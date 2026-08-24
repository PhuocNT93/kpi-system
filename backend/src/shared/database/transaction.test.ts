import { describe, expect, it, vi } from 'vitest';
import { type TransactionClient, withTransaction } from './transaction.js';

function createClient(query = vi.fn<(queryText: string) => Promise<unknown>>().mockResolvedValue(undefined)) {
  return {
    query,
    release: vi.fn()
  } satisfies TransactionClient;
}

describe('withTransaction', () => {
  it('commits successful work and releases the client', async () => {
    const client = createClient();
    const work = vi.fn().mockResolvedValue('complete');

    await expect(withTransaction({ connect: vi.fn().mockResolvedValue(client) }, work)).resolves.toBe('complete');

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(work).toHaveBeenCalledWith(client);
    expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back failed work, releases the client, and preserves the original error', async () => {
    const client = createClient();
    const failure = new Error('write failed');

    await expect(
      withTransaction({ connect: vi.fn().mockResolvedValue(client) }, async () => {
        throw failure;
      })
    ).rejects.toThrow(failure);

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('attempts a rollback when commit fails', async () => {
    const commitFailure = new Error('commit failed');
    const client = createClient(
      vi
        .fn<(queryText: string) => Promise<unknown>>()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(commitFailure)
        .mockResolvedValueOnce(undefined)
    );

    await expect(withTransaction({ connect: vi.fn().mockResolvedValue(client) }, async () => undefined)).rejects.toThrow(
      commitFailure
    );

    expect(client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledOnce();
  });
});