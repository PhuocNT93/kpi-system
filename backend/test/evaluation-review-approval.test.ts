import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pool } from 'pg';
import express, { Express, RequestHandler } from 'express';
import request from 'supertest';
import { EvaluationService } from '../src/modules/evaluation/application/services/evaluation.service.js';
import { EvaluationController } from '../src/modules/evaluation/api/evaluation.controller.js';
import { createEvaluationRouter } from '../src/modules/evaluation/api/evaluation.router.js';
import { EvaluationStatus, Evaluation } from '../src/modules/evaluation/domain/evaluation.types.js';
import { IEvaluationRepository, IEvaluationItemRepository } from '../src/modules/evaluation/domain/repositories.interface.js';
import { AppError } from '../src/api/app-error.js';
import { errorHandler } from '../src/api/error-handler.js';
import { Actor } from '../src/shared/auth/types.js';
import { AuditService } from '../src/modules/audit/application/audit.service.js';

describe('Task 44: Review & Approval Workflows', () => {
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

  const managedTeamId = 'team-alpha';
  const otherTeamId = 'team-beta';

  const assignedManagerActor: Actor = {
    userId: 'user-mgr-alpha',
    employeeId: 'emp-mgr-alpha',
    role: 'MANAGER',
    managedTeamIds: [managedTeamId],
  };

  const unrelatedManagerActor: Actor = {
    userId: 'user-mgr-beta',
    employeeId: 'emp-mgr-beta',
    role: 'MANAGER',
    managedTeamIds: [otherTeamId],
  };

  const hrAdminActor: Actor = {
    userId: 'user-hr',
    employeeId: 'emp-hr',
    role: 'HR_ADMIN',
  };

  const employeeActor: Actor = {
    userId: 'user-emp-1',
    employeeId: 'emp-1',
    role: 'EMPLOYEE',
  };

  const sampleEvaluation: Evaluation = {
    evaluation_id: 'eval-1',
    evaluation_cycle_id: 'cycle-1',
    employee_id: 'emp-1',
    team_id_snapshot: managedTeamId,
    role_id_snapshot: 'role-dev',
    manager_id_snapshot: 'emp-mgr-alpha',
    status: EvaluationStatus.SUBMITTED,
    is_locked: false,
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
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({
        ...sampleEvaluation,
        ...data,
      })),
      batchCreate: vi.fn(),
    };

    mockEvaluationItemRepo = {
      findByEvaluationId: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      batchUpdate: vi.fn(),
      batchCreate: vi.fn(),
      updateScoringResult: vi.fn(),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue({ audit_log_id: 'audit-log-1' }),
    };

    service = new EvaluationService(
      mockEvaluationRepo as unknown as IEvaluationRepository,
      mockEvaluationItemRepo as unknown as IEvaluationItemRepository,
      mockPool as unknown as Pool,
      mockAuditService as unknown as AuditService
    );

    controller = new EvaluationController(service);

    app = express();
    app.use(express.json());
    const testAuthMiddleware: RequestHandler = (req, _res, next) => {
      req.actor = currentActor;
      next();
    };
    app.use('/evaluations', createEvaluationRouter(controller, testAuthMiddleware));
    app.use(errorHandler);
  });

  describe('1. Review Command (POST /evaluations/:id/review)', () => {
    it('transitions evaluation from SUBMITTED to MANAGER_REVIEW when executed by assigned manager', async () => {
      const result = await service.reviewEvaluation('eval-1', assignedManagerActor);

      expect(result.status).toBe(EvaluationStatus.MANAGER_REVIEW);
      expect(mockEvaluationRepo.update).toHaveBeenCalledWith(
        'eval-1',
        expect.objectContaining({
          status: EvaluationStatus.MANAGER_REVIEW,
          updated_by: 'user-mgr-alpha',
        }),
        mockClient
      );
    });

    it('records an audit entry in the same transaction for REVIEW', async () => {
      await service.reviewEvaluation('eval-1', assignedManagerActor);

      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          entityType: 'EVALUATION',
          entityId: 'eval-1',
          action: 'REVIEW',
          performedBy: 'user-mgr-alpha',
        })
      );
    });

    it('returns 403 when manager from an unrelated team attempts to review', async () => {
      await expect(
        service.reviewEvaluation('eval-1', unrelatedManagerActor)
      ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Only the assigned manager or HR/Admin can perform this review action.'));
    });

    it('returns 403 when employee attempts to review', async () => {
      await expect(
        service.reviewEvaluation('eval-1', employeeActor)
      ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Only the assigned manager or HR/Admin can perform this review action.'));
    });

    it('returns 409 when evaluation is locked', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValueOnce({
        ...sampleEvaluation,
        is_locked: true,
      });

      await expect(
        service.reviewEvaluation('eval-1', assignedManagerActor)
      ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.'));
    });
  });

  describe('2. Approve Command (POST /evaluations/:id/approve)', () => {
    it('transitions evaluation from SUBMITTED or MANAGER_REVIEW to APPROVED', async () => {
      const result = await service.approveEvaluation('eval-1', assignedManagerActor);

      expect(result.status).toBe(EvaluationStatus.APPROVED);
      expect(mockEvaluationRepo.update).toHaveBeenCalledWith(
        'eval-1',
        expect.objectContaining({
          status: EvaluationStatus.APPROVED,
          updated_by: 'user-mgr-alpha',
          approved_at: expect.any(Date),
        }),
        mockClient
      );
    });

    it('records an audit entry in the same transaction for APPROVE', async () => {
      await service.approveEvaluation('eval-1', assignedManagerActor);

      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          entityType: 'EVALUATION',
          entityId: 'eval-1',
          action: 'APPROVE',
          performedBy: 'user-mgr-alpha',
        })
      );
    });

    it('allows HR_ADMIN to approve', async () => {
      const result = await service.approveEvaluation('eval-1', hrAdminActor);
      expect(result.status).toBe(EvaluationStatus.APPROVED);
    });

    it('returns 403 when unrelated manager attempts to approve', async () => {
      await expect(
        service.approveEvaluation('eval-1', unrelatedManagerActor)
      ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Only the assigned manager or HR/Admin can perform this review action.'));
    });

    it('returns 409 when evaluation is locked', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValueOnce({
        ...sampleEvaluation,
        status: EvaluationStatus.LOCKED,
      });

      await expect(
        service.approveEvaluation('eval-1', assignedManagerActor)
      ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.'));
    });
  });

  describe('3. Reject Command (POST /evaluations/:id/reject)', () => {
    it('transitions evaluation to REJECTED with mandatory reason', async () => {
      const result = await service.rejectEvaluation('eval-1', assignedManagerActor, {
        reason: 'Goals and expectations were not met during Q3 review.',
      });

      expect(result.status).toBe(EvaluationStatus.REJECTED);
      expect(mockEvaluationRepo.update).toHaveBeenCalledWith(
        'eval-1',
        expect.objectContaining({
          status: EvaluationStatus.REJECTED,
          updated_by: 'user-mgr-alpha',
        }),
        mockClient
      );
    });

    it('records an audit entry in the same transaction with rejection reason', async () => {
      await service.rejectEvaluation('eval-1', assignedManagerActor, {
        reason: 'Unacceptable attendance and performance issues.',
      });

      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          entityType: 'EVALUATION',
          entityId: 'eval-1',
          action: 'REJECT',
          reason: 'Unacceptable attendance and performance issues.',
          performedBy: 'user-mgr-alpha',
        })
      );
    });

    it('throws 400 when rejection reason is missing or empty', async () => {
      await expect(
        service.rejectEvaluation('eval-1', assignedManagerActor, { reason: '' })
      ).rejects.toThrow(new AppError(400, 'INVALID_INPUT', 'Rejection reason is required.'));

      await expect(
        service.rejectEvaluation('eval-1', assignedManagerActor, { reason: '   ' })
      ).rejects.toThrow(new AppError(400, 'INVALID_INPUT', 'Rejection reason is required.'));
    });

    it('throws 400 when trying to reject an already APPROVED evaluation', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValueOnce({
        ...sampleEvaluation,
        status: EvaluationStatus.APPROVED,
      });

      await expect(
        service.rejectEvaluation('eval-1', assignedManagerActor, { reason: 'Late rejection attempt' })
      ).rejects.toThrow(new AppError(400, 'INVALID_STATUS', 'Cannot reject an evaluation that has already been approved or published.'));
    });

    it('returns 403 when unrelated manager attempts to reject', async () => {
      await expect(
        service.rejectEvaluation('eval-1', unrelatedManagerActor, { reason: 'Unrelated manager attempt' })
      ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Only the assigned manager or HR/Admin can perform this review action.'));
    });
  });

  describe('4. Request Correction Command (POST /evaluations/:id/request-correction)', () => {
    it('transitions evaluation back to OPEN with reason so employee can revise', async () => {
      const result = await service.requestCorrection('eval-1', assignedManagerActor, {
        reason: 'Please provide links and self-assessment comments for criterion 2.',
      });

      expect(result.status).toBe(EvaluationStatus.OPEN);
      expect(mockEvaluationRepo.update).toHaveBeenCalledWith(
        'eval-1',
        expect.objectContaining({
          status: EvaluationStatus.OPEN,
          updated_by: 'user-mgr-alpha',
        }),
        mockClient
      );
    });

    it('records an audit entry in the same transaction with correction reason', async () => {
      await service.requestCorrection('eval-1', assignedManagerActor, {
        reason: 'Missing evidence links for development KPI.',
      });

      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          entityType: 'EVALUATION',
          entityId: 'eval-1',
          action: 'REQUEST_CORRECTION',
          reason: 'Missing evidence links for development KPI.',
          performedBy: 'user-mgr-alpha',
        })
      );
    });

    it('throws 400 when correction reason is missing', async () => {
      await expect(
        service.requestCorrection('eval-1', assignedManagerActor, { reason: '' })
      ).rejects.toThrow(new AppError(400, 'INVALID_INPUT', 'Correction reason is required.'));
    });

    it('throws 400 when evaluation is already in OPEN status', async () => {
      mockEvaluationRepo.findByIdForUpdate.mockResolvedValueOnce({
        ...sampleEvaluation,
        status: EvaluationStatus.OPEN,
      });

      await expect(
        service.requestCorrection('eval-1', assignedManagerActor, { reason: 'Already open' })
      ).rejects.toThrow(new AppError(400, 'INVALID_STATUS', 'Can only request correction for SUBMITTED or MANAGER_REVIEW evaluations.'));
    });

    it('returns 403 when unrelated manager attempts to request correction', async () => {
      await expect(
        service.requestCorrection('eval-1', unrelatedManagerActor, { reason: 'Unauthorized request' })
      ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Only the assigned manager or HR/Admin can perform this review action.'));
    });
  });

  describe('5. HTTP API Endpoints Integration', () => {
    it('POST /evaluations/:id/review returns 200 on success', async () => {
      currentActor = assignedManagerActor;

      const res = await request(app).post('/evaluations/eval-1/review');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(EvaluationStatus.MANAGER_REVIEW);
    });

    it('POST /evaluations/:id/approve returns 200 on success', async () => {
      currentActor = assignedManagerActor;

      const res = await request(app).post('/evaluations/eval-1/approve');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(EvaluationStatus.APPROVED);
    });

    it('POST /evaluations/:id/reject returns 200 on success and 400 when reason missing', async () => {
      currentActor = assignedManagerActor;

      const failRes = await request(app).post('/evaluations/eval-1/reject').send({});
      expect(failRes.status).toBe(400);
      expect(failRes.body.meta.error.code).toBe('INVALID_INPUT');

      const successRes = await request(app).post('/evaluations/eval-1/reject').send({
        reason: 'Performance metrics below threshold',
      });
      expect(successRes.status).toBe(200);
      expect(successRes.body.data.status).toBe(EvaluationStatus.REJECTED);
    });

    it('POST /evaluations/:id/request-correction returns 200 on success and 400 when reason missing', async () => {
      currentActor = assignedManagerActor;

      const failRes = await request(app).post('/evaluations/eval-1/request-correction').send({});
      expect(failRes.status).toBe(400);
      expect(failRes.body.meta.error.code).toBe('INVALID_INPUT');

      const successRes = await request(app).post('/evaluations/eval-1/request-correction').send({
        reason: 'Please provide more details on task deliverables',
      });
      expect(successRes.status).toBe(200);
      expect(successRes.body.data.status).toBe(EvaluationStatus.OPEN);
    });
  });
});
