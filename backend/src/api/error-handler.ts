import type { NextFunction, Request, Response } from 'express';
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
  void next;
  console.error(error);
  sendFailure(response, 500, 'An unexpected error occurred.', 'INTERNAL_SERVER_ERROR');
}
