import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { EvaluationDataImportController } from './evaluation-data-import.controller.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { sendFailure } from '../../../api/http-response.js';

export function createEvaluationDataImportRouter(
  controller: EvaluationDataImportController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  const requireHrMutation = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      sendFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }
    if (actor.role !== 'HR_ADMIN') {
      sendFailure(res, 403, 'Forbidden. Only HR Admin can modify KPI data imports.', 'FORBIDDEN');
      return;
    }
    next();
  };

  const requireHrOrAdminRead = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      sendFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }
    if (actor.role !== 'HR_ADMIN' && actor.role !== 'SYSTEM_ADMIN') {
      sendFailure(res, 403, 'Forbidden. Access restricted to HR and System Admins.', 'FORBIDDEN');
      return;
    }
    next();
  };

  // 1. Create staging import (HR_ADMIN only)
  router.post('/', requireHrMutation, (req, res, next) => {
    controller.createImport(req, res).catch(next);
  });

  // 2. List import history (HR_ADMIN, SYSTEM_ADMIN)
  router.get('/', requireHrOrAdminRead, (req, res, next) => {
    controller.listImports(req, res).catch(next);
  });

  // 3. Get import details/status (HR_ADMIN, SYSTEM_ADMIN)
  router.get('/:id', requireHrOrAdminRead, (req, res, next) => {
    controller.getImportById(req, res).catch(next);
  });

  // 4. Preview import records & conflicts (HR_ADMIN, SYSTEM_ADMIN)
  router.get('/:id/preview', requireHrOrAdminRead, (req, res, next) => {
    controller.previewImport(req, res).catch(next);
  });

  // 5. Modify draft record / resolve conflicts (HR_ADMIN only)
  router.patch('/:id', requireHrMutation, (req, res, next) => {
    controller.updateDraft(req, res).catch(next);
  });

  router.patch('/:id/records/:recordId', requireHrMutation, (req, res, next) => {
    controller.updateDraft(req, res).catch(next);
  });

  // 6. Confirm and apply batch (HR_ADMIN only)
  router.post('/:id/apply', requireHrMutation, (req, res, next) => {
    controller.applyImport(req, res).catch(next);
  });

  return router;
}
