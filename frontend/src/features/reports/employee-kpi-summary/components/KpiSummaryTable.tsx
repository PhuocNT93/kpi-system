import React from 'react';
import type { KpiItem } from '../types/kpi-summary.types';
import { resolveLocalizedText } from '../api/kpi-summary.api';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { useReportPalette } from '../../hooks/use-report-palette';
import { ReportEmptyState } from '../../components/ReportEmptyState';
import { FileText, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { useTableHeaderOffset } from '@/shared/hooks/use-table-header-offset';

interface KpiSummaryTableProps {
  kpis: KpiItem[];
  selectedKpiId: string | null;
  onSelectKpi: (kpi: KpiItem) => void;
  // Inside a hub tab: the card fills the remaining height and only the table rows scroll.
  isScrollable?: boolean;
}

export const KpiSummaryTable: React.FC<KpiSummaryTableProps> = ({
  kpis,
  selectedKpiId,
  onSelectKpi,
  isScrollable = false,
}) => {
  const tableFrameRef = useTableHeaderOffset<HTMLDivElement>();
  const { t } = useUiTranslation();
  const palette = useReportPalette();

  if (kpis.length === 0) {
    return (
      <ReportEmptyState
        icon={<AlertCircle size={26} />}
        title={t('reports.summary.no_kpi_items_title', 'No KPI Items Found')}
        description={t('reports.summary.no_kpi_items_description', 'This evaluation does not contain any evaluated criteria items.')}
      />
    );
  }

  // Strictly preserve snapshot display_order ASC
  const sortedKpis = [...kpis].sort((a, b) => {
    const diff = a.displayOrder - b.displayOrder;
    if (diff !== 0) return diff;
    return a.criterionCode.localeCompare(b.criterionCode);
  });

  const selectedRowBg = palette.tones.info.bg;
  const disabledRowBg = palette.surfaceSubtle;
  const hoverRowBg = palette.tones.neutral.bg;
  const cellStyle: React.CSSProperties = { padding: '14px 16px' };
  const headerCellStyle: React.CSSProperties = { padding: '12px 16px' };
  const badgeStyle: React.CSSProperties = { fontSize: '0.75rem', padding: '3px 8px', borderRadius: '10px' };

  return (
    <div
      style={{
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: palette.shadow,
        ...(isScrollable ? { flex: 1, display: 'flex', flexDirection: 'column' } : {}),
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '16px 20px',
          borderBottom: `1px solid ${palette.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: palette.surface,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: palette.textPrimary }}>
            {t('reports.summary.kpi_items_title', 'KPI Evaluation Items')}
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: palette.textSecondary }}>
            {t(
              'reports.summary.kpi_items_description',
              'Ordered by template display sequence. Click any row to inspect historical snapshot details and evidence.'
            )}
          </p>
        </div>
        <div style={{ fontSize: '0.8rem', color: palette.textSecondary, fontWeight: 500 }}>
          {t('reports.summary.criteria_count', '{count} criteria', { count: sortedKpis.length })}
        </div>
      </div>

      <div ref={tableFrameRef} className={isScrollable ? 'table-scroll-frame' : undefined} style={isScrollable ? undefined : { overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr
              style={{
                backgroundColor: palette.surfaceSubtle,
                borderBottom: `1px solid ${palette.border}`,
                color: palette.textSecondary,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <th style={{ ...headerCellStyle, width: '40px' }}>#</th>
              <th style={headerCellStyle}>{t('reports.summary.column_criterion', 'Criterion')}</th>
              <th style={headerCellStyle}>{t('reports.summary.column_category', 'Category')}</th>
              <th style={{ ...headerCellStyle, textAlign: 'right' }}>{t('reports.summary.column_weight', 'Weight')}</th>
              <th style={headerCellStyle}>{t('reports.summary.column_measurement', 'Measurement')}</th>
              <th style={{ ...headerCellStyle, textAlign: 'center' }}>{t('reports.summary.column_level', 'Level')}</th>
              <th style={{ ...headerCellStyle, textAlign: 'right' }}>{t('reports.summary.column_raw', 'Raw')}</th>
              <th style={{ ...headerCellStyle, textAlign: 'right' }}>{t('reports.summary.column_weighted', 'Weighted')}</th>
              <th style={{ ...headerCellStyle, textAlign: 'center' }}>{t('reports.summary.column_status', 'Status')}</th>
              <th style={{ ...headerCellStyle, textAlign: 'center' }}>{t('reports.summary.column_evidence', 'Evidence')}</th>
              <th style={{ ...headerCellStyle, width: '60px', textAlign: 'center' }}>{t('reports.summary.column_action', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedKpis.map((kpi, idx) => {
              const isSelected = kpi.evaluationItemId === selectedKpiId;
              const isRowDisabled = kpi.isDisabled;
              const restingRowBg = isRowDisabled ? disabledRowBg : 'transparent';

              return (
                <tr
                  key={kpi.evaluationItemId}
                  onClick={() => onSelectKpi(kpi)}
                  style={{
                    borderBottom: `1px solid ${palette.border}`,
                    cursor: 'pointer',
                    backgroundColor: isSelected ? selectedRowBg : restingRowBg,
                    opacity: isRowDisabled ? 0.6 : 1,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = hoverRowBg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = restingRowBg;
                  }}
                >
                  <td style={{ ...cellStyle, color: palette.textSecondary, fontWeight: 600 }}>
                    {kpi.displayOrder > 0 ? kpi.displayOrder : idx + 1}
                  </td>

                  <td style={cellStyle}>
                    <div style={{ fontWeight: 600, color: palette.textPrimary }}>
                      {resolveLocalizedText(kpi.criterionName)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: palette.textSecondary, marginTop: '2px' }}>
                      {resolveLocalizedText(kpi.criterionCode)}
                    </div>
                  </td>

                  <td style={{ ...cellStyle, color: palette.textSecondary }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        backgroundColor: palette.tones.neutral.bg,
                        fontWeight: 500,
                      }}
                    >
                      {resolveLocalizedText(kpi.category)}
                    </span>
                  </td>

                  <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, color: palette.textPrimary }}>
                    {kpi.weight}%
                  </td>

                  <td style={cellStyle}>
                    {kpi.measurement.value != null ? (
                      <div>
                        <span style={{ fontWeight: 600, color: palette.textPrimary }}>
                          {resolveLocalizedText(kpi.measurement.value)}
                        </span>{' '}
                        <span style={{ fontSize: '0.8rem', color: palette.textSecondary }}>
                          {resolveLocalizedText(kpi.measurement.unit) || ''}
                        </span>
                        {kpi.measurement.sourceLabel && (
                          <div style={{ fontSize: '0.72rem', color: palette.textSecondary }}>
                            {t('reports.summary.measurement_via', 'via {source}', {
                              source: resolveLocalizedText(kpi.measurement.sourceLabel),
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: palette.textSecondary }}>—</span>
                    )}
                  </td>

                  <td style={{ ...cellStyle, textAlign: 'center' }}>
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
                      <span style={{ color: palette.textSecondary }}>—</span>
                    )}
                  </td>

                  <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 500, color: palette.textPrimary }}>
                    {kpi.rawScore != null ? kpi.rawScore.toFixed(2) : '—'}
                  </td>

                  <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: palette.tones.info.fg }}>
                    {kpi.weightedScore != null ? kpi.weightedScore.toFixed(2) : '—'}
                  </td>

                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    {kpi.isDisabled ? (
                      <span style={{ ...badgeStyle, backgroundColor: palette.tones.neutral.bg, color: palette.textSecondary, fontWeight: 500 }}>
                        {t('reports.summary.status_disabled', 'Disabled')}
                      </span>
                    ) : kpi.isCompleted ? (
                      <span
                        style={{
                          ...badgeStyle,
                          backgroundColor: palette.tones.success.bg,
                          color: palette.tones.success.fg,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 size={12} /> {t('reports.summary.status_done', 'Done')}
                      </span>
                    ) : (
                      <span style={{ ...badgeStyle, backgroundColor: palette.tones.warning.bg, color: palette.tones.warning.fg, fontWeight: 500 }}>
                        {t('reports.summary.status_pending', 'Pending')}
                      </span>
                    )}
                  </td>

                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    {kpi.hasEvidence ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: palette.tones.info.fg,
                          backgroundColor: palette.tones.info.bg,
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        <FileText size={12} />
                        {kpi.evidenceCount}
                      </span>
                    ) : (
                      <span style={{ color: palette.textSecondary, fontSize: '0.8rem' }}>0</span>
                    )}
                  </td>

                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectKpi(kpi);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: palette.tones.info.fg,
                        padding: '4px',
                      }}
                      title={t('reports.summary.inspect_detail', 'Inspect detail drill-down')}
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
