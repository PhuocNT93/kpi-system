import React from 'react';
import { useEvaluationCyclesQuery } from '../../evaluation-cycles/hooks/use-evaluation-cycles';
import { LoadingSpinner } from '@/shared/components/ui';
import { TYPOGRAPHY, COLORS, RADII } from '@/shared/theme';
import type { EvaluationCycleDTO } from '../../evaluation-cycles/types/cycle-types';

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

  // Auto-select the first cycle as soon as cycles are available and no value is set yet
  React.useEffect(() => {
    if (!value && cycles && cycles.length > 0) {
      onChange(cycles[0].id);
    }
  }, [value, cycles, onChange]);

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}><LoadingSpinner label="" /></div>;
  }

  if (isError || !cycles) {
    return <div style={{ color: COLORS.semantic.danger.DEFAULT, fontSize: TYPOGRAPHY.fontSize.sm }}>Failed to load cycles</div>;
  }

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
          color: value ? COLORS.neutral[900] : COLORS.neutral[500],
          outline: 'none',
          minWidth: '200px',
          cursor: 'pointer'
        }}
      >
        {!value && (
          <option value="" disabled>Loading cycle...</option>
        )}
        {cycles.map((cycle: EvaluationCycleDTO) => (
          <option key={cycle.id} value={cycle.id}>
            {cycle.name} ({cycle.code}) - {cycle.status}
          </option>
        ))}
      </select>
    </div>
  );
};
