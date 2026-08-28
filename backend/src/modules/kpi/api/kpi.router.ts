import { Router } from 'express';
import { KpiRelationshipController } from './kpi-relationship.controller.js';
import { KpiController } from './kpi.controller.js';

export function createKpiRouter(
  kpiController: KpiController,
  relationshipController: KpiRelationshipController,
  jwtMiddleware: any
): Router {
  const router = Router();
  
  router.use(jwtMiddleware);

  router.post('/', kpiController.create);
  router.get('/', kpiController.getAll);
  router.get('/:id', kpiController.getById);
  router.put('/:id', kpiController.update);
  router.delete('/:id', kpiController.delete);

  router.post('/relationships', relationshipController.create);
  router.get('/relationships', relationshipController.getAll);
  router.delete('/relationships/:id', relationshipController.delete);

  return router;
}
