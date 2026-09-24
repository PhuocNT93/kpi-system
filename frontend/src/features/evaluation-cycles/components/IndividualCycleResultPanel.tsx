import React from 'react';
import { Link } from 'react-router-dom';
import { RADII, TYPOGRAPHY, useTheme } from '@/shared/theme';
import type { IndividualCycleCreationResult } from '../types/cycle-types';
import { useIndividualCycleTranslation } from '../hooks/use-individual-cycle-ui';

export interface IndividualCycleResultPanelProps {
  result: IndividualCycleCreationResult;
  /** Display label (name + code) for an employee id. */
  getEmployeeLabel: (employeeId: string) => string;
  /** Whether the viewer may open the cycle detail page (HR/Admin only). */
  canOpenCycle?: boolean;
}

interface Tone {
  background: string;
  border: string;
  color: string;
}

const TONES: Record<'success' | 'danger' | 'warning', { light: Tone; dark: Tone }> = {
  success: {
    light: { background: '#ecfdf5', border: '#a7f3d0', color: '#065f46' },
    dark: { background: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', color: '#6ee7b7' },
  },
  danger: {
    light: { background: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
    dark: { background: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' },
  },
  warning: {
    light: { background: '#fffbeb', border: '#fde68a', color: '#92400e' },
    dark: { background: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', color: '#fcd34d' },
  },
};

const listStyle: React.CSSProperties = { margin: '8px 0 0', paddingLeft: '20px', wordBreak: 'break-word' };

/**
 * Outcome of an individual cycle creation: created cycles (success), employees blocked because they
 * already have an active evaluation (blocking, per employee) and non-blocking upcoming batch warnings.
 */
export const IndividualCycleResultPanel: React.FC<IndividualCycleResultPanelProps> = ({
  result,
  getEmployeeLabel,
  canOpenCycle = true,
}) => {
  const { t } = useIndividualCycleTranslation();
  const { isDark } = useTheme();

  const boxStyle = (tone: keyof typeof TONES): React.CSSProperties => {
    const palette = isDark ? TONES[tone].dark : TONES[tone].light;
    return {
      padding: '12px 16px',
      borderRadius: RADII.md,
      background: palette.background,
      border: `1px solid ${palette.border}`,
      color: palette.color,
      fontSize: TYPOGRAPHY.fontSize.sm,
    };
  };
  const linkColor = isDark ? '#A5B4FC' : '#4F46E5';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {result.created.length > 0 && (
        <section role="status" aria-label="Created individual evaluations" style={boxStyle('success')}>
          <strong>{t('ic_result_created', 'Created {count} individual evaluation(s).', { count: result.created.length })}</strong>
          <ul style={listStyle}>
            {result.created.map((entry) => (
              <li key={entry.cycle.id}>
                {getEmployeeLabel(entry.employeeId)} —{' '}
                {canOpenCycle ? (
                  <Link to={`/admin/cycles/${entry.cycle.id}`} style={{ color: linkColor }}>
                    {entry.cycle.code}
                  </Link>
                ) : (
                  entry.cycle.code
                )}{' '}
                ({entry.evaluationItemCount} {t('ic_result_criteria', 'criteria')})
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.skipped.length > 0 && (
        <section role="alert" aria-label="Blocked employees" style={boxStyle('danger')}>
          <strong>{t('ic_result_blocked', 'Not created — these employees already have an active evaluation:')}</strong>
          <ul style={listStyle}>
            {result.skipped.map((skip) => (
              <li key={skip.employeeId}>
                {getEmployeeLabel(skip.employeeId)} ({skip.reasonCode})
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.warnings.length > 0 && (
        <section aria-label="Upcoming batch cycle warnings" style={boxStyle('warning')}>
          <strong>
            {t('ic_result_warning', 'Warning — created successfully, but these employees are also in an upcoming batch cycle:')}
          </strong>
          <ul style={listStyle}>
            {result.warnings.map((warning) => (
              <li key={`${warning.employeeId}:${warning.evaluationCycleId}`}>
                {getEmployeeLabel(warning.employeeId)} —{' '}
                {t('ic_result_warning_item', 'batch cycle {code} ({name}) opens on {date}', {
                  code: warning.evaluationCycleCode,
                  name: warning.evaluationCycleName,
                  date: warning.startDate,
                })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
