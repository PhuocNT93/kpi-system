import type { Response } from 'express';

export interface ResponseMeta {
  request_id: string;
  timestamp: string;
  error?: {
    code: string;
    field: string | null;
    details: Array<{ field: string; code: string; message: string }>;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: ResponseMeta;
}

export function sendSuccess<T>(response: Response, statusCode: number, message: string, data: T): void {
  response.status(statusCode).json({
    success: true,
    message,
    data,
    meta: createMeta(response)
  } satisfies ApiResponse<T>);
}

export function sendFailure(
  response: Response,
  statusCode: number,
  message: string,
  code: string
): void {
  response.status(statusCode).json({
    success: false,
    message,
    data: null,
    meta: {
      ...createMeta(response),
      error: {
        code,
        field: null,
        details: []
      }
    }
  } satisfies ApiResponse<null>);
}

function createMeta(response: Response): ResponseMeta {
  return {
    request_id: response.locals.requestId as string,
    timestamp: new Date().toISOString()
  };
}
