import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCollection, sendCreated } from '../../../api/http-response.js';
import { ValidationError, BadRequest } from '../../../api/app-error.js';
import { parsePaginationQuery } from '../../../api/pagination.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { EvaluationCycleService } from '../application/evaluation-cycle.service.js';
import { EvaluationCycleOpeningService } from '../application/evaluation-cycle-opening.service.js';
import {
  CreateEvaluationCycleSchema,
  UpdateEvaluationCycleSchema,
  ListEvaluationCycleQuerySchema,
  TransitionEvaluationCycleSchema,
  EvaluationCycleResponse,
} from './evaluation-cycle.dto.js';
import { EvaluationCycle, EvaluationCycleStatus } from '../domain/evaluation-cycle.types.js';

export class EvaluationCycleController {
  constructor(
    private cycleService: EvaluationCycleService,
    private openingService: EvaluationCycleOpeningService
  ) {}

  public createCycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateEvaluationCycleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Invalid evaluation cycle payload',
          parsed.error.issues.map((e) => ({
            field: e.path.join('.'),
            code: e.code.toUpperCase(),
            message: e.message,
          }))
        );
      }

      const actor = getActorFromContext(req);
      const actorEmployeeId = actor?.employeeId || actor?.userId || null;

      const created = await this.cycleService.createCycle(parsed.data, actorEmployeeId);
      const mapped = this.mapToResponse(created);
      sendCreated(res, 'Evaluation cycle created successfully', mapped, `/v1/evaluation-cycles/${created.evaluationCycleId}`);
    } catch (err) {
      next(err);
    }
  };

  public getCycleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const cycle = await this.cycleService.getCycleById(id);
      sendSuccess(res, 200, 'Evaluation cycle retrieved successfully', this.mapToResponse(cycle));
    } catch (err) {
      next(err);
    }
  };

  public listCycles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ListEvaluationCycleQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new BadRequest('Invalid list query parameters');
      }

      const { page, page_size, status, search, sort, sort_direction } = parsed.data;

      const result = await this.cycleService.listCycles({
        page,
        pageSize: page_size,
        status: status as EvaluationCycleStatus,
        search,
        sort,
        sortDirection: sort_direction ? (sort_direction.toLowerCase() as 'asc' | 'desc') : undefined,
      });

      const items = result.items.map(this.mapToResponse);

      const { buildPageMeta } = parsePaginationQuery({
        page: page.toString(),
        page_size: page_size.toString(),
      });

      sendCollection(res, 'Evaluation cycles retrieved successfully', items, buildPageMeta(result.total));
    } catch (err) {
      next(err);
    }
  };

  public updateDraftCycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const parsed = UpdateEvaluationCycleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Invalid evaluation cycle update payload',
          parsed.error.issues.map((e) => ({
            field: e.path.join('.'),
            code: e.code.toUpperCase(),
            message: e.message,
          }))
        );
      }

      const actor = getActorFromContext(req);
      const actorEmployeeId = actor?.employeeId || actor?.userId || null;

      const updated = await this.cycleService.updateDraftCycle(id, parsed.data, actorEmployeeId);
      sendSuccess(res, 200, 'Evaluation cycle updated successfully', this.mapToResponse(updated));
    } catch (err) {
      next(err);
    }
  };

  public openCycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Opening evaluation cycle with ID:', req.params.id);
      const id = req.params.id as string;
      const actor = getActorFromContext(req);
      const actorEmployeeId = actor?.employeeId || actor?.userId || null;

      const result = await this.openingService.openCycle(id, actorEmployeeId);

      sendSuccess(res, 200, 'Evaluation cycle opened successfully', {
        id: result.id,
        status: result.status,
        evaluation_count: result.evaluationCount,
      });
    } catch (err) {
      next(err);
    }
  };

  public transitionCycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const parsed = TransitionEvaluationCycleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Invalid transition evaluation cycle payload',
          parsed.error.issues.map((e) => ({
            field: e.path.join('.'),
            code: e.code.toUpperCase(),
            message: e.message,
          }))
        );
      }

      const actor = getActorFromContext(req);
      const actorEmployeeId = actor?.employeeId || actor?.userId || null;

      const transitioned = await this.cycleService.transitionCycle(id, parsed.data.target_status, actorEmployeeId);
      sendSuccess(res, 200, 'Evaluation cycle status transitioned successfully', this.mapToResponse(transitioned));
    } catch (err) {
      next(err);
    }
  };

  public lockCycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const actor = getActorFromContext(req);
      const actorEmployeeId = actor?.employeeId || actor?.userId || null;

      const locked = await this.cycleService.lockCycle(id, actorEmployeeId);

      sendSuccess(res, 200, 'Evaluation cycle locked successfully', {
        id: locked.evaluationCycleId,
        status: locked.status,
        locked_at: locked.lockedAt,
      });
    } catch (err) {
      next(err);
    }
  };

  public getScopePreview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const preview = await this.cycleService.getScopePreview(id);
      sendSuccess(res, 200, 'Scope preview retrieved successfully', preview);
    } catch (err) {
      next(err);
    }
  };

  public getOpeningStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const statusInfo = await this.cycleService.getOpeningStatus(id);
      sendSuccess(res, 200, 'Opening status retrieved successfully', statusInfo);
    } catch (err) {
      next(err);
    }
  };

  private mapToResponse(cycle: EvaluationCycle): EvaluationCycleResponse {
    return {
      id: cycle.evaluationCycleId,
      code: cycle.code,
      name: cycle.name,
      start_date: cycle.startDate,
      end_date: cycle.endDate,
      status: cycle.status,
      evaluation_template_version_id: cycle.evaluationTemplateVersionId,
      applicable_team_ids: cycle.applicableTeamIds,
      applicable_role_ids: cycle.applicableRoleIds,
      approved_by: cycle.approvedBy,
      locked_at: cycle.lockedAt,
      created_at: cycle.createdAt,
      updated_at: cycle.updatedAt,
      created_by: cycle.createdBy,
      updated_by: cycle.updatedBy,
    };
  }
}
