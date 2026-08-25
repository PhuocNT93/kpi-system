import { Router, RequestHandler } from 'express';
import { NotFound, ValidationError } from './app-error.js';
import { sendCollection, sendSuccess } from './http-response.js';
import { parsePaginationQuery } from './pagination.js';
import { AuthController, createAuthRouter } from '../modules/auth/index.js';
import { IamController, createIamRouter, AuthorizationService } from '../modules/iam/index.js';

export interface RegisterRoutesOptions {
  authController: AuthController;
  jwtMiddleware: RequestHandler;
  iamController: IamController;
  authorizationService: AuthorizationService;
}

export function createApiRouter(options: RegisterRoutesOptions): Router {
  const router = Router();

  // ── Auth Module Routes ───────────────────────────────────────────────────
  router.use('/auth', createAuthRouter(options.authController, options.jwtMiddleware));

  // ── IAM Module Routes ────────────────────────────────────────────────────
  router.use('/iam', createIamRouter(options.iamController, options.authorizationService, options.jwtMiddleware));

  // ── Sample: single-resource response ──────────────────────────────────────
  router.get('/sample/resource', (_request, response) => {
    sendSuccess(response, 200, 'Resource retrieved successfully.', {
      id: '7ea65e36-7d4d-42b3-95c1-4669578f8a9b',
      name: 'Sample resource',
    });
  });

  // ── Sample: paginated collection response ─────────────────────────────────
  router.get('/sample/collection', (request, response) => {
    const { buildPageMeta } = parsePaginationQuery(request.query as Record<string, unknown>);
    const items = [
      { id: '1', name: 'Item A' },
      { id: '2', name: 'Item B' },
    ];
    sendCollection(response, 'Items retrieved successfully.', items, buildPageMeta(2));
  });

  // ── Sample: AppError thrown inside a route ────────────────────────────────
  router.get('/sample/error', (_req, _res) => {
    throw new NotFound('Sample resource');
  });

  // ── Sample: validation error with field details ───────────────────────────
  router.get('/sample/validation-error', (_req, _res) => {
    throw new ValidationError('Request validation failed.', [
      { field: 'name', code: 'REQUIRED', message: 'name is required.' },
      { field: 'page_size', code: 'OUT_OF_RANGE', message: 'page_size must be between 1 and 100.' },
    ]);
  });

  return router;
}
