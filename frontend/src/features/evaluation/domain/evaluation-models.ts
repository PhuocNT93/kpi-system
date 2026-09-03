export enum EvaluationStatus {
  OPEN = 'OPEN',
  SUBMITTED = 'SUBMITTED',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  APPROVED = 'APPROVED',
  LOCKED = 'LOCKED',
}

export interface EvaluationCycle {
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface MyEvaluation {
  evaluation: {
    evaluation_id: string;
    evaluation_cycle_id: string;
    employee_id: string;
    status: EvaluationStatus;
    self_score?: number;
    manager_score?: number;
    final_score?: number;
    submitted_at?: string;
    approved_at?: string;
    is_locked: boolean;
  };
  cycle: EvaluationCycle;
}

export interface EvaluationItem {
  evaluation_item_id: string;
  evaluation_id: string;
  template_criterion_id: string;
  criterion_code_snapshot: string;
  criterion_name_snapshot: string;
  weight_snapshot: number;
  scoring_rule_snapshot: any;
  level_definition_snapshot: any;
  resolved_level?: number;
  raw_score?: number;
  weighted_score?: number;
  is_disabled_for_employee: boolean;
  is_missing_score: boolean;
  comment?: string;
}

export interface EmployeeSummary {
  employee_id: string;
  full_name: string;
  employee_code: string;
  email: string;
  team_name?: string;
  role_name?: string;
}

export interface TeamEvaluation {
  evaluation: {
    evaluation_id: string;
    evaluation_cycle_id: string;
    employee_id: string;
    team_id_snapshot?: string;
    role_id_snapshot?: string;
    job_level_snapshot?: string;
    manager_id_snapshot?: string;
    status: EvaluationStatus;
    self_score?: number;
    manager_score?: number;
    final_score?: number;
    submitted_at?: string;
    approved_at?: string;
    is_locked: boolean;
    created_at?: string;
  };
  employee: EmployeeSummary;
  cycle: EvaluationCycle;
}

export interface EvaluationDetail {
  evaluation_id: string;
  evaluation_cycle_id: string;
  employee_id: string;
  status: EvaluationStatus;
  self_score?: number;
  manager_score?: number;
  final_score?: number;
  submitted_at?: string;
  is_manager_reviewer?: boolean;
  items: EvaluationItem[];
}
