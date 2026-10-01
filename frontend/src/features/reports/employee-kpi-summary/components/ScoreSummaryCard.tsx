import React from 'react';
import type { ScoreSummary } from '../types/kpi-summary.types';
import { resolveLocalizedText } from '../api/kpi-summary.api';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { useReportPalette } from '../../hooks/use-report-palette';
import { Award, CheckCircle2, TrendingUp, HelpCircle } from 'lucide-react';

interface ScoreSummaryCardProps {
  scoreSummary: ScoreSummary;
}

const OFFICIAL_SCORE_TOKEN = '{official_score}';

export const ScoreSummaryCard: React.FC<ScoreSummaryCardProps> = ({ scoreSummary }) => {
  const { t } = useUiTranslation();
  const palette = useReportPalette();
  const completionPercentage = scoreSummary.kpiCount > 0
    ? Math.round((scoreSummary.completedCount / scoreSummary.kpiCount) * 100)
    : 0;

  const officialScoreText = t('reports.summary.official_score', 'Official Score');
  // The token is left unreplaced so the bolded term can sit anywhere in the translated sentence.
  const semanticsParts = t(
    'reports.summary.score_semantics_description',
    'The {official_score} is the authoritative result determined by the evaluation lifecycle/calibration. It is distinct from the unweighted arithmetic average.'
  ).split(OFFICIAL_SCORE_TOKEN);

  const secondaryCardStyle: React.CSSProperties = {
    backgroundColor: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: palette.shadow,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };
  const cardLabelStyle: React.CSSProperties = {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: palette.textSecondary,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  };
  const cardValueStyle: React.CSSProperties = { fontSize: '2rem', fontWeight: 700, color: palette.textPrimary, lineHeight: 1 };
  const cardFootnoteStyle: React.CSSProperties = { marginTop: '12px', fontSize: '0.78rem', color: palette.textSecondary };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          color: palette.textSecondary,
          marginBottom: '10px',
        }}
      >
        <HelpCircle size={14} />
        <span>
          <strong>{t('reports.summary.score_semantics_label', 'Score Semantics:')}</strong>{' '}
          {semanticsParts.map((part, index) => (
            <React.Fragment key={index}>
              {index > 0 && <strong>{officialScoreText}</strong>}
              {part}
            </React.Fragment>
          ))}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            backgroundColor: palette.surface,
            border: '2px solid var(--primary, #3b82f6)',
            borderRadius: '12px',
            padding: '20px 22px',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '4px',
              height: '100%',
              backgroundColor: 'var(--primary, #3b82f6)',
            }}
          />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: palette.tones.info.fg,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Award size={18} />
                {officialScoreText}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: palette.tones.info.bg,
                  color: palette.tones.info.fg,
                  fontWeight: 600,
                }}
              >
                {t('reports.summary.authoritative', 'Authoritative')}
              </span>
            </div>

            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: palette.textPrimary, lineHeight: 1 }}>
              {scoreSummary.officialScore != null ? scoreSummary.officialScore.toFixed(2) : '—'}
            </div>
          </div>

          <div style={cardFootnoteStyle}>
            {resolveLocalizedText(scoreSummary.officialScoreLabel, officialScoreText)}
          </div>
        </div>

        <div style={secondaryCardStyle}>
          <div>
            <div style={cardLabelStyle}>
              <TrendingUp size={16} />
              {t('reports.summary.overall_weighted_score', 'Overall Weighted Score')}
            </div>
            <div style={cardValueStyle}>
              {scoreSummary.overallWeightedScore != null ? scoreSummary.overallWeightedScore.toFixed(2) : '—'}
            </div>
          </div>
          <div style={cardFootnoteStyle}>
            {t('reports.summary.overall_weighted_score_hint', 'Sum of weighted criteria scores')}
          </div>
        </div>

        <div style={secondaryCardStyle}>
          <div>
            <div style={cardLabelStyle}>
              <TrendingUp size={16} />
              {t('reports.summary.overall_raw_score', 'Overall Score (Raw Average)')}
            </div>
            <div style={cardValueStyle}>
              {scoreSummary.overallScore != null ? scoreSummary.overallScore.toFixed(2) : '—'}
            </div>
          </div>
          <div style={cardFootnoteStyle}>
            {t('reports.summary.overall_raw_score_hint', 'Unweighted average across criteria')}
          </div>
        </div>

        <div style={secondaryCardStyle}>
          <div>
            <div style={cardLabelStyle}>
              <CheckCircle2 size={16} />
              {t('reports.summary.completion_progress', 'Completion Progress')}
            </div>
            <div style={cardValueStyle}>
              {scoreSummary.completedCount}{' '}
              <span style={{ fontSize: '1.1rem', fontWeight: 500, color: palette.textSecondary }}>
                {t('reports.summary.kpi_total', '/ {count} KPIs', { count: scoreSummary.kpiCount })}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: palette.textSecondary, marginBottom: '4px' }}>
              <span>{t('reports.summary.completion_rate', 'Completion Rate')}</span>
              <span style={{ fontWeight: 600, color: palette.textPrimary }}>{completionPercentage}%</span>
            </div>
            <div
              style={{
                height: '6px',
                width: '100%',
                backgroundColor: palette.border,
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${completionPercentage}%`,
                  backgroundColor: completionPercentage === 100 ? '#10b981' : 'var(--primary, #3b82f6)',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
