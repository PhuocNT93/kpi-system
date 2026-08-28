import React from 'react';
import type { EvaluationCycleDTO } from '../types/cycle-types';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Calendar, Layers, Users, Sliders, ShieldCheck, Clock } from 'lucide-react';

interface CycleConfigurationSummaryProps {
  cycle: Partial<EvaluationCycleDTO>;
  compact?: boolean;
}

export const CycleConfigurationSummary: React.FC<CycleConfigurationSummaryProps> = ({
  cycle,
  compact = false,
}) => {
  const items = [
    {
      icon: <Layers size={16} color={COLORS.primary.DEFAULT} />,
      label: 'Template Version',
      value: cycle.template ? `${cycle.template.name} — ${cycle.template.version}` : 'Not selected',
    },
    {
      icon: <Calendar size={16} color={COLORS.primary.DEFAULT} />,
      label: 'Evaluation Period',
      value:
        cycle.period?.startDate && cycle.period?.endDate
          ? `${cycle.period.startDate} → ${cycle.period.endDate}`
          : 'Not configured',
    },
    {
      icon: <Users size={16} color={COLORS.primary.DEFAULT} />,
      label: 'Applicable Teams',
      value:
        cycle.scope?.teams && cycle.scope.teams.length > 0
          ? cycle.scope.teams.map((t) => t.name).join(', ')
          : 'All Teams',
    },
    {
      icon: <Sliders size={16} color={COLORS.primary.DEFAULT} />,
      label: 'Applicable Roles',
      value:
        cycle.scope?.roles && cycle.scope.roles.length > 0
          ? cycle.scope.roles.map((r) => r.name).join(', ')
          : 'All Roles',
    },
    {
      icon: <Sliders size={16} color={COLORS.primary.DEFAULT} />,
      label: 'Self Assessment',
      value: 'Mandatory (System Rule)',
    },
    {
      icon: <ShieldCheck size={16} color={COLORS.primary.DEFAULT} />,
      label: 'Calibration',
      value: cycle.calibration?.enabled ? 'Enabled' : 'Disabled',
    },
    {
      icon: <Clock size={16} color={COLORS.primary.DEFAULT} />,
      label: 'Grace Period',
      value: `${cycle.gracePeriodDays ?? 0} days`,
    },
  ];

  return (
    <div
      style={{
        backgroundColor: COLORS.neutral.white,
        border: `1px solid ${COLORS.neutral[200]}`,
        borderRadius: RADII.xl,
        padding: compact ? '16px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '12px' : '16px',
      }}
    >
      <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary, letterSpacing: '0.01em' }}>
        Cycle Configuration Summary
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px 16px',
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '8px 12px',
              backgroundColor: COLORS.neutral[50],
              borderRadius: RADII.lg,
              border: `1px solid ${COLORS.neutral[100] ?? COLORS.neutral[200]}`,
            }}
          >
            <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center' }}>
              {item.icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.75rem', color: COLORS.neutral.textSecondary, fontWeight: 500 }}>
                {item.label}
              </span>
              <span style={{ fontSize: '0.875rem', color: COLORS.neutral.textPrimary, fontWeight: 600 }}>
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
