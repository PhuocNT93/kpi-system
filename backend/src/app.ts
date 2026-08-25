import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler, notFoundHandler } from './api/error-handler.js';
import { sendSuccess } from './api/http-response.js';
import { createApiRouter } from './api/routes.js';
import { getJwtConfig } from './config/jwt.config.js';
import { requestIdMiddleware } from './shared/request-id.js';
import { createJwtAuthMiddleware, JwtConfig } from './shared/auth/index.js';
import { Pool } from 'pg';
import { createDatabasePool } from './shared/database/database.js';
import {
  AuthService,
  AuthController,
  UserRepository,
  PostgresUserRepository,
  SimplePasswordHasher,
  JWTTokenService,
} from './modules/auth/index.js';
import {
  PostgresRoleRepository,
  PostgresPermissionRepository,
  PostgresUserRoleRepository,
  PostgresRolePermissionRepository,
  PostgresAuditWriter,
  RoleRepository,
  PermissionRepository,
  UserRoleRepository,
  RolePermissionRepository,
  AuditWriter,
  AuthorizationService,
  RoleService,
  PermissionService,
  RoleAssignmentService,
  IamController,
} from './modules/iam/index.js';

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
  const pool = options.dbPool || (process.env.DATABASE_URL ? createDatabasePool() : undefined);

  const userRepository =
    options.userRepository ||
    (pool ? new PostgresUserRepository(pool) : (undefined as unknown as UserRepository));
  const passwordHasher = new SimplePasswordHasher();
  const tokenService = new JWTTokenService(jwtConfig);

  const authService = userRepository
    ? new AuthService({
        userRepository,
        passwordHasher,
        tokenService,
      })
    : (undefined as unknown as AuthService);

  const authController = authService ? new AuthController(authService) : (undefined as unknown as AuthController);
  const jwtMiddleware = createJwtAuthMiddleware(jwtConfig);

  const roleRepository =
    options.roleRepository || (pool ? new PostgresRoleRepository(pool) : (undefined as unknown as RoleRepository));
  const permissionRepository =
    options.permissionRepository || (pool ? new PostgresPermissionRepository(pool) : (undefined as unknown as PermissionRepository));
  const userRoleRepository =
    options.userRoleRepository || (pool ? new PostgresUserRoleRepository(pool) : (undefined as unknown as UserRoleRepository));
  const rolePermissionRepository =
    options.rolePermissionRepository ||
    (pool ? new PostgresRolePermissionRepository(pool) : (undefined as unknown as RolePermissionRepository));
  const auditWriter =
    options.auditWriter || (pool ? new PostgresAuditWriter(pool) : (undefined as unknown as AuditWriter));

  const authorizationService = new AuthorizationService(
    roleRepository,
    permissionRepository,
    userRoleRepository,
    rolePermissionRepository
  );

  const roleService = new RoleService(roleRepository, auditWriter);
  const permissionService = new PermissionService(permissionRepository);
  const roleAssignmentService = new RoleAssignmentService(
    roleRepository,
    permissionRepository,
    userRoleRepository,
    rolePermissionRepository,
    auditWriter
  );

  const iamController = new IamController(roleService, permissionService, roleAssignmentService);

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
      })
    );
  }

  // ── Error Handling ────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
