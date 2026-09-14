export interface EmployeeEvaluationScore {
  evaluationId: string;
  evaluationCycleId: string;
  employeeId: string;
  teamId?: string;
  roleId?: string;
  jobLevelId?: string;
  cycleStatus: string;
  evaluationStatus: string;
  selfScore?: number;
  managerScore?: number;
  finalScore?: number;
  isLocked: boolean;
  publishedAt?: string;
  lockedAt?: string;
  lastRefreshedAt: string;
}

export interface EmployeeKpiScore {
  id: string;
  evaluationId: string;
  evaluationCycleId: string;
  employeeId: string;
  teamId?: string;
  criterionCode: string;
  criterionName: string;
  category?: string;
  weightSnapshot: number;
  resolvedLevel?: number;
  rawScore?: number;
  weightedScore?: number;
  isDisabledForEmployee: boolean;
  isMissingScore: boolean;
  kpiScore?: number;
  kpiWeightedScore?: number;
  lastRefreshedAt: string;
}

export interface EmployeeReport {
  score: EmployeeEvaluationScore;
  kpis: EmployeeKpiScore[];
}

export interface TeamEvaluationAggregate {
  id: string;
  evaluationCycleId: string;
  teamId: string;
  teamAverageScore?: number;
  employeeCount: number;
  completedEmployeeCount: number;
  completionRate?: number;
  scoreDistribution?: Record<string, unknown>;
  lastRefreshedAt: string;
}

export interface TeamKpiAggregate {
  id: string;
  evaluationCycleId: string;
  teamId: string;
  criterionCode: string;
  criterionName: string;
  category?: string;
  employeeCount: number;
  completedEmployeeCount: number;
  kpiScore?: number;
  kpiWeightedScore?: number;
  lastRefreshedAt: string;
}

export interface TeamReport {
  aggregate: TeamEvaluationAggregate;
  kpis: TeamKpiAggregate[];
}

export interface OrganizationAggregate {
  id: string;
  evaluationCycleId: string;
  departmentId?: string;
  teamId?: string;
  employeeCount: number;
  completedEmployeeCount: number;
  completionRate?: number;
  averageScore?: number;
  scoreDistribution?: Record<string, unknown>;
  lastRefreshedAt: string;
}

export interface KpiTrendResponse {
  kpiCode: string;
  kpiName: string;
  category?: string;
  status: 'MATCHED' | 'NEW' | 'REMOVED';
  previousScore?: number;
  currentScore?: number;
  delta?: number;
}

export interface ReportResponse<T> {
  success: boolean;
  message: string;
  data: T;
  dataAsOf: string;
  meta: Record<string, unknown>;
}
