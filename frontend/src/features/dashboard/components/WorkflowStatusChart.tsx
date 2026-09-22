import React from 'react';
import { Layers } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';
import type { WorkflowDistributionItem } from '../types/dashboard.types';

export interface WorkflowStatusChartProps {
  title?: string;
  data: WorkflowDistributionItem[];
}

export const WorkflowStatusChart: React.FC<WorkflowStatusChartProps> = ({
  title,
  data,
}) => {
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  const displayTitle = title ?? t('workflow_distribution', 'Evaluation Workflow Distribution');

  const getStatusLabel = (status: string) => {
    const fallback = status.replace(/_/g, ' ');
    return t(`status_${status.toLowerCase()}`, t(status.toLowerCase(), fallback));
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
      case 'APPROVED':
        return { bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5', color: '#10B981', border: '#A7F3D0' };
      case 'MANAGER_ASSESSMENT':
      case 'REVIEWING':
        return { bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFFBEB', color: '#F59E0B', border: '#FDE68A' };
      case 'CALIBRATION':
        return { bg: isDark ? 'rgba(139, 92, 246, 0.2)' : '#F5F3FF', color: '#8B5CF6', border: '#DDD6FE' };
      case 'SELF_ASSESSMENT':
      case 'OPEN':
        return { bg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF', color: '#3B82F6', border: '#BFDBFE' };
      case 'LOCKED':
        return { bg: isDark ? 'rgba(107, 114, 128, 0.2)' : '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
      default:
        return { bg: isDark ? 'rgba(156, 163, 175, 0.2)' : '#F9FAFB', color: '#9CA3AF', border: '#E5E7EB' };
    }
  };

  const totalCount = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div
      role="region"
      aria-label={displayTitle}
      style={{
        padding: 'clamp(16px, 2.5vw, 24px)',
        borderRadius: RADII.xl,
        backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
        border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
        boxShadow: SHADOWS.sm,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Layers size={18} color={COLORS.primary.DEFAULT} />
        <h3
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
            fontFamily: TYPOGRAPHY.fontFamily.headline,
          }}
        >
          {displayTitle}
        </h3>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '12px',
        }}
      >
        {data.map((item) => {
          const badge = getStatusBadgeStyle(item.status);
          const percent = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(0) : '0';

          return (
            <div
              key={item.status}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: RADII.lg,
                backgroundColor: badge.bg,
                border: `1px solid ${isDark ? 'transparent' : badge.border}`,
              }}
            >
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: badge.color,
                  letterSpacing: '0.04em',
                }}
              >
                {getStatusLabel(item.status)}
              </span>

              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {item.count}
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
                  }}
                >
                  {percent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
