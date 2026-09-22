import React from 'react';
import { Award, Target, CheckCircle2 } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';
import type { CriterionScoreItem, StrengthOrAreaItem } from '../types/dashboard.types';

export interface ScoreBreakdownWidgetProps {
  breakdown: CriterionScoreItem[];
  strengths: StrengthOrAreaItem[];
  developmentAreas: StrengthOrAreaItem[];
}

export const ScoreBreakdownWidget: React.FC<ScoreBreakdownWidgetProps> = ({
  breakdown,
  strengths,
  developmentAreas,
}) => {
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Strengths & Development Areas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px' }}>
        {/* Strengths */}
        <div
          role="region"
          aria-label={t('top_strengths', 'Identified Strengths')}
          style={{
            padding: 'clamp(14px, 2vw, 20px)',
            borderRadius: RADII.xl,
            backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
            border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0'}`,
            boxShadow: SHADOWS.sm,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Award size={18} color="#10B981" />
            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#10B981' }}>
              {t('top_strengths', 'Identified Strengths')}
            </h4>
          </div>
          {strengths.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
              {t('no_strengths_data', 'No score data available yet.')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {strengths.map((item) => (
                <div
                  key={item.criterion_code}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                    {item.criterion_name}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10B981' }}>
                    {item.score?.toFixed(2) ?? 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Development Areas */}
        <div
          role="region"
          aria-label="Development Areas"
          style={{
            padding: 'clamp(14px, 2vw, 20px)',
            borderRadius: RADII.xl,
            backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A'}`,
            boxShadow: SHADOWS.sm,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Target size={18} color="#F59E0B" />
            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#F59E0B' }}>
              {t('growth_areas', 'Development Focus Areas')}
            </h4>
          </div>
          {developmentAreas.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
              {t('no_strengths_data', 'No development focus identified or scores are uniform.')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {developmentAreas.map((item) => (
                <div
                  key={item.criterion_code}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB',
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                    {item.criterion_name}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F59E0B' }}>
                    {item.score?.toFixed(2) ?? 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Criteria Breakdown Table */}
      <div
        role="region"
        aria-label={t('score_breakdown', 'Criteria Breakdown')}
        style={{
          padding: 'clamp(16px, 2.5vw, 24px)',
          borderRadius: RADII.xl,
          backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
          border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
          boxShadow: SHADOWS.sm,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <CheckCircle2 size={18} color={COLORS.primary.DEFAULT} />
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
              fontFamily: TYPOGRAPHY.fontFamily.headline,
            }}
          >
            {t('score_breakdown', 'Criterion Score Breakdown')}
          </h3>
        </div>

        {breakdown.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
            {t('empty_dashboard_desc', 'No criteria details found for the current evaluation period.')}
          </p>
        ) : (
          <div className="table-responsive-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}` }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>{t('criterion', 'Criterion')}</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>{t('category', 'Category')}</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary, textAlign: 'right' }}>{t('weight', 'Weight')}</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary, textAlign: 'right' }}>{t('raw_score', 'Raw Score')}</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary, textAlign: 'right' }}>{t('weighted_score', 'Weighted Score')}</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr
                    key={row.criterion_code}
                    style={{ borderBottom: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : COLORS.neutral[100]}` }}
                  >
                    <td style={{ padding: '12px', fontWeight: 500, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                      {row.criterion_name}
                    </td>
                    <td style={{ padding: '12px', color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary }}>
                      {row.category}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: isDark ? '#D1D5DB' : COLORS.neutral.textPrimary }}>
                      {row.weight}%
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary }}>
                      {row.raw_score != null ? row.raw_score.toFixed(2) : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: COLORS.primary.DEFAULT }}>
                      {row.weighted_score != null ? row.weighted_score.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
