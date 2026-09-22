import React from 'react';
import { BarChart3 } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';
import type { ScoreDistributionBucket } from '../types/dashboard.types';

export interface ScoreDistributionChartProps {
  title?: string;
  subtitle?: string;
  data: ScoreDistributionBucket[];
}

export const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({
  title,
  subtitle,
  data,
}) => {
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  const displayTitle = title ?? t('score_distribution', 'Score Distribution');
  const displaySubtitle = subtitle ?? t('distribution_anonymous_note', 'Aggregate distribution across score ranges (strictly anonymous aggregate)');

  const maxCount = Math.max(...data.map((d) => d.count), 1);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <BarChart3 size={18} color={COLORS.primary.DEFAULT} />
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
      <p
        style={{
          margin: '0 0 20px 0',
          fontSize: '0.8125rem',
          color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
        }}
      >
        {displaySubtitle}
      </p>

      {/* Accessible Screen Reader Table Summary */}
      <div
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        <table>
          <caption>Score distribution by range</caption>
          <thead>
            <tr>
              <th>Range</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {data.map((bucket) => (
              <tr key={bucket.range}>
                <td>{bucket.range}</td>
                <td>{bucket.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual Histogram Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {data.map((bucket) => {
          const barPercent = Math.round((bucket.count / maxCount) * 100);
          const sharePercent = totalCount > 0 ? ((bucket.count / totalCount) * 100).toFixed(1) : '0';

          return (
            <div key={bucket.range} style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.5vw, 12px)' }}>
              <div
                style={{
                  width: 'clamp(55px, 16vw, 75px)',
                  fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)',
                  fontWeight: 500,
                  color: isDark ? '#D1D5DB' : COLORS.neutral.textPrimary,
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                {bucket.range}
              </div>

              <div
                style={{
                  flex: 1,
                  height: '24px',
                  backgroundColor: isDark ? '#374151' : COLORS.neutral[100],
                  borderRadius: RADII.md,
                  overflow: 'hidden',
                  position: 'relative',
                  minWidth: '60px',
                }}
              >
                <div
                  style={{
                    width: `${barPercent}%`,
                    height: '100%',
                    backgroundColor: COLORS.primary.DEFAULT,
                    borderRadius: RADII.md,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div
                style={{
                  width: 'clamp(55px, 16vw, 80px)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'baseline',
                  gap: '4px',
                  fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                  {bucket.count}
                </span>
                <span style={{ fontSize: '0.75rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
                  ({sharePercent}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
