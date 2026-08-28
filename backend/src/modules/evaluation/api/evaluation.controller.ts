import { Request, Response } from 'express';
import { EvaluationService } from '../application/services/evaluation.service.js';
import { sendSuccess } from '../../../api/http-response.js';
import { Forbidden } from '../../../api/app-error.js';

export class EvaluationController {
  constructor(private evaluationService: EvaluationService) {}

  private getEmployeeId(req: Request): string | undefined {
    return (req as any).actor?.employeeId;
  }

  getMyEvaluations = async (req: Request, res: Response): Promise<void> => {
    const employeeId = this.getEmployeeId(req);
    if (!employeeId) throw new Forbidden('User is not an employee.');
    const evaluations = await this.evaluationService.getMyEvaluations(employeeId);
    sendSuccess(res, 200, 'My evaluations retrieved successfully.', evaluations);
  };

  getEvaluationDetail = async (req: Request, res: Response): Promise<void> => {
    const employeeId = this.getEmployeeId(req);
    if (!employeeId) throw new Forbidden('User is not an employee.');
    const id = req.params.id as string;
    const detail = await this.evaluationService.getEvaluationDetail(id, employeeId);
    sendSuccess(res, 200, 'Evaluation detail retrieved successfully.', detail);
  };

  saveDraft = async (req: Request, res: Response): Promise<void> => {
    const employeeId = this.getEmployeeId(req);
    if (!employeeId) throw new Forbidden('User is not an employee.');
    const id = req.params.id as string;
    const { items } = req.body;
    await this.evaluationService.saveDraft(id, employeeId, items || []);
    sendSuccess(res, 200, 'Draft saved successfully.', null);
  };

  submitEvaluation = async (req: Request, res: Response): Promise<void> => {
    const employeeId = this.getEmployeeId(req);
    if (!employeeId) throw new Forbidden('User is not an employee.');
    const id = req.params.id as string;
    const result = await this.evaluationService.submitEvaluation(id, employeeId);
    sendSuccess(res, 200, 'Evaluation submitted successfully.', result);
  };
}
