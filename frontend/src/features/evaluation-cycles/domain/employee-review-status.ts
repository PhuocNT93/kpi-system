import type { OrgEmployee } from '@/features/organization/domain/organization-models';

export type ReviewBadgeVariant = 'success' | 'danger' | 'neutral' | 'secondary';

export function getEmployeeReviewStatus(
  employee: Pick<OrgEmployee, 'nextReviewDueDate'>,
  options: { upcomingWindowDays?: number; referenceDate?: Date } = {}
): { status: 'UPCOMING' | 'OVERDUE' | 'NOT_DUE' | 'NO_SCHEDULE'; daysUntilDue: number | null } {
  const upcomingWindowDays = options.upcomingWindowDays ?? 30;
  const referenceDate = options.referenceDate ?? new Date();
  const dueDate = employee.nextReviewDueDate ? new Date(employee.nextReviewDueDate) : null;

  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return { status: 'NO_SCHEDULE', daysUntilDue: null };
  }

  const startOfDayUtc = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diffMs = startOfDayUtc(dueDate) - startOfDayUtc(referenceDate);
  const daysUntilDue = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (daysUntilDue < 0) return { status: 'OVERDUE', daysUntilDue };
  if (daysUntilDue <= upcomingWindowDays) return { status: 'UPCOMING', daysUntilDue };
  return { status: 'NOT_DUE', daysUntilDue };
}

export function getReviewBadgeMeta(
  status: 'UPCOMING' | 'OVERDUE' | 'NOT_DUE' | 'NO_SCHEDULE',
  daysUntilDue: number | null
): { label: string; variant: ReviewBadgeVariant } {
  switch (status) {
    case 'OVERDUE':
      return { label: daysUntilDue === null ? 'Overdue' : `${Math.abs(daysUntilDue)}d overdue`, variant: 'danger' };
    case 'UPCOMING':
      return { label: daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue}d`, variant: 'secondary' };
    case 'NOT_DUE':
      return { label: daysUntilDue === null ? 'Not due' : `${daysUntilDue}d left`, variant: 'success' };
    case 'NO_SCHEDULE':
    default:
      return { label: 'No schedule', variant: 'neutral' };
  }
}
