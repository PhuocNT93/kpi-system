import React from 'react';
import { Card } from '@/shared/components/Card';
import { TYPOGRAPHY, RADII, SHADOWS } from '@/shared/theme';
import { COLORS } from '@/lib/theme';
import { Target } from 'lucide-react';
import type { EmployeeKpiScore, TeamKpiAggregate } from '../types/reports.types';

interface KpiBreakdownProps {
  kpis: (EmployeeKpiScore | TeamKpiAggregate)[];
  title?: string;
}

export const KpiBreakdown: React.FC<KpiBreakdownProps> = ({ kpis, title = 'KPI Breakdown' }) => {
  if (!kpis || kpis.length === 0) {
    return (
      <Card style={{ padding: '32px', textAlign: 'center', color: COLORS.neutral.textSecondary }}>
        <Target size={48} color={COLORS.neutral[300]} style={{ margin: '0 auto 16px' }} />
        <p>No KPI data available for this report.</p>
      </Card>
    );
  }

  return (
    <Card style={{ padding: '24px', boxShadow: SHADOWS.sm, border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.xl }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: COLORS.primary[100], padding: '8px', borderRadius: RADII.md }}>
          <Target size={20} color={COLORS.primary[600]} />
        </div>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
          {title}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {kpis.map((kpi, idx) => {
          // Type guard to distinguish between EmployeeKpiScore and TeamKpiAggregate if needed
          const kpiCode = 'criterionCode' in kpi ? kpi.criterionCode : 'Unknown';
          const kpiName = 'criterionName' in kpi ? kpi.criterionName : 'Unknown';
          const score = 'kpiScore' in kpi ? kpi.kpiScore : ('kpiWeightedScore' in kpi ? kpi.kpiWeightedScore : null);
          const rawScore = 'rawScore' in kpi ? kpi.rawScore : null;
          
          const displayScore = score ?? rawScore ?? 0;

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
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.neutral[100]}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.neutral[50]}
            >
              <div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginBottom: '4px' }}>
                  {kpiCode}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral.textPrimary }}>
                  {kpiName}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.primary[600] }}>
                  {Number(displayScore).toFixed(1)}
                </span>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>pts</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
