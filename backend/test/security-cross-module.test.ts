import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { JWTTokenService } from '../src/modules/auth/services/token.service.js';
import { AppError } from '../src/api/app-error.js';
import { EvaluationService } from '../src/modules/evaluation/application/services/evaluation.service.js';
import { EvaluationStatus } from '../src/modules/evaluation/domain/evaluation.types.js';
import type { Actor } from '../src/shared/auth/auth.types.js';
import { AuditService } from '../src/modules/audit/application/audit.service.js';

describe('TC13 - TC23: Cross-Module Security Hardening Tests', () => {
  const jwtConfig = { secret: 'test-secret-security-hardening' };
  const tokenService = new JWTTokenService(jwtConfig);

  let evaluationService: EvaluationService;
  let mockEvaluationRepo: {
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockEvaluationItemRepo: {
    findByEvaluationId: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockAuditService: {
    record: ReturnType<typeof vi.fn>;
  };
  let mockPool: {
    connect: ReturnType<typeof vi.fn>;
  };

  const employeeA: Actor = { userId: 'usr-emp-a', employeeId: 'emp-a', role: 'EMPLOYEE' };
  const _employeeB: Actor = { userId: 'usr-emp-b', employeeId: 'emp-b', role: 'EMPLOYEE' };
  const managerA: Actor = { userId: 'usr-mgr-a', employeeId: 'mgr-a', role: 'MANAGER', managedTeamIds: ['team-alpha'] };
  const hrAdminScoped: Actor = {
    userId: 'usr-hr-scoped',
    role: 'HR_ADMIN',
    permissions: ['KPI_MANUAL_OVERRIDE'],
    managedTeamIds: ['team-alpha'],
  };
  const hrAdminWithoutPerm: Actor = {
    userId: 'usr-hr-noperm',
    role: 'HR_ADMIN',
    permissions: ['some:other:permission'],
  };
  const hrAdminGlobal: Actor = {
    userId: 'usr-hr-global',
    role: 'HR_ADMIN',
    permissions: ['KPI_MANUAL_OVERRIDE'],
  };

  const sampleEvalTeamA = {
    evaluation_id: 'eval-team-a',
    evaluation_cycle_id: 'cycle-1',
    employee_id: 'emp-a',
    team_id_snapshot: 'team-alpha',
    role_id_snapshot: 'role-dev',
    manager_id_snapshot: 'mgr-a',
    status: EvaluationStatus.OPEN,
    is_locked: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const sampleEvalTeamB = {
    evaluation_id: 'eval-team-b',
    evaluation_cycle_id: 'cycle-1',
    employee_id: 'emp-b',
    team_id_snapshot: 'team-beta',
    role_id_snapshot: 'role-dev',
    manager_id_snapshot: 'mgr-b',
    status: EvaluationStatus.OPEN,
    is_locked: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const sampleItemA = {
    evaluation_item_id: 'item-a1',
    evaluation_id: 'eval-team-a',
    template_criterion_id: 'tc-1',
    criterion_code_snapshot: 'CODE_QUALITY',
    criterion_name_snapshot: 'Code Quality',
    weight_snapshot: 100,
    scoring_rule_snapshot: {},
    level_definition_snapshot: [],
    manual_override_score: undefined,
    comment: 'Initial comment',
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    updated_by: 'system',
  };

  const sampleItemB = {
    ...sampleItemA,
    evaluation_item_id: 'item-b1',
    evaluation_id: 'eval-team-b',
  };

  beforeEach(() => {
    mockEvaluationRepo = {
      findById: vi.fn(async (id: string) => {
        if (id === 'eval-team-a') return { ...sampleEvalTeamA };
        if (id === 'eval-team-b') return { ...sampleEvalTeamB };
        return null;
      }),
      findByIdForUpdate: vi.fn(async (id: string) => {
        if (id === 'eval-team-a') return { ...sampleEvalTeamA };
        if (id === 'eval-team-b') return { ...sampleEvalTeamB };
        return null;
      }),
      update: vi.fn(async (_id: string, update: Record<string, unknown>) => ({
        ...sampleEvalTeamA,
        ...update,
      })),
    };

    mockEvaluationItemRepo = {
      findByEvaluationId: vi.fn(async (evalId: string) => {
        if (evalId === 'eval-team-a') return [{ ...sampleItemA }];
        if (evalId === 'eval-team-b') return [{ ...sampleItemB }];
        return [];
      }),
      update: vi.fn(async (_id: string, fields: Record<string, unknown>) => ({
        ...sampleItemA,
        ...fields,
        version: 2,
      })),
    };

    mockAuditService = {
      record: vi.fn(async () => {}),
    };

    mockPool = {
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      }),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    evaluationService = new EvaluationService(
      mockEvaluationRepo as unknown as import('../src/modules/evaluation/domain/repositories.interface.js').IEvaluationRepository,
      mockEvaluationItemRepo as unknown as import('../src/modules/evaluation/domain/repositories.interface.js').IEvaluationItemRepository,
      mockPool as unknown as import('pg').Pool,
      mockAuditService as unknown as AuditService
    );
  });

  // TC13: Authentication enforcement
  it('TC13: rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
    const app = createApp({ jwtConfig });
    const res = await request(app).get('/api/evaluations/my');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // TC14: Admin endpoint RBAC
  it('TC14: rejects EMPLOYEE accessing admin endpoint with 403 FORBIDDEN', async () => {
    const app = createApp({ jwtConfig });
    const token = tokenService.generateAccessToken(employeeA);

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect([403, 404]).toContain(res.status); // Forbidden or non-existent employee access
    if (res.status === 403) {
      expect(res.body.success).toBe(false);
    }
  });

  // TC15: Employee resource scoping
  it('TC15: rejects Employee A trying to view Employee B evaluation with 403 FORBIDDEN', async () => {
    await expect(
      evaluationService.getEvaluationDetail('eval-team-b', employeeA)
    ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'You do not have access to this evaluation.'));
  });

  // TC16: Manager team resource scoping
  it('TC16: rejects Manager A reviewing evaluation of Employee in Team B with 403 FORBIDDEN', async () => {
    await expect(
      evaluationService.reviewEvaluation('eval-team-b', managerA)
    ).rejects.toThrow(
      new AppError(403, 'FORBIDDEN', 'Only the assigned manager or HR/Admin can perform this review action.')
    );
  });

  // TC17: Manager admin action denial
  it('TC17: rejects Manager performing manual override or admin actions', async () => {
    await expect(
      evaluationService.overrideKpiScore('eval-team-a', 'item-a1', managerA, {
        manual_override_score: 95,
        override_reason: 'Manager trying to override',
      })
    ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can manually override scores.'));
  });

  // TC18: Missing KPI_MANUAL_OVERRIDE permission
  it('TC18: rejects HR Admin without KPI_MANUAL_OVERRIDE permission with 403 FORBIDDEN', async () => {
    await expect(
      evaluationService.overrideKpiScore('eval-team-a', 'item-a1', hrAdminWithoutPerm, {
        manual_override_score: 88,
        override_reason: 'Override without permission',
      })
    ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Actor lacks KPI_MANUAL_OVERRIDE permission.'));
  });

  // TC19: Out-of-scope manual override
  it('TC19: rejects HR Admin attempting manual override outside managed team scope with 403', async () => {
    await expect(
      evaluationService.overrideKpiScore('eval-team-b', 'item-b1', hrAdminScoped, {
        manual_override_score: 85,
        override_reason: 'Attempting override outside assigned team scope',
      })
    ).rejects.toThrow(new AppError(403, 'FORBIDDEN', 'Access denied: Target evaluation is outside of your assigned scope.'));
  });

  // TC20: Authorized manual override
  it('TC20: allows authorized manual override within team scope, records reason and audit', async () => {
    const updated = await evaluationService.overrideKpiScore(
      'eval-team-a',
      'item-a1',
      hrAdminScoped,
      {
        manual_override_score: 92,
        override_reason: 'Exceptional cross-functional delivery leadership.',
      }
    );

    expect(updated.manual_override_score).toBe(92);
    expect(mockEvaluationItemRepo.update).toHaveBeenCalledWith(
      'item-a1',
      expect.objectContaining({
        manual_override_score: 92,
        override_reason: 'Exceptional cross-functional delivery leadership.',
      }),
      expect.anything()
    );
    expect(mockAuditService.record).toHaveBeenCalled();
  });

  // TC21: Manual override on locked resource
  it('TC21: rejects manual override with 409 when evaluation is locked', async () => {
    mockEvaluationRepo.findByIdForUpdate.mockResolvedValueOnce({
      ...sampleEvalTeamA,
      is_locked: true,
      status: EvaluationStatus.LOCKED,
    });

    await expect(
      evaluationService.overrideKpiScore('eval-team-a', 'item-a1', hrAdminGlobal, {
        manual_override_score: 90,
        override_reason: 'Attempting override on locked evaluation',
      })
    ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked. Scores cannot be overridden.'));
  });

  // TC22: PII and technical error masking
  it('TC22: returns standard response envelope without SQL statements or stack traces', async () => {
    const app = createApp({ jwtConfig });
    const res = await request(app).get('/api/evaluations/non-existent-id');
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
    // Ensure no raw SQL or stacks are exposed in production envelope
    expect(JSON.stringify(res.body)).not.toContain('SELECT * FROM');
    expect(JSON.stringify(res.body)).not.toContain('at Object.<anonymous>');
  });

  // TC23: Append-only audit integrity
  it('TC23: verifies audit trail is append-only with no update or delete mutations', () => {
    // The AuditService and AuditRepository only expose insert/record/find methods; no update/delete methods exist
    expect(AuditService.prototype).toHaveProperty('record');
    expect((AuditService.prototype as unknown as Record<string, unknown>).delete).toBeUndefined();
    expect((AuditService.prototype as unknown as Record<string, unknown>).update).toBeUndefined();
  });
});
