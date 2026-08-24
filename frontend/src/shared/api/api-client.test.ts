import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, getApi } from './api-client';

describe('getApi', () => {
  it('returns data from a successful response envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Service is healthy.',
          data: { status: 'healthy' },
          meta: { request_id: 'request-1', timestamp: '2026-08-22T00:00:00Z' }
        })
      })
    );

    await expect(getApi<{ status: string }>('/health')).resolves.toEqual({ status: 'healthy' });
  });

  it('throws a typed error from a failed response envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          message: 'The requested resource was not found.',
          data: null,
          meta: {
            request_id: 'request-2',
            timestamp: '2026-08-22T00:00:00Z',
            error: { code: 'RESOURCE_NOT_FOUND', field: null, details: [] }
          }
        })
      })
    );

    await expect(getApi('/missing')).rejects.toBeInstanceOf(ApiClientError);
  });
});