import { Router, RequestHandler } from 'express';
import { CalibrationController } from './calibration.controller.js';

export function createCalibrationRouter(
  controller: CalibrationController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();
  router.use(jwtMiddleware);

  // Routes for /calibration-sessions or /calibration/sessions
  router.post('/', controller.createSession);
  router.get('/', controller.listSessions);
  router.get('/:id/distribution', controller.getDistribution);
  router.get('/:id/adjustments', controller.getAdjustments);
  router.get('/:id', controller.getSessionDetail);
  router.post('/:id/adjustments', controller.adjustScore);
  router.post('/:id/finalize', controller.finalizeSession);

  // Alias routes with /sessions prefix (for router mounted at /calibration)
  router.post('/sessions', controller.createSession);
  router.get('/sessions', controller.listSessions);
  router.get('/sessions/:id/distribution', controller.getDistribution);
  router.get('/sessions/:id/adjustments', controller.getAdjustments);
  router.get('/sessions/:id', controller.getSessionDetail);
  router.post('/sessions/:id/adjustments', controller.adjustScore);
  router.post('/sessions/:id/finalize', controller.finalizeSession);

  return router;
}
