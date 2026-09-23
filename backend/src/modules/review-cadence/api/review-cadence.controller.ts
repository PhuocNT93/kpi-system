import { Request, Response, NextFunction } from 'express';
import { ReviewCadenceService } from '../application/review-cadence.service.js';
import { sendSuccess, sendCollection, sendDeleted } from '../../../api/http-response.js';
import { parsePaginationQuery } from '../../../api/pagination.js';
import { ValidationError, BadRequest, Forbidden } from '../../../api/app-error.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';

export class ReviewCadenceController {
  constructor(private readonly cadenceService: ReviewCadenceService) {}

  // ── GET /review-cadences ──────────────────────────────────────────────────

  listCadences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit, offset, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
      const activeFilter = req.query.active !== undefined ? req.query.active === 'true' : undefined;
      const [cadences, total] = await this.cadenceService.listCadences({ active: activeFilter }, offset, limit);
      sendCollection(res, 'Review Cadences retrieved successfully', cadences, buildPageMeta(total));
    } catch (err) {
      next(err);
    }
  };

  // ── GET /review-cadences/:id ──────────────────────────────────────────────

  getCadenceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const cadence = await this.cadenceService.getCadenceById(id);
      sendSuccess(res, 200, 'Review Cadence retrieved successfully', cadence);
    } catch (err) {
      next(err);
    }
  };

  // ── POST /review-cadences ─────────────────────────────────────────────────

  createCadence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getActorFromContext(req);
      if (!actor) throw new Forbidden();

      const { code, name, interval_months, is_system_default, active } = req.body;

      const errors: Array<{ field: string; code: string; message: string }> = [];
      if (!code) errors.push({ field: 'code', code: 'REQUIRED', message: 'Code is required' });
      if (!name) errors.push({ field: 'name', code: 'REQUIRED', message: 'Name is required' });
      if (interval_months === undefined || interval_months === null) {
        errors.push({ field: 'interval_months', code: 'REQUIRED', message: 'Interval months is required' });
      } else if (!Number.isInteger(Number(interval_months)) || Number(interval_months) < 1) {
        errors.push({ field: 'interval_months', code: 'INVALID', message: 'Interval months must be a positive integer' });
      }
      if (errors.length > 0) throw new ValidationError('Request validation failed.', errors);

      const cadence = await this.cadenceService.createCadence(actor, {
        code: String(code).toUpperCase().trim(),
        name: String(name).trim(),
        intervalMonths: Number(interval_months),
        isSystemDefault: is_system_default === true || is_system_default === 'true',
        active: active !== undefined ? active === true || active === 'true' : true,
      });

      sendSuccess(res, 201, 'Review Cadence created successfully', cadence);
    } catch (err) {
      next(err);
    }
  };

  // ── PATCH /review-cadences/:id ────────────────────────────────────────────

  updateCadence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getActorFromContext(req);
      if (!actor) throw new Forbidden();

      const id = req.params.id as string;
      const { name, interval_months, is_system_default, active } = req.body;

      if (interval_months !== undefined && interval_months !== null) {
        if (!Number.isInteger(Number(interval_months)) || Number(interval_months) < 1) {
          throw new ValidationError('Request validation failed.', [
            { field: 'interval_months', code: 'INVALID', message: 'Interval months must be a positive integer' },
          ]);
        }
      }

      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = String(name).trim();
      if (interval_months !== undefined) data.intervalMonths = Number(interval_months);
      if (is_system_default !== undefined) data.isSystemDefault = is_system_default === true || is_system_default === 'true';
      if (active !== undefined) data.active = active === true || active === 'true';

      const cadence = await this.cadenceService.updateCadence(actor, id, data);
      sendSuccess(res, 200, 'Review Cadence updated successfully', cadence);
    } catch (err) {
      next(err);
    }
  };

  // ── DELETE /review-cadences/:id ───────────────────────────────────────────

  deleteCadence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getActorFromContext(req);
      if (!actor) throw new Forbidden();

      const id = req.params.id as string;
      await this.cadenceService.deleteCadence(actor, id);
      sendDeleted(res, 'Review Cadence deleted successfully');
    } catch (err) {
      next(err);
    }
  };
}
