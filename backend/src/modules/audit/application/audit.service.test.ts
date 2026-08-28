import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './audit.service.js';
import { AuditRepository } from '../domain/audit.repository.js';
import { TransactionClient } from '../../../shared/database/transaction.js';
import { AuditRecordParams } from '../domain/audit.domain.js';

describe('AuditService', () => {
  let auditRepo: AuditRepository;
  let auditService: AuditService;
  let mockTx: TransactionClient;

  beforeEach(() => {
    auditRepo = {
      insert: vi.fn(),
      deleteOlderThan: vi.fn(),
      findMany: vi.fn(),
    };
    auditService = new AuditService(auditRepo);
    mockTx = {
      query: vi.fn(),
      release: vi.fn(),
    } as unknown as TransactionClient;
  });

  it('should validate and insert audit record', async () => {
    const payload: AuditRecordParams = {
      entityType: 'KPI',
      entityId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'CREATE',
      performedBy: '123e4567-e89b-12d3-a456-426614174001',
    };

    await auditService.record(mockTx, payload);

    expect(auditRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'KPI', action: 'CREATE' }),
      mockTx
    );
  });

  it('should throw validation error if entityId is invalid uuid', async () => {
    const payload: AuditRecordParams = {
      entityType: 'KPI',
      entityId: 'invalid-id',
      action: 'CREATE',
      performedBy: '123e4567-e89b-12d3-a456-426614174001',
    };

    await expect(auditService.record(mockTx, payload)).rejects.toThrow();
    expect(auditRepo.insert).not.toHaveBeenCalled();
  });
});
