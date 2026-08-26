import { Router, RequestHandler } from 'express';
import { AuthController } from './controllers/auth.controller.js';

export function createAuthRouter(
  authController: AuthController,
  jwtAuthMiddleware: RequestHandler
): Router {
  const router = Router();

  router.post('/signup', authController.signup);
  router.post('/login', authController.login);
  router.post('/google', authController.loginWithGoogle);
  router.post('/refresh', authController.refreshToken);
  router.post('/refresh-token', authController.refreshToken);
  router.post('/change-password', jwtAuthMiddleware, authController.changePassword);

  return router;
}
