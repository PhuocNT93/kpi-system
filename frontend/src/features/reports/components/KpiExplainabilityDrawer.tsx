import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Database,
  FileCheck2,
  AlertTriangle,
  Loader2,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { RADII, TYPOGRAPHY, SHADOWS } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { EvidenceViewer } from '@/features/imports/components/EvidenceViewer';
import { fetchKpiEvidence } from '../api/reports.api';
import type { ExplainabilityViewDto } from '../types/reports.types';
import { useReportPalette } from '../hooks/use-report-palette';

interface KpiExplainabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationId: string;
  kpiCode: string;
  kpiName?: string;
}

export const KpiExplainabilityDrawer: React.FC<KpiExplainabilityDrawerProps> = ({
  isOpen,
  onClose,
  evaluationId,
  kpiCode,
  kpiName,
}) => {
  const palette = useReportPalette();
  const { t, currentLocale } = useUiTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExplainabilityViewDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !evaluationId || !kpiCode) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchKpiEvidence(evaluationId, kpiCode)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message ?? '');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, evaluationId, kpiCode]);

  if (!isOpen) return null;

  const panel: React.CSSProperties = {
    padding: '12px 14px',
    backgroundColor: palette.surfaceSubtle,
    border: `1px solid ${palette.border}`,
    borderRadius: RADII.lg,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: palette.textPrimary,
  };
  const sectionTitle: React.CSSProperties = {
    margin: 0,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: palette.textPrimary,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('reports.explain.title', 'KPI Explainability & Lineage')}
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          backgroundColor: palette.surface,
          color: palette.textPrimary,
          boxShadow: SHADOWS.lg,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animation: 'slideIn 0.25s ease-out',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${palette.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: palette.surfaceSubtle,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: RADII.md,
                backgroundColor: palette.tones.primary.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: palette.tones.primary.fg,
              }}
            >
              <Sparkles size={20} aria-hidden="true" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: palette.textPrimary }}>
                {t('reports.explain.title', 'KPI Explainability & Lineage')}
              </h3>
              <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xs, color: palette.textMuted }}>
                {kpiCode} {kpiName ? `— ${kpiName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('reports.explain.close', 'Close')}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              borderRadius: RADII.md,
              cursor: 'pointer',
              color: palette.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {loading && (
            <div
              role="status"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 0',
                gap: '12px',
                color: palette.textMuted,
              }}
            >
              <Loader2 size={32} className="animate-spin" color={palette.tones.primary.fg} />
              <span>{t('reports.explain.loading', 'Fetching KPI calculation lineage & evidence...')}</span>
            </div>
          )}

          {error !== null && (
            <div
              role="alert"
              style={{
                padding: '16px',
                backgroundColor: palette.tones.warning.bg,
                border: `1px solid ${palette.border}`,
                borderRadius: RADII.lg,
                color: palette.tones.warning.fg,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertTriangle size={20} aria-hidden="true" />
              <span style={{ fontSize: TYPOGRAPHY.fontSize.sm }}>
                {error || t('reports.explain.load_error', 'Failed to load KPI explanation & evidence.')}
              </span>
            </div>
          )}

          {!loading && error === null && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  backgroundColor: palette.tones.primary.bg,
                  padding: '16px',
                  borderRadius: RADII.lg,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: palette.tones.primary.fg, fontWeight: 500 }}>
                    {t('reports.explain.final_score', 'Final Score')}
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: palette.textPrimary }}>
                    {data.score !== undefined && data.score !== null ? Number(data.score).toFixed(1) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: palette.tones.primary.fg, fontWeight: 500 }}>
                    {t('reports.explain.raw_measurement', 'Raw Measurement')}
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: palette.textPrimary }}>
                    {data.measurement !== undefined && data.measurement !== null ? data.measurement : '—'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={16} color={palette.tones.primary.fg} aria-hidden="true" />
                  <h4 style={sectionTitle}>{t('reports.explain.rationale', 'Calculation Rationale')}</h4>
                </div>
                <div style={{ ...panel, lineHeight: 1.5 }}>
                  {data.rationale || t('reports.explain.no_rationale', 'No automated rationale provided for this measurement.')}
                </div>

                {data.comment && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <MessageSquare size={16} color={palette.textMuted} aria-hidden="true" />
                      <h4 style={sectionTitle}>{t('reports.explain.comment', 'Evaluator Comment')}</h4>
                    </div>
                    <div style={panel}>{data.comment}</div>
                  </div>
                )}
              </div>

              <div
                style={{
                  ...panel,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={16} color={palette.textMuted} aria-hidden="true" />
                  <h4 style={sectionTitle}>{t('reports.explain.lineage', 'Data Source & Ingestion Lineage')}</h4>
                </div>

                {data.source ? (
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <span style={{ color: palette.textMuted }}>{t('reports.explain.source_system', 'Source System:')}</span>{' '}
                      <strong>{data.source.sourceName || data.source.sourceType}</strong>
                    </div>
                    {data.source.sourceReference && (
                      <div>
                        <span style={{ color: palette.textMuted }}>{t('reports.explain.reference', 'Reference:')}</span>{' '}
                        <code>{data.source.sourceReference}</code>
                      </div>
                    )}
                    {data.source.collectedAt && (
                      <div>
                        <span style={{ color: palette.textMuted }}>{t('reports.explain.collected_at', 'Collected At:')}</span>{' '}
                        {new Date(data.source.collectedAt).toLocaleString(currentLocale === 'vi' ? 'vi-VN' : 'en-US')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: palette.textMuted }}>
                    {t('reports.explain.no_source', 'Directly entered or legacy measurement without source snapshot.')}
                  </div>
                )}

                {data.import && (
                  <div
                    style={{
                      borderTop: `1px solid ${palette.border}`,
                      paddingTop: '8px',
                      marginTop: '4px',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: palette.textMuted,
                    }}
                  >
                    {t('reports.explain.import_batch', 'Import Batch ID:')} <code>{data.import.id}</code>{' '}
                    {t('reports.explain.import_by', '(by {name})', { name: data.import.createdBy })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck2 size={16} color={palette.tones.primary.fg} aria-hidden="true" />
                    <h4 style={sectionTitle}>
                      {t('reports.explain.evidence', 'Evidence ({count})', { count: data.evidences?.length || 0 })}
                    </h4>
                  </div>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: palette.textMuted }}>
                    {t('reports.explain.append_only', 'Append-only audit trail')}
                  </span>
                </div>

                <EvidenceViewer evidences={data.evidences || []} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
