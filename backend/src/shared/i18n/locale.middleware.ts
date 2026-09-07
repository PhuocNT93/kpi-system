import { Request, Response, NextFunction } from 'express';
import { getActorFromContext } from '../auth/actor-context.js';

export function localeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  let locale = 'en';

  // 1. User preferred locale from actor / user context if attached
  const actor = getActorFromContext(req);
  if (actor && (actor as { locale?: string }).locale) {
    locale = (actor as { locale?: string }).locale!;
  }
  // 2. Query param ?locale=xx
  else if (req.query.locale && typeof req.query.locale === 'string') {
    locale = req.query.locale;
  }
  // 3. Accept-Language header
  else if (req.headers['accept-language']) {
    const header = req.headers['accept-language'];
    const primary = header.split(',')[0]?.split(';')[0]?.trim()?.toLowerCase();
    if (primary) {
      if (primary.startsWith('vi')) {
        locale = 'vi';
      } else if (primary.startsWith('ja')) {
        locale = 'ja';
      } else if (primary.startsWith('en')) {
        locale = 'en';
      }
    }
  }

  req.locale = locale.toLowerCase().trim();
  next();
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      locale?: string;
    }
  }
}
