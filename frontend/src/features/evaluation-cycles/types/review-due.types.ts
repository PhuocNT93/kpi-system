export type ReviewDueStatus = 'OVERDUE' | 'DUE' | 'UPCOMING' | 'NOT_DUE';

export type ReviewCadenceSource = 'EMPLOYEE_OVERRIDE' | 'JOB_LEVEL' | 'SYSTEM_DEFAULT';

export interface EffectiveCadenceDTO {
  id: string;
  code: string;
  name: string;
  interval_months: number;
  source: ReviewCadenceSource;
}

export interface ReviewDueItemDTO {
  employee_id: string;
  employee_code: string;
  full_name: string;
  team_id: string | null;
  team_name: string | null;
  job_level_id: string | null;
  job_level_name: string | null;
  last_evaluation_completed_at: string | null;
  next_review_due_date: string | null;
  status: ReviewDueStatus;
  days_overdue: number;
  days_until_due: number;
  effective_cadence: EffectiveCadenceDTO | null;
}

export interface ReviewDueCountsDTO {
  overdue: number;
  due: number;
  upcoming: number;
  total_due_or_upcoming: number;
}

export interface ReviewDueMetadataDTO {
  total: number;
  lead_time_days: number;
  counts: ReviewDueCountsDTO;
}

export interface ReviewDueResponseDTO {
  items: ReviewDueItemDTO[];
  meta: ReviewDueMetadataDTO;
}

export interface ReviewDueFiltersDTO {
  status?: 'OVERDUE' | 'DUE' | 'UPCOMING' | 'ALL';
  team_id?: string;
  cadence_id?: string;
  search?: string;
  lead_time_days?: number;
  limit?: number;
  offset?: number;
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
