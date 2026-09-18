import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { JWTTokenService } from '../src/modules/auth/services/token.service.js';
import { AuditService } from '../src/modules/audit/application/audit.service.js';
import { AuditController } from '../src/modules/audit/api/audit.controller.js';
import { AuditRepository } from '../src/modules/audit/domain/audit.repository.js';
import { BUSINESS_AUDIT_ENTITY_TYPES } from '../src/modules/audit/domain/audit.domain.js';
import { Pool } from 'pg';

describe('Audit Viewer RBAC and Scope Tests (TC07 - TC13)', () => {
  const jwtConfig = { secret: 'test-secret-audit-rbac' };
  const tokenService = new JWTTokenService(jwtConfig);

  let mockAuditRepo: AuditRepository;
  let auditService: AuditService;
  let auditController: AuditController;
  let app: ReturnType<typeof createApp>;

  const systemAdminToken = tokenService.generateAccessToken({
    userId: '11111111-1111-1111-1111-111111111111',
    role: 'SYSTEM_ADMIN',
  });

  const hrAdminToken = tokenService.generateAccessToken({
    userId: '22222222-2222-2222-2222-222222222222',
    role: 'HR_ADMIN',
  });

  const managerToken = tokenService.generateAccessToken({
    userId: '33333333-3333-3333-3333-333333333333',
    role: 'MANAGER',
  });

  const employeeToken = tokenService.generateAccessToken({
    userId: '44444444-4444-4444-4444-444444444444',
    role: 'EMPLOYEE',
  });

  beforeEach(() => {
    mockAuditRepo = {
      insert: vi.fn(),
      deleteOlderThan: vi.fn(),
      findMany: vi.fn(async (filters) => {
        return {
          total: 1,
          logs: [
            {
              auditLogId: '55555555-5555-5555-5555-555555555555',
              entityType: filters.entityType || 'EVALUATION',
              entityId: '66666666-6666-6666-6666-666666666666',
              action: 'APPROVE',
              fieldName: null,
              oldValue: null,
              newValue: null,
              reason: 'Valid evaluation approval',
              performedBy: '22222222-2222-2222-2222-222222222222',
              performedByName: 'HR Admin User',
              performedAt: new Date().toISOString(),
              source: 'API',
            },
          ],
        };
      }),
    };

    auditService = new AuditService(mockAuditRepo);
    auditController = new AuditController(auditService);

    // Wire app with our auditController and a dummy pool
    const mockPool = {
      query: vi.fn(async () => ({ rows: [] })),
      connect: vi.fn(async () => ({ query: vi.fn(), release: vi.fn() })),
    } as unknown as Pool;

    app = createApp({
      jwtConfig,
      dbPool: mockPool,
      auditController,
    });
  });

  // ── TC07: SYSTEM_ADMIN gets full audit read ────────────────────────────────
  it('TC07: SYSTEM_ADMIN can read all audit logs without scope restriction', async () => {
    // Testing auditService directly
    const result = await auditService.getLogs(
      { page: 1, limit: 20 },
      { userId: '11111111-1111-1111-1111-111111111111', role: 'SYSTEM_ADMIN' }
    );

    expect(result.total).toBe(1);
    expect(mockAuditRepo.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ allowedEntityTypes: expect.anything() })
    );

    // Also via API
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${systemAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('logs');
  });

  // ── TC08: HR_ADMIN is restricted to business-scope audit logs ──────────────
  it('TC08: HR_ADMIN is scoped to BUSINESS_AUDIT_ENTITY_TYPES', async () => {
    const result = await auditService.getLogs(
      { page: 1, limit: 20 },
      { userId: '22222222-2222-2222-2222-222222222222', role: 'HR_ADMIN' }
    );

    expect(result.total).toBe(1);
    // Repository findMany must be called with allowedEntityTypes matching business scope
    expect(mockAuditRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedEntityTypes: expect.arrayContaining([...BUSINESS_AUDIT_ENTITY_TYPES]),
      })
    );

    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${hrAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── TC09: HR_ADMIN scope violation rejected with 403 ───────────────────────
  it('TC09: HR_ADMIN querying restricted system entity receives 403 Forbidden', async () => {
    await expect(
      auditService.getLogs(
        { entityType: 'SYSTEM_CONFIG_PRIVATE' },
        { userId: '22222222-2222-2222-2222-222222222222', role: 'HR_ADMIN' }
      )
    ).rejects.toThrow('HR_ADMIN can only view business-scope audit logs');

    const res = await request(app)
      .get('/api/audit-logs?entityType=SYSTEM_CONFIG_PRIVATE')
      .set('Authorization', `Bearer ${hrAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ── TC10: EMPLOYEE is denied with 403 ──────────────────────────────────────
  it('TC10: EMPLOYEE role is rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ── TC11: MANAGER without admin role is denied with 403 ────────────────────
  it('TC11: MANAGER role is rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ── TC12: Unauthenticated request rejected with 401 ────────────────────────
  it('TC12: Unauthenticated request is rejected with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/audit-logs');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ── TC13: Server-side filters & pagination ─────────────────────────────────
  it('TC13: Server-side filters and pagination are parsed and passed to repository', async () => {
    const entityId = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(app)
      .get(`/api/audit-logs?page=2&limit=15&action=APPROVE&entityType=EVALUATION&entityId=${entityId}`)
      .set('Authorization', `Bearer ${systemAdminToken}`);

    expect(res.status).toBe(200);
    expect(mockAuditRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 15,
        action: 'APPROVE',
        entityType: 'EVALUATION',
        entityId: entityId,
      })
    );
  });
});
