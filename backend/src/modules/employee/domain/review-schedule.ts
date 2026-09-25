/**
 * Review schedule domain — the ONLY place the next-review-due-date formula lives (LLD §14.1, Risk #12):
 *
 *   next_review_due_date = business_date(last_evaluation_completed_at) + effective_cadence.interval_months
 *
 * - The business date is derived in BUSINESS_TIMEZONE, never in the server or client timezone.
 * - Months are calendar months, clamped to the last day of the target month (Jan 31 + 1 → Feb 28/29).
 * - Pure functions: no database, no "now". Callers always pass the existing completion timestamp,
 *   so recalculations never drift towards "today" (Rule 9).
 */

import type { ReviewCadenceSource } from '../../review-cadence/domain/review-cadence.types.js';

export type { ReviewCadenceSource };

export interface EffectiveCadence {
  id: string;
  code: string;
  name: string;
  intervalMonths: number;
  source: ReviewCadenceSource;
}

/** Why a schedule changed — persisted in the audit payload. */
export type ReviewScheduleTrigger =
  | 'EVALUATION_PUBLISHED'
  | 'EMPLOYEE_OVERRIDE_CHANGED'
  | 'EMPLOYEE_JOB_LEVEL_CHANGED'
  | 'JOB_LEVEL_DEFAULT_CHANGED'
  | 'REVIEW_CADENCE_CHANGED';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateOnly(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Calendar date (YYYY-MM-DD) of an instant in the given IANA timezone. */
export function toBusinessDate(instant: Date, timeZone: string): string {
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('Invalid completion timestamp');
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Adds calendar months to a YYYY-MM-DD date, clamping to the end of the target month. */
export function addCalendarMonths(dateOnly: string, months: number): string {
  if (!Number.isInteger(months) || months <= 0) {
    throw new RangeError('interval_months must be a positive integer');
  }
  const match = DATE_ONLY_PATTERN.exec(dateOnly);
  if (!match) {
    throw new RangeError(`Invalid date "${dateOnly}", expected YYYY-MM-DD`);
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const targetMonthIndex = monthIndex + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  return formatDateOnly(targetYear, targetMonth + 1, Math.min(day, daysInTargetMonth));
}

/** next_review_due_date = business_date(lastCompletedAt) + intervalMonths calendar months. */
export function calculateNextReviewDueDate(
  lastCompletedAt: Date,
  intervalMonths: number,
  timeZone: string
): string {
  return addCalendarMonths(toBusinessDate(lastCompletedAt, timeZone), intervalMonths);
}

/**
 * Normalizes a stored next_review_due_date to YYYY-MM-DD.
 * The column is `timestamptz` (migrations 1788926000003/4) and holds the business date at 00:00:00 UTC
 * (see PostgresEmployeeScheduleRepository.saveSchedules), so the UTC calendar components are the business date.
 */
export function toDateOnlyString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatDateOnly(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === 'string') {
    const prefix = value.slice(0, 10);
    if (DATE_ONLY_PATTERN.test(prefix) && value.length === 10) return prefix;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return DATE_ONLY_PATTERN.test(prefix) ? prefix : null;
    return formatDateOnly(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  }
  return null;
}

/** Normalizes a value read from a `timestamptz` column to a Date. */
export function toTimestamp(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Due date for a known base and cadence; null when the employee never completed an evaluation. */
export function computeDueDate(
  lastCompletedAt: Date | null,
  cadence: EffectiveCadence | null,
  timeZone: string
): string | null {
  if (!lastCompletedAt || !cadence) return null;
  return calculateNextReviewDueDate(lastCompletedAt, cadence.intervalMonths, timeZone);
}
