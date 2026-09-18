export enum EvaluationStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  SELF_ASSESSMENT = 'SELF_ASSESSMENT',
  MANAGER_ASSESSMENT = 'MANAGER_ASSESSMENT',
  REVIEWING = 'REVIEWING',
  CALIBRATION = 'CALIBRATION',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  LOCKED = 'LOCKED',
  // Legacy aliases for backward compatibility
  SUBMITTED = 'SUBMITTED',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  REJECTED = 'REJECTED',
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
  development_blocks?: Array<Record<string, unknown>>;
  submitted_at?: Date;
  approved_at?: Date;
  published_at?: Date;
  locked_at?: Date;
  published_by?: string;
  locked_by?: string;
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
  manual_override_score?: number | null;
  override_reason?: string | null;
  override_by?: string | null;
  override_at?: Date | null;
  comment?: string;
  rationale?: string | null;
  import_id?: string | null;
  source_snapshot?: Record<string, unknown> | null;
  system_note?: string | null;
  system_suggested_level?: number | null;
  system_suggested_score?: number | null;
  system_source?: string | null;
  measurement_key?: string | null;
  measurement_unit?: string | null;
  reviewer_id?: string;
  review_date?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  version?: number;
}
