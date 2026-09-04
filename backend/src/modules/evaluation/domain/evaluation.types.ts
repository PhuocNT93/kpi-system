export enum EvaluationStatus {
  OPEN = 'OPEN',
  SUBMITTED = 'SUBMITTED',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  APPROVED = 'APPROVED',
  LOCKED = 'LOCKED',
}

export interface Evaluation {
  evaluation_id: string;
  evaluation_cycle_id: string;
  employee_id: string;
  team_id_snapshot: string;
  role_id_snapshot: string;
  job_level_snapshot?: string;
  manager_id_snapshot?: string;
  status: EvaluationStatus;
  self_score?: number;
  manager_score?: number;
  final_score?: number;
  official_score?: number | null;
  scoring_breakdown?: Record<string, unknown>;
  submitted_at?: Date;
  approved_at?: Date;
  is_locked: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  version?: number;
}

export interface EvaluationItem {
  evaluation_item_id: string;
  evaluation_id: string;
  template_criterion_id: string;
  criterion_code_snapshot: string;
  criterion_name_snapshot: string;
  weight_snapshot: number;
  kpi_id_snapshot?: string;
  kpi_code_snapshot?: string;
  kpi_name_snapshot?: string;
  kpi_weight_snapshot?: number;
  scoring_rule_snapshot: Record<string, unknown>;
  level_definition_snapshot: Record<string, unknown>[];
  measurement_value?: number;
  resolved_level?: number | null;
  raw_score?: number | null;
  normalized_score?: number | null;
  weighted_score?: number | null;
  is_disabled_for_employee: boolean;
  is_missing_score: boolean;
  comment?: string;
  reviewer_id?: string;
  review_date?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  version?: number;
}
