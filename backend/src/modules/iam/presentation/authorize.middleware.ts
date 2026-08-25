import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthorizationService } from '../application/services.js';
import { AuthorizationScope } from '../domain/types.js';
import { sendFailure } from '../../../api/http-response.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';

export function authorize(
  authzService: AuthorizationService,
  permissionCode: string,
  requiredScope?: AuthorizationScope
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const actor = req.actor || getActorFromContext(req);

    if (!actor || !actor.userId) {
      sendFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }

    try {
      await authzService.authorize(actor.userId, {
        permission: permissionCode,
        scope: requiredScope,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
