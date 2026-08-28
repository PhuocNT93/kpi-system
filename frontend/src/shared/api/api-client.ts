import type { ApiEnvelope } from './api-types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const TOKEN_STORAGE_KEY = 'kpi_auth_token';

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

  // Per FE Rule §5: on 401 callers handle sign-in flow via thrown error code
  if (!response.ok || !payload.success) {
    if (response.status === 401) {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem('kpi_auth_user');
        window.location.href = '/login';
      }
    }

    throw new ApiClientError(
      payload.message || 'Unknown server error',
      payload.meta?.error?.code ?? 'UNEXPECTED_API_RESPONSE',
      payload.meta?.request_id ?? 'unknown',
      response.status,
    );
  }

  return payload.data;
}

export async function getApi<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: buildHeaders(),
    });
  } catch {
    throw new ApiClientError('Network Error: Could not connect to the backend server.', 'NETWORK_ERROR', 'unknown', 0);
  }
  return parseResponse<T>(response);
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
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: buildHeaders(extraHeaders),
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError('Network Error: Could not connect to the backend server.', 'NETWORK_ERROR', 'unknown', 0);
  }
  return parseResponse<T>(response);
}

export async function putApi<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError('Network Error: Could not connect to the backend server.', 'NETWORK_ERROR', 'unknown', 0);
  }
  return parseResponse<T>(response);
}

export async function patchApi<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError('Network Error: Could not connect to the backend server.', 'NETWORK_ERROR', 'unknown', 0);
  }
  return parseResponse<T>(response);
}


export async function deleteApi<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
  } catch {
    throw new ApiClientError('Network Error: Could not connect to the backend server.', 'NETWORK_ERROR', 'unknown', 0);
  }
  return parseResponse<T>(response);
}
