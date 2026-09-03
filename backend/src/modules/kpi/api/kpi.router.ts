import { Router, RequestHandler } from 'express';
import { KpiRelationshipController } from './kpi-relationship.controller.js';
import { KpiController } from './kpi.controller.js';
import { AuthorizationService } from '../../iam/index.js';
import { getActorFromContext } from '../../../shared/auth/index.js';

export function createKpiRouter(
  relationshipController: KpiRelationshipController,
  kpiController: KpiController,
  authorizationService: AuthorizationService,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  const requirePermission = (permissionCode: string): RequestHandler => {
    return async (req, res, next) => {
      try {
        const actor = req.actor || getActorFromContext(req);
        if (!actor || !actor.userId) {
          res.status(401).json({ success: false, message: 'Authentication required.' });
          return;
        }
        const hasPerm = await authorizationService.hasPermission(actor.userId, permissionCode);
        if (!hasPerm) {
          res.status(403).json({ success: false, message: `Permission '${permissionCode}' required.` });
          return;
        }
        next();
      } catch (err) {
        next(err);
      }
    };
  };

  router.use(jwtMiddleware);

  // KPI Relationships (specific path first to avoid conflict with /:id)
  router.post('/relationships', requirePermission('CONFIGURATION_CREATE'), relationshipController.create);
  router.get('/relationships', requirePermission('CONFIGURATION_READ'), relationshipController.getAll);
  router.delete('/relationships/:id', requirePermission('CONFIGURATION_UPDATE'), relationshipController.delete);

  // KPI CRUD
  router.get('/', requirePermission('CONFIGURATION_READ'), kpiController.list);
  router.post('/', requirePermission('CONFIGURATION_CREATE'), kpiController.create);
  router.get('/:id', requirePermission('CONFIGURATION_READ'), kpiController.getById);
  router.put('/:id', requirePermission('CONFIGURATION_UPDATE'), kpiController.update);
  router.delete('/:id', requirePermission('CONFIGURATION_UPDATE'), kpiController.delete);

  // KPI Criterion Mapping
  router.get('/:id/criteria', requirePermission('CONFIGURATION_READ'), kpiController.getCriteria);
  router.post('/:id/criteria', requirePermission('CONFIGURATION_CREATE'), kpiController.addCriterion);
  router.patch('/:id/criteria/:mappingId', requirePermission('CONFIGURATION_UPDATE'), kpiController.updateCriterion);
  router.delete('/:id/criteria/:mappingId', requirePermission('CONFIGURATION_UPDATE'), kpiController.removeCriterion);

  return router;
}
