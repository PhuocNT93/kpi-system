import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { TransactionClient } from '../../../shared/database/transaction.js';
import { CrawlJobService } from './crawl-job.service.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { PostgresCrawlJobRepository } from '../infrastructure/postgres-crawl-job.repository.js';

const { withAuditedTransactionMock } = vi.hoisted(() => ({ withAuditedTransactionMock: vi.fn() }));

vi.mock('../../audit/application/audit-transaction.js', () => ({
  withAuditedTransaction: withAuditedTransactionMock,
}));

describe('CrawlJobService PostgreSQL claim flow', () => {
  const repository = {
    findNextDueExecution: vi.fn(),
    getClaimContext: vi.fn(),
    claimExecution: vi.fn(),
    skipClaimedExecution: vi.fn(),
    findExecutionByIdempotencyKey: vi.fn(),
    getCycleJob: vi.fn(),
    createExecution: vi.fn(),
  };
  const audit = { record: vi.fn() };
  const client = {} as TransactionClient;
  let service: CrawlJobService;

  beforeEach(() => {
    vi.clearAllMocks();
    withAuditedTransactionMock.mockImplementation(async (
      _pool: Pool,
      _auditService: AuditService,
      work: (transaction: TransactionClient, collector: typeof audit) => Promise<unknown>
    ) => work(client, audit));
    service = new CrawlJobService({} as Pool, repository as unknown as PostgresCrawlJobRepository, {} as AuditService);
  });

  it('claims one due execution only when its cycle/job mapping remains eligible', async () => {
    repository.findNextDueExecution.mockResolvedValue('execution-1');
    repository.getClaimContext.mockResolvedValue({ cycle_status: 'OPEN', job_active: true, cycle_job_enabled: true });
    repository.claimExecution.mockResolvedValue({ crawl_job_execution_id: 'execution-1', status: 'RUNNING' });

    const claimed = await service.claimNextExecution('worker-1', 60_000);

    expect(claimed).toMatchObject({ status: 'RUNNING' });
    expect(repository.claimExecution).toHaveBeenCalledWith('execution-1', 'worker-1', 60_000, client);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'CRAWL_EXECUTION',
      entityId: 'execution-1',
      action: 'CRAWL_EXECUTION_STARTED',
      oldValue: 'QUEUED',
      newValue: 'RUNNING',
    }));
  });

  it('skips a due execution if its cycle closed before claim', async () => {
    repository.findNextDueExecution.mockResolvedValue('execution-2');
    repository.getClaimContext.mockResolvedValue({ cycle_status: 'REVIEWING', job_active: true, cycle_job_enabled: true });
    repository.skipClaimedExecution.mockResolvedValue({ crawl_job_execution_id: 'execution-2', status: 'SKIPPED' });

    expect(await service.claimNextExecution('worker-2')).toBeNull();
    expect(repository.claimExecution).not.toHaveBeenCalled();
    expect(repository.skipClaimedExecution).toHaveBeenCalledWith(
      'execution-2',
      'Cycle or Crawl Job is no longer eligible for execution.',
      client
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CRAWL_EXECUTION_SKIPPED' }));
  });

  it('returns without claiming when no due execution exists', async () => {
    repository.findNextDueExecution.mockResolvedValue(null);
    expect(await service.claimNextExecution('worker-3')).toBeNull();
    expect(repository.getClaimContext).not.toHaveBeenCalled();
  });

  it('returns the persisted execution after concurrent scheduled idempotency conflict', async () => {
    const persisted = { crawl_job_execution_id: 'execution-existing', status: 'QUEUED', idempotency_key: 'key' };
    repository.findExecutionByIdempotencyKey.mockResolvedValue(persisted);
    withAuditedTransactionMock.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: '23505' }));

    await expect(service.createScheduledExecution('job-1', 'cycle-1', '202609291200'))
      .resolves.toEqual(persisted);
    expect(repository.findExecutionByIdempotencyKey).toHaveBeenCalledWith('scheduled:cycle-1:job-1:202609291200');
  });
});