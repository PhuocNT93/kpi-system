import { describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { PostgresCrawlRawPayloadStorage } from './crawl-raw-payload-storage.js';

describe('PostgresCrawlRawPayloadStorage', () => {
  it('creates execution-scoped references and redacts credential fields before persistence', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const storage = new PostgresCrawlRawPayloadStorage({ query } as unknown as Pool);

    const reference = await storage.save('execution-1', {
      issues: [{ key: 'ABC-1', api_token: 'secret-value', summary: 'Bearer token-value' }],
      authorization: 'Basic encoded-value',
    });

    expect(reference).toMatch(/^crawl:execution-1:/);
    const storedPayload = JSON.parse(query.mock.calls[0]?.[1]?.[1] as string) as {
      issues: Array<{ api_token: string; summary: string }>;
      authorization: string;
    };
    expect(storedPayload.issues[0]?.api_token).toBe('[REDACTED]');
    expect(storedPayload.issues[0]?.summary).toContain('[REDACTED]');
    expect(storedPayload.authorization).toBe('[REDACTED]');
  });
});