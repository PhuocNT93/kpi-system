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
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS } from '@/shared/theme';
import { EvidenceViewer } from '@/features/imports/components/EvidenceViewer';
import { fetchKpiEvidence } from '../api/reports.api';
import type { ExplainabilityViewDto } from '../types/reports.types';

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
          setError(err?.message || 'Failed to load KPI explanation & evidence.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, evaluationId, kpiCode]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(3px)',
        transition: 'all 0.3s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          backgroundColor: COLORS.neutral.white,
          boxShadow: SHADOWS.lg,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animation: 'slideIn 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${COLORS.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: COLORS.neutral[50],
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: RADII.md,
                backgroundColor: COLORS.primary[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.primary.DEFAULT,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: TYPOGRAPHY.fontSize.base,
                  fontWeight: TYPOGRAPHY.fontWeight.bold,
                  color: COLORS.neutral.textPrimary,
                }}
              >
                KPI Explainability & Lineage
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  color: COLORS.neutral.textSecondary,
                }}
              >
                {kpiCode} {kpiName ? `— ${kpiName}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              borderRadius: RADII.md,
              cursor: 'pointer',
              color: COLORS.neutral[500],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = COLORS.neutral[200])}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 0',
                gap: '12px',
                color: COLORS.neutral.textSecondary,
              }}
            >
              <Loader2 size={32} className="animate-spin" color={COLORS.primary.DEFAULT} />
              <span>Fetching KPI calculation lineage & evidence...</span>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: RADII.lg,
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertTriangle size={20} />
              <span style={{ fontSize: TYPOGRAPHY.fontSize.sm }}>{error}</span>
            </div>
          )}

          {!loading && !error && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Score & Measurement Highlight Card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  backgroundColor: COLORS.primary[50],
                  padding: '16px',
                  borderRadius: RADII.xl,
                  border: `1px solid ${COLORS.primary[100]}`,
                }}
              >
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.primary[700], fontWeight: 500 }}>
                    Final Score
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.primary[900] }}>
                    {data.score !== undefined && data.score !== null ? Number(data.score).toFixed(1) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.primary[700], fontWeight: 500 }}>
                    Raw Measurement
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.primary[900] }}>
                    {data.measurement !== undefined && data.measurement !== null ? data.measurement : '—'}
                  </div>
                </div>
              </div>

              {/* Rationale & Comment Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={16} color={COLORS.primary.DEFAULT} />
                  <h4 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                    Calculation Rationale
                  </h4>
                </div>
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: COLORS.neutral[50],
                    border: `1px solid ${COLORS.neutral[200]}`,
                    borderRadius: RADII.lg,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    color: COLORS.neutral.textPrimary,
                    lineHeight: '1.5',
                  }}
                >
                  {data.rationale || 'No automated rationale provided for this measurement.'}
                </div>

                {data.comment && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <MessageSquare size={16} color={COLORS.neutral.textSecondary} />
                      <h4 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                        Evaluator Comment
                      </h4>
                    </div>
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: COLORS.neutral[50],
                        border: `1px solid ${COLORS.neutral[200]}`,
                        borderRadius: RADII.lg,
                        fontSize: TYPOGRAPHY.fontSize.sm,
                        color: COLORS.neutral.textPrimary,
                      }}
                    >
                      {data.comment}
                    </div>
                  </div>
                )}
              </div>

              {/* Source & Import Lineage */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: COLORS.neutral[50],
                  borderRadius: RADII.xl,
                  border: `1px solid ${COLORS.neutral[200]}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={16} color={COLORS.neutral.textSecondary} />
                  <h4 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                    Data Source & Ingestion Lineage
                  </h4>
                </div>

                {data.source ? (
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <span style={{ color: COLORS.neutral.textSecondary }}>Source System:</span>{' '}
                      <strong>{data.source.sourceName || data.source.sourceType}</strong>
                    </div>
                    {data.source.sourceReference && (
                      <div>
                        <span style={{ color: COLORS.neutral.textSecondary }}>Reference:</span>{' '}
                        <code>{data.source.sourceReference}</code>
                      </div>
                    )}
                    {data.source.collectedAt && (
                      <div>
                        <span style={{ color: COLORS.neutral.textSecondary }}>Collected At:</span>{' '}
                        {new Date(data.source.collectedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    Directly entered or legacy measurement without source snapshot.
                  </div>
                )}

                {data.import && (
                  <div
                    style={{
                      borderTop: `1px solid ${COLORS.neutral[200]}`,
                      paddingTop: '8px',
                      marginTop: '4px',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: COLORS.neutral.textSecondary,
                    }}
                  >
                    Import Batch ID: <code>{data.import.id}</code> (by {data.import.createdBy})
                  </div>
                )}
              </div>

              {/* Evidence Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck2 size={16} color={COLORS.primary.DEFAULT} />
                    <h4 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                      Evidence ({data.evidences?.length || 0})
                    </h4>
                  </div>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    Append-only audit trail
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
