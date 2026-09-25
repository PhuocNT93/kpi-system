import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pool } from 'pg';
import express, { Express, RequestHandler } from 'express';
import request from 'supertest';
import { EvaluationService } from '../src/modules/evaluation/application/services/evaluation.service.js';
import { EvaluationController } from '../src/modules/evaluation/api/evaluation.controller.js';
import { createEvaluationRouter } from '../src/modules/evaluation/api/evaluation.router.js';
import { EvaluationStatus, Evaluation, EvaluationItem } from '../src/modules/evaluation/domain/evaluation.types.js';
import { IEvaluationRepository, IEvaluationItemRepository } from '../src/modules/evaluation/domain/repositories.interface.js';
import { AppError } from '../src/api/app-error.js';
import { errorHandler } from '../src/api/error-handler.js';
import { Actor } from '../src/shared/auth/types.js';
import { AuditService } from '../src/modules/audit/application/audit.service.js';

describe('Task 45: Publish & Lock Commands, Idempotency and Locked Protections', () => {
  let mockPublishedHandler: { onEvaluationsPublished: ReturnType<typeof vi.fn> };
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

  const hrAdminActor: Actor = {
    userId: 'user-hr',
    employeeId: 'emp-hr',
    role: 'HR_ADMIN',
  };

  const systemAdminActor: Actor = {
    userId: 'user-sysadmin',
    employeeId: 'emp-sysadmin',
    role: 'SYSTEM_ADMIN',
  };

  const managerActor: Actor = {
    userId: 'user-mgr',
    employeeId: 'emp-mgr',
    role: 'MANAGER',
    managedTeamIds: ['team-alpha'],
  };

  const employeeActor: Actor = {
    userId: 'user-emp-1',
    employeeId: 'emp-1',
    role: 'EMPLOYEE',
  };

  const sampleApprovedEvaluation: Evaluation = {
    evaluation_id: 'eval-1',
    evaluation_cycle_id: 'cycle-1',
    employee_id: 'emp-1',
    team_id_snapshot: 'team-alpha',
    role_id_snapshot: 'role-dev',
    manager_id_snapshot: 'emp-mgr',
    status: EvaluationStatus.APPROVED,
    is_locked: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const samplePublishedEvaluation: Evaluation = {
    ...sampleApprovedEvaluation,
    evaluation_id: 'eval-pub',
    status: EvaluationStatus.PUBLISHED,
    published_at: new Date(),
    published_by: 'user-hr',
    is_locked: false,
  };

  const sampleLockedEvaluation: Evaluation = {
    ...sampleApprovedEvaluation,
    evaluation_id: 'eval-locked',
    status: EvaluationStatus.LOCKED,
    is_locked: true,
    locked_at: new Date(),
    locked_by: 'user-hr',
  };

  const sampleItem: EvaluationItem = {
    evaluation_item_id: 'item-1',
    evaluation_id: 'eval-1',
    template_criterion_id: 'crit-1',
    criterion_code_snapshot: 'CODE_REVIEW',
    criterion_name_snapshot: 'Code Review Quality',
    weight_snapshot: 0.5,
    kpi_id_snapshot: 'kpi-1',
    scoring_rule_snapshot: {},
    level_definition_snapshot: [],
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

    mockPublishedHandler = { onEvaluationsPublished: vi.fn().mockResolvedValue(undefined) };
    service = new EvaluationService(
      mockEvaluationRepo as unknown as IEvaluationRepository,
      mockEvaluationItemRepo as unknown as IEvaluationItemRepository,
      mockPool as unknown as Pool,
      mockAuditService as unknown as AuditService,
      undefined,
      undefined,
      undefined,
      mockPublishedHandler
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

    currentActor = hrAdminActor;
  });

  describe('Publish Evaluation', () => {
    it('allows HR_ADMIN to publish an APPROVED evaluation and records audit in transaction', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleApprovedEvaluation });
      mockEvaluationRepo.update.mockResolvedValue({
        ...sampleApprovedEvaluation,
        status: EvaluationStatus.PUBLISHED,
        published_by: hrAdminActor.userId,
      });

      const result = await service.publishEvaluation('eval-1', hrAdminActor);

      expect(mockEvaluationRepo.findByIdForUpdate).toHaveBeenCalledWith('eval-1', mockClient);
      expect(mockEvaluationRepo.update).toHaveBeenCalledWith(
        'eval-1',
        expect.objectContaining({
          status: EvaluationStatus.PUBLISHED,
          published_by: hrAdminActor.userId,
        }),
        mockClient
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          entityType: 'EVALUATION',
          entityId: 'eval-1',
          action: 'PUBLISH',
          performedBy: hrAdminActor.userId,
        })
      );
      // EVAL-06: review schedule updated in the same transaction client as the publish
      expect(mockPublishedHandler.onEvaluationsPublished).toHaveBeenCalledWith(
        mockClient,
        [{ evaluationId: 'eval-1', employeeId: sampleApprovedEvaluation.employee_id, publishedAt: expect.any(Date) }],
        hrAdminActor.userId
      );
      expect(result.status).toBe(EvaluationStatus.PUBLISHED);
    });

    it('allows SYSTEM_ADMIN to publish an APPROVED evaluation', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleApprovedEvaluation });
      mockEvaluationRepo.update.mockResolvedValue({
        ...sampleApprovedEvaluation,
        status: EvaluationStatus.PUBLISHED,
      });

      const result = await service.publishEvaluation('eval-1', systemAdminActor);
      expect(result.status).toBe(EvaluationStatus.PUBLISHED);
    });

    it('rejects MANAGER or EMPLOYEE with 403 FORBIDDEN', async () => {
      await expect(service.publishEvaluation('eval-1', managerActor)).rejects.toThrow(
        new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can publish evaluations.')
      );
      await expect(service.publishEvaluation('eval-1', employeeActor)).rejects.toThrow(
        new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can publish evaluations.')
      );
    });

    it('is idempotent when evaluation is already PUBLISHED', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...samplePublishedEvaluation });

      const result = await service.publishEvaluation('eval-pub', hrAdminActor);

      expect(result.status).toBe(EvaluationStatus.PUBLISHED);
      expect(mockEvaluationRepo.update).not.toHaveBeenCalled();
      expect(mockAuditService.record).not.toHaveBeenCalled();
    });

    it('rejects publishing when evaluation is not in APPROVED status (e.g. OPEN, SUBMITTED)', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({
        ...sampleApprovedEvaluation,
        status: EvaluationStatus.SUBMITTED,
      });

      await expect(service.publishEvaluation('eval-1', hrAdminActor)).rejects.toThrow(
        new AppError(400, 'INVALID_STATUS', 'Evaluation must be APPROVED before it can be published.')
      );
    });

    it('rejects publishing when evaluation is locked with 409 EVALUATION_LOCKED', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

      await expect(service.publishEvaluation('eval-locked', hrAdminActor)).rejects.toThrow(
        new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.')
      );
    });
  });

  describe('Lock Evaluation & Idempotency', () => {
    it('allows HR_ADMIN to lock an APPROVED evaluation and records audit in transaction', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleApprovedEvaluation });
      mockEvaluationRepo.update.mockResolvedValue({
        ...sampleApprovedEvaluation,
        status: EvaluationStatus.LOCKED,
        is_locked: true,
        locked_by: hrAdminActor.userId,
      });

      const result = await service.lockEvaluation('eval-1', hrAdminActor);

      expect(mockEvaluationRepo.findByIdForUpdate).toHaveBeenCalledWith('eval-1', mockClient);
      expect(mockEvaluationRepo.update).toHaveBeenCalledWith(
        'eval-1',
        expect.objectContaining({
          status: EvaluationStatus.LOCKED,
          is_locked: true,
          locked_by: hrAdminActor.userId,
        }),
        mockClient
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          entityType: 'EVALUATION',
          entityId: 'eval-1',
          action: 'LOCK',
          performedBy: hrAdminActor.userId,
        })
      );
      expect(result.is_locked).toBe(true);
      expect(result.status).toBe(EvaluationStatus.LOCKED);
    });

    it('allows HR_ADMIN to lock a PUBLISHED evaluation', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...samplePublishedEvaluation });
      mockEvaluationRepo.update.mockResolvedValue({
        ...samplePublishedEvaluation,
        status: EvaluationStatus.LOCKED,
        is_locked: true,
      });

      const result = await service.lockEvaluation('eval-pub', hrAdminActor);
      expect(result.is_locked).toBe(true);
      expect(result.status).toBe(EvaluationStatus.LOCKED);
    });

    it('rejects locking when evaluation is in OPEN or SUBMITTED status with 400 INVALID_STATUS', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({
        ...sampleApprovedEvaluation,
        status: EvaluationStatus.OPEN,
      });

      await expect(service.lockEvaluation('eval-1', hrAdminActor)).rejects.toThrow(
        new AppError(400, 'INVALID_STATUS', 'Evaluation must be APPROVED or PUBLISHED before locking.')
      );
    });

    it('is idempotent on repeated lock by returning the locked evaluation without side-effects', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

      const result = await service.lockEvaluation('eval-locked', hrAdminActor);

      expect(result.is_locked).toBe(true);
      expect(result.status).toBe(EvaluationStatus.LOCKED);
      expect(mockEvaluationRepo.update).not.toHaveBeenCalled();
      expect(mockAuditService.record).not.toHaveBeenCalled();
    });

    it('returns conflict 409 EVALUATION_LOCKED when throwOnConflict option is true', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

      await expect(
        service.lockEvaluation('eval-locked', hrAdminActor, { throwOnConflict: true })
      ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is already locked.'));
    });

    it('rejects MANAGER and EMPLOYEE from locking with 403 FORBIDDEN', async () => {
      await expect(service.lockEvaluation('eval-1', managerActor)).rejects.toThrow(
        new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can lock evaluations.')
      );
      await expect(service.lockEvaluation('eval-1', employeeActor)).rejects.toThrow(
        new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can lock evaluations.')
      );
    });
  });

  describe('Write Paths Protection: All Write Operations Reject Locked Evaluation with 409', () => {
    describe('When evaluation.is_locked is true', () => {
      it('rejects saveItemDraft (criterion-level draft) with 409', async () => {
        mockEvaluationRepo.findById.mockResolvedValue({ ...sampleLockedEvaluation });

        await expect(
          service.saveItemDraft('eval-locked', 'item-1', hrAdminActor, { resolved_level: 4 })
        ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.'));
        expect(mockEvaluationItemRepo.update).not.toHaveBeenCalled();
      });

      it('rejects saveDraft (batch criteria draft) with 409', async () => {
        mockEvaluationRepo.findById.mockResolvedValue({ ...sampleLockedEvaluation });

        await expect(
          service.saveDraft('eval-locked', hrAdminActor, [{ id: 'item-1', resolved_level: 4 }])
        ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.'));
        expect(mockEvaluationItemRepo.batchUpdate).not.toHaveBeenCalled();
      });

      it('rejects submitEvaluation with 409', async () => {
        mockEvaluationRepo.findById.mockResolvedValue({
          ...sampleLockedEvaluation,
          employee_id: employeeActor.employeeId,
        });

        await expect(service.submitEvaluation('eval-locked', employeeActor)).rejects.toThrow(
          new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.')
        );
      });

      it('rejects reviewEvaluation with 409', async () => {
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

        await expect(service.reviewEvaluation('eval-locked', hrAdminActor)).rejects.toThrow(
          new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.')
        );
      });

      it('rejects approveEvaluation with 409', async () => {
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

        await expect(service.approveEvaluation('eval-locked', hrAdminActor)).rejects.toThrow(
          new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.')
        );
      });

      it('rejects rejectEvaluation with 409', async () => {
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

        await expect(
          service.rejectEvaluation('eval-locked', hrAdminActor, { reason: 'Reject reason' })
        ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.'));
      });

      it('rejects requestCorrection with 409', async () => {
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

        await expect(
          service.requestCorrection('eval-locked', hrAdminActor, { reason: 'Fix this' })
        ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.'));
      });

      it('rejects recalculateEvaluation with 409', async () => {
        mockEvaluationRepo.findById.mockResolvedValue({ ...sampleLockedEvaluation });

        await expect(service.recalculateEvaluation('eval-locked', hrAdminActor)).rejects.toThrow(
          new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked and cannot be recalculated.')
        );
      });

      it('rejects overrideKpiScore (KPI-level manual override) with 409', async () => {
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });
        mockEvaluationItemRepo.findByEvaluationId.mockResolvedValue([sampleItem]);

        await expect(
          service.overrideKpiScore('eval-locked', 'kpi-1', hrAdminActor, {
            manual_override_score: 95,
            override_reason: 'Testing override on locked',
          })
        ).rejects.toThrow(
          new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked. Scores cannot be overridden.')
        );
      });

      it('rejects publishEvaluation with 409', async () => {
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

        await expect(service.publishEvaluation('eval-locked', hrAdminActor)).rejects.toThrow(
          new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.')
        );
      });
    });

    describe('When evaluation status is LOCKED even if is_locked flag is not set', () => {
      const statusLockedEvaluation: Evaluation = {
        ...sampleApprovedEvaluation,
        status: EvaluationStatus.LOCKED,
        is_locked: false,
      };

      it('rejects saveItemDraft with 409', async () => {
        mockEvaluationRepo.findById.mockResolvedValue(statusLockedEvaluation);

        await expect(
          service.saveItemDraft('eval-1', 'item-1', hrAdminActor, { resolved_level: 3 })
        ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.'));
      });

      it('rejects saveDraft with 409', async () => {
        mockEvaluationRepo.findById.mockResolvedValue(statusLockedEvaluation);

        await expect(
          service.saveDraft('eval-1', hrAdminActor, [{ id: 'item-1', resolved_level: 3 }])
        ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.'));
      });

      it('rejects submitEvaluation with 409', async () => {
        mockEvaluationRepo.findById.mockResolvedValue({
          ...statusLockedEvaluation,
          employee_id: employeeActor.employeeId,
        });

        await expect(service.submitEvaluation('eval-1', employeeActor)).rejects.toThrow(
          new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.')
        );
      });

      it('rejects overrideKpiScore with 409', async () => {
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue(statusLockedEvaluation);
        mockEvaluationItemRepo.findByEvaluationId.mockResolvedValue([sampleItem]);

        await expect(
          service.overrideKpiScore('eval-1', 'kpi-1', hrAdminActor, {
            manual_override_score: 90,
            override_reason: 'Status locked check',
          })
        ).rejects.toThrow(
          new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked. Scores cannot be overridden.')
        );
      });
    });
  });

  describe('HTTP API Endpoints for Publish & Lock', () => {
    describe('POST /evaluations/:id/publish', () => {
      it('returns 200 with published evaluation on success', async () => {
        currentActor = hrAdminActor;
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleApprovedEvaluation });
        mockEvaluationRepo.update.mockResolvedValue({
          ...sampleApprovedEvaluation,
          status: EvaluationStatus.PUBLISHED,
        });

        const res = await request(app).post('/evaluations/eval-1/publish');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(EvaluationStatus.PUBLISHED);
      });

      it('returns 403 when called by MANAGER or EMPLOYEE', async () => {
        currentActor = managerActor;
        const resManager = await request(app).post('/evaluations/eval-1/publish');
        expect(resManager.status).toBe(403);
        expect(resManager.body.meta.error.code).toBe('FORBIDDEN');

        currentActor = employeeActor;
        const resEmp = await request(app).post('/evaluations/eval-1/publish');
        expect(resEmp.status).toBe(403);
        expect(resEmp.body.meta.error.code).toBe('FORBIDDEN');
      });

      it('returns 409 when evaluation is already locked', async () => {
        currentActor = hrAdminActor;
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

        const res = await request(app).post('/evaluations/eval-locked/publish');
        expect(res.status).toBe(409);
        expect(res.body.meta.error.code).toBe('EVALUATION_LOCKED');
      });
    });

    describe('POST /evaluations/:id/lock', () => {
      it('returns 200 with locked evaluation on success', async () => {
        currentActor = hrAdminActor;
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleApprovedEvaluation });
        mockEvaluationRepo.update.mockResolvedValue({
          ...sampleApprovedEvaluation,
          status: EvaluationStatus.LOCKED,
          is_locked: true,
        });

        const res = await request(app).post('/evaluations/eval-1/lock');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.is_locked).toBe(true);
      });

      it('returns 200 idempotently when repeating lock on already locked evaluation', async () => {
        currentActor = hrAdminActor;
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

        const res = await request(app).post('/evaluations/eval-locked/lock');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.is_locked).toBe(true);
      });

      it('returns 409 conflict when throw_on_conflict=true query param is provided on repeated lock', async () => {
        currentActor = hrAdminActor;
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });

        const res = await request(app).post('/evaluations/eval-locked/lock?throw_on_conflict=true');

        expect(res.status).toBe(409);
        expect(res.body.meta.error.code).toBe('EVALUATION_LOCKED');
      });

      it('returns 403 when called by non-HR/Admin', async () => {
        currentActor = managerActor;
        const res = await request(app).post('/evaluations/eval-1/lock');
        expect(res.status).toBe(403);
        expect(res.body.meta.error.code).toBe('FORBIDDEN');
      });
    });

    describe('Locked Evaluation HTTP Write Protections', () => {
      it('PUT /evaluations/:id/items returns 409 EVALUATION_LOCKED', async () => {
        currentActor = hrAdminActor;
        mockEvaluationRepo.findById.mockResolvedValue({ ...sampleLockedEvaluation });

        const res = await request(app)
          .put('/evaluations/eval-locked/items')
          .send({ items: [{ id: 'item-1', resolved_level: 2 }] });

        expect(res.status).toBe(409);
        expect(res.body.meta.error.code).toBe('EVALUATION_LOCKED');
      });

      it('PUT /evaluations/:id/items/:itemId returns 409 EVALUATION_LOCKED', async () => {
        currentActor = hrAdminActor;
        mockEvaluationRepo.findById.mockResolvedValue({ ...sampleLockedEvaluation });

        const res = await request(app)
          .put('/evaluations/eval-locked/items/item-1')
          .send({ resolved_level: 2 });

        expect(res.status).toBe(409);
        expect(res.body.meta.error.code).toBe('EVALUATION_LOCKED');
      });

      it('POST /evaluations/:id/submit returns 409 EVALUATION_LOCKED', async () => {
        currentActor = employeeActor;
        mockEvaluationRepo.findById.mockResolvedValue({
          ...sampleLockedEvaluation,
          employee_id: employeeActor.employeeId,
        });

        const res = await request(app).post('/evaluations/eval-locked/submit');

        expect(res.status).toBe(409);
        expect(res.body.meta.error.code).toBe('EVALUATION_LOCKED');
      });

      it('POST /evaluations/:id/kpis/:kpiId/override returns 409 EVALUATION_LOCKED', async () => {
        currentActor = hrAdminActor;
        mockEvaluationRepo.findByIdForUpdate.mockResolvedValue({ ...sampleLockedEvaluation });
        mockEvaluationItemRepo.findByEvaluationId.mockResolvedValue([sampleItem]);

        const res = await request(app)
          .post('/evaluations/eval-locked/kpis/kpi-1/override')
          .send({ manual_override_score: 88, override_reason: 'Testing HTTP write protection' });

        expect(res.status).toBe(409);
        expect(res.body.meta.error.code).toBe('EVALUATION_LOCKED');
      });
    });
  });
});
