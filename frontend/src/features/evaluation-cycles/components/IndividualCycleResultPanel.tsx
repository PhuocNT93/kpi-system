import React from 'react';
import { Link } from 'react-router-dom';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import type { IndividualCycleCreationResult } from '../types/cycle-types';

export interface IndividualCycleResultPanelProps {
  result: IndividualCycleCreationResult;
  /** Display label (name + code) for an employee id. */
  getEmployeeLabel: (employeeId: string) => string;
  /** Whether the viewer may open the cycle detail page (HR/Admin only). */
  canOpenCycle?: boolean;
}

const boxStyle = (background: string, border: string, color: string): React.CSSProperties => ({
  padding: '12px 16px',
  borderRadius: RADII.md,
  background,
  border: `1px solid ${border}`,
  color,
  fontSize: TYPOGRAPHY.fontSize.sm,
});

/**
 * Outcome of an individual cycle creation: created cycles (success), employees blocked because they
 * already have an active evaluation (blocking, per employee) and non-blocking upcoming batch warnings.
 */
export const IndividualCycleResultPanel: React.FC<IndividualCycleResultPanelProps> = ({ result, getEmployeeLabel, canOpenCycle = true }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    {result.created.length > 0 && (
      <section role="status" aria-label="Created individual evaluations" style={boxStyle('#ecfdf5', '#a7f3d0', '#065f46')}>
        <strong>Created {result.created.length} individual evaluation(s).</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
          {result.created.map((entry) => (
            <li key={entry.cycle.id}>
              {getEmployeeLabel(entry.employeeId)} — {canOpenCycle ? <Link to={`/admin/cycles/${entry.cycle.id}`}>{entry.cycle.code}</Link> : entry.cycle.code}{' '}
              ({entry.evaluationItemCount} criteria)
            </li>
          ))}
        </ul>
      </section>
    )}

    {result.skipped.length > 0 && (
      <section role="alert" aria-label="Blocked employees" style={boxStyle('#fef2f2', '#fecaca', '#b91c1c')}>
        <strong>Not created — these employees already have an active evaluation:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
          {result.skipped.map((skip) => (
            <li key={skip.employeeId}>
              {getEmployeeLabel(skip.employeeId)} ({skip.reasonCode})
            </li>
          ))}
        </ul>
      </section>
    )}

    {result.warnings.length > 0 && (
      <section aria-label="Upcoming batch cycle warnings" style={boxStyle('#fffbeb', '#fde68a', '#92400e')}>
        <strong>Warning — created successfully, but these employees are also in an upcoming batch cycle:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
          {result.warnings.map((warning) => (
            <li key={`${warning.employeeId}:${warning.evaluationCycleId}`}>
              {getEmployeeLabel(warning.employeeId)} — batch cycle {warning.evaluationCycleCode} ({warning.evaluationCycleName}) opens on{' '}
              {warning.startDate}
            </li>
          ))}
        </ul>
      </section>
    )}
  </div>
);
