/**
 * Express error-handling and 404 middleware.
 *
 * Rules applied (BACKEND_NODE_RULES §4, §6):
 *  - AppError → its own status, code, field, and details.
 *  - Unknown throwable → 500 INTERNAL_SERVER_ERROR with no stack/detail leak.
 *  - 404 route miss → 404 RESOURCE_NOT_FOUND.
 *  - Never expose raw SQL, stack traces, tokens, or unmasked PII.
 */

import type { NextFunction, Request, Response } from 'express';
import { AppError } from './app-error.js';
import { sendFailure } from './http-response.js';

export function notFoundHandler(_request: Request, response: Response): void {
  sendFailure(response, 404, 'The requested resource was not found.', 'RESOURCE_NOT_FOUND');
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction
): void {
  // Required Express 5-parameter signature; next must be declared even if unused.
  void next;

  if (error instanceof AppError) {
    sendFailure(response, error.status, error.message, error.code, error.field, error.details);
    return;
  }

  // Unknown or unhandled error — log fully server-side, return safe message to client.
  console.error(error);
  sendFailure(response, 500, 'An unexpected error occurred.', 'INTERNAL_SERVER_ERROR');
}
