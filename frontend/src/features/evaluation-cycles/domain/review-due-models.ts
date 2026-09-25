// Frontend domain models (camelCase) for the Review Due dashboard.

export type ReviewDueStatus = 'OVERDUE' | 'DUE' | 'UPCOMING' | 'NOT_DUE' | 'NO_SCHEDULE';

export type ReviewDueCadenceSource = 'EMPLOYEE_OVERRIDE' | 'JOB_LEVEL_DEFAULT' | 'SYSTEM_DEFAULT';

export interface ReviewDueCadence {
  id: string;
  code: string;
  name: string;
  intervalMonths: number;
  source: ReviewDueCadenceSource;
}

export interface ReviewDueItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  teamName: string | null;
  jobLevelName: string | null;
  effectiveCadence: ReviewDueCadence | null;
  /** ISO timestamp as sent by the backend. */
  lastEvaluationCompletedAt: string | null;
  /** Date-only string (YYYY-MM-DD) as sent by the backend — never re-parsed through Date. */
  nextReviewDueDate: string | null;
  status: ReviewDueStatus;
  daysOverdue: number;
}

export interface ReviewDuePage {
  items: ReviewDueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  lastUpdatedAt: string;
}

export interface ReviewDueFilters {
  status?: ReviewDueStatus;
  teamId?: string;
  cadenceId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}
