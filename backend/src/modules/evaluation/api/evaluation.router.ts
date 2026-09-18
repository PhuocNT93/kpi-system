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
  router.put('/:id/development-blocks', controller.saveDevelopmentBlocks);
  router.put('/:id/items/:itemId', controller.saveItemDraft);
  router.post('/:id/submit', controller.submitEvaluation);
  router.post('/:id/self-submit', controller.selfSubmitEvaluation);
  router.post('/:id/review', controller.reviewEvaluation);
  router.post('/:id/approve', controller.approveEvaluation);
  router.post('/:id/reject', controller.rejectEvaluation);
  router.post('/:id/request-correction', controller.requestCorrection);
  router.post('/:id/recalculate', controller.recalculateEvaluation);
  router.post('/:id/publish', controller.publishEvaluation);
  router.post('/:id/lock', controller.lockEvaluation);
  router.post('/:id/kpis/:kpiId/override', controller.overrideKpiScore);
  router.get('/:id/kpis/:code/evidence', controller.getKpiEvidence);

  return router;
}
