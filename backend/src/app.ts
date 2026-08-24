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

export interface AppOptions {
  userRepository?: InMemoryUserRepository;
  jwtConfig?: JwtConfig;
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

  // ── Global Middlewares ────────────────────────────────────────────────────
  app.use(requestIdMiddleware);
  app.use(cors());
  app.use(express.json());

  // ── Health Check ──────────────────────────────────────────────────────────
  app.get('/health', (_request, response) => {
    sendSuccess(response, 200, 'Service is healthy.', { status: 'healthy' });
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use('/api', createApiRouter({ authController, jwtMiddleware }));

  // ── Error Handling ────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
