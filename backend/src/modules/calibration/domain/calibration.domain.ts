import { z } from 'zod';

export type CalibrationScopeType = 'ORG' | 'DEPARTMENT' | 'TEAM';
export type CalibrationSessionStatus = 'OPEN' | 'FINALIZED';

export const CreateCalibrationSessionSchema = z
  .object({
    evaluation_cycle_id: z.string().uuid({ message: 'Mã kỳ đánh giá không hợp lệ (phải là UUID).' }),
    scope_type: z.enum(['ORG', 'DEPARTMENT', 'TEAM']),
    scope_id: z.string().uuid({ message: 'Mã phạm vi không hợp lệ (phải là UUID).' }).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.scope_type !== 'ORG' && (!data.scope_id || data.scope_id.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scope_id'],
        message: 'Mã phạm vi (scope_id) là bắt buộc khi chọn phạm vi TEAM hoặc DEPARTMENT.',
      });
    }
  });

export type CreateCalibrationSessionInput = z.infer<typeof CreateCalibrationSessionSchema>;

export const CreateCalibrationAdjustmentSchema = z.object({
  evaluation_id: z.string().uuid({ message: 'Mã phiếu đánh giá không hợp lệ (phải là UUID).' }),
  new_final_score: z
    .number()
    .min(0, { message: 'Điểm số hiệu chuẩn không thể nhỏ hơn 0.' })
    .max(100, { message: 'Điểm số hiệu chuẩn không thể lớn hơn 100.' }),
  reason: z
    .string()
    .trim()
    .min(3, { message: 'Lý do điều chỉnh là bắt buộc và phải có ít nhất 3 ký tự.' }),
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
  medianScore: number | null;
  buckets: ScoreBucket[];
}

export interface CalibrationSessionDetail {
  session: CalibrationSession;
  distribution: CalibrationDistribution;
  evaluations: CalibrationEvaluationRow[];
  adjustments: CalibrationAdjustment[];
}
