// Wire DTOs (snake_case) for GET /api/reviews/due — must match the backend contract exactly.
// Components never consume these directly; see domain/review-due-mappers.ts.

export type ReviewDueStatus = 'OVERDUE' | 'DUE' | 'UPCOMING' | 'NOT_DUE' | 'NO_SCHEDULE';

export type ReviewCadenceSource = 'EMPLOYEE_OVERRIDE' | 'JOB_LEVEL_DEFAULT' | 'SYSTEM_DEFAULT';

export interface EffectiveCadenceDTO {
  id: string;
  code: string;
  name: string;
  interval_months: number;
  source: ReviewCadenceSource;
}

export interface ReviewDueRefDTO {
  id: string;
  name: string;
}

export interface ReviewDueItemDTO {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  team: ReviewDueRefDTO | null;
  job_level: ReviewDueRefDTO | null;
  effective_cadence: EffectiveCadenceDTO | null;
  /** ISO timestamp */
  last_evaluation_completed_at: string | null;
  /** Date-only string YYYY-MM-DD */
  next_review_due_date: string | null;
  status: ReviewDueStatus;
  days_overdue: number;
}

/** Response `data` after the api-client unwraps the envelope. */
export interface ReviewDueResponseDTO {
  items: ReviewDueItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  last_updated_at: string;
}

export interface ReviewDueFiltersDTO {
  status?: ReviewDueStatus;
  team_id?: string;
  cadence_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface CreateIndividualCyclesPayload {
  employee_ids: string[];
  template_version_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface IndividualCycleCreatedItem {
  cycle_id: string;
  evaluation_id: string;
  employee_id: string;
  code: string;
}

export interface IndividualCycleWarningItem {
  employee_id: string;
  warning: {
    code: string;
    cycle_code: string;
    cycle_name: string;
    scheduled_date: string;
  };
}

export interface IndividualCycleConflictItem {
  employee_id: string;
  code: string;
  message: string;
}

export interface CreateIndividualCyclesResultDTO {
  created: IndividualCycleCreatedItem[];
  warnings: IndividualCycleWarningItem[];
  conflicts: IndividualCycleConflictItem[];
}
