import React from 'react';
import { PieChart } from 'lucide-react';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { useReportPalette } from '../hooks/use-report-palette';
import { toScoreDistributionBins } from '../domain/score-distribution';
import { ReportEmptyState } from './ReportEmptyState';

interface ScoreDistributionBarsProps {
  distribution: unknown;
}

export const ScoreDistributionBars: React.FC<ScoreDistributionBarsProps> = ({ distribution }) => {
  const palette = useReportPalette();
  const { t } = useUiTranslation();
  const bins = toScoreDistributionBins(distribution);
  const title = t('reports.org.distribution_title', 'Score Distribution');

  return (
    <section
      aria-label={title}
      style={{
        padding: '20px 24px',
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: RADII.lg,
        boxShadow: palette.shadow,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: palette.tones.primary.bg, color: palette.tones.primary.fg, padding: '8px', borderRadius: RADII.md, display: 'flex' }}>
          <PieChart size={20} aria-hidden="true" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: palette.textPrimary }}>
            {title}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: palette.textMuted }}>
            {t('reports.org.distribution_hint', 'Aggregate counts only — no individual ranking.')}
          </p>
        </div>
      </div>

      {bins.length === 0 ? (
        <ReportEmptyState
          isBare
          icon={<PieChart size={24} />}
          title={t('reports.org.distribution_empty', 'No score distribution data available for this cycle yet.')}
          description={t('reports.common.no_score_hint', 'Scores appear once evaluations are completed.')}
        />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bins.map((bin) => (
            <li
              key={bin.label}
              style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 140px) 1fr auto', alignItems: 'center', gap: '12px' }}
            >
              <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: palette.textSecondary, fontWeight: 500 }}>{bin.label}</span>
              <span
                aria-hidden="true"
                style={{ height: '10px', borderRadius: RADII.full, background: palette.surfaceMuted, overflow: 'hidden' }}
              >
                <span
                  style={{
                    display: 'block',
                    height: '100%',
                    width: `${Math.min(100, bin.percentage)}%`,
                    background: palette.tones.primary.fg,
                    borderRadius: RADII.full,
                  }}
                />
              </span>
              <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: palette.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                {t('reports.org.distribution_value', '{count} ({percentage}%)', {
                  count: bin.count,
                  percentage: bin.percentage.toFixed(1),
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
