import { Pool } from 'pg';
import { IEvaluationRepository, IEvaluationItemRepository } from '../../domain/repositories.interface.js';
import { EvaluationStatus, Evaluation } from '../../domain/evaluation.types.js';
import { NotFound, AppError } from '../../../../api/app-error.js';

export class EvaluationService {
  constructor(
    private evaluationRepo: IEvaluationRepository,
    private evaluationItemRepo: IEvaluationItemRepository,
    private pool: Pool
  ) {}

  async getMyEvaluations(userId: string): Promise<any[]> {
    return this.evaluationRepo.findMyEvaluations(userId);
  }

  async getEvaluationDetail(evaluationId: string, userId: string): Promise<any> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) {
      throw new NotFound('Evaluation');
    }
    
    // Ensure the user is authorized to view this evaluation
    // For "My Evaluation", the employee_id must match the userId
    // For managers, we'd check if they are the manager, but let's stick to employee for now.
    if (evaluation.employee_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this evaluation.');
    }

    const items = await this.evaluationItemRepo.findByEvaluationId(evaluationId);
    return {
      ...evaluation,
      items,
    };
  }

  async saveDraft(evaluationId: string, userId: string, items: { id: string; resolved_level?: number; comment?: string }[]): Promise<void> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');
    if (evaluation.employee_id !== userId) throw new AppError(403, 'FORBIDDEN', 'Access denied.');
    if (evaluation.status !== EvaluationStatus.OPEN) {
      throw new AppError(400, 'INVALID_STATUS', 'Can only save draft when evaluation is OPEN.');
    }

    await this.evaluationItemRepo.batchUpdate(evaluationId, items);
  }

  async submitEvaluation(evaluationId: string, userId: string): Promise<Evaluation> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');
    if (evaluation.employee_id !== userId) throw new AppError(403, 'FORBIDDEN', 'Access denied.');
    if (evaluation.status !== EvaluationStatus.OPEN) {
      throw new AppError(400, 'INVALID_STATUS', 'Can only submit when evaluation is OPEN.');
    }

    // In a real system, we might calculate scores here based on the scoring rules and resolved levels
    // For now, just update the status
    return this.evaluationRepo.update(evaluationId, {
      status: EvaluationStatus.SUBMITTED,
      submitted_at: new Date(),
      updated_by: userId,
    });
  }
}
