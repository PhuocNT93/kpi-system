export type CalibrationScopeType = 'ORG' | 'DEPARTMENT' | 'TEAM';
export type CalibrationSessionStatus = 'OPEN' | 'FINALIZED';

export interface CalibrationSession {
  calibrationSessionId: string;
  evaluationCycleId: string;
  cycleName?: string;
  scopeType: CalibrationScopeType;
  scopeId: string | null;
  scopeName?: string | null;
  status: CalibrationSessionStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  createdByName?: string | null;
}

export interface CalibrationAdjustment {
  calibrationAdjustmentId: string;
  calibrationSessionId: string;
  evaluationId: string;
  employeeName?: string;
  employeeCode?: string;
  oldFinalScore: number;
  newFinalScore: number;
  reason: string;
  adjustedBy: string;
  adjustedByName?: string;
  adjustedAt: string;
}

export interface CalibrationEvaluationRow {
  evaluationId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  teamName: string | null;
  status: string;
  isLocked: boolean;
  calculatedScore: number | null;
  finalScore: number | null;
  latestAdjustmentReason: string | null;
  latestAdjustedAt: string | null;
  latestAdjustedByName: string | null;
}

export interface ScoreBucket {
  range: string;
  count: number;
  percentage: number;
}

export interface CalibrationDistribution {
  totalEvaluations: number;
  minScore: number | null;
  maxScore: number | null;
  averageScore: number | null;
  medianScore: number | null;
  buckets: ScoreBucket[];
}

export interface CalibrationSessionDetail {
  session: CalibrationSession;
  distribution: CalibrationDistribution;
  evaluations: CalibrationEvaluationRow[];
  adjustments: CalibrationAdjustment[];
}

export interface CreateSessionDTO {
  evaluation_cycle_id: string;
  scope_type: CalibrationScopeType;
  scope_id?: string | null;
}

export interface CreateAdjustmentDTO {
  evaluation_id: string;
  new_final_score: number;
  reason: string;
}
