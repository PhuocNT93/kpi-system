import type { ApiEnvelope } from './api-types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const TOKEN_STORAGE_KEY = 'kpi_auth_token';

// Free-tier hosting suspends the API after idle time, so the first call of a
// session may wait for a cold start before any byte is returned.
const COLD_START_TIMEOUT_MS = 90_000;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 400;

let hasReachedServer = false;

class RequestTimeoutError extends Error {}

// Token storage — in-memory with localStorage fallback
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}

export function getAccessToken(): string | null {
  if (_accessToken) {
    return _accessToken;
  }
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      _accessToken = storedToken;
      return storedToken;
    }
  }
  return null;
}

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly requestId: string;
  public readonly statusCode: number;

  public constructor(message: string, code: string, requestId: string, statusCode = 0) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.requestId = requestId;
    this.statusCode = statusCode;
  }
}

function buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: ApiEnvelope<T>;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch (err) {
    if (!response.ok) {
      throw new ApiClientError(
        `API endpoint not found or server error (${response.status} ${response.statusText}). The API might not be implemented yet.`,
        'NETWORK_OR_SERVER_ERROR',
        'unknown',
        response.status,
      );
    }
    throw err;
  }

  // Handle 401 Unauthorized globally by clearing auth state and redirecting to login
  if (response.status === 401) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem('kpi_auth_user');
      window.location.href = '/login';
    }
  }

  // Per FE Rule §5: on 401 callers handle sign-in flow via thrown error code
  if (!response.ok || !payload.success) {
    throw new ApiClientError(
      payload.message || 'Unknown server error',
      payload.meta?.error?.code ?? 'UNEXPECTED_API_RESPONSE',
      payload.meta?.request_id ?? 'unknown',
      response.status,
    );
  }

  return payload.data;
}

function serverWakingUpError(): ApiClientError {
  return new ApiClientError(
    'The server is starting up. This can take up to a minute after a period of inactivity.',
    'SERVER_WAKING_UP',
    'unknown',
    0,
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = hasReachedServer ? REQUEST_TIMEOUT_MS : COLD_START_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new RequestTimeoutError());
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetch(`${apiBaseUrl}${path}`, { ...init, signal: controller.signal }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * `retryable` must stay false for mutations: a retried write could be applied twice.
 */
async function requestApi<T>(path: string, init: RequestInit, retryable: boolean): Promise<T> {
  const maxAttempts = retryable ? MAX_RETRIES + 1 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const isLastAttempt = attempt === maxAttempts - 1;
    let response: Response;

    try {
      response = await fetchWithTimeout(path, init);
    } catch (error) {
      if (isLastAttempt) {
        if (error instanceof RequestTimeoutError || retryable) {
          throw serverWakingUpError();
        }
        throw new ApiClientError(
          'Network Error: Could not connect to the backend server.',
          'NETWORK_ERROR',
          'unknown',
          0,
        );
      }
      await delay(RETRY_BACKOFF_MS * (attempt + 1));
      continue;
    }

    if (retryable && response.status === 503) {
      if (isLastAttempt) {
        throw serverWakingUpError();
      }
      await delay(RETRY_BACKOFF_MS * (attempt + 1));
      continue;
    }

    hasReachedServer = true;
    return parseResponse<T>(response);
  }

  throw serverWakingUpError();
}

export async function getApi<T>(path: string): Promise<T> {
  return requestApi<T>(path, { headers: buildHeaders() }, true);
}

export async function postApi<T>(
  path: string,
  body: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const extraHeaders: Record<string, string> = {};
  if (idempotencyKey) {
    extraHeaders['Idempotency-Key'] = idempotencyKey;
  }
  return requestApi<T>(
    path,
    {
      method: 'POST',
      headers: buildHeaders(extraHeaders),
      body: JSON.stringify(body),
    },
    false,
  );
}

export async function putApi<T>(path: string, body: unknown): Promise<T> {
  return requestApi<T>(
    path,
    {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    },
    false,
  );
}

export async function patchApi<T>(path: string, body: unknown): Promise<T> {
  return requestApi<T>(
    path,
    {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    },
    false,
  );
}


export async function deleteApi<T>(path: string): Promise<T> {
  return requestApi<T>(
    path,
    {
      method: 'DELETE',
      headers: buildHeaders(),
    },
    false,
  );
}
