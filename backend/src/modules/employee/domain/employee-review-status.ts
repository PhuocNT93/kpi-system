import { Employee } from './employee.domain.js';

export type EmployeeReviewStatus = 'UPCOMING' | 'OVERDUE' | 'NOT_DUE' | 'NO_SCHEDULE';

export interface EmployeeReviewStatusResult {
  status: EmployeeReviewStatus;
  isUpcoming: boolean;
  isOverdue: boolean;
  daysUntilDue: number | null;
  nextReviewDueDate: string | null | undefined;
}

export interface EmployeeReviewStatusOptions {
  upcomingWindowDays?: number;
  referenceDate?: Date;
}

function toStartOfDayUtc(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getEmployeeReviewStatus(
  employee: Pick<Employee, 'lastEvaluationCompletedAt' | 'reviewCadence' | 'nextReviewDueDate'>,
  options: EmployeeReviewStatusOptions = {}
): EmployeeReviewStatusResult {
  const upcomingWindowDays = options.upcomingWindowDays ?? 30;
  const referenceDate = options.referenceDate ?? new Date();
  const dueDate = parseDate(employee.nextReviewDueDate);

  if (!dueDate) {
    return {
      status: 'NO_SCHEDULE',
      isUpcoming: false,
      isOverdue: false,
      daysUntilDue: null,
      nextReviewDueDate: employee.nextReviewDueDate,
    };
  }

  const diffMs = toStartOfDayUtc(dueDate) - toStartOfDayUtc(referenceDate);
  const daysUntilDue = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (daysUntilDue < 0) {
    return {
      status: 'OVERDUE',
      isUpcoming: false,
      isOverdue: true,
      daysUntilDue,
      nextReviewDueDate: employee.nextReviewDueDate,
    };
  }

  if (daysUntilDue <= upcomingWindowDays) {
    return {
      status: 'UPCOMING',
      isUpcoming: true,
      isOverdue: false,
      daysUntilDue,
      nextReviewDueDate: employee.nextReviewDueDate,
    };
  }

  return {
    status: 'NOT_DUE',
    isUpcoming: false,
    isOverdue: false,
    daysUntilDue,
    nextReviewDueDate: employee.nextReviewDueDate,
  };
}
