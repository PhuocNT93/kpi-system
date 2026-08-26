import { Router, RequestHandler } from 'express';
import { NotFound, ValidationError } from './app-error.js';
import { sendCollection, sendSuccess } from './http-response.js';
import { parsePaginationQuery } from './pagination.js';
import { AuthController, createAuthRouter } from '../modules/auth/index.js';
import { IamController, createIamRouter, AuthorizationService } from '../modules/iam/index.js';
import { EmployeeController } from '../modules/employee/api/employee.controller.js';
import { createEmployeeRouter } from '../modules/employee/api/employee.router.js';
import { OrganizationController } from '../modules/organization/api/organization.controller.js';
import { createOrganizationRouter } from '../modules/organization/api/organization.router.js';

export interface RegisterRoutesOptions {
  authController: AuthController;
  jwtMiddleware: RequestHandler;
  iamController: IamController;
  authorizationService: AuthorizationService;
  employeeController?: EmployeeController;
  organizationController?: OrganizationController;
}

export function createApiRouter(options: RegisterRoutesOptions): Router {
  const router = Router();

  // ── Auth Module Routes ───────────────────────────────────────────────────
  router.use('/auth', createAuthRouter(options.authController, options.jwtMiddleware));

  // ── IAM Module Routes ────────────────────────────────────────────────────
  router.use('/iam', createIamRouter(options.iamController, options.authorizationService, options.jwtMiddleware));

  // ── Employee Module Routes ────────────────────────────────────────────────
  if (options.employeeController) {
    router.use('/', createEmployeeRouter(options.employeeController, options.jwtMiddleware));
  }

  // ── Organization Module Routes ────────────────────────────────────────────
  if (options.organizationController) {
    router.use('/org', createOrganizationRouter(options.organizationController, options.jwtMiddleware));
  }

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
  router.get('/sample/error', () => {
    throw new NotFound('Sample resource');
  });

  // ── Sample: validation error with field details ───────────────────────────
  router.get('/sample/validation-error', () => {
    throw new ValidationError('Request validation failed.', [
      { field: 'name', code: 'REQUIRED', message: 'name is required.' },
      { field: 'page_size', code: 'OUT_OF_RANGE', message: 'page_size must be between 1 and 100.' },
    ]);
  });

  return router;
}
