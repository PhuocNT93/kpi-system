import React from 'react';
import { CalendarClock, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';

export interface ReviewDueWidgetProps {
  status: 'UPCOMING' | 'OVERDUE' | 'NOT_DUE' | 'NO_SCHEDULE';
  nextReviewDueDate: string | null;
  daysUntilDue: number | null;
  reviewCadence: string | null;
  lastEvaluationCompletedAt?: string | null;
}

export const ReviewDueWidget: React.FC<ReviewDueWidgetProps> = ({
  status,
  nextReviewDueDate,
  daysUntilDue,
  reviewCadence,
  lastEvaluationCompletedAt,
}) => {
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  const getStatusBadge = () => {
    switch (status) {
      case 'OVERDUE':
        return {
          icon: <AlertCircle size={16} />,
          label: t('cadence_overdue', 'Overdue'),
          bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2',
          color: '#EF4444',
          border: '#FECACA',
        };
      case 'UPCOMING':
        return {
          icon: <Clock size={16} />,
          label: t('cadence_upcoming', 'Upcoming Due'),
          bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFFBEB',
          color: '#F59E0B',
          border: '#FDE68A',
        };
      case 'NOT_DUE':
        return {
          icon: <CheckCircle2 size={16} />,
          label: t('not_due', 'On Schedule'),
          bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5',
          color: '#10B981',
          border: '#A7F3D0',
        };
      case 'NO_SCHEDULE':
      default:
        return {
          icon: <CalendarClock size={16} />,
          label: t('no_schedule', 'No Schedule'),
          bg: isDark ? 'rgba(107, 114, 128, 0.2)' : '#F3F4F6',
          color: '#6B7280',
          border: '#E5E7EB',
        };
    }
  };

  const badge = getStatusBadge();
  const formattedDueDate = nextReviewDueDate ? new Date(nextReviewDueDate).toLocaleDateString() : 'N/A';
  const formattedLastDate = lastEvaluationCompletedAt ? new Date(lastEvaluationCompletedAt).toLocaleDateString() : 'N/A';

  return (
    <div
      role="region"
      aria-label="Review Schedule Status"
      style={{
        padding: 'clamp(16px, 2.5vw, 24px)',
        borderRadius: RADII.xl,
        backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
        border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
        boxShadow: SHADOWS.sm,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarClock size={18} color={COLORS.primary.DEFAULT} />
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
              fontFamily: TYPOGRAPHY.fontFamily.headline,
            }}
          >
            {t('review_cadence_summary', 'Review Cadence & Due Date')}
          </h3>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: RADII.full,
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: badge.bg,
            color: badge.color,
            border: `1px solid ${isDark ? 'transparent' : badge.border}`,
          }}
        >
          {badge.icon}
          {badge.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
            {t('due_date', 'Next Review Due')}
          </span>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary, marginTop: '2px' }}>
            {formattedDueDate}
          </div>
          {daysUntilDue !== null && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: daysUntilDue < 0 ? '#EF4444' : daysUntilDue <= 30 ? '#F59E0B' : '#10B981',
              }}
            >
              {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} ${t('cadence_overdue', 'days overdue')}` : `${daysUntilDue} ${t('not_due', 'days remaining')}`}
            </span>
          )}
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
            {t('review_schedule', 'Effective Cadence')}
          </span>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary, marginTop: '2px' }}>
            {reviewCadence || 'Default'}
          </div>
          <span style={{ fontSize: '0.75rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
            {t('last_cycle_score', 'Last')}: {formattedLastDate}
          </span>
        </div>
      </div>
    </div>
  );
};
