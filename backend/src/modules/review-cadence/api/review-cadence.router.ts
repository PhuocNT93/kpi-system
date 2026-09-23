import { Router, RequestHandler } from 'express';
import { ReviewCadenceController } from './review-cadence.controller.js';

export function createReviewCadenceRouter(
  controller: ReviewCadenceController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  // ── Review Cadence Routes ─────────────────────────────────────────────────
  router.get('/', controller.listCadences);
  router.post('/', controller.createCadence);
  router.get('/:id', controller.getCadenceById);
  router.patch('/:id', controller.updateCadence);
  router.delete('/:id', controller.deleteCadence);

  return router;
}
