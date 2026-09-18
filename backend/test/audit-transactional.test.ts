import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { withAuditedTransaction } from '../src/modules/audit/application/audit-transaction.js';
import { AuditService } from '../src/modules/audit/application/audit.service.js';
import { AuditRepository } from '../src/modules/audit/domain/audit.repository.js';
import { TransactionConnection, TransactionClient } from '../src/shared/database/transaction.js';
import { createApp } from '../src/app.js';
import { JWTTokenService } from '../src/modules/auth/services/token.service.js';

describe('Audit Transactional Framework Tests (TC01 - TC06)', () => {
  let mockAuditRepo: AuditRepository;
  let auditService: AuditService;
  let mockClient: TransactionClient;
  let mockConnection: TransactionConnection;
  let queryHistory: string[];

  beforeEach(() => {
    queryHistory = [];
    mockClient = {
      query: vi.fn(async (sql: string) => {
        queryHistory.push(typeof sql === 'string' ? sql.trim().toUpperCase() : '');
        return { rows: [], rowCount: 1 };
      }),
      release: vi.fn(),
    } as unknown as TransactionClient;

    mockConnection = {
      connect: vi.fn(async () => mockClient),
    };

    mockAuditRepo = {
      insert: vi.fn(async (_params, client) => {
        await client.query('INSERT INTO audit_log');
      }),
      deleteOlderThan: vi.fn(),
      findMany: vi.fn(),
    };

    auditService = new AuditService(mockAuditRepo);
  });

  // ── TC01: Case 1 — Business write + audit success (Atomic Commit) ───────────
  it('TC01: Business write and audit append commit atomically (Case 1)', async () => {
    let businessExecuted = false;

    const result = await withAuditedTransaction(
      mockConnection,
      auditService,
      async (client, audit) => {
        // Business write operation
        await client.query('UPDATE evaluation_item SET raw_score = 95');
        businessExecuted = true;

        // Append audit log record
        audit.record({
          entityType: 'EVALUATION_ITEM',
          entityId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'UPDATE',
          fieldName: 'raw_score',
          oldValue: '80',
          newValue: '95',
          performedBy: '123e4567-e89b-12d3-a456-426614174001',
          reason: 'Manager review completed',
        });

        return { success: true };
      },
      '123e4567-e89b-12d3-a456-426614174001'
    );

    expect(result).toEqual({ success: true });
    expect(businessExecuted).toBe(true);

    // Verify transaction ordering: BEGIN -> Business Write -> Audit Insert -> COMMIT
    expect(queryHistory[0]).toBe('BEGIN');
    expect(queryHistory.some((q) => q.includes('UPDATE EVALUATION_ITEM'))).toBe(true);
    expect(queryHistory.some((q) => q.includes('INSERT INTO AUDIT_LOG'))).toBe(true);
    expect(queryHistory[queryHistory.length - 1]).toBe('COMMIT');
    expect(queryHistory).not.toContain('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
    expect(mockAuditRepo.insert).toHaveBeenCalledTimes(1);
  });

  // ── TC02: Case 2 — Business write failure triggers ROLLBACK ────────────────
  it('TC02: Business write failure rolls back audit with zero orphan logs (Case 2)', async () => {
    const operation = withAuditedTransaction(
      mockConnection,
      auditService,
      async (_client, audit) => {
        // Schedule audit record
        audit.record({
          entityType: 'EVALUATION',
          entityId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'SUBMIT',
          performedBy: '123e4567-e89b-12d3-a456-426614174001',
        });

        // Force business failure
        throw new Error('Business domain invariant violation: incomplete self-evaluation');
      },
      '123e4567-e89b-12d3-a456-426614174001'
    );

    await expect(operation).rejects.toThrow('Business domain invariant violation');

    // Assert that audit insert was NEVER executed and transaction was rolled back
    expect(mockAuditRepo.insert).not.toHaveBeenCalled();
    expect(queryHistory[0]).toBe('BEGIN');
    expect(queryHistory).toContain('ROLLBACK');
    expect(queryHistory).not.toContain('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ── TC03: Case 3 — Audit write failure rolls back business write ───────────
  it('TC03: Audit write failure rolls back business changes completely (Case 3)', async () => {
    // Force audit repository failure
    mockAuditRepo.insert = vi.fn().mockRejectedValue(new Error('PostgreSQL audit_log constraint failure'));

    const operation = withAuditedTransaction(
      mockConnection,
      auditService,
      async (client, audit) => {
        // Business write succeeds
        await client.query('UPDATE evaluation SET status = "APPROVED"');

        // Audit is queued
        audit.record({
          entityType: 'EVALUATION',
          entityId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'APPROVE',
          performedBy: '123e4567-e89b-12d3-a456-426614174001',
        });

        return { approved: true };
      },
      '123e4567-e89b-12d3-a456-426614174001'
    );

    await expect(operation).rejects.toThrow('PostgreSQL audit_log constraint failure');

    // Assert that transaction rolled back despite business write executing
    expect(queryHistory[0]).toBe('BEGIN');
    expect(queryHistory).toContain('ROLLBACK');
    expect(queryHistory).not.toContain('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ── TC04: Case 4 — Multiple business writes atomic commit or rollback ──────
  it('TC04: Multiple business writes + audit commit or roll back as one (Case 4)', async () => {
    // 4.1 Success case: all writes + audit committed
    await withAuditedTransaction(
      mockConnection,
      auditService,
      async (client, audit) => {
        await client.query('UPDATE evaluation_item SET raw_score = 90 WHERE id = 1');
        await client.query('UPDATE evaluation_item SET raw_score = 85 WHERE id = 2');
        await client.query('UPDATE evaluation SET overall_score = 87.5');

        audit.record({
          entityType: 'EVALUATION',
          entityId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'RECALCULATE',
          performedBy: '123e4567-e89b-12d3-a456-426614174001',
        });
      },
      '123e4567-e89b-12d3-a456-426614174001'
    );

    expect(queryHistory.filter((q) => q === 'COMMIT').length).toBe(1);

    // 4.2 Failure midway: 1st write succeeds, 2nd write throws -> all rolled back
    queryHistory = [];
    const multiWriteFail = withAuditedTransaction(
      mockConnection,
      auditService,
      async (client, _audit) => {
        await client.query('UPDATE evaluation_item SET raw_score = 90 WHERE id = 1');
        throw new Error('Midway failure in write 2');
      },
      '123e4567-e89b-12d3-a456-426614174001'
    );

    await expect(multiWriteFail).rejects.toThrow('Midway failure in write 2');
    expect(queryHistory).toContain('ROLLBACK');
    expect(queryHistory).not.toContain('COMMIT');
    expect(mockAuditRepo.insert).toHaveBeenCalledTimes(1); // from the previous 4.1 run only
  });

  // ── TC05: Audit Immutability (Append-Only) ──────────────────────────────────
  it('TC05: AuditService exposes only insert/record/getLogs, no update or delete mutations', () => {
    expect(auditService).toHaveProperty('record');
    expect(auditService).toHaveProperty('getLogs');
    expect((auditService as unknown as Record<string, unknown>).update).toBeUndefined();
    expect((auditService as unknown as Record<string, unknown>).delete).toBeUndefined();
    expect((auditService as unknown as Record<string, unknown>).patch).toBeUndefined();
  });

  // ── TC06: Public Audit Mutation API Prohibition ───────────────────────────
  it('TC06: Verifies backend rejects public POST/PUT/PATCH/DELETE on /api/audit-logs', async () => {
    const jwtConfig = { secret: 'test-secret' };
    const tokenService = new JWTTokenService(jwtConfig);
    const adminToken = tokenService.generateAccessToken({
      userId: '123e4567-e89b-12d3-a456-426614174001',
      role: 'SYSTEM_ADMIN',
    });

    const app = createApp({
      jwtConfig,
    });

    // Public POST /audit or /audit-logs should be 404 (not allowed as business write endpoint)
    const postRes = await request(app)
      .post('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'CREATE', entityType: 'EVALUATION' });
    expect(postRes.status).toBe(404);

    // Public PUT /audit-logs/:id should be 404
    const putRes = await request(app)
      .put('/api/audit-logs/123e4567-e89b-12d3-a456-426614174000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'UPDATE' });
    expect(putRes.status).toBe(404);

    // Public DELETE /audit-logs/:id should be 404
    const deleteRes = await request(app)
      .delete('/api/audit-logs/123e4567-e89b-12d3-a456-426614174000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(404);
  });
});
