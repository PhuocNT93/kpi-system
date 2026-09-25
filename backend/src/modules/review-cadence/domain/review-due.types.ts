import type { ReviewCadenceSource } from './review-cadence.types.js';

export type ReviewDueStatus = 'OVERDUE' | 'DUE' | 'UPCOMING' | 'NOT_DUE' | 'NO_SCHEDULE';

export interface ReviewDueTeam {
  id: string;
  name: string;
}

export interface ReviewDueJobLevel {
  id: string;
  name: string;
}

export interface ReviewDueEffectiveCadence {
  id: string;
  code: string;
  name: string;
  interval_months: number;
  source: ReviewCadenceSource;
}

export interface ReviewDueItem {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  full_name?: string;
  team: ReviewDueTeam;
  team_id?: string | null;
  team_name?: string | null;
  job_level: ReviewDueJobLevel;
  job_level_id?: string | null;
  job_level_name?: string | null;
  effective_cadence: ReviewDueEffectiveCadence | null;
  last_evaluation_completed_at: string | null;
  next_review_due_date: string | null;
  status: ReviewDueStatus;
  days_overdue: number;
  days_until_due?: number | null;
}

export interface ReviewDueQueryFilters {
  status?: string;
  teamId?: string;
  cadenceId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ReviewDueBatchWarning {
  employee_id: string;
  warning: {
    code: 'BATCH_CYCLE_UPCOMING';
    cycle_code: string;
    cycle_name?: string;
    scheduled_date: string;
  };
}

export interface ReviewDueBatchConflict {
  employee_id: string;
  code: 'EVALUATION_ALREADY_OPEN' | 'UNAUTHORIZED_TEAM' | 'EMPLOYEE_INACTIVE';
  message: string;
}

export interface ReviewDueBatchCreationResult {
  created: Array<{
    employee_id: string;
    evaluation_cycle_id: string;
    evaluation_id?: string;
  }>;
  warnings: ReviewDueBatchWarning[];
  conflicts: ReviewDueBatchConflict[];
}
