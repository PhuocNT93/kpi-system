import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pool } from 'pg';
import express, { Express, RequestHandler } from 'express';
import request from 'supertest';
import { EvaluationTransitionService } from '../src/modules/evaluation/application/services/evaluation-transition.service.js';
import { EvaluationService } from '../src/modules/evaluation/application/services/evaluation.service.js';
import { EvaluationController } from '../src/modules/evaluation/api/evaluation.controller.js';
import { createEvaluationRouter } from '../src/modules/evaluation/api/evaluation.router.js';
import { EvaluationStatus, Evaluation, EvaluationItem } from '../src/modules/evaluation/domain/evaluation.types.js';
import { IEvaluationRepository, IEvaluationItemRepository } from '../src/modules/evaluation/domain/repositories.interface.js';
import { AppError } from '../src/api/app-error.js';
import { errorHandler } from '../src/api/error-handler.js';
import { Actor } from '../src/shared/auth/types.js';
import { AuditService } from '../src/modules/audit/application/audit.service.js';

describe('Task 43: Evaluation Workflow State Machine', () => {
  describe('EvaluationTransitionService - Transition Matrix & Guards', () => {
    const transitionService = new EvaluationTransitionService();

    it('allows valid sequential forward transitions', () => {
      expect(() => transitionService.validateTransition(EvaluationStatus.OPEN, EvaluationStatus.SUBMITTED)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.SUBMITTED, EvaluationStatus.MANAGER_REVIEW)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.MANAGER_REVIEW, EvaluationStatus.APPROVED)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.APPROVED, EvaluationStatus.PUBLISHED)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.PUBLISHED, EvaluationStatus.LOCKED)).not.toThrow();
    });

    it('allows direct approval from OPEN or SUBMITTED', () => {
      expect(() => transitionService.validateTransition(EvaluationStatus.OPEN, EvaluationStatus.APPROVED)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.SUBMITTED, EvaluationStatus.APPROVED)).not.toThrow();
    });

    it('allows rejection from OPEN, SUBMITTED, or MANAGER_REVIEW', () => {
      expect(() => transitionService.validateTransition(EvaluationStatus.OPEN, EvaluationStatus.REJECTED)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.SUBMITTED, EvaluationStatus.REJECTED)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.MANAGER_REVIEW, EvaluationStatus.REJECTED)).not.toThrow();
    });

    it('allows request-correction (revision) transition back to OPEN from SUBMITTED or MANAGER_REVIEW', () => {
      expect(() => transitionService.validateTransition(EvaluationStatus.SUBMITTED, EvaluationStatus.OPEN)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.MANAGER_REVIEW, EvaluationStatus.OPEN)).not.toThrow();
    });

    it('is idempotent when transitioning to the same status', () => {
      expect(() => transitionService.validateTransition(EvaluationStatus.OPEN, EvaluationStatus.OPEN)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.SUBMITTED, EvaluationStatus.SUBMITTED)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.APPROVED, EvaluationStatus.APPROVED)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.PUBLISHED, EvaluationStatus.PUBLISHED)).not.toThrow();
      expect(() => transitionService.validateTransition(EvaluationStatus.LOCKED, EvaluationStatus.LOCKED)).not.toThrow();
    });

    it('rejects invalid jumps (e.g. OPEN -> PUBLISHED, SUBMITTED -> PUBLISHED)', () => {
      expect(() => transitionService.validateTransition(EvaluationStatus.OPEN, EvaluationStatus.PUBLISHED)).toThrow(
        new AppError(400, 'INVALID_STATUS', `Cannot transition evaluation status from ${EvaluationStatus.OPEN} to ${EvaluationStatus.PUBLISHED}.`)
      );
      expect(() => transitionService.validateTransition(EvaluationStatus.SUBMITTED, EvaluationStatus.PUBLISHED)).toThrow(
        new AppError(400, 'INVALID_STATUS', `Cannot transition evaluation status from ${EvaluationStatus.SUBMITTED} to ${EvaluationStatus.PUBLISHED}.`)
      );
    });

    it('rejects transitions from terminal or finalized states (e.g. APPROVED -> OPEN, REJECTED -> APPROVED, LOCKED -> any)', () => {
      expect(() => transitionService.validateTransition(EvaluationStatus.APPROVED, EvaluationStatus.OPEN)).toThrow(AppError);
      expect(() => transitionService.validateTransition(EvaluationStatus.APPROVED, EvaluationStatus.SUBMITTED)).toThrow(AppError);
      expect(() => transitionService.validateTransition(EvaluationStatus.REJECTED, EvaluationStatus.APPROVED)).toThrow(AppError);
      expect(() => transitionService.validateTransition(EvaluationStatus.PUBLISHED, EvaluationStatus.OPEN)).toThrow(AppError);
      expect(() => transitionService.validateTransition(EvaluationStatus.LOCKED, EvaluationStatus.OPEN)).toThrow(AppError);
      expect(() => transitionService.validateTransition(EvaluationStatus.LOCKED, EvaluationStatus.APPROVED)).toThrow(AppError);
    });
  });

  describe('Submittable Criteria Validation (DoD: Block submission if required criteria incomplete)', () => {
    const transitionService = new EvaluationTransitionService();

    const baseEval: Evaluation = {
      evaluation_id: 'eval-1',
      evaluation_cycle_id: 'cycle-1',
      employee_id: 'emp-1',
      team_id_snapshot: 'team-1',
      role_id_snapshot: 'role-1',
      status: EvaluationStatus.OPEN,
      is_locked: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const completeItem1: EvaluationItem = {
      evaluation_item_id: 'item-1',
      evaluation_id: 'eval-1',
      template_criterion_id: 'crit-1',
      criterion_code_snapshot: 'CODE_QUALITY',
      criterion_name_snapshot: 'Code Quality',
      weight_snapshot: 0.5,
      scoring_rule_snapshot: {},
      level_definition_snapshot: [],
      resolved_level: 4,
      is_disabled_for_employee: false,
      is_missing_score: false,
    };

    const completeItem2: EvaluationItem = {
      evaluation_item_id: 'item-2',
      evaluation_id: 'eval-1',
      template_criterion_id: 'crit-2',
      criterion_code_snapshot: 'DELIVERY',
      criterion_name_snapshot: 'On-time Delivery',
      weight_snapshot: 0.5,
      scoring_rule_snapshot: {},
      level_definition_snapshot: [],
      resolved_level: 5,
      is_disabled_for_employee: false,
      is_missing_score: false,
    };

    it('allows submission when all active criteria have scores', () => {
      expect(() => transitionService.validateSubmittable(baseEval, [completeItem1, completeItem2])).not.toThrow();
    });

    it('blocks submission when an active criterion has is_missing_score: true', () => {
      const missingItem: EvaluationItem = {
        ...completeItem2,
        is_missing_score: true,
      };

      expect(() => transitionService.validateSubmittable(baseEval, [completeItem1, missingItem])).toThrow(
        new AppError(400, 'INCOMPLETE_EVALUATION', 'Cannot submit evaluation: 1 required criteria are incomplete or missing scores (DELIVERY).')
      );
    });

    it('blocks submission when an active criterion has resolved_level: null/undefined and no raw_score', () => {
      const incompleteItem: EvaluationItem = {
        ...completeItem1,
        resolved_level: null,
        raw_score: null,
      };

      expect(() => transitionService.validateSubmittable(baseEval, [incompleteItem, completeItem2])).toThrow(
        new AppError(400, 'INCOMPLETE_EVALUATION', 'Cannot submit evaluation: 1 required criteria are incomplete or missing scores (CODE_QUALITY).')
      );
    });

    it('ignores disabled criteria (is_disabled_for_employee: true)', () => {
      const disabledItem: EvaluationItem = {
        evaluation_item_id: 'item-disabled',
        evaluation_id: 'eval-1',
        template_criterion_id: 'crit-disabled',
        criterion_code_snapshot: 'MANAGEMENT',
        criterion_name_snapshot: 'Management Skills',
        weight_snapshot: 0,
        scoring_rule_snapshot: {},
        level_definition_snapshot: [],
        resolved_level: null,
        is_disabled_for_employee: true,
        is_missing_score: true,
      };

      expect(() => transitionService.validateSubmittable(baseEval, [completeItem1, completeItem2, disabledItem])).not.toThrow();
    });

    it('blocks submission if evaluation is already locked', () => {
      const lockedEval = { ...baseEval, is_locked: true };
      expect(() => transitionService.validateSubmittable(lockedEval, [completeItem1])).toThrow(
        new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.')
      );
    });

    it('blocks submission if evaluation status is not OPEN', () => {
      const submittedEval = { ...baseEval, status: EvaluationStatus.SUBMITTED };
      expect(() => transitionService.validateSubmittable(submittedEval, [completeItem1])).toThrow(
        new AppError(400, 'INVALID_STATUS', 'Can only submit when evaluation is OPEN.')
      );
    });
  });

  describe('EvaluationService.submitEvaluation - Concurrency, Idempotency & Audit', () => {
    let mockClient: {
      query: ReturnType<typeof vi.fn>;
      release: ReturnType<typeof vi.fn>;
    };

    let mockPool: {
      connect: ReturnType<typeof vi.fn>;
      query: ReturnType<typeof vi.fn>;
    };

    let mockEvaluationRepo: {
      findById: ReturnType<typeof vi.fn>;
      findByIdForUpdate: ReturnType<typeof vi.fn>;
      findMyEvaluations: ReturnType<typeof vi.fn>;
      findTeamEvaluations: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      batchCreate: ReturnType<typeof vi.fn>;
    };

    let mockEvaluationItemRepo: {
      findByEvaluationId: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      batchUpdate: ReturnType<typeof vi.fn>;
      batchCreate: ReturnType<typeof vi.fn>;
      updateScoringResult: ReturnType<typeof vi.fn>;
      findByCycleEmployeeKpi: ReturnType<typeof vi.fn>;
    };

    let mockAuditService: {
      record: ReturnType<typeof vi.fn>;
    };

    let service: EvaluationService;
    let controller: EvaluationController;
    let app: Express;
    let currentActor: Actor;

    const employeeActor: Actor = {
      userId: 'user-emp-1',
      employeeId: 'emp-1',
      role: 'EMPLOYEE',
    };

    const otherEmployeeActor: Actor = {
      userId: 'user-emp-2',
      employeeId: 'emp-2',
      role: 'EMPLOYEE',
    };

    const baseOpenEval: Evaluation = {
      evaluation_id: 'eval-1',
      evaluation_cycle_id: 'cycle-1',
      employee_id: 'emp-1',
      team_id_snapshot: 'team-1',
      role_id_snapshot: 'role-1',
      manager_id_snapshot: 'emp-mgr',
      status: EvaluationStatus.OPEN,
      is_locked: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const completeItem: EvaluationItem = {
      evaluation_item_id: 'item-1',
      evaluation_id: 'eval-1',
      template_criterion_id: 'crit-1',
      criterion_code_snapshot: 'CODE_QUALITY',
      criterion_name_snapshot: 'Code Quality',
      weight_snapshot: 1.0,
      scoring_rule_snapshot: {},
      level_definition_snapshot: [],
      resolved_level: 4,
      is_disabled_for_employee: false,
      is_missing_score: false,
    };

    beforeEach(() => {
      vi.clearAllMocks();

      mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: vi.fn(),
      };

      mockPool = {
        connect: vi.fn().mockResolvedValue(mockClient),
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      };

      mockEvaluationRepo = {
        findById: vi.fn(),
        findByIdForUpdate: vi.fn(),
        findMyEvaluations: vi.fn(),
        findTeamEvaluations: vi.fn(),
        update: vi.fn(),
        batchCreate: vi.fn(),
      };

      mockEvaluationItemRepo = {
        findByEvaluationId: vi.fn(),
        update: vi.fn(),
        batchUpdate: vi.fn(),
        batchCreate: vi.fn(),
        updateScoringResult: vi.fn(),
        findByCycleEmployeeKpi: vi.fn(),
      };

      mockAuditService = {
        record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      };

      service = new EvaluationService(
        mockEvaluationRepo as unknown as IEvaluationRepository,
        mockEvaluationItemRepo as unknown as IEvaluationItemRepository,
        mockPool as unknown as Pool,
        mockAuditService as unknown as AuditService
      );

      controller = new EvaluationController(service);

      const testAuthMiddleware: RequestHandler = (req, _res, next) => {
        (req as unknown as { user: Actor }).user = currentActor;
        next();
      };

      app = express();
      app.use(express.json());
      app.use('/evaluations', createEvaluationRouter(controller, testAuthMiddleware));
      app.use(errorHandler);

      currentActor = employeeActor;
    });

    it('submits successfully with row-level lock and creates audit in transaction', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...baseOpenEval });
      mockEvaluationItemRepo.findByEvaluationId.mockResolvedValue([completeItem]);
      mockEvaluationRepo.update.mockResolvedValue({
        ...baseOpenEval,
        status: EvaluationStatus.SUBMITTED,
      });

      const res = await service.submitEvaluation('eval-1', employeeActor);

      expect(mockEvaluationRepo.findByIdForUpdate).toHaveBeenCalledWith('eval-1', mockClient);
      expect(mockEvaluationItemRepo.findByEvaluationId).toHaveBeenCalledWith('eval-1', mockClient);
      expect(mockEvaluationRepo.update).toHaveBeenCalledWith(
        'eval-1',
        expect.objectContaining({
          status: EvaluationStatus.SUBMITTED,
          updated_by: employeeActor.userId,
        }),
        mockClient
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          entityType: 'EVALUATION',
          entityId: 'eval-1',
          action: 'SUBMIT',
          performedBy: employeeActor.userId,
        })
      );
      expect(res.status).toBe(EvaluationStatus.SUBMITTED);
    });

    it('is idempotent: returning current evaluation cleanly when already SUBMITTED', async () => {
      const alreadySubmittedEval: Evaluation = {
        ...baseOpenEval,
        status: EvaluationStatus.SUBMITTED,
      };
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue(alreadySubmittedEval);

      const res = await service.submitEvaluation('eval-1', employeeActor);

      expect(res.status).toBe(EvaluationStatus.SUBMITTED);
      expect(mockEvaluationRepo.update).not.toHaveBeenCalled();
      expect(mockAuditService.record).not.toHaveBeenCalled();
    });

    it('rejects other employees from submitting with 403 FORBIDDEN', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...baseOpenEval });

      await expect(service.submitEvaluation('eval-1', otherEmployeeActor)).rejects.toThrow(
        new AppError(403, 'FORBIDDEN', 'Access denied.')
      );
    });

    it('rejects submission when required criteria lack scores with 400 INCOMPLETE_EVALUATION', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...baseOpenEval });
      mockEvaluationItemRepo.findByEvaluationId.mockResolvedValue([
        { ...completeItem, resolved_level: null, raw_score: null },
      ]);

      await expect(service.submitEvaluation('eval-1', employeeActor)).rejects.toThrow(
        new AppError(400, 'INCOMPLETE_EVALUATION', 'Cannot submit evaluation: 1 required criteria are incomplete or missing scores (CODE_QUALITY).')
      );
      expect(mockEvaluationRepo.update).not.toHaveBeenCalled();
    });

    it('HTTP POST /evaluations/:id/submit returns 200 on success and 400 when criteria incomplete', async () => {
      // Incomplete case
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...baseOpenEval });
      mockEvaluationItemRepo.findByEvaluationId.mockResolvedValue([
        { ...completeItem, resolved_level: null, raw_score: null },
      ]);

      const resIncomplete = await request(app).post('/evaluations/eval-1/submit');
      expect(resIncomplete.status).toBe(400);
      expect(resIncomplete.body.meta.error.code).toBe('INCOMPLETE_EVALUATION');

      // Complete case
      mockEvaluationItemRepo.findByEvaluationId.mockResolvedValue([completeItem]);
      mockEvaluationRepo.update.mockResolvedValue({
        ...baseOpenEval,
        status: EvaluationStatus.SUBMITTED,
      });

      const resSuccess = await request(app).post('/evaluations/eval-1/submit');
      expect(resSuccess.status).toBe(200);
      expect(resSuccess.body.success).toBe(true);
      expect(resSuccess.body.data.status).toBe(EvaluationStatus.SUBMITTED);
    });
  });
});
