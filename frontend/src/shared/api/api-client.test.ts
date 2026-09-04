import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiClientError,
  deleteApi,
  getAccessToken,
  getApi,
  patchApi,
  postApi,
  putApi,
  setAccessToken,
} from './api-client';

function successResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      message: 'Success',
      data: { ok: true },
      meta: { request_id: 'req-ok', timestamp: '2026-08-22T00:00:00Z' },
    }),
  };
}

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

    vi.stubGlobal('window', { localStorage: localStorageMock, location: { href: '' } });
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

  it('does not retry a successful request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse());
    vi.stubGlobal('fetch', fetchMock);

    await getApi('/ok');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a failed GET and returns data once the server answers', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(successResponse());
    vi.stubGlobal('fetch', fetchMock);

    await expect(getApi<{ ok: boolean }>('/flaky')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reports a waking-up server after the retries are exhausted', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getApi('/down')).rejects.toMatchObject({
      code: 'SERVER_WAKING_UP',
      statusCode: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries a 503 response and reports a waking-up server when it persists', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        message: 'Service unavailable',
        data: null,
        meta: {
          request_id: 'req-503',
          timestamp: '2026-08-22T00:00:00Z',
          error: { code: 'SERVICE_UNAVAILABLE', field: null, details: [] },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getApi('/waking')).rejects.toMatchObject({ code: 'SERVER_WAKING_UP' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry business errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        success: false,
        message: 'Validation failed',
        data: null,
        meta: {
          request_id: 'req-422',
          timestamp: '2026-08-22T00:00:00Z',
          error: { code: 'VALIDATION_ERROR', field: 'name', details: [] },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getApi('/invalid')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears the session on 401 without retrying', async () => {
    mockStorage['kpi_auth_token'] = 'expired-token';
    mockStorage['kpi_auth_user'] = '{"id":"user-1"}';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        message: 'Unauthorized',
        data: null,
        meta: {
          request_id: 'req-401',
          timestamp: '2026-08-22T00:00:00Z',
          error: { code: 'UNAUTHORIZED', field: null, details: [] },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getApi('/protected')).rejects.toBeInstanceOf(ApiClientError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockStorage['kpi_auth_token']).toBeUndefined();
    expect(mockStorage['kpi_auth_user']).toBeUndefined();
  });

  it('never retries a failed write', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(postApi('/items', { name: 'a' })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    await expect(putApi('/items/1', { name: 'a' })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    await expect(patchApi('/items/1', { name: 'a' })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    await expect(deleteApi('/items/1')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('sends the caller-provided Idempotency-Key unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse());
    vi.stubGlobal('fetch', fetchMock);

    await postApi('/items', { name: 'a' }, 'idem-key-1');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/items'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'idem-key-1' }),
      })
    );
  });
});