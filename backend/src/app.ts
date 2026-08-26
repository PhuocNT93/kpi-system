import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler, notFoundHandler } from './api/error-handler.js';
import { sendSuccess } from './api/http-response.js';
import { createApiRouter } from './api/routes.js';
import { getJwtConfig } from './config/jwt.config.js';
import { resolveDatabasePool } from './config/database.config.js';
import { resolveRepositories } from './config/repositories.config.js';
import { resolveServices } from './config/services.config.js';
import { requestIdMiddleware } from './shared/request-id.js';
import { createJwtAuthMiddleware, JwtConfig } from './shared/auth/index.js';
import { Pool } from 'pg';
import {
  AuthController,
  UserRepository,
} from './modules/auth/index.js';
import {
  RoleRepository,
  PermissionRepository,
  UserRoleRepository,
  RolePermissionRepository,
  AuditWriter,
  IamController,
} from './modules/iam/index.js';
import { createEmployeeModule } from './modules/employee/employee.module.js';
import { EmployeeController } from './modules/employee/api/employee.controller.js';

export interface AppOptions {
  userRepository?: UserRepository;
  dbPool?: Pool;
  jwtConfig?: JwtConfig;
  roleRepository?: RoleRepository;
  permissionRepository?: PermissionRepository;
  userRoleRepository?: UserRoleRepository;
  rolePermissionRepository?: RolePermissionRepository;
  auditWriter?: AuditWriter;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  const jwtConfig = getJwtConfig(options.jwtConfig);

  // ── IAM & Database Setup ──────────────────────────────────────────────────
  const pool = resolveDatabasePool(options.dbPool);

  const repositories = resolveRepositories(pool, options);
  const {
    authService,
    authorizationService,
    roleService,
    permissionService,
    roleAssignmentService,
  } = resolveServices(repositories, jwtConfig);

  const authController = authService ? new AuthController(authService) : (undefined as unknown as AuthController);
  const jwtMiddleware = createJwtAuthMiddleware(jwtConfig);

  const iamController = new IamController(roleService, permissionService, roleAssignmentService);

  const employeeModule = pool ? createEmployeeModule(pool) : undefined;
  const employeeController = employeeModule?.employeeController ?? new EmployeeController();

  // ── Global Middlewares ────────────────────────────────────────────────────
  app.use(requestIdMiddleware);
  app.use(cors());
  app.use(express.json());

  // ── Swagger Documentation ─────────────────────────────────────────────────
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ── Health Check ──────────────────────────────────────────────────────────
  app.get('/health', (_request, response) => {
    sendSuccess(response, 200, 'Service is healthy.', { status: 'healthy' });
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  if (authController && iamController && authorizationService) {
    app.use(
      '/api',
      createApiRouter({
        authController,
        jwtMiddleware,
        iamController,
        authorizationService,
        employeeController,
      })
    );
  }

  // ── Error Handling ────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
