import React, { useEffect } from 'react';
import { useKpiDetailQuery } from '../hooks/useKpiSummary';
import { resolveLocalizedText } from '../api/kpi-summary.api';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { useReportPalette } from '../../hooks/use-report-palette';
import { X, ExternalLink, FileText, CheckCircle2, Lock, AlertCircle } from 'lucide-react';

interface KpiDetailPanelProps {
  employeeId: string;
  evaluationItemId: string | null;
  onClose: () => void;
}

export const KpiDetailPanel: React.FC<KpiDetailPanelProps> = ({
  employeeId,
  evaluationItemId,
  onClose,
}) => {
  const { t } = useUiTranslation();
  const { isDark } = useTheme();
  const palette = useReportPalette();
  const { data: detail, isLoading, isError, error } = useKpiDetailQuery(
    employeeId,
    evaluationItemId
  );

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!evaluationItemId) return null;

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: palette.textSecondary,
  };
  const statTileStyle: React.CSSProperties = {
    backgroundColor: palette.surfaceSubtle,
    border: `1px solid ${palette.border}`,
    borderRadius: '8px',
    padding: '12px 16px',
  };
  const statLabelStyle: React.CSSProperties = { fontSize: '0.75rem', color: palette.textSecondary, marginBottom: '4px' };
  const statValueStyle: React.CSSProperties = { fontSize: '1.25rem', fontWeight: 700, color: palette.textPrimary };
  const levelLabel = (level: number) => t('reports.summary.level_number', 'Level {level}', { level });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          backgroundColor: palette.surface,
          borderLeft: `1px solid ${palette.border}`,
          boxShadow: isDark ? '-4px 0 24px rgba(0,0,0,0.5)' : '-4px 0 24px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          color: palette.textPrimary,
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${palette.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            position: 'sticky',
            top: 0,
            backgroundColor: palette.surface,
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: palette.tones.neutral.bg,
                  color: palette.textSecondary,
                }}
              >
                {resolveLocalizedText(detail?.criteria.category, t('reports.summary.kpi_detail', 'KPI Detail'))}
              </span>
              {detail?.isLocked && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: palette.tones.neutral.bg,
                    color: palette.textSecondary,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Lock size={11} /> {t('reports.summary.read_only', 'Read-Only')}
                </span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: palette.textPrimary }}>
              {isLoading
                ? t('reports.summary.loading_kpi_detail', 'Loading KPI Detail...')
                : resolveLocalizedText(detail?.criteria.criterionName)}
            </h3>
            <div style={{ fontSize: '0.8rem', color: palette.textSecondary, marginTop: '2px' }}>
              {resolveLocalizedText(detail?.criteria.criterionCode)}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: palette.textSecondary,
              padding: '6px',
              borderRadius: '6px',
            }}
            aria-label={t('reports.summary.close_detail_panel', 'Close detail panel')}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', flex: 1 }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: palette.textSecondary }}>
              {t('reports.summary.loading_snapshot_details', 'Loading historical snapshot details...')}
            </div>
          )}

          {isError && (
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: isDark ? '#fca5a5' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertCircle size={20} />
              <span>
                {error instanceof Error ? error.message : t('reports.summary.load_detail_error', 'Failed to load KPI detail.')}
              </span>
            </div>
          )}

          {detail && (
            <>
              {detail.criteria.description && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ ...sectionTitleStyle, marginBottom: '6px' }}>
                    {t('reports.summary.description', 'Description')}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: palette.textPrimary }}>
                    {resolveLocalizedText(detail.criteria.description)}
                  </p>
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <div style={statTileStyle}>
                  <div style={statLabelStyle}>{t('reports.summary.weight', 'Weight')}</div>
                  <div style={statValueStyle}>{detail.scoring.weight}%</div>
                </div>

                <div style={statTileStyle}>
                  <div style={statLabelStyle}>{t('reports.summary.resolved_level', 'Resolved Level')}</div>
                  <div style={{ ...statValueStyle, color: palette.tones.info.fg }}>
                    {detail.scoring.resolvedLevel != null ? levelLabel(detail.scoring.resolvedLevel) : '—'}
                  </div>
                </div>

                <div style={statTileStyle}>
                  <div style={statLabelStyle}>{t('reports.summary.raw_score', 'Raw Score')}</div>
                  <div style={statValueStyle}>
                    {detail.scoring.rawScore != null ? detail.scoring.rawScore.toFixed(2) : '—'}
                  </div>
                </div>

                <div style={statTileStyle}>
                  <div style={statLabelStyle}>{t('reports.summary.weighted_score', 'Weighted Score')}</div>
                  <div style={{ ...statValueStyle, color: palette.tones.info.fg }}>
                    {detail.scoring.weightedScore != null ? detail.scoring.weightedScore.toFixed(2) : '—'}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ ...sectionTitleStyle, marginBottom: '8px' }}>
                  {t('reports.summary.measurement_information', 'Measurement Information')}
                </div>
                <div
                  style={{
                    backgroundColor: palette.surfaceSubtle,
                    border: `1px solid ${palette.border}`,
                    borderRadius: '8px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: palette.textSecondary }}>{t('reports.summary.recorded_value', 'Recorded Value:')}</span>
                    <span style={{ fontWeight: 600, color: palette.textPrimary }}>
                      {detail.measurement.value != null
                        ? `${resolveLocalizedText(detail.measurement.value)} ${resolveLocalizedText(detail.measurement.unit)}`
                        : t('reports.summary.not_measured', 'Not measured')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: palette.textSecondary }}>{t('reports.summary.data_source', 'Data Source:')}</span>
                    <span style={{ fontWeight: 500, color: palette.textPrimary }}>
                      {resolveLocalizedText(
                        detail.measurement.sourceLabel,
                        t('reports.summary.manual_evaluation', 'Manual evaluation')
                      )}
                    </span>
                  </div>
                  {detail.measurement.recordedAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: palette.textSecondary }}>{t('reports.summary.recorded_at', 'Recorded At:')}</span>
                      <span style={{ color: palette.textPrimary }}>
                        {new Date(detail.measurement.recordedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={sectionTitleStyle}>
                    {t('reports.summary.snapshot_level_definitions', 'Snapshot Level Definitions')}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: palette.textSecondary }}>
                    {t('reports.summary.evaluation_time_snapshot', 'Evaluation-time snapshot')}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detail.levelDefinitions.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: palette.textSecondary, fontStyle: 'italic' }}>
                      {t('reports.summary.no_level_definitions', 'No level definitions recorded in snapshot.')}
                    </div>
                  ) : (
                    detail.levelDefinitions.map((ld) => {
                      const isResolved = ld.level === detail.scoring.resolvedLevel;
                      return (
                        <div
                          key={ld.level}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: `1px solid ${isResolved ? 'var(--primary, #3b82f6)' : palette.border}`,
                            backgroundColor: isResolved ? palette.tones.info.bg : palette.surface,
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                          }}
                        >
                          <span
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: isResolved ? 'var(--primary, #3b82f6)' : palette.border,
                              color: isResolved ? '#fff' : palette.textSecondary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {ld.level}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: palette.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {resolveLocalizedText(ld.name || levelLabel(ld.level))}
                              {isResolved && (
                                <span style={{ fontSize: '0.72rem', color: palette.tones.success.fg, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <CheckCircle2 size={12} /> {t('reports.summary.resolved', 'Resolved')}
                                </span>
                              )}
                            </div>
                            {ld.description && (
                              <div style={{ fontSize: '0.8rem', color: palette.textSecondary, marginTop: '2px' }}>
                                {resolveLocalizedText(ld.description)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <div style={{ ...sectionTitleStyle, marginBottom: '8px' }}>
                  {t('reports.summary.evidence_count', 'Evidence ({count})', { count: detail.evidence.length })}
                </div>

                {detail.evidence.length === 0 ? (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: palette.surfaceSubtle,
                      color: palette.textSecondary,
                      fontSize: '0.85rem',
                      textAlign: 'center',
                    }}
                  >
                    {t('reports.summary.no_evidence', 'No evidence submitted for this criterion.')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {detail.evidence.map((ev) => (
                      <div
                        key={ev.evidenceId}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${palette.border}`,
                          backgroundColor: palette.surface,
                          fontSize: '0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: palette.tones.info.bg,
                              color: palette.tones.info.fg,
                            }}
                          >
                            {ev.evidenceType}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: palette.textSecondary }}>
                            {new Date(ev.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {ev.title && (
                          <div style={{ fontWeight: 600, color: palette.textPrimary, marginBottom: '4px' }}>
                            {resolveLocalizedText(ev.title)}
                          </div>
                        )}

                        {ev.rationale && (
                          <div style={{ fontSize: '0.8rem', color: palette.textSecondary, marginBottom: '6px', fontStyle: 'italic' }}>
                            "{resolveLocalizedText(ev.rationale)}"
                          </div>
                        )}

                        {ev.evidenceUrl && (
                          <a
                            href={ev.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: palette.tones.info.fg,
                              fontSize: '0.8rem',
                              textDecoration: 'none',
                              wordBreak: 'break-all',
                            }}
                          >
                            <ExternalLink size={13} />
                            {ev.evidenceUrl}
                          </a>
                        )}

                        {ev.fileReference && !ev.evidenceUrl && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: palette.textSecondary, fontSize: '0.8rem' }}>
                            <FileText size={13} /> {ev.fileReference}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
