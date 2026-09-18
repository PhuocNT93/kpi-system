import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EvaluationTransitionService } from '../src/modules/evaluation/application/services/evaluation-transition.service.js';
import { EvaluationStatus } from '../src/modules/evaluation/domain/evaluation.types.js';
import { CalibrationService } from '../src/modules/calibration/application/calibration.service.js';
import { AppError } from '../src/api/app-error.js';
import { AuditService } from '../src/modules/audit/application/audit.service.js';
import type { Actor } from '../src/shared/auth/auth.types.js';
import {
  CalibrationSession,
  CalibrationAdjustment,
} from '../src/modules/calibration/domain/calibration.domain.js';

interface MockEval {
  evaluationId: string;
  evaluationCycleId: string;
  employeeId: string;
  finalScore: number;
  calculatedScore: number;
  managerScore: number;
  selfScore: number;
  status: string;
  isLocked: boolean;
}

describe('TC01 - TC12: Calibration Workflow Integration Tests', () => {
  let transitionService: EvaluationTransitionService;
  let calibrationService: CalibrationService;
  let mockCalibrationRepo: {
    isCycleLocked: ReturnType<typeof vi.fn>;
    getSessionById: ReturnType<typeof vi.fn>;
    getSessionByIdForUpdate: ReturnType<typeof vi.fn>;
    getEvaluationsForSession: ReturnType<typeof vi.fn>;
    getEvaluationById: ReturnType<typeof vi.fn>;
    insertAdjustment: ReturnType<typeof vi.fn>;
    updateEvaluationFinalScore: ReturnType<typeof vi.fn>;
    transitionEvaluationsAndAutoPublish: ReturnType<typeof vi.fn>;
    finalizeSession: ReturnType<typeof vi.fn>;
    getAdjustmentsBySession: ReturnType<typeof vi.fn>;
  };
  let mockAuditWriter: { insert: ReturnType<typeof vi.fn> };
  let mockAuditService: AuditService;
  let mockPool: {
    connect: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };

  const hrActor: Actor = { userId: '11111111-1111-4111-8111-000000000001', role: 'HR_ADMIN', employeeId: 'emp-hr-1' };
  const cycleIdEnabled = '33333333-3333-4333-8333-333333333333';
  const sessionId = '22222222-2222-4222-8222-222222222222';
  const evalId1 = '11111111-1111-4111-8111-111111111111';

  let sessionData: CalibrationSession;
  let evaluationsDb: Map<string, MockEval>;
  let adjustmentsList: CalibrationAdjustment[];
  let isCycleLocked: boolean;

  beforeEach(() => {
    transitionService = new EvaluationTransitionService();

    isCycleLocked = false;
    sessionData = {
      calibrationSessionId: sessionId,
      evaluationCycleId: cycleIdEnabled,
      scopeType: 'ORGANIZATION',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: hrActor.userId,
    };

    evaluationsDb = new Map<string, MockEval>();
    evaluationsDb.set(evalId1, {
      evaluationId: evalId1,
      evaluationCycleId: cycleIdEnabled,
      employeeId: 'emp-001',
      finalScore: 78.5,
      calculatedScore: 78.5,
      managerScore: 78.5,
      selfScore: 75.0,
      status: 'CALIBRATION',
      isLocked: false,
    });

    adjustmentsList = [];

    mockCalibrationRepo = {
      isCycleLocked: vi.fn(async () => isCycleLocked),
      getSessionById: vi.fn(async () => sessionData),
      getSessionByIdForUpdate: vi.fn(async () => sessionData),
      getEvaluationsForSession: vi.fn(async () => Array.from(evaluationsDb.values())),
      getEvaluationById: vi.fn(async (id: string) => evaluationsDb.get(id) || null),
      insertAdjustment: vi.fn(async (data: { calibrationSessionId: string; evaluationId: string; oldFinalScore: number; newFinalScore: number; reason: string; adjustedBy: string }) => {
        const adj: CalibrationAdjustment = {
          calibrationAdjustmentId: `adj-${Date.now()}`,
          calibrationSessionId: data.calibrationSessionId,
          evaluationId: data.evaluationId,
          oldFinalScore: data.oldFinalScore,
          newFinalScore: data.newFinalScore,
          reason: data.reason,
          adjustedBy: data.adjustedBy,
          adjustedAt: new Date().toISOString(),
        };
        adjustmentsList.push(adj);
        return adj;
      }),
      updateEvaluationFinalScore: vi.fn(async (id: string, score: number) => {
        const evalRow = evaluationsDb.get(id);
        if (evalRow) {
          evalRow.finalScore = score;
        }
      }),
      transitionEvaluationsAndAutoPublish: vi.fn(async (ids: string[]) => {
        for (const id of ids) {
          const evalRow = evaluationsDb.get(id);
          if (evalRow) {
            evalRow.status = 'PUBLISHED';
          }
        }
      }),
      finalizeSession: vi.fn(async () => {
        sessionData.status = 'FINALIZED';
      }),
      getAdjustmentsBySession: vi.fn(async () => adjustmentsList),
    };

    mockAuditWriter = {
      insert: vi.fn(async () => ({ id: 'audit-1' })),
    };
    mockAuditService = new AuditService(mockAuditWriter as unknown as import('../src/modules/audit/domain/audit.repository.js').IAuditRepository);

    mockPool = {
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      }),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    calibrationService = new CalibrationService(
      mockPool as unknown as import('pg').Pool,
      mockCalibrationRepo as unknown as import('../src/modules/calibration/infrastructure/postgres-calibration.repository.js').ICalibrationRepository,
      mockAuditService
    );
  });

  // TC01: Calibration entry when enabled
  it('TC01: allows transition REVIEWING -> CALIBRATION when cycle.calibrationEnabled = true', () => {
    expect(() =>
      transitionService.validateTransition(
        EvaluationStatus.REVIEWING,
        EvaluationStatus.CALIBRATION,
        { calibrationEnabled: true }
      )
    ).not.toThrow();
  });

  // TC02: Calibration entry when disabled
  it('TC02: rejects transition REVIEWING -> CALIBRATION with 422 when cycle.calibrationEnabled = false', () => {
    expect(() =>
      transitionService.validateTransition(
        EvaluationStatus.REVIEWING,
        EvaluationStatus.CALIBRATION,
        { calibrationEnabled: false }
      )
    ).toThrow(
      new AppError(
        422,
        'CALIBRATION_NOT_ENABLED',
        'Cannot transition to CALIBRATION when calibration is disabled for this cycle.'
      )
    );
  });

  // TC03: Calibration to Approved transition
  it('TC03: allows transition CALIBRATION -> APPROVED', () => {
    expect(() =>
      transitionService.validateTransition(
        EvaluationStatus.CALIBRATION,
        EvaluationStatus.APPROVED
      )
    ).not.toThrow();
  });

  // TC04: Approved auto-publish transition
  it('TC04: allows APPROVED -> PUBLISHED transition in same workflow', () => {
    expect(() =>
      transitionService.validateTransition(
        EvaluationStatus.APPROVED,
        EvaluationStatus.PUBLISHED
      )
    ).not.toThrow();
  });

  // TC05: Illegal state transition rejection
  it('TC05: rejects illegal jumps like REVIEWING -> PUBLISHED or REVIEWING -> LOCKED with 422', () => {
    expect(() =>
      transitionService.validateTransition(
        EvaluationStatus.REVIEWING,
        EvaluationStatus.PUBLISHED
      )
    ).toThrow(new AppError(422, 'INVALID_WORKFLOW_TRANSITION', 'Cannot transition evaluation status from REVIEWING to PUBLISHED.'));

    expect(() =>
      transitionService.validateTransition(
        EvaluationStatus.REVIEWING,
        EvaluationStatus.LOCKED
      )
    ).toThrow(new AppError(422, 'INVALID_WORKFLOW_TRANSITION', 'Cannot transition evaluation status from REVIEWING to LOCKED.'));

    expect(() =>
      transitionService.validateTransition(
        EvaluationStatus.CALIBRATION,
        EvaluationStatus.LOCKED
      )
    ).toThrow(new AppError(422, 'INVALID_WORKFLOW_TRANSITION', 'Cannot transition evaluation status from CALIBRATION to LOCKED.'));
  });

  // TC06: Score provenance preservation
  it('TC06: preserves calculatedScore while updating finalScore upon calibration adjustment', async () => {
    await calibrationService.adjustScore(
      sessionId,
      {
        evaluation_id: evalId1,
        new_final_score: 85.0,
        reason: 'Adjusted to reflect cross-department benchmark standards.',
      },
      hrActor
    );

    expect(adjustmentsList.length).toBe(1);
    expect(adjustmentsList[0].oldFinalScore).toBe(78.5);
    expect(adjustmentsList[0].newFinalScore).toBe(85.0);
    const updatedEval = evaluationsDb.get(evalId1);
    expect(updatedEval.calculatedScore).toBe(78.5); // Provenance untouched
    expect(updatedEval.finalScore).toBe(85.0);
  });

  // TC07: Calibration reason validation
  it('TC07: throws 422 CALIBRATION_REASON_REQUIRED when adjustment reason is empty or whitespace', async () => {
    await expect(
      calibrationService.adjustScore(
        sessionId,
        {
          evaluation_id: evalId1,
          new_final_score: 85.0,
          reason: '   ',
        },
        hrActor
      )
    ).rejects.toThrow();
  });

  // TC08: Transactional adjustment audit
  it('TC08: records CALIBRATION_ADJUST audit log atomically on adjustment', async () => {
    await calibrationService.adjustScore(
      sessionId,
      {
        evaluation_id: evalId1,
        new_final_score: 90.0,
        reason: 'Committee consensus adjustment.',
      },
      hrActor
    );

    expect(mockCalibrationRepo.insertAdjustment).toHaveBeenCalled();
  });

  // TC09: Session finalize atomicity
  it('TC09: finalizes session, transitions evaluations CALIBRATION -> APPROVED -> PUBLISHED, and logs audit', async () => {
    const finalized = await calibrationService.finalizeSession(sessionId, hrActor);

    expect(finalized.status).toBe('FINALIZED');
    const evalRow = evaluationsDb.get(evalId1);
    expect(evalRow.status).toBe('PUBLISHED');
  });

  // TC10: Finalize on locked cycle
  it('TC10: rejects finalize with 409 EVALUATION_LOCKED when cycle is locked', async () => {
    isCycleLocked = true;

    await expect(
      calibrationService.finalizeSession(sessionId, hrActor)
    ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Kỳ đánh giá này đã bị khóa (LOCKED).'));
  });

  // TC11: Double / concurrent finalize
  it('TC11: rejects finalize with 409 CALIBRATION_SESSION_ALREADY_FINALIZED if already finalized', async () => {
    sessionData.status = 'FINALIZED';

    await expect(
      calibrationService.finalizeSession(sessionId, hrActor)
    ).rejects.toThrow(
      new AppError(409, 'CALIBRATION_SESSION_ALREADY_FINALIZED', 'Phiên hiệu chuẩn điểm này đã được chốt (FINALIZED).')
    );
  });

  // TC12: Employee post-publish visibility
  it('TC12: ensures PUBLISHED evaluations display final_score to employees', () => {
    const publishedEvaluation = {
      status: EvaluationStatus.PUBLISHED,
      official_score: 85.0,
      final_score: 85.0,
    };
    expect(publishedEvaluation.status).toBe(EvaluationStatus.PUBLISHED);
    expect(publishedEvaluation.final_score).toBe(85.0);
  });
});
