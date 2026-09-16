import { z } from 'zod';

export type CalibrationScopeType = 'ORG' | 'DEPARTMENT' | 'TEAM';
export type CalibrationSessionStatus = 'OPEN' | 'FINALIZED';

export const CreateCalibrationSessionSchema = z.object({
  evaluation_cycle_id: z.string().uuid(),
  scope_type: z.enum(['ORG', 'DEPARTMENT', 'TEAM']),
  scope_id: z.string().uuid().optional().nullable(),
});

export type CreateCalibrationSessionInput = z.infer<typeof CreateCalibrationSessionSchema>;

export const CreateCalibrationAdjustmentSchema = z.object({
  evaluation_id: z.string().uuid(),
  new_final_score: z.number().min(0).max(100),
  reason: z.string().trim().min(3, 'Lý do điều chỉnh là bắt buộc và phải có ít nhất 3 ký tự.'),
});

export type CreateCalibrationAdjustmentInput = z.infer<typeof CreateCalibrationAdjustmentSchema>;

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
  buckets: ScoreBucket[];
}

export interface CalibrationSessionDetail {
  session: CalibrationSession;
  distribution: CalibrationDistribution;
  evaluations: CalibrationEvaluationRow[];
  adjustments: CalibrationAdjustment[];
}
