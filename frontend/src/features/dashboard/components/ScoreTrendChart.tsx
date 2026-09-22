import React from 'react';
import { TrendingUp } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';
import type { ScoreTrendItem } from '../types/dashboard.types';

export interface ScoreTrendChartProps {
  title?: string;
  data: ScoreTrendItem[];
}

export const ScoreTrendChart: React.FC<ScoreTrendChartProps> = ({
  title,
  data,
}) => {
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  const displayTitle = title ?? t('score_trend', 'Personal Historical Score Trend');

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          borderRadius: RADII.xl,
          backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
          border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
          boxShadow: SHADOWS.sm,
          textAlign: 'center',
          color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
        }}
      >
        <TrendingUp size={24} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
        <p style={{ margin: 0, fontSize: '0.875rem' }}>{t('no_trend_data', 'No historical published evaluations available yet.')}</p>
      </div>
    );
  }

  const maxScore = 5;

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <TrendingUp size={18} color={COLORS.primary.DEFAULT} />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.map((item) => {
          const barWidth = Math.min(Math.max((item.overall_score / maxScore) * 100, 0), 100);
          const formattedDate = item.published_at
            ? new Date(item.published_at).toLocaleDateString()
            : null;

          return (
            <div key={item.cycle_id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                  {item.cycle_name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {formattedDate && (
                    <span style={{ fontSize: '0.75rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
                      {formattedDate}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: COLORS.primary.DEFAULT,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {item.overall_score.toFixed(2)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  height: '10px',
                  backgroundColor: isDark ? '#374151' : COLORS.neutral[100],
                  borderRadius: RADII.full,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    backgroundColor: COLORS.primary.DEFAULT,
                    borderRadius: RADII.full,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
