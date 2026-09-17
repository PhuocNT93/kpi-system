import React, { useState } from 'react';
import type { EvaluationItem, ScoringKpiResult } from '../domain/evaluation-models';
import { CriterionCard } from './CriterionCard';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import {
  ChevronDown,
  ChevronUp,
  Target,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Award,
} from 'lucide-react';

export interface KpiGroup {
  kpiId: string;
  kpiCode: string;
  kpiName: string;
  kpiWeight: number;
  scoringResult?: ScoringKpiResult;
  items: EvaluationItem[];
  manualOverrideScore?: number | null;
  overrideReason?: string | null;
}

interface KpiEvaluationCardProps {
  kpiGroup: KpiGroup;
  index: number;
  draftItems: Record<string, { resolved_level?: number | null; comment?: string; isDirty?: boolean }>;
  isEditable: boolean;
  savingItemId: string | null;
  mode: 'self' | 'manager';
  canOverride?: boolean;
  onLevelChange: (itemId: string, level: number) => void;
  onCommentChange: (itemId: string, comment: string) => void;
  onSaveSingle: (itemId: string) => void;
  onOverrideKpi?: (kpiId: string) => void;
}

export const KpiEvaluationCard: React.FC<KpiEvaluationCardProps> = ({
  kpiGroup,
  index,
  draftItems,
  isEditable,
  savingItemId,
  mode,
  canOverride = false,
  onLevelChange,
  onCommentChange,
  onSaveSingle,
  onOverrideKpi,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const activeItems = kpiGroup.items.filter((item) => !item.is_disabled_for_employee);
  const completedItems = activeItems.filter((item) => {
    const draft = draftItems[item.evaluation_item_id];
    const level = draft?.resolved_level !== undefined ? draft.resolved_level : item.resolved_level;
    const hasRawScore = item.raw_score !== null && item.raw_score !== undefined;
    const hasOverride = item.manual_override_score !== null && item.manual_override_score !== undefined;
    return !item.is_missing_score && (level !== null && level !== undefined || hasRawScore || hasOverride);
  });

  const isAllCompleted = activeItems.length > 0 && completedItems.length === activeItems.length;
  const progressPercent = activeItems.length > 0 ? Math.round((completedItems.length / activeItems.length) * 100) : 100;

  // Calculate total weight of this KPI from items if kpiWeight is not set
  const totalItemWeight = kpiGroup.items.reduce((sum, item) => {
    const w = Number(item.weight_snapshot);
    if (isNaN(w)) return sum;
    const normalizedW = w <= 1 && w > 0 ? Math.round(w * 100) : w;
    return sum + normalizedW;
  }, 0);

  const displayWeight = kpiGroup.kpiWeight > 0 ? kpiGroup.kpiWeight : totalItemWeight;

  return (
    <article
      style={{
        backgroundColor: COLORS.neutral.white,
        borderRadius: RADII.xl,
        border: `1.5px solid ${isAllCompleted ? '#e2e8f0' : '#fed7aa'}`,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* KPI Header Banner */}
      <div
        style={{
          padding: '18px 24px',
          backgroundColor: isExpanded ? '#f8fafc' : COLORS.neutral.white,
          borderBottom: isExpanded ? `1px solid ${COLORS.neutral[200]}` : 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Left: KPI Title, Code, Weight */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: RADII.lg,
                backgroundColor: isAllCompleted ? '#eff6ff' : '#fff7ed',
                color: isAllCompleted ? '#2563eb' : '#ea580c',
                flexShrink: 0,
                border: `1px solid ${isAllCompleted ? '#bfdbfe' : '#ffedd5'}`,
              }}
            >
              <Target size={20} />
            </span>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '2px 8px',
                    borderRadius: RADII.sm,
                    backgroundColor: '#e2e8f0',
                    color: '#334155',
                  }}
                >
                  KPI #{index + 1} &bull; {kpiGroup.kpiCode}
                </span>

                {displayWeight > 0 && (
                  <span
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: RADII.sm,
                      backgroundColor: '#ede9fe',
                      color: '#6d28d9',
                    }}
                  >
                    Trọng số: {displayWeight}%
                  </span>
                )}

                {kpiGroup.manualOverrideScore !== null && kpiGroup.manualOverrideScore !== undefined && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: RADII.sm,
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                    }}
                  >
                    <Sliders size={12} />
                    Đã hiệu chỉnh: {kpiGroup.manualOverrideScore}%
                  </span>
                )}
              </div>

              <h3
                style={{
                  margin: '4px 0 0',
                  fontSize: TYPOGRAPHY.fontSize.base,
                  fontWeight: TYPOGRAPHY.fontWeight.bold,
                  color: COLORS.neutral.textPrimary,
                }}
              >
                {kpiGroup.kpiName}
              </h3>
            </div>
          </div>

          {/* Right: Progress, Score & Expand Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
            {/* Completion badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: RADII.md,
                backgroundColor: isAllCompleted ? '#f0fdf4' : '#fff7ed',
                color: isAllCompleted ? '#15803d' : '#c2410c',
                border: `1px solid ${isAllCompleted ? '#bbf7d0' : '#fed7aa'}`,
              }}
            >
              {isAllCompleted ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {completedItems.length}/{activeItems.length} tiêu chí
            </span>

            {/* Calculated Score if available */}
            {kpiGroup.scoringResult && kpiGroup.scoringResult.normalized_score !== null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: RADII.md,
                  backgroundColor: '#f0f9ff',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                }}
              >
                <Award size={14} />
                Điểm KPI: {kpiGroup.scoringResult.normalized_score}
              </span>
            )}

            {/* HR Override Button */}
            {canOverride && onOverrideKpi && (
              <button
                type="button"
                onClick={() => onOverrideKpi(kpiGroup.items[0]?.evaluation_item_id || kpiGroup.kpiId)}
                style={{
                  padding: '5px 10px',
                  borderRadius: RADII.md,
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sliders size={13} />
                Hiệu chỉnh KPI
              </button>
            )}

            {/* Expand / Collapse Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Thu gọn thẻ KPI' : 'Mở rộng thẻ KPI'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: RADII.md,
                backgroundColor: COLORS.neutral.white,
                color: COLORS.neutral.textSecondary,
                border: `1px solid ${COLORS.neutral[300]}`,
                cursor: 'pointer',
              }}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Mini progress bar */}
        <div
          style={{
            height: '4px',
            borderRadius: '2px',
            backgroundColor: '#e2e8f0',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: isAllCompleted ? '#22c55e' : '#f97316',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* KPI Body: Child Criteria Cards */}
      {isExpanded && (
        <div
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#fafafa',
          }}
        >
          {kpiGroup.items.map((item, itemIdx) => {
            const draft = draftItems[item.evaluation_item_id];
            return (
              <CriterionCard
                key={item.evaluation_item_id}
                item={item}
                index={itemIdx}
                resolvedLevel={draft?.resolved_level}
                comment={draft?.comment}
                isDirty={draft?.isDirty}
                isEditable={isEditable}
                onLevelChange={(lvl) => onLevelChange(item.evaluation_item_id, lvl)}
                onCommentChange={(cmt) => onCommentChange(item.evaluation_item_id, cmt)}
                onSaveSingle={() => onSaveSingle(item.evaluation_item_id)}
                isSavingSingle={savingItemId === item.evaluation_item_id}
                mode={mode}
              />
            );
          })}
        </div>
      )}
    </article>
  );
};
