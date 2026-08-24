import cors from 'cors';
import express from 'express';
import { NotFound, ValidationError } from './api/app-error.js';
import { errorHandler, notFoundHandler } from './api/error-handler.js';
import { sendCollection, sendSuccess } from './api/http-response.js';
import { parsePaginationQuery } from './api/pagination.js';
import { requestIdMiddleware } from './shared/request-id.js';

export function createApp() {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(cors());
  app.use(express.json());

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get('/health', (_request, response) => {
    sendSuccess(response, 200, 'Service is healthy.', { status: 'healthy' });
  });

  // ── Sample: single-resource response ──────────────────────────────────────
  app.get('/sample/resource', (_request, response) => {
    sendSuccess(response, 200, 'Resource retrieved successfully.', {
      id: '7ea65e36-7d4d-42b3-95c1-4669578f8a9b',
      name: 'Sample resource'
    });
  });

  // ── Sample: paginated collection response ─────────────────────────────────
  app.get('/sample/collection', (request, response) => {
    const { buildPageMeta } = parsePaginationQuery(request.query as Record<string, unknown>);
    const items = [{ id: '1', name: 'Item A' }, { id: '2', name: 'Item B' }];
    sendCollection(response, 'Items retrieved successfully.', items, buildPageMeta(2));
  });

  // ── Sample: AppError thrown inside a route ────────────────────────────────
  app.get('/sample/error', (_req, _res) => {
    throw new NotFound('Sample resource');
  });

  // ── Sample: validation error with field details ───────────────────────────
  app.get('/sample/validation-error', (_req, _res) => {
    throw new ValidationError('Request validation failed.', [
      { field: 'name', code: 'REQUIRED', message: 'name is required.' },
      { field: 'page_size', code: 'OUT_OF_RANGE', message: 'page_size must be between 1 and 100.' }
    ]);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
