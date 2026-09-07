import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { ImportController } from './import.controller.js';
import { AuthorizationService } from '../../iam/index.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { sendFailure } from '../../../api/http-response.js';

export function createImportRouter(
  controller: ImportController,
  authorizationService: AuthorizationService,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  const requireHrAdmin = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      sendFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }
    if (actor.role !== 'HR_ADMIN') {
      sendFailure(res, 403, 'Forbidden', 'FORBIDDEN');
      return;
    }
    next();
  };

  router.get('/csv-templates/current/download', requireHrAdmin, (req, res, next) => { 
    controller.downloadCurrentCsvTemplate(req, res).catch(next); 
  });

  router.get('/csv-templates/:csv_template_id/download', requireHrAdmin, (req, res, next) => { 
    controller.downloadCsvTemplateById(req, res).catch(next); 
  });

  return router;
}
