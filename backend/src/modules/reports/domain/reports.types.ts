export interface EmployeeEvaluationScore {
  evaluation_id: string;
  evaluation_cycle_id: string;
  employee_id: string;
  team_id?: string;
  role_id?: string;
  job_level_id?: string;
  cycle_status: string;
  evaluation_status: string;
  self_score?: number;
  manager_score?: number;
  final_score?: number;
  is_locked: boolean;
  published_at?: Date;
  locked_at?: Date;
  last_refreshed_at: Date;
}

export interface EmployeeKpiScore {
  id: string;
  evaluation_id: string;
  evaluation_cycle_id: string;
  employee_id: string;
  team_id?: string;
  criterion_code: string;
  criterion_name: string;
  category?: string;
  weight_snapshot: number;
  resolved_level?: number;
  raw_score?: number;
  weighted_score?: number;
  is_disabled_for_employee: boolean;
  is_missing_score: boolean;
  kpi_score?: number;
  kpi_weighted_score?: number;
  has_evidence?: boolean;
  evidence_count?: number;
  comment?: string | null;
  last_refreshed_at: Date;
}

export interface TeamEvaluationAggregate {
  id: string;
  evaluation_cycle_id: string;
  team_id: string;
  team_average_score?: number;
  employee_count: number;
  completed_employee_count: number;
  completion_rate?: number;
  score_distribution?: Record<string, unknown>;
  last_refreshed_at: Date;
}

export interface TeamKpiAggregate {
  id: string;
  evaluation_cycle_id: string;
  team_id: string;
  criterion_code: string;
  criterion_name: string;
  category?: string;
  employee_count: number;
  completed_employee_count: number;
  kpi_score?: number;
  kpi_weighted_score?: number;
  last_refreshed_at: Date;
}

export interface OrganizationAggregate {
  id: string;
  evaluation_cycle_id: string;
  department_id?: string;
  team_id?: string;
  employee_count: number;
  completed_employee_count: number;
  completion_rate?: number;
  average_score?: number;
  score_distribution?: Record<string, unknown>;
  last_refreshed_at: Date;
}

export interface IReportsRepository {
  // Projections (writes)
  upsertEmployeeEvaluationScore(score: Partial<EmployeeEvaluationScore>): Promise<void>;
  upsertEmployeeKpiScore(kpiScore: Partial<EmployeeKpiScore>): Promise<void>;
  upsertTeamEvaluationAggregate(agg: Partial<TeamEvaluationAggregate>): Promise<void>;
  upsertTeamKpiAggregate(agg: Partial<TeamKpiAggregate>): Promise<void>;
  upsertOrganizationAggregate(agg: Partial<OrganizationAggregate>): Promise<void>;

  clearCycleProjections(cycleId: string): Promise<void>;

  // Queries (reads)
  getEmployeeReport(employeeId: string, cycleId: string): Promise<{ score: EmployeeEvaluationScore; kpis: EmployeeKpiScore[] }>;
  getTeamReport(teamId: string, cycleId: string): Promise<{ aggregate: TeamEvaluationAggregate; kpis: TeamKpiAggregate[] }>;
  getTeamKpiReport(teamId: string, cycleId: string): Promise<TeamKpiAggregate[]>;
  getOrganizationReport(cycleId: string): Promise<OrganizationAggregate[]>;
}
