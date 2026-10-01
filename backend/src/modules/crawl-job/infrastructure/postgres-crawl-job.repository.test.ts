import { describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { TransactionClient } from '../../../shared/database/transaction.js';
import { PostgresCrawlJobRepository } from './postgres-crawl-job.repository.js';

describe('PostgresCrawlJobRepository worker claims', () => {
  it('selects only due queued executions with SKIP LOCKED', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ crawl_job_execution_id: 'execution-1' }] });
    const client = { query, release: vi.fn() } as unknown as TransactionClient;
    const repository = new PostgresCrawlJobRepository({} as Pool);

    await expect(repository.findNextDueExecution(client)).resolves.toBe('execution-1');
    const [sql] = query.mock.calls[0]!;
    expect(sql).toContain("status = 'QUEUED'");
    expect(sql).toContain('next_retry_at <= NOW()');
    expect(sql).toContain('FOR UPDATE OF execution SKIP LOCKED');
  });

  it('atomically claims a still-due queued row and assigns a lease owner', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ crawl_job_execution_id: 'execution-1', status: 'RUNNING' }] });
    const client = { query, release: vi.fn() } as unknown as TransactionClient;
    const repository = new PostgresCrawlJobRepository({} as Pool);

    await expect(repository.claimExecution('execution-1', 'worker-1', 60_000, client))
      .resolves.toMatchObject({ status: 'RUNNING' });
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain("status = 'RUNNING'");
    expect(sql).toContain("status = 'QUEUED'");
    expect(sql).toContain('claimed_by = $2');
    expect(sql).toContain('lease_expires_at');
    expect(values).toEqual(['execution-1', 'worker-1', 60_000]);
  });

  it('uses persisted next_retry_at when creating a retry attempt', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ crawl_job_execution_id: 'retry-1', attempt_no: 2 }] });
    const client = { query, release: vi.fn() } as unknown as TransactionClient;
    const repository = new PostgresCrawlJobRepository({} as Pool);
    const nextRetryAt = new Date('2026-09-29T12:00:00.000Z');

    await repository.createExecution({
      id: 'retry-1',
      jobId: 'job-1',
      cycleId: 'cycle-1',
      actorId: 'actor-1',
      triggerType: 'RETRY',
      idempotencyKey: 'retry:execution-1:attempt-2',
      retryOfId: 'execution-1',
      attemptNo: 2,
      maxAttempts: 3,
      nextRetryAt,
      snapshot: {
        script_id: 'script-1', script_version: 1, script_checksum: 'checksum',
        source_system: 'JIRA', source_config: {}, connector_credential_id: 'credential-1', criteria: [],
      },
      criteriaSnapshot: [],
    }, client);

    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('max_attempts');
    expect(sql).toContain('next_retry_at');
    expect(values.at(-3)).toBe(2);
    expect(values.at(-2)).toBe(3);
    expect(values.at(-1)).toBe(nextRetryAt);
  });

  it('defers later scheduled jobs until after a retry attempt becomes due', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const client = { query, release: vi.fn() } as unknown as TransactionClient;
    const repository = new PostgresCrawlJobRepository({} as Pool);
    const retryAt = new Date('2026-09-29T12:02:00.000Z');

    await repository.deferFollowingScheduledExecutions('execution-1', retryAt, client);
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('GREATEST(following.next_retry_at');
    expect(sql).toContain('following_mapping.sequence_order > failed_mapping.sequence_order');
    expect(sql).toContain("following.status = 'QUEUED'");
    expect(values).toEqual(['execution-1', retryAt]);
  });
});