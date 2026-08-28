import { Router, RequestHandler } from 'express';
import { EvaluationController } from './evaluation.controller.js';

export function createEvaluationRouter(
  controller: EvaluationController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  router.get('/my', controller.getMyEvaluations);
  router.get('/:id', controller.getEvaluationDetail);
  router.put('/:id/items', controller.saveDraft);
  router.post('/:id/submit', controller.submitEvaluation);

  return router;
}
