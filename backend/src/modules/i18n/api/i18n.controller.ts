import { Request, Response, NextFunction } from 'express';
import { I18nService } from '../application/i18n.service.js';
import { sendSuccess } from '../../../api/http-response.js';
import { getActorOrThrow } from '../../../shared/auth/actor-context.js';
import { BadRequest } from '../../../api/app-error.js';

export class I18nController {
  constructor(private readonly service: I18nService) {}

  getLocales = async (_req: Request, res: Response): Promise<void> => {
    const locales = this.service.getAvailableLocales();
    sendSuccess(res, 200, 'Available locales retrieved successfully', { locales });
  };

  getEntityTranslations = async (req: Request<{ entity_type: string; entity_id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entity_type, entity_id } = req.params;
      if (!entity_type || !entity_id) {
        throw new BadRequest('entity_type and entity_id parameters are required');
      }
      const translations = await this.service.getTranslationsMap(entity_type, entity_id);
      sendSuccess(res, 200, 'Entity translations retrieved successfully', { translations });
    } catch (err) {
      next(err);
    }
  };

  putEntityTranslations = async (req: Request<{ entity_type: string; entity_id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entity_type, entity_id } = req.params;
      if (!entity_type || !entity_id) {
        throw new BadRequest('entity_type and entity_id parameters are required');
      }

      const actor = getActorOrThrow(req);
      await this.service.upsertEntityTranslations(
        entity_type,
        entity_id,
        req.body,
        actor.userId || actor.employeeId
      );

      sendSuccess(res, 200, 'Translations updated successfully', null);
    } catch (err) {
      next(err);
    }
  };

  updateUserLocale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getActorOrThrow(req);
      const { locale } = req.body;
      if (!locale || typeof locale !== 'string') {
        throw new BadRequest("Property 'locale' is required and must be a string");
      }

      await this.service.updateUserPreferredLocale(actor.userId || actor.employeeId || '', locale);
      sendSuccess(res, 200, 'User preferred locale updated successfully', { locale });
    } catch (err) {
      next(err);
    }
  };
}
