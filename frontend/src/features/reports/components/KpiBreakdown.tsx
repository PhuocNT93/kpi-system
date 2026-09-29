import React, { useState } from 'react';
import { TYPOGRAPHY, RADII } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { Target, FileCheck, MessageSquare, Sparkles } from 'lucide-react';
import type { EmployeeKpiScore, TeamKpiAggregate } from '../types/reports.types';
import { useReportPalette } from '../hooks/use-report-palette';
import { KpiExplainabilityDrawer } from './KpiExplainabilityDrawer';
import { ReportEmptyState } from './ReportEmptyState';

interface KpiBreakdownProps {
  kpis: (EmployeeKpiScore | TeamKpiAggregate)[];
  title?: string;
  // Inside a hub tab: the card fills the remaining height and only the KPI list scrolls.
  isScrollable?: boolean;
}

export const KpiBreakdown: React.FC<KpiBreakdownProps> = ({ kpis, title, isScrollable = false }) => {
  const palette = useReportPalette();
  const { t } = useUiTranslation();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<{
    evaluationId: string;
    kpiCode: string;
    kpiName: string;
  } | null>(null);

  const resolvedTitle = title ?? t('reports.kpi.title', 'KPI Breakdown');
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
        <Target size={20} aria-hidden="true" />
      </div>
      <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: palette.textPrimary }}>
        {resolvedTitle}
      </h3>
    </div>
  );

  if (!kpis || kpis.length === 0) {
    return (
      <section style={isScrollable ? { ...cardStyle, flex: 1, display: 'flex', flexDirection: 'column' } : cardStyle}>
        {heading}
        {/* The empty state has no table to scroll, so it gets no minimum height of its own. */}
        <div style={isScrollable ? { flex: 1, minHeight: 0, overflowY: 'auto' } : undefined}>
          <ReportEmptyState isBare icon={<Target size={24} />} title={t('reports.kpi.empty', 'No KPI data available for this report.')} />
        </div>
      </section>
    );
  }

  return (
    <>
      <section style={isScrollable ? { ...cardStyle, flex: 1, display: 'flex', flexDirection: 'column' } : cardStyle}>
        {heading}
        <div className={isScrollable ? 'table-scroll-frame' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {kpis.map((kpi, idx) => {
            const kpiCode = 'criterionCode' in kpi ? kpi.criterionCode : 'Unknown';
            const kpiName = 'criterionName' in kpi ? kpi.criterionName : 'Unknown';
            const score = 'kpiScore' in kpi ? kpi.kpiScore : ('kpiWeightedScore' in kpi ? kpi.kpiWeightedScore : null);
            const rawScore = 'rawScore' in kpi ? kpi.rawScore : null;
            const displayScore = score ?? rawScore ?? 0;

            const isEmployeeKpi = 'evaluationId' in kpi;
            const evaluationId = isEmployeeKpi ? (kpi as EmployeeKpiScore).evaluationId : undefined;
            const hasEvidence = isEmployeeKpi ? (kpi as EmployeeKpiScore).hasEvidence : false;
            const evidenceCount = isEmployeeKpi ? (kpi as EmployeeKpiScore).evidenceCount ?? 0 : 0;
            const comment = isEmployeeKpi ? (kpi as EmployeeKpiScore).comment : null;
            const rowKey = kpi.id || String(idx);

            return (
              <div
                key={rowKey}
                onMouseEnter={() => setHoveredKey(rowKey)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 16px',
                  backgroundColor: hoveredKey === rowKey ? palette.surfaceMuted : palette.surfaceSubtle,
                  borderRadius: RADII.md,
                  border: `1px solid ${palette.border}`,
                  transition: 'background-color 150ms ease',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: palette.textMuted, fontWeight: TYPOGRAPHY.fontWeight.medium }}>
                      {kpiCode}
                    </span>

                    {hasEvidence && (
                      <span
                        title={t('reports.kpi.evidence_count', '{count} evidence items attached', { count: evidenceCount })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          padding: '1px 6px',
                          borderRadius: RADII.full,
                          backgroundColor: palette.tones.primary.bg,
                          color: palette.tones.primary.fg,
                          fontWeight: TYPOGRAPHY.fontWeight.medium,
                        }}
                      >
                        <FileCheck size={11} aria-hidden="true" />
                        {evidenceCount > 0 ? evidenceCount : t('reports.kpi.evidence', 'Evidence')}
                      </span>
                    )}

                    {comment && (
                      <span
                        title={t('reports.kpi.has_comment', 'Has comment')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          padding: '1px 6px',
                          borderRadius: RADII.full,
                          backgroundColor: palette.tones.neutral.bg,
                          color: palette.textSecondary,
                          fontWeight: TYPOGRAPHY.fontWeight.medium,
                        }}
                      >
                        <MessageSquare size={11} aria-hidden="true" />
                        {t('reports.kpi.note', 'Note')}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.medium, color: palette.textPrimary }}>
                    {kpiName}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, color: palette.tones.primary.fg }}>
                      {Number(displayScore).toFixed(1)}
                    </span>
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: palette.textMuted }}>
                      {t('reports.kpi.points', 'pts')}
                    </span>
                  </div>

                  {evaluationId && (
                    <button
                      type="button"
                      onClick={() => setSelectedKpi({ evaluationId, kpiCode, kpiName })}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: RADII.md,
                        backgroundColor: palette.surface,
                        border: `1px solid ${palette.borderStrong}`,
                        color: palette.textSecondary,
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        fontWeight: TYPOGRAPHY.fontWeight.medium,
                        cursor: 'pointer',
                      }}
                    >
                      <Sparkles size={13} aria-hidden="true" />
                      {t('reports.kpi.explain', 'Explain')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedKpi && (
        <KpiExplainabilityDrawer
          isOpen={Boolean(selectedKpi)}
          onClose={() => setSelectedKpi(null)}
          evaluationId={selectedKpi.evaluationId}
          kpiCode={selectedKpi.kpiCode}
          kpiName={selectedKpi.kpiName}
        />
      )}
    </>
  );
};
