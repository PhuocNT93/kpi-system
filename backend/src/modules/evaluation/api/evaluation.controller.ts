import { Request, Response, NextFunction } from 'express';
import { EvaluationService } from '../application/services/evaluation.service.js';
import { sendSuccess } from '../../../api/http-response.js';
import { getActorOrThrow } from '../../../shared/auth/actor-context.js';
import { Actor } from '../../../shared/auth/types.js';

export class EvaluationController {
  constructor(private evaluationService: EvaluationService) {}

  private getActor(req: Request): Actor {
    try {
      return getActorOrThrow(req);
    } catch {
      const user = (req as unknown as { user?: { id?: string; userId?: string; role?: string; employeeId?: string; managedTeamIds?: string[] } }).user;
      if (!user) throw new Error('Unauthorized');
      const userId = user.id ?? user.userId;
      if (!userId) throw new Error('Unauthorized: no user id');
      const rawRole = user.role ?? 'EMPLOYEE';
      const validRoles: string[] = ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'];
      return {
        userId,
        role: (validRoles.includes(rawRole) ? rawRole : 'EMPLOYEE') as import('../../../shared/auth/types.js').UserRole,
        employeeId: user.employeeId ?? user.id,
        managedTeamIds: user.managedTeamIds ?? [],
      };
    }
  }

  getMyEvaluations = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const evaluations = await this.evaluationService.getMyEvaluations(actor);
    sendSuccess(res, 200, 'My evaluations retrieved successfully.', evaluations);
  };

  getTeamEvaluations = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const evaluations = await this.evaluationService.getTeamEvaluations(actor);
    sendSuccess(res, 200, 'Team evaluations retrieved successfully.', evaluations);
  };

  getEvaluationDetail = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const id = req.params.id as string;
    const detail = await this.evaluationService.getEvaluationDetail(id, actor);
    sendSuccess(res, 200, 'Evaluation detail retrieved successfully.', detail);
  };

  saveDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const { items } = req.body;
      await this.evaluationService.saveDraft(id, actor, items || []);
      sendSuccess(res, 200, 'Draft saved successfully.', null);
    } catch (err) {
      next(err);
    }
  };

  saveItemDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const itemId = req.params.itemId as string;
      const { resolved_level, comment, version } = req.body;
      await this.evaluationService.saveItemDraft(id, itemId, actor, {
        resolved_level,
        comment,
        version: version !== undefined && version !== null ? Number(version) : undefined,
      });
      sendSuccess(res, 200, 'Item draft saved successfully.', null);
    } catch (err) {
      next(err);
    }
  };

  submitEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const result = await this.evaluationService.submitEvaluation(id, actor);
      sendSuccess(res, 200, 'Evaluation submitted successfully.', result);
    } catch (err) {
      next(err);
    }
  };

  selfSubmitEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const result = await this.evaluationService.submitEvaluation(id, actor);
      sendSuccess(res, 200, 'Self-assessment submitted successfully.', result);
    } catch (err) {
      next(err);
    }
  };

  reviewEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const result = await this.evaluationService.reviewEvaluation(id, actor);
      sendSuccess(res, 200, 'Evaluation review started successfully.', result);
    } catch (err) {
      next(err);
    }
  };

  approveEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const result = await this.evaluationService.approveEvaluation(id, actor);
      sendSuccess(res, 200, 'Evaluation approved successfully.', result);
    } catch (err) {
      next(err);
    }
  };

  rejectEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const { reason } = req.body;
      const result = await this.evaluationService.rejectEvaluation(id, actor, { reason: reason as string });
      sendSuccess(res, 200, 'Evaluation rejected successfully.', result);
    } catch (err) {
      next(err);
    }
  };

  requestCorrection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const { reason } = req.body;
      const result = await this.evaluationService.requestCorrection(id, actor, { reason: reason as string });
      sendSuccess(res, 200, 'Correction requested successfully.', result);
    } catch (err) {
      next(err);
    }
  };

  recalculateEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const result = await this.evaluationService.recalculateEvaluation(id, actor);
      sendSuccess(res, 200, 'Evaluation score calculated successfully.', result);
    } catch (err) {
      next(err);
    }
  };

  publishEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const result = await this.evaluationService.publishEvaluation(id, actor);
      sendSuccess(res, 200, 'Evaluation published successfully.', result);
    } catch (err) {
      next(err);
    }
  };

  lockEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const throwOnConflict = req.query.throw_on_conflict === 'true';
      const result = await this.evaluationService.lockEvaluation(id, actor, { throwOnConflict });
      sendSuccess(res, 200, 'Evaluation locked successfully.', result);
    } catch (err) {
      next(err);
    }
  };

  overrideKpiScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const id = req.params.id as string;
      const kpiId = req.params.kpiId as string;
      const { manual_override_score, override_reason } = req.body;
      const scoreNum =
        manual_override_score !== undefined && manual_override_score !== null && manual_override_score !== ''
          ? Number(manual_override_score)
          : NaN;
      const result = await this.evaluationService.overrideKpiScore(id, kpiId, actor, {
        manual_override_score: scoreNum,
        override_reason: override_reason as string,
      });
      sendSuccess(res, 200, 'KPI score override applied successfully.', result);
    } catch (err) {
      next(err);
    }
  };

  getKpiEvidence = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const id = req.params.id as string;
    const code = req.params.code as string;
    const result = await this.evaluationService.getKpiExplainability(id, code, actor);
    sendSuccess(res, 200, 'KPI evidence and explainability retrieved successfully.', result);
  };
}
