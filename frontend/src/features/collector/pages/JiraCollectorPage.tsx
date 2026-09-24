import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bug,
  Layers,
  Timer,
  X,
  Settings,
  Star,
  Info,
  Code2,
} from 'lucide-react';
import {
  getBatchRuns,
  getBatchRunDetail,
  triggerBatchRun,
  getMemberBatchDetail,
  applyBatchMemberResult,
  updateBatchCron,
  type BatchRunListItem,
  type BatchRunSummaryItem,
  type MemberBatchResult,
} from '../api/jira-collector-api';
import { SHADOWS } from '@/shared/theme';

export interface SchedulePreset {
  id: string;
  title: string;
  badge: string;
  desc: string;
  cron: string;
  hour: string;
  minute: string;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: 'midnight',
    title: '🌙 00:00 Nửa đêm hàng ngày',
    badge: 'Khuyến nghị',
    desc: 'Tự động chạy sau khi hết ngày làm việc, tổng hợp trọn vẹn dữ liệu Jira & Blueprint của ngày hôm trước.',
    cron: '0 0 * * *',
    hour: '00',
    minute: '00',
  },
  {
    id: 'morning',
    title: '🌅 07:00 Sáng hàng ngày',
    badge: 'Đầu ngày',
    desc: 'Cập nhật số liệu mới nhất trước khi nhân sự bước vào giờ làm việc (08:30).',
    cron: '0 7 * * *',
    hour: '07',
    minute: '00',
  },
  {
    id: 'evening',
    title: '🌇 18:00 Chiều hàng ngày',
    badge: 'Cuối ca',
    desc: 'Đánh giá ngay sau khi kết thúc ca làm việc buổi chiều (17:30).',
    cron: '0 18 * * *',
    hour: '18',
    minute: '00',
  },
  {
    id: 'every6h',
    title: '⏱️ Mỗi 6 tiếng một lần',
    badge: 'Định kỳ cao',
    desc: 'Quét 4 lần trong ngày: 00:00, 06:00, 12:00, 18:00 (Giờ Việt Nam GMT+7).',
    cron: '0 */6 * * *',
    hour: '00',
    minute: '00',
  },
  {
    id: 'every12h',
    title: '⏱️ Mỗi 12 tiếng một lần',
    badge: 'Định kỳ',
    desc: 'Quét 2 lần trong ngày: 00:00 và 12:00 (Giờ Việt Nam GMT+7).',
    cron: '0 */12 * * *',
    hour: '00',
    minute: '00',
  },
];

export function describeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length === 5) {
    const [min, hour, dom, mon, dow] = parts;
    if (dom === '*' && mon === '*' && dow === '*') {
      if (hour.startsWith('*/')) {
        const step = hour.slice(2);
        return `Mỗi ${step} tiếng một lần (vào phút thứ ${min.padStart(2, '0')})`;
      }
      if (!hour.includes('*') && !hour.includes(',') && !min.includes('*')) {
        const h = parseInt(hour, 10);
        const m = parseInt(min, 10);
        const period = h < 12 ? 'sáng' : h < 18 ? 'chiều' : 'tối';
        const displayH = String(h).padStart(2, '0');
        const displayM = String(m).padStart(2, '0');
        return `${displayH}:${displayM} hàng ngày (${period}) — Giờ Việt Nam GMT+7`;
      }
    }
  }
  return `Lịch cron: ${cron}`;
}

const LEVEL_META: Record<number, { label: string; bg: string; text: string; border: string }> = {
  1: { label: 'Mức 1 — Cần cải thiện', bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  2: { label: 'Mức 2 — Dưới kỳ vọng', bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  3: { label: 'Mức 3 — Đạt yêu cầu', bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  4: { label: 'Mức 4 — Tốt / Vượt chuẩn', bg: '#ecfdf5', text: '#047857', border: '#6ee7b7' },
  5: { label: 'Mức 5 — Xuất sắc', bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
};

const KPI_META: Record<string, { label: string; icon: React.ReactNode; color: string; weight: string }> = {
  PERF_01: { label: 'Tiến độ đúng hạn', icon: <Clock size={14} />, color: '#2563eb', weight: '25%' },
  CODE_QUALITY: { label: 'Chất lượng & Bug', icon: <Bug size={14} />, color: '#dc2626', weight: '20%' },
  TASK_VOLUME: { label: 'Khối lượng Task', icon: <Layers size={14} />, color: '#7c3aed', weight: '15%' },
  OWNERSHIP_SCOPE: { label: 'Độ khó kỹ thuật', icon: <Star size={14} />, color: '#0891b2', weight: '20%' },
  INDEPENDENCE: { label: 'Tự chủ & Đóng góp', icon: <CheckCircle2 size={14} />, color: '#059669', weight: '20%' },
};

function formatDuration(ms: number): string {
  if (ms === 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}


// ── Member Detail Panel ──────────────────────────────────────────────────────
function MemberDetailPanel({
  result,
  runId,
  onClose,
}: {
  result: MemberBatchResult;
  runId: string;
  onClose: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [expandedTaskKeys, setExpandedTaskKeys] = useState<Set<string>>(new Set());
  const [showLateDetails, setShowLateDetails] = useState<boolean>(true);

  const toggleExpand = (key: string) => {
    setExpandedTaskKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (expandedTaskKeys.size === result.taskContributions.length) {
      setExpandedTaskKeys(new Set());
    } else {
      setExpandedTaskKeys(new Set(result.taskContributions.map((t) => t.taskKey)));
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setApplyError(null);
    try {
      await applyBatchMemberResult(result.employeeCode, {
        runId,
        cycleCode: result.cycleCode,
        markReviewed: true,
      });
      setApplied(true);
    } catch (err) {
      setApplyError((err as Error).message);
    } finally {
      setApplying(false);
    }
  };

  const levelMeta = LEVEL_META[result.overallLevel] || LEVEL_META[3];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)',
          borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
              }}>
                {result.memberName.charAt(result.memberName.lastIndexOf(' ') + 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>{result.memberName}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{result.employeeCode} · {result.team}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{
                padding: '3px 12px', borderRadius: 999,
                background: levelMeta.bg, color: levelMeta.text, border: `1px solid ${levelMeta.border}`,
                fontWeight: 700, fontSize: 14,
              }}>
                ⭐ {result.overallScore.toFixed(1)} — {levelMeta.label}
              </span>
              <span style={{
                padding: '3px 10px', borderRadius: 999,
                background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0',
                fontSize: 11, fontWeight: 600,
              }}>
                📅 Thu thập: {result.dateFrom || '—'} → {result.dateTo || '—'}
              </span>
              {result.blueprintSummary?.hasData && (
                <span style={{
                  padding: '3px 10px', borderRadius: 999,
                  background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                  fontSize: 11, fontWeight: 700,
                }}>
                  🚢 Đã tích hợp Blueprint CLV
                </span>
              )}
              {result.metrics.totalTasks === 0 && (
                <span style={{
                  padding: '3px 10px', borderRadius: 999,
                  background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
                  fontSize: 11, fontWeight: 600,
                }}>
                  ⚠ Không tìm thấy task trong Jira
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: '20px 28px' }}>
          {/* Blueprint CLV Summary Section */}
          {result.blueprintSummary?.hasData ? (
            <div style={{ marginBottom: 24, background: '#f8faff', borderRadius: 12, border: '1px solid #c7d2fe', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🚢</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#312e81' }}>
                    Dữ liệu thu thập từ Cổng Blueprint CLV (SSO)
                  </span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                  background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                }}>
                  ✓ Đã đồng bộ dữ liệu kỳ H2-2026
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {/* Attendance */}
                {result.blueprintSummary.attendance && (
                  <div style={{ background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e0e7ff' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#4338ca', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} /> Chuyên cần (UI_TAT_028)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>
                        {result.blueprintSummary.attendance.punctualityRate}%
                      </span>
                      <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>đúng giờ</span>
                      <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#059669' }}>
                        {result.blueprintSummary.attendance.score10.toFixed(1)}/10 điểm
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span>Tổng công: <strong>{result.blueprintSummary.attendance.totalWorkDays}</strong></span>
                      <span>Đúng hạn: <strong style={{ color: '#059669' }}>{result.blueprintSummary.attendance.onTimeDays}</strong></span>
                      <span>Trễ: <strong style={{ color: result.blueprintSummary.attendance.lateDays > 0 ? '#dc2626' : '#64748b' }}>{result.blueprintSummary.attendance.lateDays} ({result.blueprintSummary.attendance.lateMinutes}p)</strong></span>
                      <span>Nghỉ: <strong>{result.blueprintSummary.attendance.leaveDays}</strong></span>
                    </div>

                    {/* Danh sách ngày trễ chi tiết */}
                    {result.blueprintSummary.attendance.lateDays > 0 ? (
                      <div style={{ marginTop: 8, padding: '8px 10px', background: '#fff1f2', borderRadius: 8, border: '1px solid #fecdd3' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#be123c', display: 'flex', alignItems: 'center', gap: 4 }}>
                            🚨 Chi tiết {result.blueprintSummary.attendance.lateDays} ngày đi trễ ({result.blueprintSummary.attendance.lateMinutes} phút):
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowLateDetails(!showLateDetails)}
                            style={{
                              fontSize: 10, color: '#be123c', background: 'none', border: 'none',
                              cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: 0,
                            }}
                          >
                            {showLateDetails ? 'Thu gọn ▲' : 'Xem danh sách ▼'}
                          </button>
                        </div>
                        {showLateDetails && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, maxHeight: 150, overflowY: 'auto' }}>
                            {(result.blueprintSummary.attendance.lateRecords || []).length > 0 ? (
                              result.blueprintSummary.attendance.lateRecords!.map((lr, lIdx) => (
                                <div key={lIdx} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  background: '#ffffff', padding: '5px 8px', borderRadius: 6,
                                  border: '1px solid #ffe4e6', fontSize: 11,
                                }}>
                                  <div>
                                    <strong style={{ color: '#0f172a' }}>📅 {lr.date}</strong>
                                    <span style={{ color: '#475569', marginLeft: 8 }}>
                                      Vào: <strong style={{ color: '#e11d48' }}>{lr.punchIn || '--:--'}</strong>
                                      {lr.workShift ? ` (Ca ${lr.workShift})` : ''}
                                    </span>
                                  </div>
                                  <span style={{
                                    background: '#ffe4e6', color: '#be123c', fontWeight: 700,
                                    padding: '1px 6px', borderRadius: 4, fontSize: 10,
                                  }}>
                                    Trễ {lr.lateMinutes} phút
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div style={{ fontSize: 11, color: '#be123c' }}>
                                Ghi nhận {result.blueprintSummary.attendance.lateDays} lần trễ, tổng {result.blueprintSummary.attendance.lateMinutes} phút trong kỳ H2-2026.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        marginTop: 8, padding: '4px 8px', background: '#f0fdf4',
                        borderRadius: 6, border: '1px solid #bbf7d0', fontSize: 11, color: '#15803d',
                        display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
                      }}>
                        <CheckCircle2 size={12} /> 100% các ngày làm việc đều đúng giờ, không có ngày trễ.
                      </div>
                    )}
                  </div>
                )}

                {/* PIM Tasks */}
                {result.blueprintSummary.tasks && (
                  <div style={{ background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e0e7ff' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#4338ca', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={13} /> Nhiệm vụ PIM (UI_PIM_001)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>
                        {result.blueprintSummary.tasks.totalTasks}
                      </span>
                      <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>tasks xử lý</span>
                      <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#059669' }}>
                        {result.blueprintSummary.tasks.score10.toFixed(1)}/10 điểm
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Đã hoàn thành: <strong>{result.blueprintSummary.tasks.completedTasks}</strong> tasks PIM
                    </div>
                  </div>
                )}
              </div>

              {/* Blended formulas */}
              {result.blueprintSummary.blendedKpis && result.blueprintSummary.blendedKpis.length > 0 && (
                <div style={{ background: '#eef2ff', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: '#3730a3' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>🔀 Công thức tích hợp điểm:</div>
                  {result.blueprintSummary.blendedKpis.map((bk, i) => (
                    <div key={i} style={{ marginTop: 2 }}>
                      • <strong>{bk.kpiName} ({bk.kpiCode})</strong>: {bk.formula} → <strong>{bk.blendedScore}%</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              marginBottom: 24, padding: '12px 16px', background: '#f8fafc',
              borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Info size={16} color="#94a3b8" />
              <span>Chưa có dữ liệu Blueprint cho nhân sự này trong kỳ H2-2026. Điểm đang được tính 100% từ Jira PIM.</span>
            </div>
          )}

          {/* KPI Grid */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 12 }}>
              📊 Điểm KPI từng tiêu chí
              {result.blueprintSummary?.hasData && (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                  🚢 Đã tích hợp với Blueprint CLV
                </span>
              )}
            </div>
            {result.metrics.totalTasks === 0 && (
              <div style={{
                padding: '10px 14px', background: '#fff7ed', borderRadius: 8,
                border: '1px solid #fed7aa', marginBottom: 12,
                fontSize: 13, color: '#92400e',
              }}>
                ⚠ <strong>Không tìm thấy task Jira</strong> cho nhân viên này trong khoảng {result.dateFrom} → {result.dateTo}.<br />
                Có thể do username Jira khác employee code, hoặc chưa có task nào được assign/reported trong kỳ này.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {result.records.map((rec) => {
                const kMeta = KPI_META[rec.kpi_code];
                const lMeta = LEVEL_META[rec.resolved_level] || LEVEL_META[3];
                return (
                  <div key={rec.kpi_code} style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: lMeta.bg, border: `1px solid ${lMeta.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: kMeta?.color || '#374151' }}>
                      {kMeta?.icon || <Star size={14} />}
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{kMeta?.label || rec.kpi_code}</span>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: lMeta.text }}>
                      Mức {rec.resolved_level}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{rec.comment}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Jira Metrics */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 10 }}>📋 Dữ liệu Jira PIM thực tế</div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8, background: '#f8fafc', borderRadius: 10, padding: 12,
            }}>
              {[
                { label: 'Tổng tasks', value: result.metrics.totalTasks },
                { label: 'Hoàn thành', value: result.metrics.completedTasks, color: '#047857' },
                { label: 'Đúng hạn', value: `${result.metrics.onTimeRate}%`, color: '#2563eb' },
                { label: 'Critical Bugs', value: result.metrics.criticalBugs, color: result.metrics.criticalBugs > 0 ? '#dc2626' : '#047857' },
                { label: 'Đang làm', value: result.metrics.inProgressTasks },
                { label: 'Trễ hạn', value: result.metrics.delayedTasks, color: result.metrics.delayedTasks > 0 ? '#c2410c' : '#047857' },
                { label: 'Tổng bug', value: result.metrics.totalBugs },
                { label: 'Giờ log', value: `${result.metrics.totalHoursSpent}h` },
              ].map((m) => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: m.color || '#1e293b' }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Task Contribution Scores with Deep AI Reasoning or Raw Tasks List */}
          {result.taskContributions.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🤖 AI đánh giá chi tiết từng Task ({result.taskContributions.length} tasks)</span>
                </div>
                <button
                  onClick={toggleAll}
                  style={{
                    background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6,
                    padding: '4px 12px', fontSize: 12, color: '#334155', cursor: 'pointer',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {expandedTaskKeys.size === result.taskContributions.length ? '▲ Thu gọn tất cả' : '▼ Mở rộng chi tiết AI'}
                </button>
              </div>

              <div style={{ maxHeight: 420, overflowY: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Task & Nghiệp vụ</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 600, width: 110 }}>Độ phức tạp</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 600, width: 110 }}>Đóng góp</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Nhận xét AI & Lý giải</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.taskContributions.map((t, idx) => {
                      const isExpanded = expandedTaskKeys.has(t.taskKey);
                      const isDone = ['done', 'resolved', 'closed', 'complete'].some((s) => (t.status || '').toLowerCase().includes(s));
                      return (
                        <React.Fragment key={t.taskKey}>
                          <tr
                            onClick={() => toggleExpand(t.taskKey)}
                            style={{
                              borderBottom: !isExpanded && idx < result.taskContributions.length - 1 ? '1px solid #f1f5f9' : 'none',
                              cursor: 'pointer',
                              background: isExpanded ? '#faf5ff' : 'transparent',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = '#f8faff'; }}
                            onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <a
                                  href={t.jiraUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none', fontSize: 13 }}
                                >
                                  {t.taskKey}
                                </a>
                                <span style={{
                                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                                  background: isDone ? '#f0fdf4' : '#eff6ff',
                                  color: isDone ? '#16a34a' : '#2563eb',
                                  border: `1px solid ${isDone ? '#bbf7d0' : '#bfdbfe'}`,
                                  fontWeight: 600,
                                }}>
                                  {t.status || (isDone ? 'Đã xong' : 'Đang làm')}
                                </span>
                                <span style={{
                                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                                  background: t.isOnTime ? '#ecfdf5' : '#fef2f2',
                                  color: t.isOnTime ? '#059669' : '#dc2626',
                                  fontWeight: 600,
                                }}>
                                  {t.isOnTime ? 'Đúng hạn' : 'Trễ hạn'}
                                </span>
                                {(t.timeSpentHours ?? 0) > 0 && (
                                  <span style={{ fontSize: 10, color: '#64748b' }}>
                                    ⏱ {t.timeSpentHours}h
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: '#334155', marginTop: 3, fontWeight: 500 }}>
                                {t.summary}
                              </div>
                              {t.components && t.components.length > 0 && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                  {t.components.map((c) => (
                                    <span key={c} style={{ fontSize: 10, background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: 4 }}>
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 2 }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <div
                                    key={s}
                                    style={{
                                      width: 8, height: 8, borderRadius: 2,
                                      background: s <= t.complexityScore ? '#7c3aed' : '#e5e7eb',
                                    }}
                                  />
                                ))}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9' }}>
                                {t.complexityScore}/5
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>
                                {t.complexityScore >= 5 ? 'Rất cao' : t.complexityScore === 4 ? 'Cao' : t.complexityScore === 3 ? 'Trung bình' : 'Cơ bản'}
                              </div>
                            </td>

                            <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 2 }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <div
                                    key={s}
                                    style={{
                                      width: 8, height: 8, borderRadius: 2,
                                      background: s <= t.contributionScore ? '#059669' : '#e5e7eb',
                                    }}
                                  />
                                ))}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>
                                {t.contributionScore}/5
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>
                                {t.contributionScore >= 5 ? 'Xuất sắc' : t.contributionScore === 4 ? 'Tốt' : 'Đạt'}
                              </div>
                            </td>

                            <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                              <div style={{ fontSize: 12, color: '#1e293b' }}>{t.aiComment}</div>
                              <div style={{ marginTop: 4, fontSize: 11, color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {isExpanded ? '▲ Thu gọn phân tích' : '▼ Xem vì sao được điểm này'}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detailed Reasoning Drawer */}
                          {isExpanded && (
                            <tr style={{ background: '#faf5ff', borderBottom: idx < result.taskContributions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                              <td colSpan={4} style={{ padding: '0 14px 14px' }}>
                                <div style={{
                                  background: '#fff', borderRadius: 8, border: '1px solid #e9d5ff',
                                  padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10,
                                }}>
                                  {/* Complexity Reason */}
                                  <div style={{ background: '#fdf4ff', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #9333ea' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce', marginBottom: 2 }}>
                                      🟣 Vì sao đạt độ phức tạp {t.complexityScore}/5?
                                    </div>
                                    <div style={{ fontSize: 12, color: '#3b0764', lineHeight: 1.5 }}>
                                      {t.complexityRationale || 'Độ phức tạp được đánh giá dựa trên mức độ ưu tiên, thời lượng và logic module.'}
                                    </div>
                                  </div>

                                  {/* Contribution Reason */}
                                  <div style={{ background: '#f0fdf4', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #16a34a' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 2 }}>
                                      🟢 Nhân sự đã đóng góp cụ thể gì vào task?
                                    </div>
                                    <div style={{ fontSize: 12, color: '#14532d', lineHeight: 1.5 }}>
                                      {t.contributionRationale || 'Nhân sự đã trực tiếp xử lý bài toán, cam kết tiến độ và chất lượng.'}
                                    </div>
                                  </div>

                                  {/* Technical Metadata */}
                                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                                    <span>Loại: <strong>{t.issueType || 'Task'}</strong></span>
                                    <span>Ưu tiên: <strong>{t.priority || 'Medium'}</strong></span>
                                    <span>Trạng thái: <strong>{t.status || 'Done'}</strong></span>
                                    <span>Số lượng comment trao đổi: <strong>{t.commentsCount || 0}</strong></span>
                                    {t.latestComment && (
                                      <span style={{ width: '100%', color: '#475569', fontStyle: 'italic' }}>
                                        💬 Ý kiến gần nhất: "{t.latestComment}"
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (result.metrics?.tasks && result.metrics.tasks.length > 0) ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 10 }}>
                📋 Danh sách nhiệm vụ Jira ({result.metrics.tasks.length} tasks)
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Task & Tiêu đề</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 600, width: 120 }}>Trạng thái</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 600, width: 100 }}>Tiến độ</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 600, width: 90 }}>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.metrics.tasks.map((task, idx) => {
                      const isDone = ['done', 'resolved', 'closed', 'complete'].some((s) => (task.status || '').toLowerCase().includes(s));
                      return (
                        <tr key={task.key} style={{ borderBottom: idx < (result.metrics.tasks?.length ?? 0) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <a href={task.jiraUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                                {task.key}
                              </a>
                              <span style={{ fontSize: 10, color: '#64748b' }}>{task.issueType}</span>
                              <span style={{ fontSize: 10, color: '#64748b' }}>• {task.priority}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>{task.summary}</div>
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 4,
                              background: isDone ? '#f0fdf4' : '#eff6ff',
                              color: isDone ? '#16a34a' : '#2563eb',
                              border: `1px solid ${isDone ? '#bbf7d0' : '#bfdbfe'}`,
                              fontWeight: 600,
                            }}>
                              {task.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 4,
                              background: task.isOnTime ? '#ecfdf5' : '#fef2f2',
                              color: task.isOnTime ? '#059669' : '#dc2626',
                              fontWeight: 600,
                            }}>
                              {task.isOnTime ? 'Đúng hạn' : 'Trễ hạn'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                            {task.timeSpentHours > 0 ? `⏱ ${task.timeSpentHours}h` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 24, padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', color: '#64748b', fontSize: 13 }}>
              Không ghi nhận nhiệm vụ Jira nào của nhân sự trong khoảng thời gian đánh giá.
            </div>
          )}

          {/* Apply button */}
          <div style={{
            padding: '16px 20px', background: applied ? '#ecfdf5' : '#f8faff',
            borderRadius: 12, border: `1px solid ${applied ? '#6ee7b7' : '#c7d2fe'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: applied ? '#047857' : '#3730a3' }}>
                {applied ? '✅ Đã áp dụng vào chu kỳ đánh giá' : '💾 Áp dụng điểm vào hệ thống'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {applied
                  ? `Điểm đã được ghi vào chu kỳ ${result.cycleCode} và cập nhật ngày review`
                  : 'Ghi điểm batch vào DB và đánh dấu đã review cho nhân viên này'}
              </div>
              {applyError && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>⚠ {applyError}</div>}
            </div>
            {!applied && (
              <button
                onClick={handleApply}
                disabled={applying}
                style={{
                  background: '#4f46e5', color: '#fff',
                  border: 'none', borderRadius: 8, padding: '10px 20px',
                  fontWeight: 600, fontSize: 13, cursor: applying ? 'not-allowed' : 'pointer',
                  opacity: applying ? 0.6 : 1, flexShrink: 0,
                }}
              >
                {applying ? '⏳ Đang áp dụng...' : '✅ Áp dụng điểm'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Score Table Row ─────────────────────────────────────────────────────────
function ScoreRow({
  member,
  runId,
  onViewDetail,
}: {
  member: BatchRunSummaryItem;
  runId: string;
  onViewDetail: (code: string, runId: string) => void;
}) {
  const lMeta = LEVEL_META[member.overallLevel] || LEVEL_META[3];
  const kpiMap = Object.fromEntries(member.kpiScores.map((k) => [k.kpi_code, k]));

  return (
    <tr
      onClick={() => onViewDetail(member.employeeCode, runId)}
      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8faff')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={{ padding: '10px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{member.memberName}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{member.employeeCode} · {member.team}</div>
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 999,
          background: lMeta.bg, color: lMeta.text, border: `1px solid ${lMeta.border}`,
          fontWeight: 700, fontSize: 13,
        }}>
          {member.overallScore.toFixed(1)}
        </span>
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
          Mức {member.overallLevel}
        </span>
      </td>
      {['PERF_01', 'CODE_QUALITY', 'TASK_VOLUME', 'OWNERSHIP_SCOPE', 'INDEPENDENCE'].map((k) => {
        const kpi = kpiMap[k];
        const km = KPI_META[k];
        return (
          <td key={k} style={{ padding: '10px 8px', textAlign: 'center' }}>
            {kpi ? (
              <span style={{ fontSize: 12, color: km?.color || '#334155', fontWeight: 600 }}>
                L{kpi.resolved_level}
              </span>
            ) : (
              <span style={{ color: '#d1d5db' }}>—</span>
            )}
          </td>
        );
      })}
      {/* Blueprint column */}
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        {member.hasBlueprint ? (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            🚢 Tích hợp
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Chỉ Jira</span>
        )}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
        {member.avgTaskContribution != null ? (
          <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
            {member.avgTaskContribution.toFixed(1)}/5
          </span>
        ) : <span style={{ color: '#d1d5db' }}>—</span>}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
        <div>{member.dateFrom?.slice(0, 10) || '—'}</div>
        <div>→ {member.dateTo?.slice(0, 10) || '—'}</div>
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
        <ChevronRight size={16} color="#94a3b8" />
      </td>
    </tr>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export const JiraCollectorPage: React.FC = () => {
  const [batchData, setBatchData] = useState<{ total: number; currentCron: string; runs: BatchRunListItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const [selectedRunIdx, setSelectedRunIdx] = useState(0);
  const [detailPanel, setDetailPanel] = useState<{ result: MemberBatchResult; runId: string } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showCronEdit, setShowCronEdit] = useState(false);
  const [cronInput, setCronInput] = useState('');
  const [cronSaving, setCronSaving] = useState(false);
  const [cronSaved, setCronSaved] = useState(false);

  // Friendly Schedule configuration states
  const [scheduleMode, setScheduleMode] = useState<'preset' | 'time' | 'expert'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('midnight');
  const [selectedHour, setSelectedHour] = useState<string>('00');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  const loadBatchRuns = useCallback(async () => {
    try {
      const data = await getBatchRuns();
      setBatchData(data);
      if (data.currentCron) {
        setCronInput(data.currentCron);
        const found = SCHEDULE_PRESETS.find((p) => p.cron === data.currentCron);
        if (found) {
          setSelectedPresetId(found.id);
          setSelectedHour(found.hour);
          setSelectedMinute(found.minute);
        } else {
          const parts = data.currentCron.trim().split(/\s+/);
          if (parts.length === 5 && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
            setSelectedHour(String(parts[1]).padStart(2, '0'));
            setSelectedMinute(String(parts[0]).padStart(2, '0'));
          }
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatchRuns();
    // Poll every 8s while a run might be in progress
    const interval = setInterval(loadBatchRuns, 8000);
    return () => clearInterval(interval);
  }, [loadBatchRuns]);

  const handleRunNow = async () => {
    setRunning(true);
    setRunMessage(null);
    try {
      const res = await triggerBatchRun();
      setRunMessage(res.message);
      // Refresh after 3s
      setTimeout(loadBatchRuns, 3000);
    } catch (err) {
      setRunMessage(`Lỗi: ${(err as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleViewDetail = async (employeeCode: string, runId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await getMemberBatchDetail(runId, employeeCode);
      setDetailPanel({ result: detail, runId });
    } catch {
      // fallback: try to get from summary
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveCron = async () => {
    setCronSaving(true);
    try {
      await updateBatchCron(cronInput);
      setCronSaved(true);
      setShowCronEdit(false);
      if (batchData) setBatchData({ ...batchData, currentCron: cronInput });
      setTimeout(() => setCronSaved(false), 3000);
    } catch (err) {
      alert(`Lỗi: ${(err as Error).message}`);
    } finally {
      setCronSaving(false);
    }
  };

  const [selectedRunErrorLog, setSelectedRunErrorLog] = useState<string[]>([]);
  const [showAllErrors, setShowAllErrors] = useState(false);

  const currentRun = batchData?.runs[selectedRunIdx];
  const latestRun = batchData?.runs[0];

  useEffect(() => {
    if (!currentRun) {
      setSelectedRunErrorLog([]);
      return;
    }
    if (currentRun.errorLog && currentRun.errorLog.length > 0) {
      setSelectedRunErrorLog(currentRun.errorLog);
    } else if (currentRun.status === 'FAILED' || (currentRun.failedMembers > 0 && currentRun.completedMembers === 0)) {
      getBatchRunDetail(currentRun.id)
        .then((detail) => {
          if (detail && detail.errorLog && detail.errorLog.length > 0) {
            setSelectedRunErrorLog(detail.errorLog);
          }
        })
        .catch(() => {});
    } else {
      setSelectedRunErrorLog([]);
    }
  }, [currentRun]);

  // A batch is truly active only if the latest version is marked RUNNING and started recently (< 15 mins)
  const isRunning = Boolean(
    latestRun?.status === 'RUNNING' &&
    (!latestRun.runAt || (Date.now() - new Date(latestRun.runAt).getTime()) < 15 * 60 * 1000)
  );

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 16, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
            🤖 Batch KPI Scoring & Lịch sử Version
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Tự động thu thập Jira PIM + Blueprint CLV · AI chấm điểm chi tiết từng task — 19 thành viên
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Cron info */}
          <div
            onClick={() => setShowCronEdit(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', background: '#f8faff', border: '1px solid #c7d2fe',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#4f46e5',
            }}
          >
            <Clock size={14} />
            <span style={{ fontWeight: 600 }}>
              00:00 hàng ngày ({batchData?.currentCron || '0 0 * * *'})
            </span>
          </div>

          <button
            onClick={loadBatchRuns}
            style={{
              background: 'none', border: '1px solid #e2e8f0',
              borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: '#64748b',
            }}
          >
            <RefreshCw size={15} />
          </button>

          <button
            id="batch-run-now-btn"
            onClick={handleRunNow}
            disabled={running || !!isRunning}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: running || isRunning ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 22px', fontWeight: 700, fontSize: 14,
              cursor: running || isRunning ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
            }}
          >
            {running || isRunning ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={16} />}
            {running ? 'Đang khởi động...' : isRunning ? 'Đang chạy...' : '▶ Chạy Batch ngay'}
          </button>
        </div>
      </div>

      {/* Auto-collect Schedule & Database Persistence Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: '1px solid #bae6fd', borderRadius: 12, padding: '14px 20px',
        marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, boxShadow: '0 2px 8px rgba(2,132,199,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#0284c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            flexShrink: 0,
          }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0369a1' }}>
                ⏰ Lịch thu thập tự động: {describeCron(batchData?.currentCron || '0 0 * * *')}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: '#e0f2fe', color: '#0284c7', border: '1px solid #7dd3fc',
              }}>
                Cron: {batchData?.currentCron || '0 0 * * *'}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
              }}>
                💾 Lưu version vào PostgreSQL
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#0c4a6e', marginTop: 3 }}>
              Mỗi lần chạy sẽ tạo 1 <strong>Phiên bản lịch sử (Version)</strong> lưu đầy đủ dữ liệu Jira + Blueprint CLV vào cơ sở dữ liệu · Click từng hàng để xem AI phân tích chuyên sâu từng task.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowScriptModal(true)}
            style={{
              background: '#fff', border: '1px solid #c7d2fe', color: '#4338ca',
              borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Code2 size={14} /> ⚙️ Script JQL setup là gì?
          </button>
          <button
            type="button"
            onClick={() => setShowCronEdit(true)}
            style={{
              background: '#0284c7', border: 'none', color: '#fff',
              borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 6px rgba(2,132,199,0.3)',
            }}
          >
            <Settings size={14} /> Cài đặt lịch chạy
          </button>
        </div>
      </div>

      {runMessage && (
        <div style={{
          padding: '10px 16px', background: '#eff6ff', borderRadius: 8,
          border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 13,
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Info size={15} />
          {runMessage}
        </div>
      )}

      {cronSaved && (
        <div style={{
          padding: '10px 16px', background: '#ecfdf5', borderRadius: 8,
          border: '1px solid #6ee7b7', color: '#047857', fontSize: 13,
          marginBottom: 16,
        }}>
          ✅ Đã cập nhật lịch cron thành công
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div>Đang tải lịch sử batch từ cơ sở dữ liệu...</div>
        </div>
      ) : !batchData || batchData.runs.length === 0 ? (
        /* Empty state */
        <div style={{
          textAlign: 'center', padding: 60,
          background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)',
          borderRadius: 16, border: '2px dashed #c7d2fe',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#1e293b', marginBottom: 8 }}>
            Chưa có phiên bản nào trong database
          </div>
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
            Nhấn <strong>"Chạy Batch ngay"</strong> để bắt đầu thu thập và tạo Version #1 cho toàn bộ 19 thành viên.<br />
            Hệ thống tự động chạy vào lúc <strong>00:00 (nửa đêm) hàng ngày</strong> theo cron <code>{batchData?.currentCron || '0 0 * * *'}</code>.
          </div>
          <button
            onClick={handleRunNow}
            disabled={running}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            🚀 Chạy Batch tạo Version #1
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Run history sidebar */}
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
            overflow: 'hidden', boxShadow: SHADOWS.sm,
          }}>
            <div style={{
              padding: '12px 16px', background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>Lịch sử Version</span>
              <span style={{ fontSize: 11, background: '#e2e8f0', padding: '1px 6px', borderRadius: 4 }}>
                {batchData.runs.length} bản
              </span>
            </div>
            {batchData.runs.map((run, idx) => (
              <div
                key={run.id}
                onClick={() => setSelectedRunIdx(idx)}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: idx < batchData.runs.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: selectedRunIdx === idx ? '#eff6ff' : 'transparent',
                  borderLeft: selectedRunIdx === idx ? '3px solid #4f46e5' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  {run.status === 'DONE' && <CheckCircle2 size={13} color="#047857" />}
                  {run.status === 'RUNNING' && <RefreshCw size={13} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />}
                  {run.status === 'FAILED' && <AlertCircle size={13} color="#dc2626" />}
                  <span style={{
                    fontSize: 11, fontWeight: 800,
                    color: '#1e293b',
                  }}>
                    {run.versionTag || `Phiên bản #${run.versionNumber || (batchData.runs.length - idx)}`}
                  </span>
                  {idx === 0 && (
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#ede9fe', color: '#6d28d9', fontWeight: 700 }}>
                      Mới nhất
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {formatDate(run.runAt)}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span>{run.completedMembers}/{run.totalMembers} NV ✅</span>
                  {run.blueprintMembersCount ? (
                    <span style={{ color: '#059669', fontWeight: 600 }}>🚢 {run.blueprintMembersCount} Blueprint</span>
                  ) : null}
                  <span>({formatDuration(run.durationMs)})</span>
                </div>
              </div>
            ))}
          </div>

          {/* Score table */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: SHADOWS.sm, overflow: 'hidden' }}>
            {currentRun && (
              <>
                {/* Run info bar */}
                <div style={{
                  padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 6,
                      background: '#4f46e5', color: '#fff',
                    }}>
                      {currentRun.versionTag || `Phiên bản #${currentRun.versionNumber || 1}`}
                    </span>
                    {currentRun.status === 'DONE' ? <CheckCircle2 size={15} color="#047857" /> :
                      currentRun.status === 'RUNNING' ? <RefreshCw size={15} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} /> :
                        <AlertCircle size={15} color="#dc2626" />}
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
                      {formatDate(currentRun.runAt)}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Kích hoạt: <strong>{currentRun.triggeredBy === 'CRON' ? '⏰ Tự động (Cron)' : '👤 Thủ công'}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Thành công: <strong style={{ color: '#047857' }}>{currentRun.completedMembers}/{currentRun.totalMembers}</strong> NV
                  </span>
                  {currentRun.blueprintMembersCount ? (
                    <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                      🚢 Đồng bộ Blueprint: {currentRun.blueprintMembersCount} NV
                    </span>
                  ) : null}
                  {currentRun.durationMs > 0 && (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      <Timer size={12} style={{ verticalAlign: 'middle' }} /> {formatDuration(currentRun.durationMs)}
                    </span>
                  )}
                  {currentRun.status === 'RUNNING' && (
                    <span style={{
                      padding: '2px 10px', background: '#eff6ff', color: '#2563eb',
                      borderRadius: 999, fontSize: 11, fontWeight: 600, border: '1px solid #bfdbfe',
                    }}>
                      ⏳ Đang xử lý — Tự động cập nhật mỗi 8s
                    </span>
                  )}
                </div>

                {currentRun.scoreSummary.length === 0 ? (
                  (() => {
                    const isFailed = currentRun.status === 'FAILED' || (currentRun.failedMembers > 0 && currentRun.completedMembers === 0);
                    const effectiveErrors = (currentRun.errorLog && currentRun.errorLog.length > 0)
                      ? currentRun.errorLog
                      : selectedRunErrorLog;
                    const hasAuthError = effectiveErrors.some(
                      (err) => err.includes('401') || err.includes('UNAUTHORIZED') || err.includes('Unauthorized')
                    );
                    const hasCaptcha = effectiveErrors.some(
                      (err) => err.includes('CAPTCHA') || err.includes('CAPTCHA_CHALLENGE')
                    );

                    if (isFailed) {
                      return (
                        <div style={{ padding: 24 }}>
                          {hasAuthError ? (
                            <div style={{
                              padding: '24px',
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              borderRadius: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                <div style={{
                                  width: 44, height: 44, borderRadius: 10,
                                  background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  <AlertCircle size={24} style={{ color: '#d97706' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#92400e' }}>
                                    Lỗi xác thực Jira: HTTP 401 Unauthorized (Chưa cấu hình mật khẩu Jira)
                                  </h4>
                                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#b45309', lineHeight: 1.5 }}>
                                    Máy chủ Jira PIM CyberLogitec (<code>pim.cyberlogitec.com</code>) từ chối xác thực tài khoản <b>ky.luong</b> do máy chủ chưa được cấu hình biến môi trường <code>JIRA_PASSWORD</code> hoặc mật khẩu đã thay đổi.
                                  </p>
                                </div>
                              </div>

                              <div style={{
                                background: '#ffffff',
                                border: '1px solid #fde68a',
                                borderRadius: '8px',
                                padding: '14px 18px',
                                fontSize: 13,
                                color: '#78350f',
                              }}>
                                <div style={{ fontWeight: 700, marginBottom: 8, color: '#92400e' }}>
                                  👉 Cách khắc phục:
                                </div>
                                <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <li>
                                    Thêm biến môi trường <code>JIRA_PASSWORD</code> vào cấu hình máy chủ Render (Tab Environment của service backend).
                                  </li>
                                  <li>
                                    Hệ thống đã được bổ sung mật khẩu fallback mặc định trong mã nguồn mới nhất. Sau khi deploy phiên bản mới, hệ thống sẽ tự động xác thực thành công.
                                  </li>
                                  <li>
                                    Sau khi cấu hình, bấm <b>"Thử chạy lại Batch"</b> bên dưới.
                                  </li>
                                </ol>
                              </div>

                              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={handleRunNow}
                                  disabled={running}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '9px 18px',
                                    background: '#d97706',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: running ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)',
                                  }}
                                >
                                  <RefreshCw size={15} className={running ? 'animate-spin' : ''} /> Thử chạy lại Batch
                                </button>
                                {effectiveErrors.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllErrors((v) => !v)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#92400e',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      marginLeft: 'auto',
                                    }}
                                  >
                                    {showAllErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    {showAllErrors ? 'Ẩn chi tiết lỗi' : `Xem chi tiết lỗi (${effectiveErrors.length} lỗi)`}
                                  </button>
                                )}
                              </div>

                              {showAllErrors && effectiveErrors.length > 0 && (
                                <div style={{
                                  maxHeight: 220,
                                  overflowY: 'auto',
                                  background: '#1e293b',
                                  color: '#fde68a',
                                  padding: '12px 16px',
                                  borderRadius: 8,
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  lineHeight: 1.5,
                                }}>
                                  {effectiveErrors.map((err, i) => (
                                    <div key={i} style={{ marginBottom: 6 }}>• {err}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : hasCaptcha ? (
                            <div style={{
                              padding: '24px',
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              borderRadius: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                <div style={{
                                  width: 44, height: 44, borderRadius: 10,
                                  background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  <AlertTriangle size={24} style={{ color: '#e11d48' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#9f1239' }}>
                                    Lỗi Jira Server: Tài khoản bị khóa do CAPTCHA Challenge (HTTP 403)
                                  </h4>
                                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#be123c', lineHeight: 1.5 }}>
                                    Hệ thống Jira PIM CyberLogitec (<code>pim.cyberlogitec.com</code>) đã tạm thời chặn kết nối API và yêu cầu xác thực hình ảnh CAPTCHA đối với tài khoản <b>ky.luong</b> do cơ chế bảo mật chống brute-force của Jira.
                                  </p>
                                </div>
                              </div>

                              <div style={{
                                background: '#ffffff',
                                border: '1px solid #fecdd3',
                                borderRadius: '8px',
                                padding: '14px 18px',
                                fontSize: 13,
                                color: '#881337',
                              }}>
                                <div style={{ fontWeight: 700, marginBottom: 8, color: '#9f1239' }}>
                                  👉 Hướng dẫn mở khóa trong 30 giây:
                                </div>
                                <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <li>
                                    Bấm vào nút <b>"Mở Jira PIM để nhập CAPTCHA"</b> bên dưới để mở giao diện web Jira.
                                  </li>
                                  <li>
                                    Đăng nhập tài khoản <b>ky.luong</b>, mật khẩu và <b>giải mã CAPTCHA hình ảnh</b> hiển thị trên màn hình đăng nhập.
                                  </li>
                                  <li>
                                    Sau khi đăng nhập thành công vào Jira trên trình duyệt, quay lại đây và bấm <b>"Thử chạy lại Batch"</b>.
                                  </li>
                                </ol>
                              </div>

                              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                <a
                                  href="https://pim.cyberlogitec.com/jira/login.jsp"
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '9px 18px',
                                    background: '#e11d48',
                                    color: '#ffffff',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    fontSize: 13,
                                    textDecoration: 'none',
                                    boxShadow: '0 2px 4px rgba(225, 29, 72, 0.2)',
                                  }}
                                >
                                  <ExternalLink size={15} /> Mở Jira PIM để nhập CAPTCHA
                                </a>
                                <button
                                  type="button"
                                  onClick={handleRunNow}
                                  disabled={running}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '9px 18px',
                                    background: '#ffffff',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: running ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  <RefreshCw size={15} className={running ? 'animate-spin' : ''} /> Thử chạy lại Batch
                                </button>
                                {effectiveErrors.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllErrors((v) => !v)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#9f1239',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      marginLeft: 'auto',
                                    }}
                                  >
                                    {showAllErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    {showAllErrors ? 'Ẩn chi tiết lỗi' : `Xem chi tiết lỗi (${effectiveErrors.length} lỗi)`}
                                  </button>
                                )}
                              </div>

                              {showAllErrors && effectiveErrors.length > 0 && (
                                <div style={{
                                  maxHeight: 220,
                                  overflowY: 'auto',
                                  background: '#1e293b',
                                  color: '#fca5a5',
                                  padding: '12px 16px',
                                  borderRadius: 8,
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  lineHeight: 1.5,
                                }}>
                                  {effectiveErrors.map((err, i) => (
                                    <div key={i} style={{ marginBottom: 6 }}>• {err}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              padding: '20px 24px',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertCircle size={22} style={{ color: '#ef4444' }} />
                                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
                                  Phiên thu thập thất bại ({currentRun.failedMembers}/{currentRun.totalMembers} nhân viên gặp lỗi)
                                </h4>
                              </div>
                              {effectiveErrors[0] && (
                                <div style={{ fontSize: 13, color: '#7f1d1d', background: '#fee2e2', padding: '12px 14px', borderRadius: 8 }}>
                                  {effectiveErrors[0]}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={handleRunNow}
                                  disabled={running}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '8px 18px',
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <RefreshCw size={14} className={running ? 'animate-spin' : ''} /> Chạy lại Batch
                                </button>
                                {effectiveErrors.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllErrors((v) => !v)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#991b1b',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {showAllErrors ? 'Ẩn bớt lỗi' : `Xem tất cả ${effectiveErrors.length} lỗi`}
                                  </button>
                                )}
                              </div>
                              {showAllErrors && effectiveErrors.length > 1 && (
                                <div style={{
                                  maxHeight: 220,
                                  overflowY: 'auto',
                                  background: '#1e293b',
                                  color: '#fca5a5',
                                  padding: '12px 16px',
                                  borderRadius: 8,
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  lineHeight: 1.5,
                                }}>
                                  {effectiveErrors.map((err, i) => (
                                    <div key={i} style={{ marginBottom: 4 }}>• {err}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                        {currentRun.status === 'RUNNING' ? '⏳ Đang đánh giá thành viên...' : 'Không có kết quả'}
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: '#475569' }}>Nhân viên</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#475569' }}>Tổng điểm</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#475569' }}>Mức</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#2563eb' }}>PERF_01 (25%)</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#dc2626' }}>CODE_QA (20%)</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#7c3aed' }}>TASK_VOL (15%)</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#0891b2' }}>OWNER (20%)</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#059669' }}>INDEP (20%)</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#166534', width: 100 }}>Blueprint CLV</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#059669' }}>Task AI (30%)</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#475569' }}>Kỳ thu thập</th>
                          <th style={{ width: 32 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {currentRun.scoreSummary
                          .sort((a, b) => b.overallScore - a.overallScore)
                          .map((member) => (
                            <ScoreRow
                              key={member.employeeCode}
                              member={member}
                              runId={currentRun.id}
                              onViewDetail={handleViewDetail}
                            />
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Friendly Schedule Edit Modal */}
      {showCronEdit && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setShowCronEdit(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: '24px 28px', width: '100%', maxWidth: 560,
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={20} color="#0284c7" />
                <div style={{ fontWeight: 800, fontSize: 17, color: '#1e293b' }}>
                  ⏰ Cài đặt Lịch thu thập & Chấm điểm Tự động
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCronEdit(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Hệ thống sẽ chạy ngầm định kỳ để quét Jira PIM + Blueprint CLV cho 19 nhân viên và tự động lưu phiên bản mới vào cơ sở dữ liệu.
            </p>

            {/* Mode Tabs */}
            <div style={{
              display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10,
              marginBottom: 16,
            }}>
              <button
                type="button"
                onClick={() => setScheduleMode('preset')}
                style={{
                  flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8,
                  fontSize: 12, fontWeight: scheduleMode === 'preset' ? 700 : 500,
                  background: scheduleMode === 'preset' ? '#fff' : 'transparent',
                  color: scheduleMode === 'preset' ? '#0284c7' : '#64748b',
                  boxShadow: scheduleMode === 'preset' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                }}
              >
                ⚡ Lựa chọn nhanh
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('time')}
                style={{
                  flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8,
                  fontSize: 12, fontWeight: scheduleMode === 'time' ? 700 : 500,
                  background: scheduleMode === 'time' ? '#fff' : 'transparent',
                  color: scheduleMode === 'time' ? '#0284c7' : '#64748b',
                  boxShadow: scheduleMode === 'time' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                }}
              >
                🕒 Chọn giờ hàng ngày
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('expert')}
                style={{
                  flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8,
                  fontSize: 12, fontWeight: scheduleMode === 'expert' ? 700 : 500,
                  background: scheduleMode === 'expert' ? '#fff' : 'transparent',
                  color: scheduleMode === 'expert' ? '#0284c7' : '#64748b',
                  boxShadow: scheduleMode === 'expert' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                }}
              >
                ⚙️ Nâng cao (Cron)
              </button>
            </div>

            {/* TAB 1: PRESETS */}
            {scheduleMode === 'preset' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {SCHEDULE_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id || cronInput === preset.cron;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setCronInput(preset.cron);
                        setSelectedHour(preset.hour);
                        setSelectedMinute(preset.minute);
                      }}
                      style={{
                        padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                        border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: isSelected ? '#f0f9ff' : '#ffffff',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#0369a1' : '#1e293b' }}>
                          {preset.title}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                          background: isSelected ? '#e0f2fe' : '#f1f5f9',
                          color: isSelected ? '#0284c7' : '#64748b',
                        }}>
                          {preset.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{preset.desc}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: TIME PICKER */}
            {scheduleMode === 'time' && (
              <div style={{
                background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0',
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 12 }}>
                  Chọn giờ chạy tự động mỗi ngày (Giờ Việt Nam GMT+7):
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>Giờ (00-23)</label>
                    <select
                      value={selectedHour}
                      onChange={(e) => {
                        const h = e.target.value;
                        setSelectedHour(h);
                        const cron = `${selectedMinute} ${parseInt(h, 10)} * * *`;
                        setCronInput(cron);
                      }}
                      style={{
                        padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1',
                        fontSize: 15, fontWeight: 700, color: '#1e293b', background: '#fff',
                      }}
                    >
                      {Array.from({ length: 24 }).map((_, i) => {
                        const str = String(i).padStart(2, '0');
                        const label = i === 0 ? '00:00 (Nửa đêm)' : i < 12 ? `${str}:00 (Sáng)` : i < 18 ? `${str}:00 (Chiều)` : `${str}:00 (Tối)`;
                        return <option key={str} value={str}>{label}</option>;
                      })}
                    </select>
                  </div>

                  <span style={{ fontSize: 20, fontWeight: 700, color: '#94a3b8', marginTop: 16 }}>:</span>

                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>Phút</label>
                    <select
                      value={selectedMinute}
                      onChange={(e) => {
                        const m = e.target.value;
                        setSelectedMinute(m);
                        const cron = `${m} ${parseInt(selectedHour, 10)} * * *`;
                        setCronInput(cron);
                      }}
                      style={{
                        padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1',
                        fontSize: 15, fontWeight: 700, color: '#1e293b', background: '#fff',
                      }}
                    >
                      {['00', '15', '30', '45'].map((m) => (
                        <option key={m} value={m}>{m} phút</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#0369a1', background: '#e0f2fe', padding: '8px 12px', borderRadius: 8 }}>
                  💡 Hệ thống sẽ tự động quét và tính điểm vào lúc <strong>{selectedHour}:{selectedMinute}</strong> mỗi ngày.
                </div>
              </div>
            )}

            {/* TAB 3: EXPERT CRON */}
            {scheduleMode === 'expert' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                  Nhập biểu thức Cron 5 trường: <code>[phút] [giờ] [ngày] [tháng] [thứ]</code>
                </div>
                <input
                  value={cronInput}
                  onChange={(e) => setCronInput(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid #c7d2fe', fontFamily: 'monospace', fontSize: 16,
                    outline: 'none', boxSizing: 'border-box', marginBottom: 8,
                  }}
                  placeholder="0 0 * * *"
                />
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  • <code>0 0 * * *</code> : 00:00 nửa đêm mỗi ngày<br />
                  • <code>0 7 * * *</code> : 07:00 sáng mỗi ngày<br />
                  • <code>0 */6 * * *</code> : Mỗi 6 tiếng một lần
                </div>
              </div>
            )}

            {/* Schedule Summary Banner */}
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
              padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle2 size={18} color="#15803d" />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
                  Lịch trình được chọn
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginTop: 1 }}>
                  {describeCron(cronInput || '0 0 * * *')}
                </div>
                <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                  Múi giờ máy chủ: Asia/Ho_Chi_Minh (GMT+7) · Cron: <code>{cronInput}</code>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCronEdit(false)}
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 8,
                  padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  color: '#475569',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveCron}
                disabled={cronSaving || !cronInput.trim()}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '9px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  boxShadow: '0 4px 12px rgba(2,132,199,0.3)',
                }}
              >
                {cronSaving ? 'Đang lưu...' : '💾 Lưu & Áp dụng lịch này'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script JQL Explainer Modal */}
      {showScriptModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setShowScriptModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: '24px 28px', width: '100%', maxWidth: 640,
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code2 size={22} color="#0284c7" />
                <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
                  ⚙️ Hướng dẫn Cấu hình Script JQL Thu thập
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f0f9ff', padding: '12px 16px', borderRadius: 10, border: '1px solid #bae6fd' }}>
                <strong style={{ color: '#0369a1' }}>1. Script JQL là gì?</strong>
                <p style={{ margin: '4px 0 0', color: '#0c4a6e' }}>
                  Script JQL là bộ quy tắc và câu lệnh truy vấn động được hệ thống dùng để kết nối với máy chủ Jira PIM (<code>https://pim.cyberlogitec.com/jira</code>) nhằm lấy danh sách các task, bugs và worklog của nhân sự. Script được lưu trong database và có thể tùy chỉnh 100% không cần viết lại mã nguồn.
                </p>
              </div>

              <div>
                <strong style={{ color: '#1e293b' }}>2. Các biến thay thế động (Dynamic Placeholders):</strong>
                <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                  <li><code>{'{EMPLOYEE_CODE}'}</code>: Mã nhân viên (ví dụ: <code>213844</code>, <code>183322</code>). Hệ thống tự động thay thế mã từng người khi chạy batch.</li>
                  <li><code>{'{FROM_DATE}'}</code>: Ngày bắt đầu kỳ đánh giá (tự động lấy từ ngày review trước đó hoặc đầu kỳ).</li>
                  <li><code>{'{TO_DATE}'}</code>: Ngày kết thúc kỳ đánh giá (mặc định là ngày hiện tại).</li>
                </ul>
              </div>

              <div>
                <strong style={{ color: '#1e293b' }}>3. Câu lệnh JQL mẫu được thực thi:</strong>
                <pre style={{
                  background: '#1e293b', color: '#38bdf8', padding: '10px 14px', borderRadius: 8,
                  fontSize: 12, overflowX: 'auto', margin: '6px 0 0',
                }}>
                  {`(assignee = "{EMPLOYEE_CODE}" OR reporter = "{EMPLOYEE_CODE}" OR worklogAuthor = "{EMPLOYEE_CODE}")\nAND updated >= "{FROM_DATE}" AND updated <= "{TO_DATE}"\nORDER BY updated DESC`}
                </pre>
              </div>

              <div>
                <strong style={{ color: '#1e293b' }}>4. Các tham số lọc nghiệp vụ:</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', marginBottom: 2 }}>Trạng thái Hoàn thành:</div>
                    <div style={{ fontSize: 11, color: '#059669' }}>Closed, Resolved, Done</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Dùng tính tỷ lệ hoàn thành đúng hạn (PERF_01).</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', marginBottom: 2 }}>Phân loại Bug:</div>
                    <div style={{ fontSize: 11, color: '#dc2626' }}>Bug, Defect, Problem, Incident</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Dùng để tính chỉ số Code Quality (CODE_QUALITY).</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fdf4ff', padding: '12px 16px', borderRadius: 10, border: '1px solid #f0abfc' }}>
                <strong style={{ color: '#86198f' }}>5. Cách chỉnh sửa & Test thử nghiệm:</strong>
                <p style={{ margin: '4px 0 0', color: '#701a75' }}>
                  Bạn có thể bấm vào tab <strong>"⚙️ Cấu hình Script JQL"</strong> ở góc trên cùng để thay đổi JQL template, thêm các status mới hoặc chạy thử trực tiếp với bất kỳ nhân viên nào để xem trước danh sách task trả về từ Jira trước khi lưu.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                style={{
                  background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '9px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Panel */}
      {detailPanel && (
        <MemberDetailPanel
          result={detailPanel.result}
          runId={detailPanel.runId}
          onClose={() => setDetailPanel(null)}
        />
      )}

      {loadingDetail && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.3)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18,
        }}>
          ⏳ Đang tải chi tiết...
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
