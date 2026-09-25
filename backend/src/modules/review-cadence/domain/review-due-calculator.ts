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
