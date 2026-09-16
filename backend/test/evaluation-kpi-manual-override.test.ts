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

describe('Task 42: KPI-Level Manual Override', () => {
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
  };

  let mockAuditService: {
    record: ReturnType<typeof vi.fn>;
  };

  let service: EvaluationService;
  let controller: EvaluationController;
  let app: Express;
  let currentActor: Actor;

  const hrActorWithPerm: Actor = {
    userId: 'user-hr-1',
    employeeId: 'emp-hr-1',
    role: 'HR_ADMIN',
    permissions: ['KPI_MANUAL_OVERRIDE'],
  };

  const hrActorWithSeedPerm: Actor = {
    userId: 'user-hr-2',
    employeeId: 'emp-hr-2',
    role: 'HR_ADMIN',
    permissions: ['evaluation:manual_override'],
  };

  const hrActorDefault: Actor = {
    userId: 'user-hr-3',
    employeeId: 'emp-hr-3',
    role: 'HR_ADMIN',
  };

  const sysAdminActor: Actor = {
    userId: 'user-sysadmin',
    employeeId: 'emp-sysadmin',
    role: 'SYSTEM_ADMIN',
  };

  const managerActor: Actor = {
    userId: 'user-mgr-1',
    employeeId: 'emp-mgr-1',
    role: 'MANAGER',
    managedTeamIds: ['team-1'],
  };

  const employeeActor: Actor = {
    userId: 'user-emp-1',
    employeeId: 'emp-1',
    role: 'EMPLOYEE',
    managedTeamIds: [],
  };

  const hrActorWithoutPerm: Actor = {
    userId: 'user-hr-no-perm',
    employeeId: 'emp-hr-no-perm',
    role: 'HR_ADMIN',
    permissions: ['employee:read'],
  };

  const sampleEvaluation: Evaluation = {
    evaluation_id: 'eval-1',
    evaluation_cycle_id: 'cycle-1',
    employee_id: 'emp-1',
    team_id_snapshot: 'team-1',
    role_id_snapshot: 'role-dev',
    status: EvaluationStatus.APPROVED,
    is_locked: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const sampleItem: EvaluationItem = {
    evaluation_item_id: 'item-kpi-1',
    evaluation_id: 'eval-1',
    template_criterion_id: 'tc-1',
    criterion_code_snapshot: 'CODE-1',
    criterion_name_snapshot: 'Execution Quality',
    weight_snapshot: 50,
    kpi_id_snapshot: 'kpi-dev-quality',
    scoring_rule_snapshot: {},
    level_definition_snapshot: [],
    raw_score: 80,
    normalized_score: 80,
    weighted_score: 40,
    is_disabled_for_employee: false,
    is_missing_score: false,
    manual_override_score: null,
    override_reason: null,
    created_at: new Date(),
    updated_at: new Date(),
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
      findByIdForUpdate: vi.fn().mockResolvedValue({ ...sampleEvaluation }),
      findMyEvaluations: vi.fn(),
      findTeamEvaluations: vi.fn(),
      update: vi.fn(),
      batchCreate: vi.fn(),
    };

    mockEvaluationItemRepo = {
      findByEvaluationId: vi.fn().mockResolvedValue([{ ...sampleItem }]),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({
        ...sampleItem,
        ...data,
      })),
      batchUpdate: vi.fn(),
      batchCreate: vi.fn(),
      updateScoringResult: vi.fn(),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue({ audit_log_id: 'audit-1' }),
    };

    service = new EvaluationService(
      mockEvaluationRepo as unknown as IEvaluationRepository,
      mockEvaluationItemRepo as unknown as IEvaluationItemRepository,
      mockPool as unknown as Pool,
      mockAuditService as unknown as AuditService
    );

    controller = new EvaluationController(service);

    // Setup express app with test auth middleware injecting currentActor
    app = express();
    app.use(express.json());
    const testAuthMiddleware: RequestHandler = (req, _res, next) => {
      req.actor = currentActor;
      next();
    };
    app.use('/evaluations', createEvaluationRouter(controller, testAuthMiddleware));
    app.use(errorHandler);
  });

  describe('Permission & Authorization (DoD: Only HR/Admin with permission can override; Manager returns 403)', () => {
    it('rejects Manager attempt with 403 FORBIDDEN', async () => {
      await expect(
        service.overrideKpiScore('eval-1', 'item-kpi-1', managerActor, {
          manual_override_score: 95,
          override_reason: 'Manager trying to override',
        })
      ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can manually override scores.'));
    });

    it('rejects Employee attempt with 403 FORBIDDEN', async () => {
      await expect(
        service.overrideKpiScore('eval-1', 'item-kpi-1', employeeActor, {
          manual_override_score: 95,
          override_reason: 'Employee trying to override',
        })
      ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can manually override scores.'));
    });

    it('rejects HR Admin without KPI_MANUAL_OVERRIDE permission when permissions are configured', async () => {
      await expect(
        service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithoutPerm, {
          manual_override_score: 95,
          override_reason: 'HR without perm',
        })
      ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Actor lacks KPI_MANUAL_OVERRIDE permission.'));
    });

    it('allows default HR Admin without explicit permissions array', async () => {
      const result = await service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorDefault, {
        manual_override_score: 89,
        override_reason: 'HR override with default permissions',
      });
      expect(result.manual_override_score).toBe(89);
    });

    it('allows HR Admin with explicit KPI_MANUAL_OVERRIDE permission', async () => {
      const result = await service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithPerm, {
        manual_override_score: 90,
        override_reason: 'Calibration adjustment by HR',
      });
      expect(result.manual_override_score).toBe(90);
      expect(result.override_reason).toBe('Calibration adjustment by HR');
    });

    it('allows HR Admin with evaluation:manual_override permission', async () => {
      const result = await service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithSeedPerm, {
        manual_override_score: 88,
        override_reason: 'Committee decision',
      });
      expect(result.manual_override_score).toBe(88);
      expect(result.override_reason).toBe('Committee decision');
    });

    it('allows System Admin', async () => {
      const result = await service.overrideKpiScore('eval-1', 'item-kpi-1', sysAdminActor, {
        manual_override_score: 92,
        override_reason: 'System Admin adjustment',
      });
      expect(result.manual_override_score).toBe(92);
      expect(result.override_reason).toBe('System Admin adjustment');
    });
  });

  describe('Validation (DoD: reason mandatory [400 if missing]; score between 0 and 100)', () => {
    it('throws 400 when override_reason is missing or empty string', async () => {
      await expect(
        service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithPerm, {
          manual_override_score: 85,
          override_reason: '',
        })
      ).rejects.toThrow(new AppError(400, 'INVALID_INPUT', 'Override reason is required.'));

      await expect(
        service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithPerm, {
          manual_override_score: 85,
          override_reason: '   ',
        })
      ).rejects.toThrow(new AppError(400, 'INVALID_INPUT', 'Override reason is required.'));
    });

    it('throws 400 when manual_override_score is < 0 or > 100 or NaN', async () => {
      await expect(
        service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithPerm, {
          manual_override_score: -5,
          override_reason: 'Negative score',
        })
      ).rejects.toThrow(new AppError(400, 'INVALID_INPUT', 'Override score must be a number between 0 and 100.'));

      await expect(
        service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithPerm, {
          manual_override_score: 105,
          override_reason: 'Above 100',
        })
      ).rejects.toThrow(new AppError(400, 'INVALID_INPUT', 'Override score must be a number between 0 and 100.'));

      await expect(
        service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithPerm, {
          manual_override_score: NaN,
          override_reason: 'NaN score',
        })
      ).rejects.toThrow(new AppError(400, 'INVALID_INPUT', 'Override score must be a number between 0 and 100.'));
    });
  });

  describe('Locked State Protection (DoD: locked evaluation rejects override with 409)', () => {
    it('throws 409 when evaluation.is_locked is true', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValueOnce({
        ...sampleEvaluation,
        is_locked: true,
      });

      await expect(
        service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithPerm, {
          manual_override_score: 90,
          override_reason: 'Attempt on locked evaluation',
        })
      ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked. Scores cannot be overridden.'));
    });

    it('throws 409 when evaluation status is LOCKED', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValueOnce({
        ...sampleEvaluation,
        status: EvaluationStatus.LOCKED,
      });

      await expect(
        service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithPerm, {
          manual_override_score: 90,
          override_reason: 'Attempt on locked status',
        })
      ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked. Scores cannot be overridden.'));
    });
  });

  describe('Score Preservation & Audit Log (DoD: calculated kpi_score preserved; audit tests pass)', () => {
    it('preserves calculated scores (raw_score, normalized_score, weighted_score) and stores override separately', async () => {
      await service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithPerm, {
        manual_override_score: 95,
        override_reason: 'Exceptional performance in Q3',
      });

      expect(mockEvaluationItemRepo.update).toHaveBeenCalledWith(
        'item-kpi-1',
        expect.objectContaining({
          manual_override_score: 95,
          override_reason: 'Exceptional performance in Q3',
          override_by: 'user-hr-1',
          updated_by: 'user-hr-1',
        }),
        mockClient
      );

      // Verify that raw_score, normalized_score, weighted_score are NOT in the update payload (never overwritten)
      const updatePayload = mockEvaluationItemRepo.update.mock.calls[0][1];
      expect(updatePayload).not.toHaveProperty('raw_score');
      expect(updatePayload).not.toHaveProperty('normalized_score');
      expect(updatePayload).not.toHaveProperty('weighted_score');
    });

    it('identifies item by kpi_id_snapshot if kpiId matches KPI code/snapshot ID', async () => {
      await service.overrideKpiScore('eval-1', 'kpi-dev-quality', hrActorWithPerm, {
        manual_override_score: 90,
        override_reason: 'Override by KPI snapshot ID',
      });

      expect(mockEvaluationItemRepo.update).toHaveBeenCalledWith(
        'item-kpi-1',
        expect.objectContaining({
          manual_override_score: 90,
        }),
        mockClient
      );
    });

    it('records an audit entry in the same transaction with EVALUATION_ITEM and MANUAL_OVERRIDE', async () => {
      await service.overrideKpiScore('eval-1', 'item-kpi-1', hrActorWithPerm, {
        manual_override_score: 95,
        override_reason: 'Audit test reason',
      });

      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          entityType: 'EVALUATION_ITEM',
          entityId: 'item-kpi-1',
          action: 'MANUAL_OVERRIDE',
          fieldName: 'manual_override_score',
          oldValue: null,
          newValue: '95',
          reason: 'Audit test reason',
          performedBy: 'user-hr-1',
          source: 'API',
        })
      );
    });
  });

  describe('HTTP API endpoint: POST /evaluations/:id/kpis/:kpiId/override', () => {
    it('returns 200 and success payload when HR Admin overrides score', async () => {
      currentActor = hrActorWithPerm;

      const res = await request(app)
        .post('/evaluations/eval-1/kpis/item-kpi-1/override')
        .send({
          manual_override_score: 90,
          override_reason: 'Valid override reason via API',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('KPI score override applied successfully.');
      expect(res.body.data.manual_override_score).toBe(90);
    });

    it('returns 403 when Manager calls the API', async () => {
      currentActor = managerActor;

      const res = await request(app)
        .post('/evaluations/eval-1/kpis/item-kpi-1/override')
        .send({
          manual_override_score: 90,
          override_reason: 'Manager attempting override',
        });

      expect(res.status).toBe(403);
      expect(res.body.meta.error.code).toBe('FORBIDDEN');
    });

    it('returns 400 when override_reason is missing', async () => {
      currentActor = hrActorWithPerm;

      const res = await request(app)
        .post('/evaluations/eval-1/kpis/item-kpi-1/override')
        .send({
          manual_override_score: 90,
        });

      expect(res.status).toBe(400);
      expect(res.body.meta.error.code).toBe('INVALID_INPUT');
    });

    it('returns 400 when manual_override_score is missing or invalid', async () => {
      currentActor = hrActorWithPerm;

      const res = await request(app)
        .post('/evaluations/eval-1/kpis/item-kpi-1/override')
        .send({
          override_reason: 'Reason without score',
        });

      expect(res.status).toBe(400);
      expect(res.body.meta.error.code).toBe('INVALID_INPUT');
    });

    it('returns 409 when evaluation is locked', async () => {
      currentActor = hrActorWithPerm;
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValueOnce({
        ...sampleEvaluation,
        is_locked: true,
      });

      const res = await request(app)
        .post('/evaluations/eval-1/kpis/item-kpi-1/override')
        .send({
          manual_override_score: 90,
          override_reason: 'Trying on locked',
        });

      expect(res.status).toBe(409);
      expect(res.body.meta.error.code).toBe('EVALUATION_LOCKED');
    });
  });
});
