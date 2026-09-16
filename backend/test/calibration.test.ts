import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { JWTTokenService } from '../src/modules/auth/services/token.service.js';
import { seedIamData } from '../src/modules/iam/index.js';
import {
  InMemoryUserRepository,
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryUserRoleRepository,
  InMemoryRolePermissionRepository,
  InMemoryAuditWriter,
} from './mocks/in-memory-test-repositories.js';
import { CalibrationService } from '../src/modules/calibration/application/calibration.service.js';
import { CalibrationController } from '../src/modules/calibration/api/calibration.controller.js';
import { CalibrationRepository } from '../src/modules/calibration/domain/calibration.repository.js';
import {
  CalibrationSession,
  CalibrationAdjustment,
  CalibrationEvaluationRow,
} from '../src/modules/calibration/domain/calibration.domain.js';

describe('Calibration API & Service Integration Tests', () => {
  const jwtConfig = { secret: 'test-secret-calibration' };
  const tokenService = new JWTTokenService(jwtConfig);

  let app: import('express').Application;
  let mockCalibrationRepo: CalibrationRepository;
  let calibrationService: CalibrationService;
  let calibrationController: CalibrationController;

  const cycleId = 'c1111111-1111-4111-8111-111111111111';
  const teamId = 't2222222-2222-4222-8222-222222222222';
  const sessionId = 's3333333-3333-4333-8333-333333333333';
  const eval1Id = 'e4444444-4444-4444-8444-444444444444';
  const eval2Id = 'e5555555-5555-4555-8555-555555555555';
  const eval3Id = 'e6666666-6666-4666-8666-666666666666';

  let sessionsDb: Map<string, CalibrationSession>;
  let adjustmentsDb: CalibrationAdjustment[];
  let evaluationsDb: Map<string, CalibrationEvaluationRow & { managerScore: number; selfScore: number; evaluationCycleId: string }>;
  let isCycleLockedVal: boolean;

  beforeEach(async () => {
    sessionsDb = new Map();
    adjustmentsDb = [];
    evaluationsDb = new Map();
    isCycleLockedVal = false;

    // Seed evaluation rows
    evaluationsDb.set(eval1Id, {
      evaluationId: eval1Id,
      evaluationCycleId: cycleId,
      employeeId: 'emp-1',
      employeeCode: 'EMP001',
      employeeName: 'Nguyen Van A',
      departmentName: 'Engineering',
      teamName: 'Frontend Team',
      status: 'CALIBRATION',
      isLocked: false,
      calculatedScore: 70.0,
      managerScore: 70.0,
      selfScore: 75.0,
      finalScore: 70.0,
      latestAdjustmentReason: null,
      latestAdjustedAt: null,
      latestAdjustedByName: null,
    });

    evaluationsDb.set(eval2Id, {
      evaluationId: eval2Id,
      evaluationCycleId: cycleId,
      employeeId: 'emp-2',
      employeeCode: 'EMP002',
      employeeName: 'Tran Thi B',
      departmentName: 'Engineering',
      teamName: 'Frontend Team',
      status: 'CALIBRATION',
      isLocked: false,
      calculatedScore: 80.0,
      managerScore: 80.0,
      selfScore: 82.0,
      finalScore: 80.0,
      latestAdjustmentReason: null,
      latestAdjustedAt: null,
      latestAdjustedByName: null,
    });

    evaluationsDb.set(eval3Id, {
      evaluationId: eval3Id,
      evaluationCycleId: cycleId,
      employeeId: 'emp-3',
      employeeCode: 'EMP003',
      employeeName: 'Le Van C',
      departmentName: 'Engineering',
      teamName: 'Frontend Team',
      status: 'CALIBRATION',
      isLocked: false,
      calculatedScore: 90.0,
      managerScore: 90.0,
      selfScore: 88.0,
      finalScore: 90.0,
      latestAdjustmentReason: null,
      latestAdjustedAt: null,
      latestAdjustedByName: null,
    });

    // Seed initial session
    const initialSession: CalibrationSession = {
      calibrationSessionId: sessionId,
      evaluationCycleId: cycleId,
      cycleName: '2026 Q1 Review',
      scopeType: 'TEAM',
      scopeId: teamId,
      scopeName: 'Frontend Team',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'hr-user-id',
      createdByName: 'HR Administrator',
    };
    sessionsDb.set(sessionId, initialSession);

    mockCalibrationRepo = {
      createSession: vi.fn(async (input, createdBy) => {
        const newId = `session-${Date.now()}`;
        const newSession: CalibrationSession = {
          calibrationSessionId: newId,
          evaluationCycleId: input.evaluation_cycle_id,
          scopeType: input.scope_type,
          scopeId: input.scope_id ?? null,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: createdBy,
          createdByName: 'HR Admin',
        };
        sessionsDb.set(newId, newSession);
        return newSession;
      }),
      getSessionById: vi.fn(async (id) => sessionsDb.get(id) ?? null),
      getSessionByIdForUpdate: vi.fn(async (id) => sessionsDb.get(id) ?? null),
      getExistingSession: vi.fn(async (cycle, scope, scopeId) => {
        for (const s of sessionsDb.values()) {
          if (s.evaluationCycleId === cycle && s.scopeType === scope && s.scopeId === (scopeId ?? null) && s.status === 'OPEN') {
            return s;
          }
        }
        return null;
      }),
      listSessionsByCycle: vi.fn(async (cId) => {
        return Array.from(sessionsDb.values()).filter((s) => s.evaluationCycleId === cId);
      }),
      finalizeSession: vi.fn(async (id) => {
        const s = sessionsDb.get(id);
        if (s) {
          s.status = 'FINALIZED';
        }
      }),
      getEvaluationsForSession: vi.fn(async () => Array.from(evaluationsDb.values())),
      getEvaluationById: vi.fn(async (id) => {
        const e = evaluationsDb.get(id);
        if (!e) return null;
        return {
          evaluationId: e.evaluationId,
          evaluationCycleId: e.evaluationCycleId,
          employeeId: e.employeeId,
          finalScore: e.finalScore,
          managerScore: e.managerScore,
          selfScore: e.selfScore,
          status: e.status,
          isLocked: e.isLocked,
        };
      }),
      isCycleLocked: vi.fn(async () => isCycleLockedVal),
      insertAdjustment: vi.fn(async (params) => {
        const adj: CalibrationAdjustment = {
          calibrationAdjustmentId: `adj-${Date.now()}-${Math.random()}`,
          calibrationSessionId: params.calibrationSessionId,
          evaluationId: params.evaluationId,
          oldFinalScore: params.oldFinalScore,
          newFinalScore: params.newFinalScore,
          reason: params.reason,
          adjustedBy: params.adjustedBy,
          adjustedAt: new Date().toISOString(),
        };
        adjustmentsDb.push(adj);
        return adj;
      }),
      updateEvaluationFinalScore: vi.fn(async (id, score) => {
        const e = evaluationsDb.get(id);
        if (e) {
          e.finalScore = score;
        }
      }),
      transitionEvaluationsAndAutoPublish: vi.fn(async (ids) => {
        for (const id of ids) {
          const e = evaluationsDb.get(id);
          if (e) {
            e.status = 'PUBLISHED';
          }
        }
      }),
      getAdjustmentsBySession: vi.fn(async (id) => {
        return adjustmentsDb.filter((a) => a.calibrationSessionId === id);
      }),
    };

    // Pool dummy for service
    const mockPool = {
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      }),
    } as unknown as import('pg').Pool;

    calibrationService = new CalibrationService(mockPool, mockCalibrationRepo);
    calibrationController = new CalibrationController(calibrationService);

    // Setup Auth and App
    const userRepo = new InMemoryUserRepository();
    const roleRepo = new InMemoryRoleRepository();
    const permRepo = new InMemoryPermissionRepository();
    const userRoleRepo = new InMemoryUserRoleRepository();
    const rolePermRepo = new InMemoryRolePermissionRepository();
    const auditWriter = new InMemoryAuditWriter();

    await seedIamData(roleRepo, permRepo, userRoleRepo, rolePermRepo);

    app = createApp({
      userRepository: userRepo,
      roleRepository: roleRepo,
      permissionRepository: permRepo,
      userRoleRepository: userRoleRepo,
      rolePermissionRepository: rolePermRepo,
      auditWriter,
      jwtConfig,
      calibrationController,
    });
  });

  const getAuthToken = (role: string, userId = 'user-test-id') => {
    return tokenService.generateAccessToken({
      userId,
      role: role as import('../src/shared/auth/types.js').UserRole,
      employeeId: userId,
      managedTeamIds: [],
    });
  };

  describe('RBAC Authorization', () => {
    it('allows HR_ADMIN to access calibration endpoints', async () => {
      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .get(`/api/calibration-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session.calibrationSessionId).toBe(sessionId);
    });

    it('denies EMPLOYEE access with 403 Forbidden', async () => {
      const token = getAuthToken('EMPLOYEE');
      const res = await request(app)
        .get(`/api/calibration-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('denies MANAGER access with 403 Forbidden', async () => {
      const token = getAuthToken('MANAGER');
      const res = await request(app)
        .get(`/api/calibration-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('denies SYSTEM_ADMIN mutation access with 403 Forbidden', async () => {
      const token = getAuthToken('SYSTEM_ADMIN');
      const res = await request(app)
        .post(`/api/calibration-sessions/${sessionId}/adjustments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_id: eval1Id,
          new_final_score: 85,
          reason: 'System Admin attempting calibration',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Session Creation & Scope Validation', () => {
    it('creates ORG session successfully as HR_ADMIN', async () => {
      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post('/api/calibration-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_cycle_id: cycleId,
          scope_type: 'ORG',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('OPEN');
      expect(res.body.data.scopeType).toBe('ORG');
    });

    it('rejects TEAM scope without scope_id', async () => {
      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post('/api/calibration-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_cycle_id: cycleId,
          scope_type: 'TEAM',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects creation on locked evaluation cycle with 409 EVALUATION_LOCKED', async () => {
      isCycleLockedVal = true;
      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post('/api/calibration-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_cycle_id: cycleId,
          scope_type: 'ORG',
        });

      expect(res.status).toBe(409);
      expect(res.body.meta?.error?.code).toBe('EVALUATION_LOCKED');
    });
  });

  describe('Score Distribution Calculations', () => {
    it('calculates average, median, min, max correctly on overall_weighted_score (odd count)', async () => {
      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .get(`/api/calibration-sessions/${sessionId}/distribution`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const dist = res.body.data;
      expect(dist.totalEvaluations).toBe(3);
      expect(dist.averageScore).toBe(80.0);
      expect(dist.medianScore).toBe(80.0);
      expect(dist.minScore).toBe(70.0);
      expect(dist.maxScore).toBe(90.0);
    });

    it('calculates median correctly with even count evaluations', () => {
      const evals = [
        { calculatedScore: 70.0, finalScore: 70.0 },
        { calculatedScore: 80.0, finalScore: 80.0 },
        { calculatedScore: 85.0, finalScore: 85.0 },
        { calculatedScore: 95.0, finalScore: 95.0 },
      ];
      const dist = calibrationService.calculateDistribution(evals);
      expect(dist.totalEvaluations).toBe(4);
      expect(dist.medianScore).toBe(82.5); // (80 + 85) / 2
      expect(dist.averageScore).toBe(82.5);
    });
  });

  describe('Score Adjustments & Invariants', () => {
    it('applies adjustment, updates final_score, and preserves original calculated score', async () => {
      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post(`/api/calibration-sessions/${sessionId}/adjustments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_id: eval1Id,
          new_final_score: 85.0,
          reason: 'Adjusting score based on complex project delivery contribution',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify final_score updated
      const updatedEval = evaluationsDb.get(eval1Id)!;
      expect(updatedEval.finalScore).toBe(85.0);
      // Verify original calculated manager score is completely preserved
      expect(updatedEval.calculatedScore).toBe(70.0);
      expect(updatedEval.managerScore).toBe(70.0);

      // Verify adjustment record
      expect(adjustmentsDb.length).toBe(1);
      expect(adjustmentsDb[0].oldFinalScore).toBe(70.0);
      expect(adjustmentsDb[0].newFinalScore).toBe(85.0);
      expect(adjustmentsDb[0].reason).toContain('complex project delivery');
    });

    it('rejects adjustment with empty or whitespace-only reason with 422 CALIBRATION_REASON_REQUIRED', async () => {
      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post(`/api/calibration-sessions/${sessionId}/adjustments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_id: eval1Id,
          new_final_score: 85.0,
          reason: '   ',
        });

      expect(res.status).toBe(422);
      expect(res.body.meta?.error?.code).toBe('CALIBRATION_REASON_REQUIRED');
    });

    it('rejects adjustment with out-of-bounds score', async () => {
      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post(`/api/calibration-sessions/${sessionId}/adjustments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_id: eval1Id,
          new_final_score: 115.0,
          reason: 'Valid reason for adjustment',
        });

      expect(res.status).toBe(422);
      expect(res.body.meta?.error?.code).toBe('INVALID_CALIBRATION_SCORE');
    });

    it('preserves history across multiple adjustments (append-only)', async () => {
      const token = getAuthToken('HR_ADMIN');
      await request(app)
        .post(`/api/calibration-sessions/${sessionId}/adjustments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_id: eval1Id,
          new_final_score: 82.0,
          reason: 'First adjustment based on evidence',
        });

      await request(app)
        .post(`/api/calibration-sessions/${sessionId}/adjustments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_id: eval1Id,
          new_final_score: 85.0,
          reason: 'Second adjustment after committee review',
        });

      expect(adjustmentsDb.length).toBe(2);
      expect(adjustmentsDb[0].newFinalScore).toBe(82.0);
      expect(adjustmentsDb[1].newFinalScore).toBe(85.0);
    });

    it('rejects adjustment when evaluation is locked with 409 EVALUATION_LOCKED', async () => {
      evaluationsDb.get(eval1Id)!.isLocked = true;
      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post(`/api/calibration-sessions/${sessionId}/adjustments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_id: eval1Id,
          new_final_score: 85.0,
          reason: 'Attempting adjustment on locked evaluation',
        });

      expect(res.status).toBe(409);
      expect(res.body.meta?.error?.code).toBe('EVALUATION_LOCKED');
    });
  });

  describe('Session Finalize & Workflow Integration', () => {
    it('finalizes session, transitions evaluations to PUBLISHED atomically', async () => {
      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post(`/api/calibration-sessions/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('FINALIZED');

      // Check evaluations transitioned to PUBLISHED
      for (const e of evaluationsDb.values()) {
        expect(e.status).toBe('PUBLISHED');
      }
    });

    it('rejects adjustment on finalized session with 409 CALIBRATION_SESSION_ALREADY_FINALIZED', async () => {
      sessionsDb.get(sessionId)!.status = 'FINALIZED';

      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post(`/api/calibration-sessions/${sessionId}/adjustments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_id: eval1Id,
          new_final_score: 85.0,
          reason: 'Attempting edit on finalized session',
        });

      expect(res.status).toBe(409);
      expect(res.body.meta?.error?.code).toBe('CALIBRATION_SESSION_ALREADY_FINALIZED');
    });

    it('rejects duplicate finalization with 409 CALIBRATION_SESSION_ALREADY_FINALIZED', async () => {
      sessionsDb.get(sessionId)!.status = 'FINALIZED';

      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post(`/api/calibration-sessions/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect(res.body.meta?.error?.code).toBe('CALIBRATION_SESSION_ALREADY_FINALIZED');
    });

    it('rejects finalization if evaluation cycle is locked with 409 EVALUATION_LOCKED', async () => {
      isCycleLockedVal = true;

      const token = getAuthToken('HR_ADMIN');
      const res = await request(app)
        .post(`/api/calibration-sessions/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect(res.body.meta?.error?.code).toBe('EVALUATION_LOCKED');
    });
  });
});
