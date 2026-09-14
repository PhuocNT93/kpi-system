import React, { useState, useEffect, useMemo } from 'react';
import type { EvaluationItem } from '../domain/evaluation-models';
import { LevelSelector } from './LevelSelector';
import type { LevelItem } from './LevelSelector';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  FileText,
  Save,
  HelpCircle,
  Cpu,
  Sparkles,
  Users,
  RefreshCw,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { collectorApi } from '@/features/collector/api/collector-api';
import type { BlueprintTasksSummary, BlueprintMemberItem } from '@/features/collector/api/collector-api';

interface CriterionCardProps {
  item: EvaluationItem;
  index: number;
  resolvedLevel?: number | null;
  comment?: string;
  isDirty?: boolean;
  isEditable?: boolean;
  onLevelChange: (level: number) => void;
  onCommentChange: (comment: string) => void;
  onSaveSingle?: () => void;
  isSavingSingle?: boolean;
  mode?: 'self' | 'manager';
}

const parseCriterionName = (raw: unknown): string => {
  if (!raw) return 'Tiêu chí';
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, string>;
    return obj.vn || obj.vi || obj.en || Object.values(obj)[0] || 'Tiêu chí';
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed.vn || parsed.vi || parsed.en || Object.values(parsed)[0] || raw;
      }
    } catch {
      return raw;
    }
    return raw;
  }
  return String(raw);
};

const DEFAULT_COMPANY_LEVELS: LevelItem[] = [
  { level: 5, level_no: 5, label_vn: 'Xuất sắc (100% chỉ tiêu - Vượt kỳ vọng)', score: 10, description: 'Hoàn thành 100% chỉ tiêu với chất lượng và tiến độ vượt trội.' },
  { level: 4, level_no: 4, label_vn: 'Đạt chuẩn tốt (>= 90% chỉ tiêu)', score: 8, description: 'Hoàn thành tốt các chỉ tiêu theo đúng cam kết.' },
  { level: 3, level_no: 3, label_vn: 'Cần cải thiện (80% - 89% chỉ tiêu)', score: 6, description: 'Đạt một phần chỉ tiêu, cần nỗ lực cải thiện hơn.' },
  { level: 2, level_no: 2, label_vn: 'Chưa đạt yêu cầu (70% - 79% chỉ tiêu)', score: 5, description: 'Chưa đạt mức tiêu chuẩn quy định.' },
  { level: 1, level_no: 1, label_vn: 'Không hoàn thành (< 70% chỉ tiêu)', score: 3, description: 'Chỉ tiêu không đạt, vi phạm tiến độ hoặc kỷ luật.' },
];

export const CriterionCard: React.FC<CriterionCardProps> = ({
  item,
  index,
  resolvedLevel,
  comment = '',
  isDirty = false,
  isEditable = true,
  onSaveSingle,
  isSavingSingle = false,
  onLevelChange,
  onCommentChange,
  mode = 'self',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const isDisabled = item.is_disabled_for_employee;
  const levelSnapshot = item.level_definition_snapshot as { levels?: LevelItem[] } | LevelItem[] | null;
  const rawLevels: LevelItem[] = levelSnapshot && 'levels' in levelSnapshot && Array.isArray(levelSnapshot.levels)
    ? levelSnapshot.levels
    : Array.isArray(levelSnapshot)
    ? levelSnapshot
    : [];

  const weightNum = Number(item.weight_snapshot);
  const formattedWeight = !isNaN(weightNum)
    ? (weightNum <= 1 && weightNum > 0 ? Math.round(weightNum * 100) : weightNum)
    : 0;

  // Core KPI detection (e.g. On-time task completion / weight >= 10%)
  const isCoreKpi = Boolean(
    item.criterion_code_snapshot?.toUpperCase().includes('ON_TIME') ||
    item.criterion_code_snapshot?.toUpperCase().includes('KPI_01') ||
    item.criterion_code_snapshot?.toUpperCase().includes('TASK') ||
    item.kpi_code_snapshot?.toUpperCase().includes('KPI_01') ||
    formattedWeight >= 10
  );

  // According to company rubric:
  // Core KPI: Level 4 is 9/10 score (Grade A)
  // Standard KPI: Level 4 is 8/10 score
  const levels: LevelItem[] = useMemo(() => {
    if (rawLevels.length > 0) return rawLevels;
    if (isCoreKpi) {
      return [
        { level: 5, level_no: 5, label_vn: 'Xuất sắc (100% chỉ tiêu - Vượt kỳ vọng)', score: 10, description: 'Hoàn thành 100% chỉ tiêu với chất lượng và tiến độ vượt trội.' },
        { level: 4, level_no: 4, label_vn: 'Đạt chuẩn KPI Cốt lõi ★ (>= 90% chỉ tiêu)', score: 9, description: 'Hoàn thành tốt các chỉ tiêu cam kết của KPI cốt lõi rất quan trọng.' },
        { level: 3, level_no: 3, label_vn: 'Cần cải thiện (80% - 89% chỉ tiêu)', score: 6, description: 'Đạt một phần chỉ tiêu, cần nỗ lực cải thiện hơn.' },
        { level: 2, level_no: 2, label_vn: 'Chưa đạt yêu cầu (70% - 79% chỉ tiêu)', score: 5, description: 'Chưa đạt mức tiêu chuẩn quy định.' },
        { level: 1, level_no: 1, label_vn: 'Không hoàn thành (< 70% chỉ tiêu)', score: 3, description: 'Chỉ tiêu không đạt, vi phạm tiến độ hoặc kỷ luật.' },
      ];
    }
    return DEFAULT_COMPANY_LEVELS;
  }, [rawLevels, isCoreKpi]);

  const ruleSnapshot = item.scoring_rule_snapshot as { rule_type?: string; name?: string } | null;
  const ruleType = ruleSnapshot?.rule_type || ruleSnapshot?.name || 'Chuẩn';
  const criterionName = parseCriterionName(item.criterion_name_snapshot);

  const isCompleted = isDisabled || (resolvedLevel !== null && resolvedLevel !== undefined);

  // Task Criterion (Criterion 2 / On-time task completion)
  const isTaskCriterion = Boolean(
    item.criterion_code_snapshot?.toUpperCase().includes('ON_TIME') ||
    item.criterion_code_snapshot?.toUpperCase().includes('TASK') ||
    item.system_source?.includes('PIM') ||
    index === 1
  );

  const [memberList, setMemberList] = useState<BlueprintMemberItem[]>([
    { id: 'hieudao', name: 'Hieu Dao (hieudao)', role: 'Người đăng kí / Requester' },
    { id: 'thienvo', name: 'Thien Vo (thienvo)', role: 'Người đăng kí / Requester' },
    { id: 'diemtran', name: 'Diem Tran (diemtran)', role: 'Người đăng kí / Requester' },
    { id: 'anlt', name: 'Lê Trọng An (anlt)', role: 'Developer / Người đăng kí' },
    { id: 'khoadang', name: 'Đặng Đình Khoa (khoadang)', role: 'Developer / Người đăng kí' },
    { id: 'kyluong', name: 'Lương Đình Kỳ (kyluong)', role: 'Senior Developer / PIC' },
    { id: 'tungha', name: 'Tung Ha (tungha)', role: 'Developer / PIC' },
    { id: 'ducnguyen', name: 'Duc Nguyen (ducnguyen)', role: 'Developer / PIC' },
    { id: 'hyle', name: 'Hy Le (hyle)', role: 'Developer / PIC' },
    { id: 'ngocnb', name: 'Ngoc Nguyen Ba (ngocnb)', role: 'Developer / PIC' },
    { id: 'phuocnt', name: 'Phuoc Nguyen Thanh (phuocnt)', role: 'Developer / PIC' },
  ]);
  const [selectedMember, setSelectedMember] = useState<string>('hieudao');
  const [customMemberInput, setCustomMemberInput] = useState<string>('');
  const [memberFilterRole, setMemberFilterRole] = useState<'requester' | 'assignee' | 'both'>('requester');
  const [memberFromDate, setMemberFromDate] = useState<string>('');
  const [memberToDate, setMemberToDate] = useState<string>('');
  const [memberTasksData, setMemberTasksData] = useState<BlueprintTasksSummary | null>(null);
  const [isLoadingMemberTasks, setIsLoadingMemberTasks] = useState<boolean>(false);
  const [memberFetchError, setMemberFetchError] = useState<string | null>(null);
  const [showDelayedTasks, setShowDelayedTasks] = useState<boolean>(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isTaskCriterion) {
      collectorApi.getBlueprintMembers().then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setMemberList(res);
        }
      }).catch(() => {});
    }
  }, [isTaskCriterion]);

  const handleFetchMemberTasks = async (
    targetId?: string,
    roleOverride?: 'requester' | 'assignee' | 'both',
    fromOverride?: string,
    toOverride?: string
  ) => {
    const memberId = targetId || (selectedMember === 'custom' ? customMemberInput.trim() : selectedMember);
    if (!memberId) return;
    const roleTarget = roleOverride !== undefined ? roleOverride : memberFilterRole;
    const fromTarget = fromOverride !== undefined ? fromOverride : memberFromDate;
    const toTarget = toOverride !== undefined ? toOverride : memberToDate;

    setIsLoadingMemberTasks(true);
    setMemberFetchError(null);
    try {
      const res = await collectorApi.previewBlueprintTasks({
        projectFilter: 'Allegro NX',
        member: memberId,
        filterRole: roleTarget,
        fromDate: fromTarget,
        toDate: toTarget,
      });
      if (res && res.totalTasks !== undefined) {
        setMemberTasksData(res);
      } else {
        setMemberFetchError('Không tìm thấy dữ liệu task cho thành viên này.');
      }
    } catch (err: unknown) {
      setMemberFetchError((err as Error).message || 'Lỗi khi kết nối Blueprint UI_PIM_001.');
    } finally {
      setIsLoadingMemberTasks(false);
    }
  };

  const handleApplyMemberScore = () => {
    if (!memberTasksData) return;
    const memberInfo = memberList.find((m) => m.id === (memberTasksData.username || selectedMember));
    const displayName = memberInfo?.name || memberTasksData.username || selectedMember;
    const suggestedLvl = memberTasksData.suggestedLevel || 1;
    onLevelChange(suggestedLvl);

    const generatedComment = `[Đối soát Blueprint UI_PIM_001] Thành viên ${displayName} (@${memberTasksData.username || selectedMember}): Tiến độ hoàn thành ${memberTasksData.onTimeTasks}/${memberTasksData.totalTasks} task đúng hạn (${memberTasksData.onTimeRate}%), có ${memberTasksData.delayedTasks} task trễ hạn. Quy đổi điểm chuẩn hệ 10: ${memberTasksData.score10}/10 (Hạng ${memberTasksData.grade}, Mức ${suggestedLvl}).`;
    onCommentChange(generatedComment);
    setApplySuccessMessage(`Đã áp dụng kết quả của ${displayName} vào Đánh giá (Điểm ${memberTasksData.score10}/10 - Mức ${suggestedLvl})!`);
    setTimeout(() => setApplySuccessMessage(null), 4000);
  };

  return (
    <div
      style={{
        backgroundColor: COLORS.neutral.white,
        borderRadius: RADII.xl,
        border: `1.5px solid ${
          isDisabled
            ? COLORS.neutral[200]
            : isDirty
            ? '#f59e0b'
            : isCompleted
            ? '#10b98140'
            : COLORS.neutral[200]
        }`,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        opacity: isDisabled ? 0.75 : 1,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: isDisabled ? COLORS.neutral[100] : COLORS.neutral[50],
          borderBottom: isExpanded ? `1px solid ${COLORS.neutral[200]}` : 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: RADII.full,
              backgroundColor: isDisabled
                ? COLORS.neutral[200]
                : isCompleted
                ? '#ecfdf5'
                : COLORS.primary[100],
              color: isDisabled
                ? COLORS.neutral[500]
                : isCompleted
                ? '#047857'
                : COLORS.primary.DEFAULT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {isDisabled ? '—' : isCompleted ? <CheckCircle2 size={16} /> : index + 1}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: TYPOGRAPHY.fontSize.base, fontWeight: 600, color: COLORS.neutral.textPrimary }}>
                {criterionName}
              </span>
              <span
                style={{
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  fontWeight: 600,
                  color: COLORS.neutral[500],
                  backgroundColor: COLORS.neutral[200],
                  padding: '2px 6px',
                  borderRadius: RADII.sm,
                }}
              >
                {item.criterion_code_snapshot}
              </span>

              {isDisabled && (
                <span
                  style={{
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    color: '#b45309',
                    backgroundColor: '#fef3c7',
                    padding: '2px 8px',
                    borderRadius: RADII.md,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <AlertCircle size={12} /> Không áp dụng cho bạn
                </span>
              )}

              {isDirty && (
                <span
                  style={{
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    color: '#b45309',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    padding: '2px 6px',
                    borderRadius: RADII.sm,
                  }}
                >
                  Chưa lưu
                </span>
              )}

              {/* Status Badge */}
              {mode === 'self' ? (
                resolvedLevel !== null && resolvedLevel !== undefined ? (
                  <span
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 700,
                      color: '#047857',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: RADII.md,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle2 size={12} /> Đã tự đánh giá: Mức {resolvedLevel}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 600,
                      color: '#b45309',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      padding: '2px 8px',
                      borderRadius: RADII.md,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Chờ tự đánh giá
                  </span>
                )
              ) : (
                item.raw_score !== null && item.raw_score !== undefined && (
                  <span
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 700,
                      color: '#047857',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: RADII.md,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Điểm hệ 10: {item.raw_score}/10 {item.weighted_score !== null && item.weighted_score !== undefined ? `(+${Number(item.weighted_score).toFixed(2)}đ)` : ''}
                  </span>
                )
              )}

              {/* System benchmark badge if available */}
              {item.system_suggested_score !== undefined && item.system_suggested_score !== null && (
                <span
                  style={{
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 700,
                    color: '#4338ca',
                    backgroundColor: '#e0e7ff',
                    border: '1px solid #c7d2fe',
                    padding: '2px 8px',
                    borderRadius: RADII.md,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Cpu size={12} /> Gợi ý hệ thống: {item.system_suggested_score}/10
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, flexWrap: 'wrap' }}>
              <span>Trọng số: <strong>{formattedWeight}%</strong></span>
              <span>•</span>
              <span>Quy tắc: <strong>{ruleType}</strong></span>
              <span>•</span>
              {isCoreKpi ? (
                <span
                  style={{
                    color: '#b45309',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a',
                    padding: '1px 6px',
                    borderRadius: RADII.sm,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="KPI Cốt lõi: Hoàn thành đạt chuẩn (>= 90%) sẽ nhận 9/10 điểm"
                >
                  ⭐ KPI Cốt lõi (Core KPI - Đạt chuẩn = 9đ)
                </span>
              ) : (
                <span
                  style={{
                    color: '#475569',
                    backgroundColor: '#f1f5f9',
                    padding: '1px 6px',
                    borderRadius: RADII.sm,
                    fontWeight: 600,
                  }}
                >
                  KPI Bình thường (Đạt chuẩn = 8đ)
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isDirty && onSaveSingle && isEditable && !isDisabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSaveSingle();
              }}
              disabled={isSavingSingle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: RADII.md,
                backgroundColor: COLORS.neutral.white,
                border: `1px solid ${COLORS.neutral[300]}`,
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 600,
                color: COLORS.neutral.textPrimary,
                cursor: 'pointer',
              }}
            >
              <Save size={12} />
              {isSavingSingle ? 'Đang lưu...' : 'Lưu mục này'}
            </button>
          )}

          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: COLORS.neutral[500],
            }}
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isDisabled ? (
            <div
              style={{
                padding: '16px',
                backgroundColor: COLORS.neutral[50],
                borderRadius: RADII.lg,
                border: `1px dashed ${COLORS.neutral[300]}`,
                color: COLORS.neutral.textSecondary,
                fontSize: TYPOGRAPHY.fontSize.sm,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <HelpCircle size={18} color={COLORS.neutral[400]} />
              <span>
                Tiêu chí này đã được cấu hình không áp dụng cho chức danh/phòng ban của bạn trong kỳ đánh giá này. Bạn không cần thực hiện đánh giá mục này.
              </span>
            </div>
          ) : (
            <>
              {/* SYSTEM BENCHMARK EVIDENCE BOX */}
              {(item.system_note || item.measurement_value !== undefined || item.system_source) && (
                <div
                  style={{
                    borderRadius: RADII.xl,
                    border: '1.5px solid #cbd5e1',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#6366f1',
                          color: '#ffffff',
                        }}
                      >
                        <Cpu size={14} />
                      </span>
                      <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: '#1e293b' }}>
                        Dữ liệu đối soát tự động từ Hệ thống (System Evidence)
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: RADII.full,
                          backgroundColor: '#e0e7ff',
                          color: '#4338ca',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {item.system_source || 'Blueprint CLV'}
                      </span>
                    </div>

                    {item.system_suggested_score !== undefined && item.system_suggested_score !== null && (
                      <span
                        style={{
                          fontSize: TYPOGRAPHY.fontSize.xs,
                          fontWeight: 700,
                          color: '#047857',
                          backgroundColor: '#ecfdf5',
                          padding: '4px 10px',
                          borderRadius: RADII.md,
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        Đề xuất hệ thống: {item.system_suggested_score}/10 {item.system_suggested_level ? `(Mức ${item.system_suggested_level})` : ''}
                      </span>
                    )}
                  </div>

                  {/* Actual Measured Note */}
                  <div
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: '#334155',
                      lineHeight: 1.6,
                      backgroundColor: '#ffffff',
                      padding: '10px 14px',
                      borderRadius: RADII.md,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <strong>Ghi nhận thực tế:</strong> {item.system_note || (item.measurement_value !== undefined ? `Chỉ số đo lường đạt ${item.measurement_value}${item.measurement_unit || '%'}` : '')}
                  </div>

                  {/* Smart Action: Apply suggestion into Self Assessment */}
                  {isEditable && mode === 'self' && item.system_suggested_level && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '2px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          onLevelChange(item.system_suggested_level!);
                          const sampleComment = `Tôi xác nhận và đồng ý với dữ liệu đo lường từ ${item.system_source || 'hệ thống Blueprint'}: Đề xuất mức ${item.system_suggested_level} (${item.system_suggested_score}/10 điểm).`;
                          if (!comment || comment.trim() === '') {
                            onCommentChange(sampleComment);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: RADII.md,
                          backgroundColor: '#4f46e5',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: TYPOGRAPHY.fontSize.xs,
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4338ca')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
                      >
                        <Sparkles size={14} />
                        ✨ Áp dụng mức đề xuất này vào Tự đánh giá (Mức {item.system_suggested_level})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MANAGER MEMBER TASK INSPECTOR (FOR CRITERION 2 / TASK CRITERIA) */}
              {isTaskCriterion && (
                <div
                  style={{
                    borderRadius: RADII.xl,
                    border: '1.5px solid #93c5fd',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                        }}
                      >
                        <Users size={15} />
                      </span>
                      <div>
                        <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: '#1e3a8a' }}>
                          👥 Chế độ Quản lý / Đối soát: Kiểm tra Task & Đánh giá Thành viên trong Nhóm
                        </span>
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                          Chọn thành viên để kiểm tra trực tiếp tiến độ task đúng hạn / trễ hạn trên Blueprint UI_PIM_001
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: RADII.full,
                        backgroundColor: '#dbeafe',
                        color: '#1d4ed8',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      Blueprint UI_PIM_001 Live
                    </span>
                  </div>

                  {/* Member & Filter Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      backgroundColor: '#ffffff',
                      padding: '10px 14px',
                      borderRadius: RADII.lg,
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155' }}>
                      Thành viên:
                    </span>
                    <select
                      value={selectedMember}
                      onChange={(e) => {
                        setSelectedMember(e.target.value);
                        if (e.target.value !== 'custom') {
                          handleFetchMemberTasks(e.target.value);
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: RADII.md,
                        border: '1px solid #cbd5e1',
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        fontWeight: 600,
                        color: '#1e293b',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {memberList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.role ? `— ${m.role}` : ''}
                        </option>
                      ))}
                      <option value="custom">-- Nhập username khác --</option>
                    </select>

                    {selectedMember === 'custom' && (
                      <input
                        type="text"
                        placeholder="Nhập username..."
                        value={customMemberInput}
                        onChange={(e) => setCustomMemberInput(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: RADII.md,
                          border: '1px solid #cbd5e1',
                          fontSize: TYPOGRAPHY.fontSize.xs,
                          width: '120px',
                          outline: 'none',
                        }}
                      />
                    )}

                    {/* Role Filter */}
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#475569', marginLeft: '4px' }}>
                      Vai trò:
                    </span>
                    <select
                      value={memberFilterRole}
                      onChange={(e) => {
                        const val = e.target.value as 'requester' | 'assignee' | 'both';
                        setMemberFilterRole(val);
                        handleFetchMemberTasks(undefined, val);
                      }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: RADII.md,
                        border: '1px solid #cbd5e1',
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        fontWeight: 600,
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    >
                      <option value="requester">📌 Người đăng kí (Requester)</option>
                      <option value="assignee">👤 Người thực hiện (Assignee)</option>
                      <option value="both">🔄 Cả hai</option>
                    </select>

                    {/* Date range */}
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#15803d', display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>
                      <Calendar size={12} /> Từ:
                    </span>
                    <input
                      type="date"
                      value={memberFromDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMemberFromDate(val);
                        handleFetchMemberTasks(undefined, undefined, val, memberToDate);
                      }}
                      style={{
                        padding: '4px 6px',
                        borderRadius: RADII.sm,
                        border: '1px solid #bbf7d0',
                        fontSize: '11px',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#15803d' }}>
                      Đến:
                    </span>
                    <input
                      type="date"
                      value={memberToDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMemberToDate(val);
                        handleFetchMemberTasks(undefined, undefined, memberFromDate, val);
                      }}
                      style={{
                        padding: '4px 6px',
                        borderRadius: RADII.sm,
                        border: '1px solid #bbf7d0',
                        fontSize: '11px',
                        outline: 'none',
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleFetchMemberTasks()}
                      disabled={isLoadingMemberTasks}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: RADII.md,
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        fontWeight: 600,
                        cursor: isLoadingMemberTasks ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <RefreshCw size={13} style={{ animation: isLoadingMemberTasks ? 'spin 1s linear infinite' : 'none' }} />
                      {isLoadingMemberTasks ? 'Đang quét...' : 'Lọc Task'}
                    </button>
                  </div>

                  {memberFetchError && (
                    <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: RADII.md, color: '#dc2626', fontSize: TYPOGRAPHY.fontSize.xs }}>
                      {memberFetchError}
                    </div>
                  )}

                  {applySuccessMessage && (
                    <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: RADII.md, color: '#16a34a', fontSize: TYPOGRAPHY.fontSize.xs, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={14} /> {applySuccessMessage}
                    </div>
                  )}

                  {/* Member Tasks Metrics */}
                  {memberTasksData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '8px',
                        }}
                      >
                        <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: RADII.md, border: '1px solid #e2e8f0' }}>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>Tỉ lệ đúng hạn</span>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: memberTasksData.onTimeRate >= 90 ? '#059669' : memberTasksData.onTimeRate >= 70 ? '#d97706' : '#dc2626' }}>
                            {memberTasksData.onTimeRate}%
                          </span>
                        </div>

                        <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: RADII.md, border: '1px solid #e2e8f0' }}>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>Quy đổi Điểm hệ 10</span>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: '#4338ca' }}>
                            {memberTasksData.score10}/10 <span style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5' }}>(Hạng {memberTasksData.grade})</span>
                          </span>
                        </div>

                        <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: RADII.md, border: '1px solid #e2e8f0' }}>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>Tổng task / Đúng hạn</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                            {memberTasksData.totalTasks} task <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>({memberTasksData.onTimeTasks} đúng)</span>
                          </span>
                        </div>

                        <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: RADII.md, border: '1px solid #e2e8f0' }}>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>Task bị trễ hạn</span>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: memberTasksData.delayedTasks > 0 ? '#dc2626' : '#059669' }}>
                            {memberTasksData.delayedTasks} task
                          </span>
                        </div>
                      </div>

                      {/* Delayed Tasks Toggle & Table */}
                      {memberTasksData.delayedTasks > 0 && (
                        <div style={{ backgroundColor: '#ffffff', borderRadius: RADII.lg, border: '1px solid #fecaca', overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => setShowDelayedTasks(!showDelayedTasks)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: '#fff1f2',
                              border: 'none',
                              color: '#be123c',
                              fontSize: TYPOGRAPHY.fontSize.xs,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <AlertTriangle size={14} /> Xem danh sách {memberTasksData.delayedTasks} task trễ hạn của {memberTasksData.username}
                            </span>
                            <span>{showDelayedTasks ? 'Thu gọn ▲' : 'Mở rộng ▼'}</span>
                          </button>

                          {showDelayedTasks && (
                            <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '8px' }}>
                              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                                    <th style={{ padding: '6px 8px' }}>Mã Req</th>
                                    <th style={{ padding: '6px 8px' }}>Tên Task</th>
                                    <th style={{ padding: '6px 8px' }}>Người thực hiện</th>
                                    <th style={{ padding: '6px 8px' }}>Hạn cam kết</th>
                                    <th style={{ padding: '6px 8px' }}>Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(memberTasksData.delayedTaskList || memberTasksData.tasks.filter(t => !t.isOnTime)).slice(0, 15).map((t, idx) => (
                                    <tr key={t.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2563eb' }}>{t.seqNo || t.id}</td>
                                      <td style={{ padding: '6px 8px', color: '#1e293b' }}>{t.title}</td>
                                      <td style={{ padding: '6px 8px', color: '#4338ca', fontWeight: 500, fontSize: '10px' }}>{t.assignee || '—'}</td>
                                      <td style={{ padding: '6px 8px', color: '#be123c' }}>{t.plannedDue || 'N/A'}</td>
                                      <td style={{ padding: '6px 8px' }}>
                                        <span style={{ padding: '1px 6px', borderRadius: RADII.sm, backgroundColor: '#fef2f2', color: '#b91c1c', fontWeight: 600, fontSize: '10px' }}>
                                          Trễ hạn
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {(memberTasksData.delayedTasks > 15) && (
                                <div style={{ textAlign: 'center', padding: '6px', fontSize: '11px', color: '#64748b' }}>
                                  (Hiển thị 15/{memberTasksData.delayedTasks} task trễ hạn gần nhất)
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action to Apply Member Score */}
                      {isEditable && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '2px' }}>
                          <button
                            type="button"
                            onClick={handleApplyMemberScore}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 14px',
                              borderRadius: RADII.md,
                              backgroundColor: '#059669',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: TYPOGRAPHY.fontSize.xs,
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                            }}
                          >
                            <Sparkles size={14} />
                            🎯 Áp dụng kết quả của {memberTasksData.username} vào Đánh giá (Mức {memberTasksData.suggestedLevel} — {memberTasksData.score10}/10 điểm)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Level selection */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: 600,
                    color: COLORS.neutral.textPrimary,
                  }}
                >
                  {mode === 'manager' ? 'Chọn mức đánh giá quản lý' : 'Chọn mức độ tự đánh giá'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <LevelSelector
                  levels={levels}
                  selectedLevel={resolvedLevel}
                  onSelectLevel={onLevelChange}
                  disabled={!isEditable}
                />
              </div>

              {/* Comment & Evidence */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      fontWeight: 600,
                      color: COLORS.neutral.textPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <FileText size={16} /> {mode === 'manager' ? 'Nhận xét của quản lý' : 'Ý kiến / Giải trình tự đánh giá'}
                  </label>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral[400] }}>
                    {comment.length} ký tự
                  </span>
                </div>
                <textarea
                  disabled={!isEditable}
                  value={comment}
                  onChange={(e) => onCommentChange(e.target.value)}
                  placeholder={
                    mode === 'manager'
                      ? 'Nhập nhận xét và phản hồi cho nhân viên...'
                      : 'Nhập mô tả kết quả công việc, dẫn chứng số liệu hoặc lý do bạn chọn mức đánh giá trên (nếu có lý do khách quan cần quản lý xem xét)...'
                  }
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: RADII.lg,
                    border: `1px solid ${COLORS.neutral[300]}`,
                    backgroundColor: !isEditable ? COLORS.neutral[100] : COLORS.neutral.white,
                    fontFamily: 'inherit',
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    lineHeight: 1.5,
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
