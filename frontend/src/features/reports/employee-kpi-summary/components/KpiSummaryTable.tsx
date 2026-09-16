import React from 'react';
import type { KpiItem } from '../types/kpi-summary.types';
import { resolveLocalizedText } from '../api/kpi-summary.api';
import { FileText, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

interface KpiSummaryTableProps {
  kpis: KpiItem[];
  selectedKpiId: string | null;
  onSelectKpi: (kpi: KpiItem) => void;
}

export const KpiSummaryTable: React.FC<KpiSummaryTableProps> = ({
  kpis,
  selectedKpiId,
  onSelectKpi,
}) => {
  if (kpis.length === 0) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '36px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          marginBottom: '24px',
        }}
      >
        <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
          No KPI Items Found
        </h3>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          This evaluation does not contain any evaluated criteria items.
        </p>
      </div>
    );
  }

  // Strictly preserve snapshot display_order ASC
  const sortedKpis = [...kpis].sort((a, b) => {
    const diff = a.displayOrder - b.displayOrder;
    if (diff !== 0) return diff;
    return a.criterionCode.localeCompare(b.criterionCode);
  });

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            KPI Evaluation Items
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Ordered by template display sequence. Click any row to inspect historical snapshot details and evidence.
          </p>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {sortedKpis.length} criteria
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.02))',
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <th style={{ padding: '12px 16px', width: '40px' }}>#</th>
              <th style={{ padding: '12px 16px' }}>Criterion</th>
              <th style={{ padding: '12px 16px' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Weight</th>
              <th style={{ padding: '12px 16px' }}>Measurement</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Level</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Raw</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Weighted</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Evidence</th>
              <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedKpis.map((kpi, idx) => {
              const isSelected = kpi.evaluationItemId === selectedKpiId;
              const isRowDisabled = kpi.isDisabled;

              return (
                <tr
                  key={kpi.evaluationItemId}
                  onClick={() => onSelectKpi(kpi)}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    backgroundColor: isSelected
                      ? 'rgba(59, 130, 246, 0.08)'
                      : isRowDisabled
                      ? 'rgba(0,0,0,0.02)'
                      : 'transparent',
                    opacity: isRowDisabled ? 0.6 : 1,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(0,0,0,0.03))';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = isRowDisabled ? 'rgba(0,0,0,0.02)' : 'transparent';
                  }}
                >
                  {/* Sequence number from displayOrder */}
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {kpi.displayOrder > 0 ? kpi.displayOrder : idx + 1}
                  </td>

                  {/* Criterion Code & Name */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {resolveLocalizedText(kpi.criterionName)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {resolveLocalizedText(kpi.criterionCode)}
                    </div>
                  </td>

                  {/* Category */}
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.05))',
                        fontWeight: 500,
                      }}
                    >
                      {resolveLocalizedText(kpi.category)}
                    </span>
                  </td>

                  {/* Weight */}
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {kpi.weight}%
                  </td>

                  {/* Measurement */}
                  <td style={{ padding: '14px 16px' }}>
                    {kpi.measurement.value != null ? (
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {resolveLocalizedText(kpi.measurement.value)}
                        </span>{' '}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {resolveLocalizedText(kpi.measurement.unit) || ''}
                        </span>
                        {kpi.measurement.sourceLabel && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            via {resolveLocalizedText(kpi.measurement.sourceLabel)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </td>

                  {/* Resolved Level */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {kpi.resolvedLevel != null ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary, #3b82f6)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
                      >
                        {kpi.resolvedLevel}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </td>

                  {/* Raw Score */}
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {kpi.rawScore != null ? kpi.rawScore.toFixed(2) : '—'}
                  </td>

                  {/* Weighted Score */}
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--primary, #3b82f6)' }}>
                    {kpi.weightedScore != null ? kpi.weightedScore.toFixed(2) : '—'}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {kpi.isDisabled ? (
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '10px', backgroundColor: 'rgba(107, 114, 128, 0.12)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Disabled
                      </span>
                    ) : kpi.isCompleted ? (
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Done
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706', fontWeight: 500 }}>
                        Pending
                      </span>
                    )}
                  </td>

                  {/* Evidence indicator */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {kpi.hasEvidence ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--primary, #3b82f6)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        <FileText size={12} />
                        {kpi.evidenceCount}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>0</span>
                    )}
                  </td>

                  {/* Action */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectKpi(kpi);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--primary, #3b82f6)',
                        padding: '4px',
                      }}
                      title="Inspect detail drill-down"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
