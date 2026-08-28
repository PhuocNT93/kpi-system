import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, getAccessToken, getApi, setAccessToken } from './api-client';

describe('getApi', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const localStorageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    vi.stubGlobal('window', { localStorage: localStorageMock });
    vi.stubGlobal('localStorage', localStorageMock);
    setAccessToken(null);
  });

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

  it('includes Authorization header when token is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Success',
        data: { ok: true },
        meta: { request_id: 'req-1', timestamp: '2026-08-22T00:00:00Z' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    setAccessToken('my-secret-jwt');
    await getApi('/protected');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/protected'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-secret-jwt',
        }),
      })
    );
  });

  it('falls back to localStorage token if in-memory token is empty', async () => {
    mockStorage['kpi_auth_token'] = 'stored-jwt-token';

    expect(getAccessToken()).toBe('stored-jwt-token');
  });
});