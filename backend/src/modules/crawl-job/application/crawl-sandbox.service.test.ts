import { describe, expect, it, vi } from 'vitest';
import { CrawlSandboxService } from './crawl-sandbox.service.js';

describe('CrawlSandboxService', () => {
  it('runs a script without Node process, filesystem or environment globals', async () => {
    const fetchSource = vi.fn(async () => ({ records: [] }));
    const sandbox = new CrawlSandboxService();

    const output = await sandbox.run<string>(
      'async (input) => ({ process: typeof process, require: typeof require, fetch: typeof fetch, value: input.value })',
      { value: 'isolated' },
      fetchSource
    );

    expect(output).toEqual({ process: 'undefined', require: 'undefined', fetch: 'undefined', value: 'isolated' });
    expect(fetchSource).not.toHaveBeenCalled();
  });

  it('allows source requests only through the injected host callback', async () => {
    const fetchSource = vi.fn(async (path: string) => ({ path }));
    const sandbox = new CrawlSandboxService();

    const output = await sandbox.run<{ source: { path: string } }>(
      'async (_input, fetchSource) => ({ source: await fetchSource("/metrics") })',
      {},
      fetchSource
    );

    expect(fetchSource).toHaveBeenCalledWith('/metrics', undefined);
    expect(output).toEqual({ source: { path: '/metrics' } });
  });

  it('enforces the hard execution timeout', async () => {
    const sandbox = new CrawlSandboxService({ timeoutMs: 100 });

    await expect(sandbox.run('() => { while (true) {} }', {}, async () => null))
      .rejects.toMatchObject({ code: 'SANDBOX_TIMEOUT' });
  });

  it('rejects results exceeding the output size limit', async () => {
    const sandbox = new CrawlSandboxService({ outputLimitBytes: 64 });

    await expect(sandbox.run('() => ({ value: "x".repeat(100) })', {}, async () => null))
      .rejects.toMatchObject({ code: 'SANDBOX_OUTPUT_TOO_LARGE' });
  });
});