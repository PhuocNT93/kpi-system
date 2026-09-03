import { Pool } from 'pg';
import { IEvaluationRepository, IEvaluationItemRepository } from '../../domain/repositories.interface.js';
import { EvaluationStatus, Evaluation } from '../../domain/evaluation.types.js';
import { NotFound, AppError } from '../../../../api/app-error.js';
import { Actor } from '../../../../shared/auth/types.js';

export class EvaluationService {
  constructor(
    private evaluationRepo: IEvaluationRepository,
    private evaluationItemRepo: IEvaluationItemRepository,
    private pool: Pool
  ) {}

  async getMyEvaluations(userId: string): Promise<any[]> {
    return this.evaluationRepo.findMyEvaluations(userId);
  }

  async getTeamEvaluations(actor: Actor): Promise<any[]> {
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';
    let managerEmployeeId = actor.employeeId;

    if (!managerEmployeeId && actor.userId && !isSuperAdminOrHr) {
      const userResult = await this.pool.query(
        'SELECT employee_id FROM app_user WHERE id = $1',
        [actor.userId]
      );
      managerEmployeeId = userResult.rows[0]?.employee_id ?? undefined;
    }

    return this.evaluationRepo.findTeamEvaluations({
      managerEmployeeId,
      isSuperAdminOrHr,
    });
  }

  async getEvaluationDetail(evaluationId: string, actor: Actor): Promise<any> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) {
      throw new NotFound('Evaluation');
    }
    
    const isSelf = evaluation.employee_id === actor.employeeId || evaluation.employee_id === actor.userId;
    const isManager = evaluation.manager_id_snapshot === actor.employeeId || evaluation.manager_id_snapshot === actor.userId;
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';

    if (!isSelf && !isManager && !isSuperAdminOrHr) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this evaluation.');
    }

    const items = await this.evaluationItemRepo.findByEvaluationId(evaluationId);
    return {
      ...evaluation,
      items,
      is_manager_reviewer: isManager || isSuperAdminOrHr,
    };
  }

  async saveItemDraft(
    evaluationId: string,
    itemId: string,
    actor: Actor,
    data: { resolved_level?: number; comment?: string }
  ): Promise<void> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');

    const isSelf = evaluation.employee_id === actor.employeeId || evaluation.employee_id === actor.userId;
    const isManager = evaluation.manager_id_snapshot === actor.employeeId || evaluation.manager_id_snapshot === actor.userId;
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';

    if (!isSelf && !isManager && !isSuperAdminOrHr) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied.');
    }

    // Self can only edit when OPEN
    if (isSelf && !isManager && !isSuperAdminOrHr && evaluation.status !== EvaluationStatus.OPEN) {
      throw new AppError(400, 'INVALID_STATUS', 'Can only save draft when evaluation is OPEN.');
    }

    await this.evaluationItemRepo.update(itemId, {
      resolved_level: data.resolved_level,
      comment: data.comment,
      updated_by: actor.userId,
    });
  }

  async saveDraft(
    evaluationId: string,
    actor: Actor,
    items: { id: string; resolved_level?: number; comment?: string }[]
  ): Promise<void> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');

    const isSelf = evaluation.employee_id === actor.employeeId || evaluation.employee_id === actor.userId;
    const isManager = evaluation.manager_id_snapshot === actor.employeeId || evaluation.manager_id_snapshot === actor.userId;
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';

    if (!isSelf && !isManager && !isSuperAdminOrHr) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied.');
    }

    // Self can only edit when OPEN
    if (isSelf && !isManager && !isSuperAdminOrHr && evaluation.status !== EvaluationStatus.OPEN) {
      throw new AppError(400, 'INVALID_STATUS', 'Can only save draft when evaluation is OPEN.');
    }

    await this.evaluationItemRepo.batchUpdate(evaluationId, items);
  }

  async submitEvaluation(evaluationId: string, actor: Actor): Promise<Evaluation> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');

    const isSelf = evaluation.employee_id === actor.employeeId || evaluation.employee_id === actor.userId;
    if (!isSelf) throw new AppError(403, 'FORBIDDEN', 'Access denied.');
    if (evaluation.status !== EvaluationStatus.OPEN) {
      throw new AppError(400, 'INVALID_STATUS', 'Can only submit when evaluation is OPEN.');
    }

    return this.evaluationRepo.update(evaluationId, {
      status: EvaluationStatus.SUBMITTED,
      submitted_at: new Date(),
      updated_by: actor.userId,
    });
  }

  async approveEvaluation(evaluationId: string, actor: Actor): Promise<Evaluation> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');

    const isManager = evaluation.manager_id_snapshot === actor.employeeId || evaluation.manager_id_snapshot === actor.userId;
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';

    if (!isManager && !isSuperAdminOrHr) {
      throw new AppError(403, 'FORBIDDEN', 'Only managers or HR can approve evaluations.');
    }

    return this.evaluationRepo.update(evaluationId, {
      status: EvaluationStatus.APPROVED,
      approved_at: new Date(),
      updated_by: actor.userId,
    });
  }
}
