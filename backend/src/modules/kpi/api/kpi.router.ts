import { Router } from 'express';
import { KpiRelationshipController } from './kpi-relationship.controller.js';

export function createKpiRouter(
  relationshipController: KpiRelationshipController,
  jwtMiddleware: any
): Router {
  const router = Router();
  
  router.use(jwtMiddleware);

  router.post('/relationships', relationshipController.create);
  router.get('/relationships', relationshipController.getAll);
  router.delete('/relationships/:id', relationshipController.delete);

  return router;
}
