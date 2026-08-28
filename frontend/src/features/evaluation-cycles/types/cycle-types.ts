export type CycleStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REVIEWING'
  | 'CALIBRATION'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'LOCKED';

export type CycleAllowedAction =
  | 'EDIT'
  | 'OPEN'
  | 'LOCK'
  | 'VIEW'
  | 'MANAGE'
  | 'DELETE';

export interface TemplateReferenceDTO {
  id: string;
  name: string;
  version: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  criteriaCount?: number;
}

export interface PeriodDTO {
  startDate: string; // ISO format (YYYY-MM-DD)
  endDate: string;
}

export interface ScopeSelectionDTO {
  teams: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}

export interface CalibrationConfigDTO {
  enabled: boolean;
}

export interface SelfAssessmentConfigDTO {
  required: boolean; // Always true per system business rules
}

export interface EvaluationSummaryDTO {
  applicableEmployees: number;
  generated: number;
  inProgress?: number;
  completed?: number;
}

export interface EvaluationCycleDTO {
  id: string;
  code: string;
  name: string;
  status: CycleStatus;
  template: TemplateReferenceDTO;
  period: PeriodDTO;
  scope: ScopeSelectionDTO;
  calibration: CalibrationConfigDTO;
  selfAssessment: SelfAssessmentConfigDTO;
  gracePeriodDays: number;
  evaluationSummary: EvaluationSummaryDTO;
  allowedActions: CycleAllowedAction[];
  createdAt: string;
  updatedAt: string;
  openedAt?: string | null;
  lockedAt?: string | null;
  createdBy?: string;
  approvedBy?: string | null;
}

export interface CreateEvaluationCyclePayload {
  code: string;
  name: string;
  templateVersionId: string;
  startDate: string;
  endDate: string;
  applicableTeamIds: string[];
  applicableRoleIds: string[];
  calibrationEnabled: boolean;
  gracePeriodDays: number;
}

export interface UpdateEvaluationCyclePayload extends Partial<CreateEvaluationCyclePayload> {}

export interface ScopePreviewDTO {
  employeeCount: number;
  byTeam: { teamId: string; name: string; count: number }[];
  byRole: { roleId: string; name: string; count: number }[];
}

export interface CycleOpenResultDTO {
  cycleId: string;
  status: CycleStatus;
  evaluationCount: number;
  criteriaSnapshotsCount?: number;
  auditEventId: string;
  failedCount?: number;
  details?: {
    total: number;
    created: number;
    failed: number;
  };
}

export interface CycleOpeningStatusDTO {
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total: number;
  processed: number;
  successful: number;
  failed: number;
}

export interface CycleFilterParams {
  search?: string;
  status?: string;
  templateId?: string;
  teamId?: string;
}
