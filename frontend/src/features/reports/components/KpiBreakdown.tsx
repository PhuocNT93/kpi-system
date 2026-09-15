import React, { useState } from 'react';
import { Card } from '@/shared/components/Card';
import { TYPOGRAPHY, RADII, SHADOWS } from '@/shared/theme';
import { COLORS } from '@/lib/theme';
import { Target, FileCheck, MessageSquare, Sparkles } from 'lucide-react';
import type { EmployeeKpiScore, TeamKpiAggregate } from '../types/reports.types';
import { KpiExplainabilityDrawer } from './KpiExplainabilityDrawer';

interface KpiBreakdownProps {
  kpis: (EmployeeKpiScore | TeamKpiAggregate)[];
  title?: string;
}

export const KpiBreakdown: React.FC<KpiBreakdownProps> = ({ kpis, title = 'KPI Breakdown' }) => {
  const [selectedKpi, setSelectedKpi] = useState<{
    evaluationId: string;
    kpiCode: string;
    kpiName: string;
  } | null>(null);

  if (!kpis || kpis.length === 0) {
    return (
      <Card style={{ padding: '32px', textAlign: 'center', color: COLORS.neutral.textSecondary }}>
        <Target size={48} color={COLORS.neutral[300]} style={{ margin: '0 auto 16px' }} />
        <p>No KPI data available for this report.</p>
      </Card>
    );
  }

  return (
    <>
      <Card
        style={{
          padding: '24px',
          boxShadow: SHADOWS.sm,
          border: `1px solid ${COLORS.neutral[200]}`,
          borderRadius: RADII.xl,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: COLORS.primary[100], padding: '8px', borderRadius: RADII.md }}>
            <Target size={20} color={COLORS.primary[600]} />
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: TYPOGRAPHY.fontSize.lg,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
            }}
          >
            {title}
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

            return (
              <div
                key={kpi.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: COLORS.neutral[50],
                  borderRadius: RADII.md,
                  border: `1px solid ${COLORS.neutral[200]}`,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = COLORS.neutral[100])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = COLORS.neutral[50])}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        color: COLORS.neutral.textSecondary,
                        fontWeight: TYPOGRAPHY.fontWeight.medium,
                      }}
                    >
                      {kpiCode}
                    </span>

                    {/* Evidence Indicator Badge */}
                    {hasEvidence && (
                      <span
                        title={`${evidenceCount} evidence items attached`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          padding: '1px 6px',
                          borderRadius: RADII.full,
                          backgroundColor: COLORS.primary[100],
                          color: COLORS.primary[700],
                          fontWeight: TYPOGRAPHY.fontWeight.medium,
                        }}
                      >
                        <FileCheck size={11} />
                        {evidenceCount > 0 ? evidenceCount : 'Evidence'}
                      </span>
                    )}

                    {/* Comment indicator badge */}
                    {comment && (
                      <span
                        title="Has comment"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          padding: '1px 6px',
                          borderRadius: RADII.full,
                          backgroundColor: COLORS.neutral[200],
                          color: COLORS.neutral[700],
                          fontWeight: TYPOGRAPHY.fontWeight.medium,
                        }}
                      >
                        <MessageSquare size={11} />
                        Note
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      fontWeight: TYPOGRAPHY.fontWeight.medium,
                      color: COLORS.neutral.textPrimary,
                    }}
                  >
                    {kpiName}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span
                      style={{
                        fontSize: TYPOGRAPHY.fontSize.xl,
                        fontWeight: TYPOGRAPHY.fontWeight.bold,
                        color: COLORS.primary[600],
                      }}
                    >
                      {Number(displayScore).toFixed(1)}
                    </span>
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                      pts
                    </span>
                  </div>

                  {/* Explain / Evidence button for employee evaluations */}
                  {evaluationId && (
                    <button
                      onClick={() =>
                        setSelectedKpi({
                          evaluationId,
                          kpiCode,
                          kpiName,
                        })
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: RADII.md,
                        backgroundColor: COLORS.neutral.white,
                        border: `1px solid ${COLORS.neutral[300]}`,
                        color: COLORS.neutral[700],
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        fontWeight: TYPOGRAPHY.fontWeight.medium,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.primary[50];
                        e.currentTarget.style.borderColor = COLORS.primary[300];
                        e.currentTarget.style.color = COLORS.primary[700];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.neutral.white;
                        e.currentTarget.style.borderColor = COLORS.neutral[300];
                        e.currentTarget.style.color = COLORS.neutral[700];
                      }}
                    >
                      <Sparkles size={13} />
                      Explain
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Drawer */}
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
