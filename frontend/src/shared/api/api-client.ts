import type { ApiEnvelope } from './api-types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly requestId: string;

  public constructor(message: string, code: string, requestId: string) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.requestId = requestId;
  }
}

export async function getApi<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new ApiClientError(
      payload.message,
      payload.meta.error?.code ?? 'UNEXPECTED_API_RESPONSE',
      payload.meta.request_id
    );
  }

  return payload.data;
}
