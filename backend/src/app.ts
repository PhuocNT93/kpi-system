import cors from 'cors';
import express from 'express';
import { errorHandler, notFoundHandler } from './api/error-handler.js';
import { sendSuccess } from './api/http-response.js';
import { createApiRouter } from './api/routes.js';
import { getJwtConfig } from './config/jwt.config.js';
import { requestIdMiddleware } from './shared/request-id.js';
import { createJwtAuthMiddleware, JwtConfig } from './shared/auth/index.js';
import {
  AuthService,
  AuthController,
  InMemoryUserRepository,
  SimplePasswordHasher,
  JWTTokenService,
} from './modules/auth/index.js';
import {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryUserRoleRepository,
  InMemoryRolePermissionRepository,
  InMemoryAuditWriter,
  seedIamData,
  AuthorizationService,
  RoleService,
  PermissionService,
  RoleAssignmentService,
  IamController,
} from './modules/iam/index.js';

export interface AppOptions {
  userRepository?: InMemoryUserRepository;
  jwtConfig?: JwtConfig;
  roleRepository?: InMemoryRoleRepository;
  permissionRepository?: InMemoryPermissionRepository;
  userRoleRepository?: InMemoryUserRoleRepository;
  rolePermissionRepository?: InMemoryRolePermissionRepository;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  const jwtConfig = getJwtConfig(options.jwtConfig);

  const userRepository = options.userRepository || new InMemoryUserRepository();
  const passwordHasher = new SimplePasswordHasher();
  const tokenService = new JWTTokenService(jwtConfig);

  const authService = new AuthService({
    userRepository,
    passwordHasher,
    tokenService,
  });

  const authController = new AuthController(authService);
  const jwtMiddleware = createJwtAuthMiddleware(jwtConfig);

  // ── IAM Setup ─────────────────────────────────────────────────────────────
  const roleRepository = options.roleRepository || new InMemoryRoleRepository();
  const permissionRepository = options.permissionRepository || new InMemoryPermissionRepository();
  const userRoleRepository = options.userRoleRepository || new InMemoryUserRoleRepository();
  const rolePermissionRepository = options.rolePermissionRepository || new InMemoryRolePermissionRepository();
  const auditWriter = new InMemoryAuditWriter();

  // Seed IAM Data synchronously/in-memory setup
  seedIamData(roleRepository, permissionRepository, userRoleRepository, rolePermissionRepository);

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

  // ── Health Check ──────────────────────────────────────────────────────────
  app.get('/health', (_request, response) => {
    sendSuccess(response, 200, 'Service is healthy.', { status: 'healthy' });
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use(
    '/api',
    createApiRouter({
      authController,
      jwtMiddleware,
      iamController,
      authorizationService,
    })
  );

  // ── Error Handling ────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
