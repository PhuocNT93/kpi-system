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

export interface EvaluationCycle {
  evaluationCycleId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: EvaluationCycleStatus;
  evaluationTemplateVersionId: string;
  applicableTeamIds: string[];
  applicableRoleIds: string[];
  approvedBy: string | null;
  lockedAt: string | null;
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
  scoringBreakdown?: Record<string, any> | null;
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
  scoringRuleSnapshot: Record<string, any>;
  levelDefinitionSnapshot: Record<string, any>[];
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
  FORBIDDEN: 'FORBIDDEN',
} as const;
