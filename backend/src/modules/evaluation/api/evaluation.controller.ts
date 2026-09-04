import { Request, Response } from 'express';
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
      const user = (req as any).user;
      if (!user) throw new Error('Unauthorized');
      return {
        userId: user.id || user.userId,
        role: user.role || 'EMPLOYEE',
        employeeId: user.employeeId || user.id,
        managedTeamIds: user.managedTeamIds || [],
      };
    }
  }

  getMyEvaluations = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const evaluations = await this.evaluationService.getMyEvaluations(actor.employeeId || actor.userId);
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

  saveDraft = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const id = req.params.id as string;
    const { items } = req.body;
    await this.evaluationService.saveDraft(id, actor, items || []);
    sendSuccess(res, 200, 'Draft saved successfully.', null);
  };

  saveItemDraft = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const id = req.params.id as string;
    const itemId = req.params.itemId as string;
    const { resolved_level, comment } = req.body;
    await this.evaluationService.saveItemDraft(id, itemId, actor, { resolved_level, comment });
    sendSuccess(res, 200, 'Item draft saved successfully.', null);
  };

  submitEvaluation = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const id = req.params.id as string;
    const result = await this.evaluationService.submitEvaluation(id, actor);
    sendSuccess(res, 200, 'Evaluation submitted successfully.', result);
  };

  selfSubmitEvaluation = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const id = req.params.id as string;
    const result = await this.evaluationService.submitEvaluation(id, actor);
    sendSuccess(res, 200, 'Self-assessment submitted successfully.', result);
  };

  approveEvaluation = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const id = req.params.id as string;
    const result = await this.evaluationService.approveEvaluation(id, actor);
    sendSuccess(res, 200, 'Evaluation approved successfully.', result);
  };

  recalculateEvaluation = async (req: Request, res: Response): Promise<void> => {
    const actor = this.getActor(req);
    const id = req.params.id as string;
    const result = await this.evaluationService.recalculateEvaluation(id, actor);
    sendSuccess(res, 200, 'Evaluation score calculated successfully.', result);
  };
}
