import { Router, RequestHandler } from 'express';
import { EvaluationController } from './evaluation.controller.js';

export function createEvaluationRouter(
  controller: EvaluationController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  router.get('/my', controller.getMyEvaluations);
  router.get('/team', controller.getTeamEvaluations);
  router.get('/:id', controller.getEvaluationDetail);
  router.put('/:id/items', controller.saveDraft);
  router.put('/:id/items/:itemId', controller.saveItemDraft);
  router.post('/:id/submit', controller.submitEvaluation);
  router.post('/:id/self-submit', controller.selfSubmitEvaluation);
  router.post('/:id/approve', controller.approveEvaluation);
  router.post('/:id/recalculate', controller.recalculateEvaluation);

  return router;
}
