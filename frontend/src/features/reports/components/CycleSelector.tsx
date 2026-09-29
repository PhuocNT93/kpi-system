import React from 'react';
import { useEvaluationCyclesQuery } from '../../evaluation-cycles/hooks/use-evaluation-cycles';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import type { EvaluationCycleDTO } from '../../evaluation-cycles/types/cycle-types';
import { useReportPalette } from '../hooks/use-report-palette';

export interface CycleSelectorProps {
  value: string;
  onChange: (cycleId: string) => void;
  label?: string;
  id?: string;
  // Optional selectors (e.g. a comparison cycle) start empty instead of picking the first cycle.
  isOptional?: boolean;
  emptyOptionLabel?: string;
}

export const CycleSelector: React.FC<CycleSelectorProps> = ({
  value,
  onChange,
  label,
  id = 'report-cycle-select',
  isOptional = false,
  emptyOptionLabel,
}) => {
  const { data: cycles, isLoading, isError } = useEvaluationCyclesQuery();
  const { t } = useUiTranslation();
  const palette = useReportPalette();
  const resolvedLabel = label ?? t('reports.common.cycle', 'Evaluation Cycle');

  React.useEffect(() => {
    if (!isOptional && !value && cycles && cycles.length > 0) {
      onChange(cycles[0].id);
    }
  }, [isOptional, value, cycles, onChange]);

  const selectStyle: React.CSSProperties = {
    height: '38px',
    boxSizing: 'border-box',
    padding: '0 12px',
    borderRadius: RADII.md,
    border: `1px solid ${palette.inputBorder}`,
    backgroundColor: palette.inputBg,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: palette.textPrimary,
    outline: 'none',
    width: '100%',
    minWidth: '220px',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 240px', minWidth: 0 }}>
      {resolvedLabel && (
        <label
          htmlFor={id}
          style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: palette.textSecondary }}
        >
          {resolvedLabel}
        </label>
      )}
      {isError || (!isLoading && !cycles) ? (
        <div role="alert" style={{ color: palette.tones.warning.fg, fontSize: TYPOGRAPHY.fontSize.sm }}>
          {t('reports.common.cycles_load_error', 'Failed to load cycles')}
        </div>
      ) : (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          style={selectStyle}
        >
          {isOptional ? (
            <option value="">{emptyOptionLabel ?? t('reports.common.no_comparison', 'No comparison')}</option>
          ) : (
            !value && (
              <option value="" disabled>
                {t('reports.common.loading_cycles', 'Loading cycle...')}
              </option>
            )
          )}
          {(cycles ?? []).map((cycle: EvaluationCycleDTO) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.name} ({cycle.code}) - {cycle.status}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
