import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { I18nController } from './i18n.controller.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { sendFailure } from '../../../api/http-response.js';

export function createI18nRouter(
  controller: I18nController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      sendFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      sendFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }
    if (actor.role !== 'SYSTEM_ADMIN' && actor.role !== 'HR_ADMIN') {
      sendFailure(res, 403, 'Admin privileges required', 'FORBIDDEN');
      return;
    }
    next();
  };

  router.get('/i18n/locales', controller.getLocales);
  router.get('/i18n/:entity_type/:entity_id', jwtMiddleware, requireAuth, controller.getEntityTranslations);
  router.put('/i18n/:entity_type/:entity_id', jwtMiddleware, requireAdmin, controller.putEntityTranslations);
  router.patch('/users/me/locale', jwtMiddleware, requireAuth, controller.updateUserLocale);

  return router;
}
