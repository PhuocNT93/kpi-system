import React, { useState } from 'react';
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
} from 'lucide-react';

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
  const levels: LevelItem[] = Array.isArray(item.level_definition_snapshot?.levels)
    ? item.level_definition_snapshot.levels
    : Array.isArray(item.level_definition_snapshot)
    ? item.level_definition_snapshot
    : [];

  const ruleSnapshot = item.scoring_rule_snapshot;
  const ruleType = ruleSnapshot?.rule_type || ruleSnapshot?.name || 'Chuẩn';

  const isCompleted = isDisabled || (resolvedLevel !== null && resolvedLevel !== undefined);

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
                {item.criterion_name_snapshot}
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
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
              <span>Trọng số: <strong>{item.weight_snapshot}%</strong></span>
              <span>•</span>
              <span>Quy tắc: <strong>{ruleType}</strong></span>
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
                  placeholder={mode === 'manager'
                    ? 'Nhập nhận xét và phản hồi cho nhân viên...'
                    : 'Nhập mô tả kết quả công việc, dẫn chứng số liệu hoặc lý do bạn chọn mức đánh giá trên...'}
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
