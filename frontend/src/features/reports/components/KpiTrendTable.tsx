import React from 'react';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from 'lucide-react';
import type { KpiTrendResponse } from '../types/reports.types';
import { useReportPalette } from '../hooks/use-report-palette';
import { ReportEmptyState } from './ReportEmptyState';
import { useTableHeaderOffset } from '@/shared/hooks/use-table-header-offset';

interface KpiTrendTableProps {
  trends: KpiTrendResponse[];
  emptyTitle?: string;
  emptyDescription?: string;
  // Inside a hub tab: the card fills the remaining height and only the table scrolls.
  isScrollable?: boolean;
}

export const KpiTrendTable: React.FC<KpiTrendTableProps> = ({ trends, emptyTitle, emptyDescription, isScrollable = false }) => {
  const tableFrameRef = useTableHeaderOffset<HTMLDivElement>();
  const palette = useReportPalette();
  const { t } = useUiTranslation();

  const cardStyle: React.CSSProperties = {
    padding: '20px 24px',
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: RADII.lg,
    boxShadow: palette.shadow,
  };

  const heading = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexShrink: 0 }}>
      <div style={{ backgroundColor: palette.tones.primary.bg, color: palette.tones.primary.fg, padding: '8px', borderRadius: RADII.md, display: 'flex' }}>
        <TrendingUp size={20} aria-hidden="true" />
      </div>
      <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: palette.textPrimary }}>
        {t('reports.trend.title', 'Cross-cycle KPI Trend')}
      </h3>
    </div>
  );

  if (!trends || trends.length === 0) {
    return (
      <section style={isScrollable ? { ...cardStyle, flex: 1, display: 'flex', flexDirection: 'column' } : cardStyle}>
        {heading}
        {/* The empty state has no table to scroll, so it gets no minimum height of its own. */}
        <div style={isScrollable ? { flex: 1, minHeight: 0, overflowY: 'auto' } : undefined}>
          <ReportEmptyState
            isBare
            icon={<TrendingUp size={24} />}
            title={emptyTitle ?? t('reports.trend.empty', 'No KPI trend data available.')}
            description={emptyDescription}
          />
        </div>
      </section>
    );
  }

  const headerCell: React.CSSProperties = { padding: '10px 16px', fontWeight: TYPOGRAPHY.fontWeight.semibold };
  const statusStyle = (status: KpiTrendResponse['status']) => {
    if (status === 'MATCHED') return palette.tones.primary;
    if (status === 'NEW') return palette.tones.success;
    return palette.tones.neutral;
  };

  return (
    <section style={isScrollable ? { ...cardStyle, flex: 1, display: 'flex', flexDirection: 'column' } : { ...cardStyle, overflowX: 'auto' }}>
      {heading}
      <div ref={tableFrameRef} className={isScrollable ? 'table-scroll-frame' : undefined}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                borderBottom: `1px solid ${palette.border}`,
                color: palette.textMuted,
                fontSize: TYPOGRAPHY.fontSize.xs,
                textTransform: 'uppercase',
                background: palette.surfaceSubtle,
              }}
            >
              <th style={headerCell}>{t('reports.trend.col_code', 'Code')}</th>
              <th style={headerCell}>{t('reports.trend.col_name', 'KPI Name')}</th>
              <th style={headerCell}>{t('reports.trend.col_status', 'Status')}</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>{t('reports.trend.col_prev', 'Prev Score')}</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>{t('reports.trend.col_curr', 'Curr Score')}</th>
              <th style={{ ...headerCell, textAlign: 'right' }}>{t('reports.trend.col_delta', 'Delta')}</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((trend) => {
              const isRemoved = trend.status === 'REMOVED';
              const badge = statusStyle(trend.status);
              const deltaColor =
                trend.delta === undefined || trend.delta === 0
                  ? palette.textMuted
                  : trend.delta > 0
                    ? palette.tones.success.fg
                    : palette.tones.warning.fg;

              return (
                <tr
                  key={trend.kpiCode}
                  style={{
                    borderBottom: `1px solid ${palette.border}`,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    color: isRemoved ? palette.textMuted : palette.textPrimary,
                  }}
                >
                  <td style={{ padding: '14px 16px', color: palette.textMuted, fontFamily: 'monospace' }}>{trend.kpiCode}</td>
                  <td style={{ padding: '14px 16px', fontWeight: TYPOGRAPHY.fontWeight.medium }}>{trend.kpiName}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: RADII.full,
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        fontWeight: TYPOGRAPHY.fontWeight.medium,
                        backgroundColor: badge.bg,
                        color: badge.fg,
                      }}
                    >
                      {trend.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: palette.textMuted }}>
                    {trend.previousScore !== undefined ? Number(trend.previousScore).toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                    {trend.currentScore !== undefined ? Number(trend.currentScore).toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {trend.delta !== undefined ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', color: deltaColor }}>
                        {trend.delta > 0 ? <ArrowUpRight size={16} /> : trend.delta < 0 ? <ArrowDownRight size={16} /> : <Minus size={16} />}
                        <span style={{ fontWeight: TYPOGRAPHY.fontWeight.medium }}>
                          {trend.delta > 0 ? '+' : ''}
                          {Number(trend.delta).toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
