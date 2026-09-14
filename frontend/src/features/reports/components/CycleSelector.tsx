import React from 'react';
import { useEvaluationCyclesQuery } from '../../evaluation-cycles/hooks/use-evaluation-cycles';
import { LoadingSpinner } from '@/shared/components/ui';
import { TYPOGRAPHY, COLORS, RADII } from '@/shared/theme';

export interface CycleSelectorProps {
  value: string;
  onChange: (cycleId: string) => void;
  label?: string;
}

export const CycleSelector: React.FC<CycleSelectorProps> = ({ 
  value, 
  onChange, 
  label = 'Evaluation Cycle' 
}) => {
  const { data: cycles, isLoading, isError } = useEvaluationCyclesQuery();

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}><LoadingSpinner label="" /></div>;
  }

  if (isError || !cycles) {
    return <div style={{ color: COLORS.semantic.danger.DEFAULT, fontSize: TYPOGRAPHY.fontSize.sm }}>Failed to load cycles</div>;
  }

  // If no value is provided but we have cycles, default to the first one (usually latest/active)
  React.useEffect(() => {
    if (value === '00000000-0000-0000-0000-000000000000' && cycles.length > 0) {
      onChange(cycles[0].id);
    }
  }, [value, cycles, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral[700] }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: RADII.md,
          border: `1px solid ${COLORS.neutral[300]}`,
          backgroundColor: COLORS.neutral.white,
          fontSize: TYPOGRAPHY.fontSize.sm,
          color: COLORS.neutral[900],
          outline: 'none',
          minWidth: '200px',
          cursor: 'pointer'
        }}
      >
        <option value="00000000-0000-0000-0000-000000000000" disabled>Select a cycle...</option>
        {cycles.map((cycle: any) => (
          <option key={cycle.id} value={cycle.id}>
            {cycle.name} ({cycle.code}) - {cycle.status}
          </option>
        ))}
      </select>
    </div>
  );
};
