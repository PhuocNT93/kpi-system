import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Activity,
  Search,
  AlertTriangle,
  Award,
  Sparkles,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import {
  jiraCollectorApi,
  type JiraTaskSummary,
  type JiraMember,
} from '../api/jira-collector-api';
import { evaluationCycleApi, type EvaluationCycleDTO } from '@/features/evaluation-cycles';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';

export const JiraCollectorPage: React.FC = () => {
  // Members
  const [members, setMembers] = useState<JiraMember[]>([]);

  // Selection & Filters
  const [selectedUsername, setSelectedUsername] = useState<string>('193613'); // Default: Trung QN
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [filterRole, setFilterRole] = useState<'all' | 'assignee' | 'reporter' | 'worklog' | 'both'>('all');

  // Review Cadence & Review Date (Matching Module 1 CollectorPage)
  const [reviewCadence, setReviewCadence] = useState<'6_MONTHS' | '1_YEAR'>('6_MONTHS');
  const [reviewDate, setReviewDate] = useState<string>('2026-09-14');

  const calculateFromDate = (targetReviewDate: string, cadence: '6_MONTHS' | '1_YEAR'): string => {
    if (!targetReviewDate) return '2026-03-14';
    const parts = targetReviewDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (cadence === '6_MONTHS') {
        d.setMonth(d.getMonth() - 6);
      } else {
        d.setFullYear(d.getFullYear() - 1);
      }
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return targetReviewDate;
  };

  const [fromDate, setFromDate] = useState<string>('2026-03-14');
  const [toDate, setToDate] = useState<string>('2026-09-14');

  const handleReviewCadenceChange = (newCadence: '6_MONTHS' | '1_YEAR') => {
    setReviewCadence(newCadence);
    const from = calculateFromDate(reviewDate, newCadence);
    setFromDate(from);
    setToDate(reviewDate);
  };

  const handleReviewDateChange = (newDate: string) => {
    setReviewDate(newDate);
    const from = calculateFromDate(newDate, reviewCadence);
    setFromDate(from);
    setToDate(newDate);
  };

  // Query State & Results
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [summary, setSummary] = useState<JiraTaskSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  // Table filtering
  const [tableSearch, setTableSearch] = useState<string>('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ON_TIME' | 'DELAYED' | 'IN_PROGRESS'>('ALL');

  // Load initial members, projects, and cycles
  useEffect(() => {
    let isMounted = true;

    async function loadInitData() {
      try {
        const [mRes, cRes] = await Promise.all([
          jiraCollectorApi.getMembers().catch(() => [] as JiraMember[]),
          evaluationCycleApi.getCycles().catch(() => [] as EvaluationCycleDTO[]),
        ]);

        if (isMounted) {
          const loadedMembers = (mRes as JiraMember[]) || [];
          setMembers(loadedMembers);
          if (loadedMembers.length > 0 && !selectedUsername) {
            setSelectedUsername(loadedMembers[0].jiraUsername);
          }

          const loadedCycles = (cRes as EvaluationCycleDTO[]) || [];
          if (loadedCycles.length > 0) {
            const openCycle =
              loadedCycles.find((c) => c.status === 'PUBLISHED' || c.status === 'IN_PROGRESS') ||
              loadedCycles[0];
            setSelectedCycleId(openCycle.id);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to load initial Jira metadata:', err);
      }
    }

    loadInitData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selected Member Object
  const currentMember = useMemo(() => {
    return members.find((m) => m.jiraUsername === selectedUsername) || null;
  }, [members, selectedUsername]);

  // Handle Fetch Tasks
  const handleFetchTasks = useCallback(async () => {
    if (!selectedUsername) return;
    setLoading(true);
    setErrorMessage(null);
    setSyncFeedback(null);

    try {
      const res = await jiraCollectorApi.previewTasks({
        targetUsername: selectedUsername,
        displayName: currentMember?.name,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        filterRole,
      });

      if (res) {
        setSummary(res);
      } else {
        setErrorMessage('Không nhận được dữ liệu phản hồi từ máy chủ Jira.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Lỗi thu thập dữ liệu Jira: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [selectedUsername, currentMember, fromDate, toDate, filterRole]);

  // Auto-fetch on member change if not fetched yet
  useEffect(() => {
    if (selectedUsername) {
      handleFetchTasks();
    }
  }, [selectedUsername, handleFetchTasks]);

  // Handle Sync to Cycle
  const handleSyncToCycle = async () => {
    if (!summary) {
      setSyncFeedback({
        type: 'error',
        message: 'Vui lòng tải dữ liệu Jira trước khi đồng bộ.',
      });
      return;
    }

    setSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await jiraCollectorApi.syncTasks({
        targetUsername: selectedUsername,
        displayName: currentMember?.name,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        filterRole,
        cycleId: selectedCycleId || undefined,
      });

      if (res && res.success) {
        setSyncFeedback({
          type: 'success',
          message: `Đồng bộ thành công điểm KPI #1 vào kỳ đánh giá! Điểm: ${res.score10}/10 (Hạng ${res.grade}, Điểm trọng số: ${res.weightedScore}).`,
          details: res.comment,
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: 'Không tìm thấy mục đánh giá phù hợp trong kỳ đã chọn.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncFeedback({
        type: 'error',
        message: `Lỗi đồng bộ: ${msg}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  // Filter tasks table
  const filteredTasks = useMemo(() => {
    if (!summary || !summary.tasks) return [];
    let list = summary.tasks;

    // Filter by status tab
    if (statusTab === 'ON_TIME') {
      list = list.filter((t) => t.isCompleted && t.isOnTime);
    } else if (statusTab === 'DELAYED') {
      list = list.filter((t) => !t.isOnTime);
    } else if (statusTab === 'IN_PROGRESS') {
      list = list.filter((t) => !t.isCompleted);
    }

    // Filter by search text
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.key.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.projectName.toLowerCase().includes(q) ||
          (t.status && t.status.toLowerCase().includes(q))
      );
    }

    return list;
  }, [summary, statusTab, tableSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── TOP BANNER ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0052cc 0%, #172b4d 100%)',
          borderRadius: RADII.xl,
          padding: '24px 28px',
          color: '#ffffff',
          boxShadow: SHADOWS.lg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ maxWidth: '720px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <Activity size={14} /> Jira Server REST API (Dashboard 12207)
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: '#10b981',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Chỉ Đọc (Read-only)
            </span>
          </div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>
            Module 2: Quản lý Task & Tiến độ (Jira PIM - UI_PIM_001)
          </h2>
          <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.5 }}>
            Truy xuất trực tiếp danh sách task, giờ công (worklog) và kiểm tra hạn hoàn thành của các nhân sự
            thuộc Team Quản lý của Anh Kỳ. Tự động quy đổi tỷ lệ đúng hạn sang điểm số /10 cho KPI Cốt Lõi #1.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleFetchTasks}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: RADII.lg,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Đang tải...' : 'Làm mới Jira'}
          </button>

          <button
            onClick={handleSyncToCycle}
            disabled={syncing || !summary}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: RADII.lg,
              border: 'none',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 700,
              cursor: syncing || !summary ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            <Zap size={16} />
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ điểm vào KPI #1'}
          </button>
        </div>
      </div>

      {/* ── FEEDBACK ALERTS ── */}
      {syncFeedback && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: RADII.lg,
            backgroundColor: syncFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${syncFeedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: syncFeedback.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          {syncFeedback.type === 'success' ? (
            <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: TYPOGRAPHY.fontSize.sm }}>{syncFeedback.message}</div>
            {syncFeedback.details && (
              <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, marginTop: '4px', opacity: 0.9 }}>
                {syncFeedback.details}
              </div>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: RADII.lg,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 500 }}>{errorMessage}</span>
        </div>
      )}

      {/* ── CONTROL FILTERS PANEL ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: RADII.xl,
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: SHADOWS.sm,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'flex-end',
        }}
      >
        {/* Member Selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 700,
              color: '#475569',
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            Nhân sự quản lý (20 thành viên)
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedUsername}
              onChange={(e) => setSelectedUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: RADII.md,
                border: '1px solid #cbd5e1',
                fontSize: TYPOGRAPHY.fontSize.sm,
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: 600,
              }}
            >
              <optgroup label="── ALLEGRO NX Part (12 nhân sự) ──">
                {members
                  .filter((m) => m.part === 'ALLEGRO NX')
                  .map((m) => (
                    <option key={m.id} value={m.jiraUsername}>
                      {m.name} {m.role ? `• ${m.role}` : ''}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="── Maritime Solutions Part (8 nhân sự) ──">
                {members
                  .filter((m) => m.part === 'Maritime Solutions')
                  .map((m) => (
                    <option key={m.id} value={m.jiraUsername}>
                      {m.name} {m.role ? `• ${m.role}` : ''}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>



        {/* Role Filter */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 700,
              color: '#475569',
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            Vai Trò Lọc
          </label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as 'all' | 'assignee' | 'reporter' | 'worklog' | 'both')}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: RADII.md,
              border: '1px solid #cbd5e1',
              fontSize: TYPOGRAPHY.fontSize.sm,
              backgroundColor: '#ffffff',
              color: '#1e293b',
              fontWeight: 600,
            }}
          >
            <option value="all">Tất cả vai trò (Assignee + Worklog + Reporter)</option>
            <option value="assignee">Assignee (Người nhận task chính)</option>
            <option value="worklog">Worklog (Người ghi giờ công)</option>
            <option value="reporter">Reporter (Người tạo task)</option>
            <option value="both">Assignee + Reporter</option>
          </select>
        </div>

        {/* Kỳ review (Review Cadence: 6 tháng hoặc 1 năm) */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 700,
              color: '#1e40af',
              marginBottom: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <Layers size={16} color="#2563eb" /> Kỳ review:
          </label>
          <select
            value={reviewCadence}
            onChange={(e) => handleReviewCadenceChange(e.target.value as '6_MONTHS' | '1_YEAR')}
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: RADII.md,
              border: '2px solid #3b82f6',
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 700,
              color: '#1e40af',
              backgroundColor: '#eff6ff',
              cursor: 'pointer',
            }}
          >
            <option value="6_MONTHS">📅 6 tháng (Bán niên)</option>
            <option value="1_YEAR">🗓️ 1 năm (Cả năm)</option>
          </select>
        </div>

        {/* Ngày review (Review Date) */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 700,
              color: '#1e40af',
              marginBottom: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <Calendar size={15} color="#2563eb" /> Ngày review:
          </label>
          <input
            type="date"
            value={reviewDate}
            onChange={(e) => handleReviewDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: RADII.md,
              border: '2px solid #3b82f6',
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 700,
              color: '#0f172a',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>

      {/* Auto-calculated Date Range Pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '-6px', marginBottom: '8px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: RADII.md,
            backgroundColor: '#eff6ff',
            border: '1px dashed #60a5fa',
            color: '#1e40af',
            fontSize: TYPOGRAPHY.fontSize.xs,
            fontWeight: 600,
          }}
          title={`Hệ thống tự động quét dữ liệu ${reviewCadence === '6_MONTHS' ? '6 tháng' : '1 năm'} trước ngày review`}
        >
          <Clock size={14} color="#2563eb" />
          <span>
            Dải dữ liệu cào ({reviewCadence === '6_MONTHS' ? '6 tháng trước' : '1 năm trước'}):{' '}
            <strong style={{ color: '#1d4ed8' }}>{fromDate}</strong>
            {' → '}
            <strong style={{ color: '#1d4ed8' }}>{toDate}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!fromDate && !toDate) {
              const from = calculateFromDate(reviewDate, reviewCadence);
              setFromDate(from);
              setToDate(reviewDate);
            } else {
              setFromDate('');
              setToDate('');
            }
          }}
          style={{
            padding: '6px 14px',
            borderRadius: RADII.md,
            border: '1px solid #cbd5e1',
            backgroundColor: !fromDate && !toDate ? '#eff6ff' : '#ffffff',
            color: !fromDate && !toDate ? '#2563eb' : '#64748b',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {!fromDate && !toDate ? '✓ Đang xem toàn bộ thời gian' : '⚡ Xem toàn bộ lịch sử task'}
        </button>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Total Tasks */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: RADII.lg,
              padding: '18px 20px',
              border: '1px solid #e2e8f0',
              boxShadow: SHADOWS.sm,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
              <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, textTransform: 'uppercase' }}>
                Tổng Số Task
              </span>
              <Layers size={18} color="#0052cc" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginTop: '8px' }}>
              {summary.totalTasks}
            </div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', marginTop: '4px' }}>
              Trong khoảng thời gian lọc
            </div>
          </div>

          {/* Completed & In Progress */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: RADII.lg,
              padding: '18px 20px',
              border: '1px solid #e2e8f0',
              boxShadow: SHADOWS.sm,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
              <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, textTransform: 'uppercase' }}>
                Đã Xong / Đang Làm
              </span>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', marginTop: '8px' }}>
              {summary.completedTasks}{' '}
              <span style={{ fontSize: '16px', fontWeight: 500, color: '#64748b' }}>
                / {summary.inProgressTasks} đang làm
              </span>
            </div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', marginTop: '4px' }}>
              Trễ hạn ghi nhận: <strong style={{ color: '#ef4444' }}>{summary.delayedTasks} task</strong>
            </div>
          </div>

          {/* On-Time Rate */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: RADII.lg,
              padding: '18px 20px',
              border: '1px solid #e2e8f0',
              boxShadow: SHADOWS.sm,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
              <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, textTransform: 'uppercase' }}>
                Tỷ Lệ Đúng Hạn
              </span>
              <Clock size={18} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: summary.onTimeRate >= 90 ? '#10b981' : summary.onTimeRate >= 80 ? '#f59e0b' : '#ef4444', marginTop: '8px' }}>
              {summary.onTimeRate}%
            </div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', marginTop: '4px' }}>
              {summary.onTimeTasks}/{summary.completedTasks || summary.totalTasks} task đúng hạn
            </div>
          </div>

          {/* Total Logged Hours */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: RADII.lg,
              padding: '18px 20px',
              border: '1px solid #e2e8f0',
              boxShadow: SHADOWS.sm,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
              <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, textTransform: 'uppercase' }}>
                Tổng Giờ Worklog
              </span>
              <Calendar size={18} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6', marginTop: '8px' }}>
              {summary.totalHours}h
            </div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', marginTop: '4px' }}>
              Log thời gian qua Jira Issue
            </div>
          </div>

          {/* KPI Score /10 */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: RADII.lg,
              padding: '18px 20px',
              border: '2px solid #0052cc',
              boxShadow: SHADOWS.sm,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#0052cc' }}>
              <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 800, textTransform: 'uppercase' }}>
                Điểm KPI Quy Đổi
              </span>
              <Award size={18} color="#0052cc" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#0052cc', marginTop: '8px' }}>
              {summary.score10}{' '}
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#64748b' }}>/ 10</span>
            </div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#475569', marginTop: '4px', fontWeight: 600 }}>
              Áp dụng cho KPI #1 (Core KPI)
            </div>
          </div>

          {/* Grade & Level */}
          <div
            style={{
              background:
                summary.grade === 'S'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : summary.grade === 'A'
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : summary.grade === 'B'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              borderRadius: RADII.lg,
              padding: '18px 20px',
              color: '#ffffff',
              boxShadow: SHADOWS.sm,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, textTransform: 'uppercase' }}>
                Xếp Loại Đạt Được
              </span>
              <Sparkles size={18} />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, marginTop: '6px' }}>
              Hạng {summary.grade}
            </div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, opacity: 0.9, marginTop: '4px' }}>
              Gợi ý Mức {summary.suggestedLevel}/5 (Tỷ lệ: {summary.onTimeRate}%)
            </div>
          </div>
        </div>
      )}

      {/* ── RUBRIC EXPLANATION BOX ── */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: RADII.lg,
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '16px',
          fontSize: TYPOGRAPHY.fontSize.xs,
          color: '#475569',
        }}
      >
        <span style={{ fontWeight: 700, color: '#1e293b' }}>
          📌 Quy tắc tính điểm KPI #1 (Core KPI - Tiến độ Task Jira):
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <strong style={{ color: '#10b981' }}>Hạng S (10/10):</strong> Đúng hạn ≥ 95%
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <strong style={{ color: '#2563eb' }}>Hạng A (9/10):</strong> Đúng hạn 90% - 94%
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <strong style={{ color: '#d97706' }}>Hạng B (8/10):</strong> Đúng hạn 80% - 89%
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <strong style={{ color: '#e11d48' }}>Hạng C (7/10):</strong> Đúng hạn 70% - 79%
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <strong style={{ color: '#ef4444' }}>Hạng D (≤ 6/10):</strong> Đúng hạn &lt; 70%
        </span>
      </div>

      {/* ── TASKS TABLE SECTION ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: RADII.xl,
          border: '1px solid #e2e8f0',
          boxShadow: SHADOWS.sm,
          overflow: 'hidden',
        }}
      >
        {/* Table Header Controls */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setStatusTab('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: RADII.md,
                border: 'none',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: statusTab === 'ALL' ? '#0052cc' : '#f1f5f9',
                color: statusTab === 'ALL' ? '#ffffff' : '#475569',
              }}
            >
              Tất cả ({summary?.totalTasks || 0})
            </button>
            <button
              onClick={() => setStatusTab('ON_TIME')}
              style={{
                padding: '6px 14px',
                borderRadius: RADII.md,
                border: 'none',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: statusTab === 'ON_TIME' ? '#10b981' : '#f1f5f9',
                color: statusTab === 'ON_TIME' ? '#ffffff' : '#475569',
              }}
            >
              Đúng hạn ({summary?.onTimeTasks || 0})
            </button>
            <button
              onClick={() => setStatusTab('DELAYED')}
              style={{
                padding: '6px 14px',
                borderRadius: RADII.md,
                border: 'none',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: statusTab === 'DELAYED' ? '#ef4444' : '#f1f5f9',
                color: statusTab === 'DELAYED' ? '#ffffff' : '#475569',
              }}
            >
              Trễ hạn ({summary?.delayedTasks || 0})
            </button>
            <button
              onClick={() => setStatusTab('IN_PROGRESS')}
              style={{
                padding: '6px 14px',
                borderRadius: RADII.md,
                border: 'none',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: statusTab === 'IN_PROGRESS' ? '#3b82f6' : '#f1f5f9',
                color: statusTab === 'IN_PROGRESS' ? '#ffffff' : '#475569',
              }}
            >
              Đang làm ({summary?.inProgressTasks || 0})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search
              size={16}
              color="#94a3b8"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Tìm kiếm mã task, tiêu đề..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 34px',
                borderRadius: RADII.md,
                border: '1px solid #cbd5e1',
                fontSize: TYPOGRAPHY.fontSize.xs,
                color: '#1e293b',
              }}
            />
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto', maxHeight: '560px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
            <thead
              style={{
                backgroundColor: '#f8fafc',
                position: 'sticky',
                top: 0,
                borderBottom: '2px solid #e2e8f0',
                zIndex: 1,
              }}
            >
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '130px' }}>Mã Task</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Tiêu Đề Task</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '100px' }}>Dự Án</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '110px' }}>Loại</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '120px' }}>Trạng Thái</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '120px' }}>Đúng Hạn</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '110px' }}>Hạn Chót</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '110px' }}>Ngày Xong</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '90px' }}>Worklog</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                    <div>Đang tải danh sách task từ Jira Server...</div>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 500 }}>
                      Không tìm thấy task nào phù hợp với bộ lọc hiện tại.
                    </div>
                    {(fromDate || toDate) && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setFromDate('');
                            setToDate('');
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: RADII.md,
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            fontSize: TYPOGRAPHY.fontSize.xs,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Xóa bộ lọc ngày ({fromDate || '...'} ~ {toDate || '...'}) để xem toàn bộ task
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr
                    key={t.key}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Key with Clickable Link to Jira */}
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <a
                        href={t.jiraUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#0052cc',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Mở issue trên Jira Server"
                      >
                        {t.key}
                        <ArrowUpRight size={13} />
                      </a>
                    </td>

                    {/* Summary */}
                    <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: 500, maxWidth: '360px' }}>
                      <span
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                        title={t.title}
                      >
                        {t.title}
                      </span>
                    </td>

                    {/* Project */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: TYPOGRAPHY.fontSize.xs,
                          fontWeight: 600,
                        }}
                      >
                        {t.projectKey}
                      </span>
                    </td>

                    {/* Issue Type */}
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: TYPOGRAPHY.fontSize.xs }}>
                      {t.issueType}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: TYPOGRAPHY.fontSize.xs,
                          fontWeight: 600,
                          backgroundColor: t.isCompleted ? '#ecfdf5' : '#eff6ff',
                          color: t.isCompleted ? '#059669' : '#2563eb',
                        }}
                      >
                        {t.status}
                      </span>
                    </td>

                    {/* On-Time Status */}
                    <td style={{ padding: '12px 16px' }}>
                      {t.isOnTime ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#10b981',
                            fontWeight: 600,
                            fontSize: TYPOGRAPHY.fontSize.xs,
                          }}
                        >
                          <CheckCircle2 size={14} /> Đúng hạn
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#ef4444',
                            fontWeight: 600,
                            fontSize: TYPOGRAPHY.fontSize.xs,
                          }}
                        >
                          <AlertTriangle size={14} /> Trễ hạn
                        </span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: TYPOGRAPHY.fontSize.xs }}>
                      {t.dueDate || '—'}
                    </td>

                    {/* Resolution Date */}
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: TYPOGRAPHY.fontSize.xs }}>
                      {t.resolutionDate || '—'}
                    </td>

                    {/* Time Spent */}
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b', fontSize: TYPOGRAPHY.fontSize.xs }}>
                      {t.timeSpentHours > 0 ? `${t.timeSpentHours}h` : '0h'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default JiraCollectorPage;
