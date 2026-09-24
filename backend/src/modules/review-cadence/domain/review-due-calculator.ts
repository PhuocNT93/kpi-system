import { ReviewDueStatus } from './review-due.types.js';

export interface DueStatusCalculationResult {
  status: ReviewDueStatus;
  daysOverdue: number;
  daysUntilDue: number | null;
}

export interface DueStatusOptions {
  leadTimeDays?: number;
  referenceDate?: Date;
}

/**
 * Normalizes a date to UTC midnight (start of day) timestamp.
 */
export function toStartOfDayUtc(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Parses a date string or Date object into a valid Date or null.
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Resolves the explicit review due status and overdue day count.
 *
 * Rules (LLD §14.1 / prompt):
 * - next_review_due_date < today                         -> OVERDUE (days_overdue = today - next_review_due_date)
 * - next_review_due_date = today                         -> DUE     (days_overdue = 0)
 * - today < next_review_due_date <= today + lead_time    -> UPCOMING(days_overdue = 0)
 * - next_review_due_date > today + lead_time             -> NOT_DUE
 * - null/empty                                           -> NO_SCHEDULE
 */
export function calculateReviewDueStatus(
  nextReviewDueDate: string | Date | null | undefined,
  options: DueStatusOptions = {}
): DueStatusCalculationResult {
  const leadTimeDays = Math.max(0, options.leadTimeDays ?? 30);
  const referenceDate = options.referenceDate ?? new Date();
  const dueDate = parseDate(nextReviewDueDate);

  if (!dueDate) {
    return {
      status: 'NO_SCHEDULE',
      daysOverdue: 0,
      daysUntilDue: null,
    };
  }

  const diffMs = toStartOfDayUtc(dueDate) - toStartOfDayUtc(referenceDate);
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return {
      status: 'OVERDUE',
      daysOverdue: Math.abs(diffDays),
      daysUntilDue: diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      status: 'DUE',
      daysOverdue: 0,
      daysUntilDue: 0,
    };
  }

  if (diffDays <= leadTimeDays) {
    return {
      status: 'UPCOMING',
      daysOverdue: 0,
      daysUntilDue: diffDays,
    };
  }

  return {
    status: 'NOT_DUE',
    daysOverdue: 0,
    daysUntilDue: diffDays,
  };
}

/**
 * Calculates next review due date strictly from baseline completion timestamp.
 * Avoids schedule drift: never uses today + interval.
 * Clamps days to end of month if necessary (e.g., Aug 31 + 6 months -> Feb 28).
 */
export function calculateNextReviewDueDate(
  lastCompletedAt: string | Date,
  intervalMonths: number
): Date {
  if (intervalMonths <= 0) {
    throw new Error('intervalMonths must be greater than 0');
  }

  const base = parseDate(lastCompletedAt);
  if (!base) {
    throw new Error('Invalid lastCompletedAt timestamp');
  }

  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();

  // Target year and month
  const targetYear = year + Math.floor((month + intervalMonths) / 12);
  const targetMonth = (month + intervalMonths) % 12;

  // Find max days in target month
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay, base.getUTCHours(), base.getUTCMinutes(), base.getUTCSeconds(), base.getUTCMilliseconds()));
}
