import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { AuditController } from './audit.controller.js';
import { AuthorizationService } from '../../iam/application/services.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { sendFailure } from '../../../api/http-response.js';

export function createAuditRouter(
  auditController: AuditController,
  authorizationService: AuthorizationService,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();
  
  router.use(jwtMiddleware);

  const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      sendFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }
    if (actor.role !== 'SYSTEM_ADMIN' && actor.role !== 'HR_ADMIN') {
      sendFailure(res, 403, 'Forbidden', 'FORBIDDEN');
      return;
    }
    next();
  };

  router.get('/audit-logs', requireAdmin, (req, res, next) => {
    auditController.getLogs(req, res).catch(next);
  });

  return router;
}
