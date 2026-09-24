export enum EvaluationCycleStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  REVIEWING = 'REVIEWING',
  CALIBRATION = 'CALIBRATION',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  LOCKED = 'LOCKED',
}

export enum EvaluationStatus {
  OPEN = 'OPEN',
  SELF_ASSESSMENT = 'SELF_ASSESSMENT',
  MANAGER_ASSESSMENT = 'MANAGER_ASSESSMENT',
  REVIEWING = 'REVIEWING',
  CALIBRATION = 'CALIBRATION',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  LOCKED = 'LOCKED',
}

/**
 * Evaluation statuses that no longer count as an active (open) evaluation for an employee.
 * Every other status — DRAFT through CALIBRATION, plus the legacy SUBMITTED/MANAGER_REVIEW —
 * is active. APPROVED auto-publishes and REJECTED can only be locked, so both are finished.
 */
export const NON_ACTIVE_EVALUATION_STATUSES = ['APPROVED', 'PUBLISHED', 'LOCKED', 'REJECTED'] as const;

export enum EvaluationCycleType {
  BATCH = 'BATCH',
  INDIVIDUAL_SCHEDULED = 'INDIVIDUAL_SCHEDULED',
}

export interface EvaluationCycle {
  evaluationCycleId: string;
  code: string;
  name: string;
  cycleType: EvaluationCycleType;
  /** The evaluated employee of an INDIVIDUAL_SCHEDULED cycle; null for BATCH cycles. */
  triggeredByEmployeeId: string | null;
  startDate: string;
  endDate: string;
  status: EvaluationCycleStatus;
  evaluationTemplateVersionId: string;
  applicableTeamIds: string[];
  applicableRoleIds: string[];
  applicableEmployeeIds: string[];
  approvedBy: string | null;
  lockedAt: string | null;
  calibrationEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface Evaluation {
  evaluationId: string;
  evaluationCycleId: string;
  employeeId: string;
  teamIdSnapshot: string;
  roleIdSnapshot: string;
  jobLevelSnapshot: string | null;
  managerIdSnapshot: string | null;
  status: EvaluationStatus;
  selfScore: number | null;
  managerScore: number | null;
  finalScore: number | null;
  scoringBreakdown?: Record<string, unknown> | null;
  submittedAt: string | null;
  approvedAt: string | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface EvaluationItem {
  evaluationItemId: string;
  evaluationId: string;
  templateCriterionId: string;
  criterionCodeSnapshot: string;
  criterionNameSnapshot: string;
  weightSnapshot: number;
  kpiIdSnapshot?: string;
  kpiCodeSnapshot?: string;
  kpiNameSnapshot?: string;
  kpiWeightSnapshot?: number;
  scoringRuleSnapshot: Record<string, unknown>;
  levelDefinitionSnapshot: Record<string, unknown>[];
  resolvedLevel: number | null;
  rawScore: number | null;
  normalizedScore?: number | null;
  weightedScore: number | null;
  isDisabledForEmployee: boolean;
  isMissingScore: boolean;
  comment: string | null;
  reviewerId: string | null;
  reviewDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface ListEvaluationCycleQuery {
  page?: number;
  pageSize?: number;
  status?: EvaluationCycleStatus;
  search?: string;
  sort?: string;
  sortDirection?: 'asc' | 'desc';
}

export const EvaluationCycleErrorCodes = {
  EVALUATION_CYCLE_NOT_FOUND: 'EVALUATION_CYCLE_NOT_FOUND',
  EVALUATION_CYCLE_CODE_ALREADY_EXISTS: 'EVALUATION_CYCLE_CODE_ALREADY_EXISTS',
  EVALUATION_CYCLE_NOT_EDITABLE: 'EVALUATION_CYCLE_NOT_EDITABLE',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  INVALID_TEMPLATE_VERSION: 'INVALID_TEMPLATE_VERSION',
  TEMPLATE_NOT_PUBLISHED: 'TEMPLATE_NOT_PUBLISHED',
  INVALID_TEMPLATE_CONFIGURATION: 'INVALID_TEMPLATE_CONFIGURATION',
  INVALID_CYCLE_STATE_TRANSITION: 'INVALID_CYCLE_STATE_TRANSITION',
  EVALUATION_CYCLE_ALREADY_LOCKED: 'EVALUATION_CYCLE_ALREADY_LOCKED',
  EVALUATION_CYCLE_OPEN_CONFLICT: 'EVALUATION_CYCLE_OPEN_CONFLICT',
  EVALUATION_ALREADY_OPEN: 'EVALUATION_ALREADY_OPEN',
  EMPLOYEE_NOT_ELIGIBLE: 'EMPLOYEE_NOT_ELIGIBLE',
  FORBIDDEN: 'FORBIDDEN',
} as const;

/** Current organisational context of an employee, read (and row-locked) before generating evaluations. */
export interface EvaluationEmployeeRecord {
  employeeId: string;
  employeeCode: string;
  teamId: string | null;
  roleId: string | null;
  jobLevelId: string | null;
  managerId: string | null;
  employmentStatus: string;
}

/** An active evaluation that blocks creating another evaluation for the same employee. */
export interface ActiveEvaluationRef {
  evaluationId: string;
  evaluationCycleId: string;
  employeeId: string;
  status: string;
}
