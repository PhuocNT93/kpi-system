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
  GoogleIdentityVerifier,
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
import { createOrganizationModule } from './modules/organization/organization.module.js';
import { createConfigurationModule } from './modules/configuration/configuration.module.js';
import { createKpiModule } from './modules/kpi/kpi.module.js';
import { createAuditModule } from './modules/audit/audit.module.js';
import { createEvaluationCycleModule } from './modules/evaluation-cycle/evaluation-cycle.module.js';
import { createEvaluationModule } from './modules/evaluation/evaluation.module.js';

export interface AppOptions {
  userRepository?: UserRepository;
  dbPool?: Pool;
  jwtConfig?: JwtConfig;
  roleRepository?: RoleRepository;
  permissionRepository?: PermissionRepository;
  userRoleRepository?: UserRoleRepository;
  rolePermissionRepository?: RolePermissionRepository;
  auditWriter?: AuditWriter;
  googleIdentityVerifier?: GoogleIdentityVerifier;
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
  } = resolveServices(repositories, jwtConfig, options.googleIdentityVerifier);

  const authController = authService ? new AuthController(authService) : (undefined as unknown as AuthController);
  const jwtMiddleware = createJwtAuthMiddleware(jwtConfig);

  const iamController = new IamController(
    roleService, 
    permissionService, 
    roleAssignmentService, 
    repositories.userRepository!
  );

  const auditModule = pool ? createAuditModule(pool) : undefined;

  const employeeModule = pool && auditModule ? createEmployeeModule(pool, auditModule.auditService) : undefined;
  const employeeController = employeeModule?.employeeController ?? new EmployeeController();

  const organizationModule = pool ? createOrganizationModule(pool) : undefined;
  const organizationController = organizationModule?.organizationController;

  const configurationModule = pool ? createConfigurationModule(pool) : undefined;
  const configurationController = configurationModule?.configurationController;

  const kpiModule = pool ? createKpiModule(pool) : undefined;
  const kpiRelationshipController = kpiModule?.relationshipController;

  const evaluationCycleModule = pool ? createEvaluationCycleModule(pool, auditModule?.auditService) : undefined;
  const evaluationCycleController = evaluationCycleModule?.cycleController;

  const evaluationModule = pool ? createEvaluationModule(pool) : undefined;
  const evaluationController = evaluationModule?.evaluationController;

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
        organizationController,
        configurationController,
        kpiRelationshipController,
        auditController: auditModule?.auditController,
        evaluationCycleController,
        evaluationController,
      })
    );
  }

  // ── Error Handling ────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
