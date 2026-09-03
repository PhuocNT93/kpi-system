import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { EvaluationCycleController } from './evaluation-cycle.controller.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { Forbidden, Unauthenticated } from '../../../api/app-error.js';

export function createEvaluationCycleRouter(
  controller: EvaluationCycleController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  const requireHrAdmin = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      next(new Unauthenticated('Authentication required'));
      return;
    }
    if (actor.role !== 'HR_ADMIN' && actor.role !== 'SYSTEM_ADMIN') {
      next(new Forbidden('Only HR_ADMIN or SYSTEM_ADMIN can perform this operation'));
      return;
    }
    next();
  };

  const requireAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      next(new Unauthenticated('Authentication required'));
      return;
    }
    next();
  };

  router.post('/evaluation-cycles', requireHrAdmin, controller.createCycle);
  router.get('/evaluation-cycles', requireAuthenticated, controller.listCycles);
  router.get('/evaluation-cycles/:id', requireAuthenticated, controller.getCycleById);
  router.patch('/evaluation-cycles/:id', requireHrAdmin, controller.updateDraftCycle);
  router.post('/evaluation-cycles/:id/open', requireHrAdmin, controller.openCycle);
  router.post('/evaluation-cycles/:id/transition', requireHrAdmin, controller.transitionCycle);
  router.post('/evaluation-cycles/:id/lock', requireHrAdmin, controller.lockCycle);
  router.get('/evaluation-cycles/:id/opening-status', requireAuthenticated, controller.getOpeningStatus);
  router.get('/evaluation-cycles/:id/scope-preview', requireAuthenticated, controller.getScopePreview);

  return router;
}
