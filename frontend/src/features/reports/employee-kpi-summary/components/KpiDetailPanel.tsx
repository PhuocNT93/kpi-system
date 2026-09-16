import React, { useEffect } from 'react';
import { useKpiDetailQuery } from '../hooks/useKpiSummary';
import { resolveLocalizedText } from '../api/kpi-summary.api';
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          backgroundColor: 'var(--bg-surface, #fff)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--bg-surface, #fff)',
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
                  backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.05))',
                  color: 'var(--text-secondary)',
                }}
              >
                {resolveLocalizedText(detail?.criteria.category, 'KPI Detail')}
              </span>
              {detail?.isLocked && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(107, 114, 128, 0.12)',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Lock size={11} /> Read-Only
                </span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isLoading ? 'Loading KPI Detail...' : resolveLocalizedText(detail?.criteria.criterionName)}
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {resolveLocalizedText(detail?.criteria.criterionCode)}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '6px',
            }}
            aria-label="Close detail panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', flex: 1 }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              Loading historical snapshot details...
            </div>
          )}

          {isError && (
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertCircle size={20} />
              <span>{error instanceof Error ? error.message : 'Failed to load KPI detail.'}</span>
            </div>
          )}

          {detail && (
            <>
              {/* Description */}
              {detail.criteria.description && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Description
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                    {resolveLocalizedText(detail.criteria.description)}
                  </p>
                </div>
              )}

              {/* Scoring & Weight Overview */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.02))',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Weight
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {detail.scoring.weight}%
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.02))',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Resolved Level
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary, #3b82f6)' }}>
                    {detail.scoring.resolvedLevel != null ? `Level ${detail.scoring.resolvedLevel}` : '—'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.02))',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Raw Score
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {detail.scoring.rawScore != null ? detail.scoring.rawScore.toFixed(2) : '—'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.02))',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Weighted Score
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary, #3b82f6)' }}>
                    {detail.scoring.weightedScore != null ? detail.scoring.weightedScore.toFixed(2) : '—'}
                  </div>
                </div>
              </div>

              {/* Measurement Section */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Measurement Information
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.02))',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Recorded Value:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {detail.measurement.value != null ? `${resolveLocalizedText(detail.measurement.value)} ${resolveLocalizedText(detail.measurement.unit)}` : 'Not measured'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Data Source:</span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {resolveLocalizedText(detail.measurement.sourceLabel, 'Manual evaluation')}
                    </span>
                  </div>
                  {detail.measurement.recordedAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Recorded At:</span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        {new Date(detail.measurement.recordedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Snapshot Level Definitions (Historical Immutability) */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Snapshot Level Definitions
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Evaluation-time snapshot
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detail.levelDefinitions.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No level definitions recorded in snapshot.
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
                            border: `1px solid ${isResolved ? 'var(--primary, #3b82f6)' : 'var(--border-subtle)'}`,
                            backgroundColor: isResolved ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface)',
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
                              backgroundColor: isResolved ? 'var(--primary, #3b82f6)' : 'var(--border-subtle)',
                              color: isResolved ? '#fff' : 'var(--text-secondary)',
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
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {resolveLocalizedText(ld.name || `Level ${ld.level}`)}
                              {isResolved && (
                                <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <CheckCircle2 size={12} /> Resolved
                                </span>
                              )}
                            </div>
                            {ld.description && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
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

              {/* Associated Evidence */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Evidence ({detail.evidence.length})
                </div>

                {detail.evidence.length === 0 ? (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.02))',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      textAlign: 'center',
                    }}
                  >
                    No evidence submitted for this criterion.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {detail.evidence.map((ev) => (
                      <div
                        key={ev.evidenceId}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-surface)',
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
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              color: 'var(--primary, #3b82f6)',
                            }}
                          >
                            {ev.evidenceType}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {new Date(ev.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {ev.title && (
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {resolveLocalizedText(ev.title)}
                          </div>
                        )}

                        {ev.rationale && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontStyle: 'italic' }}>
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
                              color: 'var(--primary, #3b82f6)',
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
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
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
