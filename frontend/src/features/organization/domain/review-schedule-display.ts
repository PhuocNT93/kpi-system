// Display helpers for the server-computed review schedule.
// These only format values returned by the backend; they never compute a due date.

import type { EffectiveCadenceSource } from './organization-models';
import { formatTimestampAsLocalDate } from '../../../shared/utils/timestamp-display';

export const EMPTY_SCHEDULE_VALUE = '—';

type TranslateFn = (key: string, fallback?: string, params?: Record<string, string | number>) => string;

export function getCadenceSourceLabel(source: EffectiveCadenceSource, t: TranslateFn): string {
  switch (source) {
    case 'EMPLOYEE_OVERRIDE':
      return t('cadence_source_employee_override', 'Employee override');
    case 'JOB_LEVEL_DEFAULT':
      return t('cadence_source_job_level_default', 'Job level default');
    case 'SYSTEM_DEFAULT':
    default:
      return t('cadence_source_system_default', 'System default');
  }
}

/** Shows an ISO timestamp as a date in the viewer's timezone (display only, no due-date calculation). */
export function formatTimestampDatePart(value: string | null | undefined): string {
  return formatTimestampAsLocalDate(value, EMPTY_SCHEDULE_VALUE);
}

/**
 * Cadence label for display. Admin-defined names often already contain the interval (e.g. "Quarterly (3 months)"),
 * so the interval is appended only when the name does not mention it — avoids "Quarterly (3 months) (3 months)".
 */
export function formatCadenceLabel(name: string, intervalMonths: number, t: TranslateFn): string {
  const mentionsInterval = new RegExp(`(^|[^0-9])${intervalMonths}([^0-9]|$)`).test(name);
  return mentionsInterval
    ? name
    : `${name} (${t('interval_months_label', '{months} months', { months: intervalMonths })})`;
}
