import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditRetentionService } from './audit-retention.service.js';
import { AuditRepository } from '../domain/audit.repository.js';
import { Pool, PoolClient } from 'pg';

describe('AuditRetentionService', () => {
  let auditRepo: AuditRepository;
  let service: AuditRetentionService;
  let mockPool: Pool;
  let mockClient: PoolClient;

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockResolvedValue({}),
      release: vi.fn(),
    } as unknown as PoolClient;

    mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    } as unknown as Pool;

    auditRepo = {
      insert: vi.fn(),
      deleteOlderThan: vi.fn(),
      findMany: vi.fn(),
    };

    service = new AuditRetentionService(mockPool, auditRepo);
  });

  it('should delete in batches and loop until done', async () => {
    // First call deletes 500, second call deletes 100, third call deletes 0 (loop ends)
    vi.mocked(auditRepo.deleteOlderThan)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(100);

    const cutoff = new Date();
    const result = await service.deleteExpiredLogs(cutoff, 500);

    expect(result.totalDeleted).toBe(600);
    expect(auditRepo.deleteOlderThan).toHaveBeenCalledTimes(2);
    expect(mockClient.query).toHaveBeenCalledWith('SET LOCAL ROLE kpi_maintenance');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalledTimes(2);
  });

  it('should rollback and release on error', async () => {
    vi.mocked(auditRepo.deleteOlderThan).mockRejectedValueOnce(new Error('DB Error'));

    const cutoff = new Date();
    await expect(service.deleteExpiredLogs(cutoff, 500)).rejects.toThrow('DB Error');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
