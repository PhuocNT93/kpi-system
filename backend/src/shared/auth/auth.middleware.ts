import { Request, Response, NextFunction, RequestHandler } from 'express';
import { sendFailure } from '../../api/http-response.js';
import { Action, IAuthorizer, Resource } from './types.js';
import { getActorFromContext } from './actor-context.js';

export function requirePermission(
  authorizer: IAuthorizer,
  action: Action,
  resourceResolver?: (req: Request) => Resource | undefined
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const actor = getActorFromContext(req);

    if (!actor) {
      sendFailure(res, 401, 'Unauthenticated actor', 'UNAUTHENTICATED');
      return;
    }

    const resource = resourceResolver ? resourceResolver(req) : undefined;
    const isAllowed = await authorizer.authorize(actor, action, resource);

    if (!isAllowed) {
      sendFailure(res, 403, 'Forbidden: Insufficient permissions', 'FORBIDDEN');
      return;
    }

    next();
  };
}
