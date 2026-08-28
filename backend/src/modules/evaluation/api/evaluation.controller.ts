import { Request, Response } from 'express';
import { EvaluationService } from '../application/services/evaluation.service.js';
import { sendSuccess } from '../../../api/http-response.js';

export class EvaluationController {
  constructor(private evaluationService: EvaluationService) {}

  private getActorId(req: Request): string | undefined {
    return (req as any).user?.id;
  }

  getMyEvaluations = async (req: Request, res: Response): Promise<void> => {
    const userId = this.getActorId(req);
    if (!userId) throw new Error('Unauthorized');
    const evaluations = await this.evaluationService.getMyEvaluations(userId);
    sendSuccess(res, 200, 'My evaluations retrieved successfully.', evaluations);
  };

  getEvaluationDetail = async (req: Request, res: Response): Promise<void> => {
    const userId = this.getActorId(req);
    if (!userId) throw new Error('Unauthorized');
    const id = req.params.id as string;
    const detail = await this.evaluationService.getEvaluationDetail(id, userId);
    sendSuccess(res, 200, 'Evaluation detail retrieved successfully.', detail);
  };

  saveDraft = async (req: Request, res: Response): Promise<void> => {
    const userId = this.getActorId(req);
    if (!userId) throw new Error('Unauthorized');
    const id = req.params.id as string;
    const { items } = req.body;
    await this.evaluationService.saveDraft(id, userId, items || []);
    sendSuccess(res, 200, 'Draft saved successfully.', null);
  };

  submitEvaluation = async (req: Request, res: Response): Promise<void> => {
    const userId = this.getActorId(req);
    if (!userId) throw new Error('Unauthorized');
    const id = req.params.id as string;
    const result = await this.evaluationService.submitEvaluation(id, userId);
    sendSuccess(res, 200, 'Evaluation submitted successfully.', result);
  };
}
