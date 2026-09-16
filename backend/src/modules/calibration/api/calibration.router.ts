import { Router, RequestHandler } from 'express';
import { CalibrationController } from './calibration.controller.js';

export function createCalibrationRouter(
  controller: CalibrationController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();
  router.use(jwtMiddleware);

  router.post('/sessions', controller.createSession);
  router.get('/sessions', controller.listSessions);
  router.get('/sessions/:id', controller.getSessionDetail);
  router.post('/sessions/:id/adjustments', controller.adjustScore);
  router.post('/sessions/:id/finalize', controller.finalizeSession);

  return router;
}
