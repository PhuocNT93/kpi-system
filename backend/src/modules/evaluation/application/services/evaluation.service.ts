import { Pool, PoolClient } from 'pg';
import { IEvaluationRepository, IEvaluationItemRepository } from '../../domain/repositories.interface.js';
import { EvaluationStatus, Evaluation, EvaluationItem } from '../../domain/evaluation.types.js';
import { MyEvaluationListItem, TeamEvaluationListItem } from '../../domain/repositories.interface.js';
import { NotFound, AppError } from '../../../../api/app-error.js';
import { Actor } from '../../../../shared/auth/types.js';
import { withTransaction } from '../../../../shared/database/transaction.js';
import { AuditService } from '../../../audit/application/audit.service.js';
import { ScoringEngine, type ScoringKpiInput, type OverallScoringResult } from '../../domain/scoring/scoring-engine.js';
import { RuleEngine } from '../../../rule-engine/domain/rule-engine.js';
import { appEventEmitter, AppEvent } from '../../../../shared/events/index.js';
import { ExplainabilityViewDto, SourceSnapshot } from '../../../evaluation-data-import/domain/evaluation-data-import.types.js';
import { EvaluationTransitionService } from './evaluation-transition.service.js';
import { NotificationType } from '../../../notification/domain/notification.types.js';
import { NotificationService } from '../../../notification/application/notification.service.js';

export class EvaluationService {
  constructor(
    private evaluationRepo: IEvaluationRepository,
    private evaluationItemRepo: IEvaluationItemRepository,
    private pool: Pool,
    private auditService?: AuditService,
    private ruleEngine?: RuleEngine,
    private transitionService: EvaluationTransitionService = new EvaluationTransitionService(),
    private notificationService?: NotificationService
  ) {}

  private async resolveUserForEmployee(employeeId: string, client?: PoolClient): Promise<{ userId: string; email: string } | null> {
    const executor = client ?? this.pool;
    const res = await executor.query(
      `SELECT u.id as user_id, u.email
       FROM employee e
       JOIN app_user u ON LOWER(u.email) = LOWER(e.email)
       WHERE e.employee_id = $1
       LIMIT 1`,
      [employeeId]
    );
    if (res.rows.length === 0) {
      const userRes = await executor.query(
        `SELECT id as user_id, email FROM app_user WHERE id = $1 LIMIT 1`,
        [employeeId]
      );
      if (userRes.rows.length > 0) {
        return { userId: userRes.rows[0].user_id, email: userRes.rows[0].email };
      }
      return null;
    }
    return { userId: res.rows[0].user_id, email: res.rows[0].email };
  }

  private async checkCycleNotLocked(cycleId?: string, client?: PoolClient): Promise<void> {
    if (!cycleId) return;
    const runner = client || this.pool;
    if (!runner || typeof runner.query !== 'function') return;
    const lockClause = client ? ' FOR SHARE' : '';
    const res = await runner.query(
      `SELECT status, locked_at FROM evaluation_cycle WHERE evaluation_cycle_id = $1${lockClause}`,
      [cycleId]
    );
    if (res && res.rows && res.rows.length > 0) {
      const row = res.rows[0];
      if (row.status === 'LOCKED' || Boolean(row.locked_at)) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation cycle is locked.');
      }
    }
  }

  async getMyEvaluations(actor: Actor): Promise<MyEvaluationListItem[]> {
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';
    return this.evaluationRepo.findMyEvaluations({
      userId: actor.employeeId || actor.userId,
      includeAll: isSuperAdminOrHr,
    });
  }

  async getTeamEvaluations(actor: Actor): Promise<TeamEvaluationListItem[]> {
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';
    let managerEmployeeId = actor.employeeId;

    // Always try to resolve the employeeId from app_user if not in token
    if (!managerEmployeeId && actor.userId) {
      const userResult = await this.pool.query(
        'SELECT employee_id FROM app_user WHERE id = $1',
        [actor.userId]
      );
      managerEmployeeId = userResult.rows[0]?.employee_id ?? undefined;
    }

    return this.evaluationRepo.findTeamEvaluations({
      managerEmployeeId,
      // HR_ADMIN with an employeeId: filter by their managed team (not global)
      // HR_ADMIN without employeeId: see all evaluations (system-wide)
      isSuperAdminOrHr: isSuperAdminOrHr && !managerEmployeeId,
    });
  }

  async getEvaluationDetail(evaluationId: string, actor: Actor): Promise<(Evaluation & { items: EvaluationItem[]; official_score: number | null; is_manager_reviewer: boolean })> {
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

    const rawItems = await this.evaluationItemRepo.findByEvaluationId(evaluationId);

    // Employees can only see scores after evaluation is PUBLISHED or LOCKED
    const canSeeScores =
      isManager ||
      isSuperAdminOrHr ||
      evaluation.status === EvaluationStatus.PUBLISHED ||
      evaluation.status === EvaluationStatus.LOCKED;

    const items: EvaluationItem[] = canSeeScores
      ? rawItems
      : rawItems.map((item) => ({
          ...item,
          resolved_level: undefined,
          comment: undefined,
          weighted_score: undefined,
          manual_override_score: undefined,
        }));


    return {
      ...evaluation,
      items,
      official_score: canSeeScores
        ? ((typeof evaluation.scoring_breakdown?.official_score === 'number' ? evaluation.scoring_breakdown.official_score : null) ?? evaluation.manager_score ?? null)
        : null,
      is_manager_reviewer: isManager || isSuperAdminOrHr,
    };
  }

  async saveItemDraft(
    evaluationId: string,
    itemId: string,
    actor: Actor,
    data: { resolved_level?: number; comment?: string; version?: number }
  ): Promise<void> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');

    const isSelf = evaluation.employee_id === actor.employeeId || evaluation.employee_id === actor.userId;
    const isManager = evaluation.manager_id_snapshot === actor.employeeId || evaluation.manager_id_snapshot === actor.userId;
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';

    if (!isSelf && !isManager && !isSuperAdminOrHr) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied.');
    }

    if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
      throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.');
    }

    await this.checkCycleNotLocked(evaluation.evaluation_cycle_id);

    // Self (employee) can only edit when OPEN
    if (isSelf && !isManager && !isSuperAdminOrHr && evaluation.status !== EvaluationStatus.OPEN) {
      throw new AppError(400, 'INVALID_STATUS', 'Can only save draft when evaluation is OPEN.');
    }

    // Manager can edit when OPEN, SUBMITTED, or MANAGER_REVIEW
    if (isManager && !isSuperAdminOrHr) {
      const managerEditableStatuses = [EvaluationStatus.OPEN, EvaluationStatus.SUBMITTED, 'MANAGER_REVIEW' as EvaluationStatus];
      if (!managerEditableStatuses.includes(evaluation.status)) {
        throw new AppError(400, 'INVALID_STATUS', 'Manager can only edit during OPEN, SUBMITTED, or MANAGER_REVIEW.');
      }
    }

    if (data.version !== undefined) {
      await this.evaluationItemRepo.update(
        itemId,
        {
          resolved_level: data.resolved_level,
          comment: data.comment,
          updated_by: actor.userId,
        },
        undefined,
        data.version
      );
    } else {
      await this.evaluationItemRepo.update(itemId, {
        resolved_level: data.resolved_level,
        comment: data.comment,
        updated_by: actor.userId,
      });
    }
  }

  async saveDraft(
    evaluationId: string,
    actor: Actor,
    items: { id: string; resolved_level?: number; comment?: string; version?: number }[]
  ): Promise<void> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');

    const isSelf = evaluation.employee_id === actor.employeeId || evaluation.employee_id === actor.userId;
    const isManager = evaluation.manager_id_snapshot === actor.employeeId || evaluation.manager_id_snapshot === actor.userId;
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';

    if (!isSelf && !isManager && !isSuperAdminOrHr) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied.');
    }

    if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
      throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.');
    }

    await this.checkCycleNotLocked(evaluation.evaluation_cycle_id);

    // Self (employee) can only edit when OPEN
    if (isSelf && !isManager && !isSuperAdminOrHr && evaluation.status !== EvaluationStatus.OPEN) {
      throw new AppError(400, 'INVALID_STATUS', 'Can only save draft when evaluation is OPEN.');
    }

    // Manager can edit when OPEN, SUBMITTED, or MANAGER_REVIEW
    if (isManager && !isSuperAdminOrHr) {
      const managerEditableStatuses = [EvaluationStatus.OPEN, EvaluationStatus.SUBMITTED, 'MANAGER_REVIEW' as EvaluationStatus];
      if (!managerEditableStatuses.includes(evaluation.status)) {
        throw new AppError(400, 'INVALID_STATUS', 'Manager can only edit during OPEN, SUBMITTED, or MANAGER_REVIEW.');
      }
    }

    await this.evaluationItemRepo.batchUpdate(evaluationId, items);
  }

  async saveDevelopmentBlocks(
    evaluationId: string,
    actor: Actor,
    developmentBlocks: Array<{ title: string; desc?: string; accent?: string; value: string }>
  ): Promise<void> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');

    const isSelf = evaluation.employee_id === actor.employeeId || evaluation.employee_id === actor.userId;
    const isManager = evaluation.manager_id_snapshot === actor.employeeId || evaluation.manager_id_snapshot === actor.userId;
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';

    if (!isSelf && !isManager && !isSuperAdminOrHr) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied.');
    }

    if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
      throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.');
    }

    await this.checkCycleNotLocked(evaluation.evaluation_cycle_id);

    if (isSelf && !isManager && !isSuperAdminOrHr && evaluation.status !== EvaluationStatus.OPEN) {
      throw new AppError(400, 'INVALID_STATUS', 'Can only save draft when evaluation is OPEN.');
    }

    if (isManager && !isSuperAdminOrHr) {
      const managerEditableStatuses = [EvaluationStatus.OPEN, EvaluationStatus.SUBMITTED, 'MANAGER_REVIEW' as EvaluationStatus];
      if (!managerEditableStatuses.includes(evaluation.status)) {
        throw new AppError(400, 'INVALID_STATUS', 'Manager can only edit during OPEN, SUBMITTED, or MANAGER_REVIEW.');
      }
    }

    await this.evaluationRepo.update(evaluationId, {
      development_blocks: developmentBlocks.map((block) => ({
        title: block.title,
        desc: block.desc ?? '',
        accent: block.accent ?? '',
        value: String(block.value ?? '').slice(0, 2000),
      })),
      updated_by: actor.userId,
    });
  }

  async submitEvaluation(evaluationId: string, actor: Actor): Promise<Evaluation> {
    const executeSubmit = async (
      client?: PoolClient,
      evalRecord?: Evaluation
    ): Promise<Evaluation> => {
      let evaluation = evalRecord;
      if (!evaluation && client) {
        evaluation = (await this.evaluationRepo.findByIdForUpdate(evaluationId, client)) ||
          (await this.evaluationRepo.findById(evaluationId, client)) ||
          (await this.evaluationRepo.findById(evaluationId)) ||
          undefined;
      } else if (!evaluation) {
        evaluation = (await this.evaluationRepo.findById(evaluationId)) || undefined;
      }

      if (!evaluation) throw new NotFound('Evaluation');

      const isSelf = evaluation.employee_id === actor.employeeId || evaluation.employee_id === actor.userId;
      if (!isSelf) throw new AppError(403, 'FORBIDDEN', 'Access denied.');

      if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.');
      }

      await this.checkCycleNotLocked(evaluation.evaluation_cycle_id, client);

      // Idempotency: if already submitted, return current evaluation
      if (evaluation.status === EvaluationStatus.SUBMITTED) {
        return evaluation;
      }

      this.transitionService.validateTransition(evaluation.status, EvaluationStatus.SUBMITTED);

      // Validate required criteria have scores completed
      const rawItems = await this.evaluationItemRepo.findByEvaluationId(evaluationId, client);
      const items = Array.isArray(rawItems) ? rawItems : [];
      this.transitionService.validateSubmittable(evaluation, items);

      const updatePayload = {
        status: EvaluationStatus.SUBMITTED,
        submitted_at: new Date(),
        updated_by: actor.userId,
      };
      const updated = client
        ? await this.evaluationRepo.update(evaluationId, updatePayload, client)
        : await this.evaluationRepo.update(evaluationId, updatePayload);

      if (this.auditService && client) {
        await this.auditService.record(client, {
          entityType: 'EVALUATION',
          entityId: evaluationId,
          action: 'SUBMIT',
          oldValue: JSON.stringify({ status: evaluation.status }),
          newValue: JSON.stringify({ status: EvaluationStatus.SUBMITTED }),
          performedBy: actor.userId,
          source: 'API',
        });
      }

      if (this.notificationService && evaluation.manager_id_snapshot && client) {
        const managerUser = await this.resolveUserForEmployee(evaluation.manager_id_snapshot, client);
        if (managerUser) {
          await this.notificationService.enqueueNotification(
            {
              notificationType: NotificationType.SELF_SUBMITTED,
              relatedEntityType: 'EVALUATION',
              relatedEntityId: evaluationId,
              recipientUserAccountId: managerUser.userId,
              recipientEmail: managerUser.email,
              contextPayload: {
                evaluation_id: evaluationId,
              },
            },
            client
          );
        }
      }

      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });
      return updated;
    };

    if (this.pool && typeof this.pool.connect === 'function') {
      return withTransaction(this.pool, async (client) => {
        const repositoryClient = client as unknown as PoolClient;
        return executeSubmit(repositoryClient);
      });
    }

    return executeSubmit();
  }

  private checkReviewPermission(evaluation: Evaluation, actor: Actor): void {
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';
    const isDirectManager =
      Boolean(actor.employeeId && evaluation.manager_id_snapshot === actor.employeeId) ||
      Boolean(actor.userId && evaluation.manager_id_snapshot === actor.userId);
    const isTeamManager =
      Boolean(actor.managedTeamIds && actor.managedTeamIds.includes(evaluation.team_id_snapshot));
    const isManager = actor.role === 'MANAGER' && (isDirectManager || isTeamManager);

    if (!isSuperAdminOrHr && !isManager) {
      throw new AppError(403, 'FORBIDDEN', 'Only the assigned manager or HR/Admin can perform this review action.');
    }
  }

  async reviewEvaluation(evaluationId: string, actor: Actor): Promise<Evaluation> {
    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const evaluation = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
      if (!evaluation) throw new NotFound('Evaluation');

      this.checkReviewPermission(evaluation, actor);

      if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.');
      }

      await this.checkCycleNotLocked(evaluation.evaluation_cycle_id, repositoryClient);

      if (evaluation.status === EvaluationStatus.MANAGER_REVIEW) {
        return evaluation;
      }

      const reviewableStatuses = [EvaluationStatus.OPEN, EvaluationStatus.SUBMITTED];
      if (!reviewableStatuses.includes(evaluation.status)) {
        throw new AppError(400, 'INVALID_STATUS', `Cannot review evaluation in ${evaluation.status} status.`);
      }

      const updated = await this.evaluationRepo.update(evaluationId, {
        status: EvaluationStatus.MANAGER_REVIEW,
        updated_by: actor.userId,
      }, repositoryClient);

      if (this.auditService) {
        await this.auditService.record(client, {
          entityType: 'EVALUATION',
          entityId: evaluationId,
          action: 'REVIEW',
          oldValue: JSON.stringify({ status: evaluation.status }),
          newValue: JSON.stringify({ status: EvaluationStatus.MANAGER_REVIEW }),
          performedBy: actor.userId,
          source: 'API',
        });
      }

      if (this.notificationService) {
        const hrRes = await (client ?? this.pool).query(
          `SELECT u.id as user_id, u.email
           FROM app_user u
           JOIN user_role ur ON ur.user_id = u.id::text
           JOIN role r ON r.role_id = ur.role_id
           WHERE r.code IN ('HR_ADMIN', 'SYSTEM_ADMIN')
           LIMIT 1`
        );
        if (hrRes.rows.length > 0 && hrRes.rows[0]) {
          await this.notificationService.enqueueNotification(
            {
              notificationType: NotificationType.MANAGER_SUBMITTED,
              relatedEntityType: 'EVALUATION',
              relatedEntityId: evaluationId,
              recipientUserAccountId: String(hrRes.rows[0].user_id),
              recipientEmail: String(hrRes.rows[0].email),
              contextPayload: { evaluation_id: evaluationId },
            },
            client
          );
        }
      }

      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });
      return updated;
    });
  }

  async approveEvaluation(evaluationId: string, actor: Actor): Promise<Evaluation> {
    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const evaluation = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
      if (!evaluation) throw new NotFound('Evaluation');

      this.checkReviewPermission(evaluation, actor);

      if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.');
      }

      await this.checkCycleNotLocked(evaluation.evaluation_cycle_id, repositoryClient);

      if (evaluation.status === EvaluationStatus.APPROVED || evaluation.status === EvaluationStatus.PUBLISHED) {
        throw new AppError(409, 'ALREADY_APPROVED', 'Evaluation has already been approved.');
      }

      const approvableStatuses = [EvaluationStatus.OPEN, EvaluationStatus.SUBMITTED, EvaluationStatus.MANAGER_REVIEW];
      if (!approvableStatuses.includes(evaluation.status)) {
        throw new AppError(400, 'INVALID_STATUS', 'Evaluation must be OPEN, SUBMITTED, or MANAGER_REVIEW to be approved.');
      }

      const updated = await this.evaluationRepo.update(evaluationId, {
        status: EvaluationStatus.APPROVED,
        approved_at: new Date(),
        updated_by: actor.userId,
      }, repositoryClient);

      if (this.auditService) {
        await this.auditService.record(client, {
          entityType: 'EVALUATION',
          entityId: evaluationId,
          action: 'APPROVE',
          oldValue: JSON.stringify({ status: evaluation.status }),
          newValue: JSON.stringify({ status: EvaluationStatus.APPROVED }),
          performedBy: actor.userId,
          source: 'API',
        });
      }

      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });
      return updated;
    });
  }

  async rejectEvaluation(
    evaluationId: string,
    actor: Actor,
    data: { reason: string }
  ): Promise<Evaluation> {
    if (!data.reason || typeof data.reason !== 'string' || data.reason.trim() === '') {
      throw new AppError(400, 'INVALID_INPUT', 'Rejection reason is required.');
    }

    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const evaluation = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
      if (!evaluation) throw new NotFound('Evaluation');

      this.checkReviewPermission(evaluation, actor);

      if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.');
      }

      if (evaluation.status === EvaluationStatus.APPROVED || evaluation.status === EvaluationStatus.PUBLISHED) {
        throw new AppError(400, 'INVALID_STATUS', 'Cannot reject an evaluation that has already been approved or published.');
      }

      const updated = await this.evaluationRepo.update(evaluationId, {
        status: EvaluationStatus.REJECTED,
        updated_by: actor.userId,
      }, repositoryClient);

      if (this.auditService) {
        await this.auditService.record(client, {
          entityType: 'EVALUATION',
          entityId: evaluationId,
          action: 'REJECT',
          reason: data.reason.trim(),
          oldValue: JSON.stringify({ status: evaluation.status }),
          newValue: JSON.stringify({ status: EvaluationStatus.REJECTED, reason: data.reason.trim() }),
          performedBy: actor.userId,
          source: 'API',
        });
      }

      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });
      return updated;
    });
  }

  async requestCorrection(
    evaluationId: string,
    actor: Actor,
    data: { reason: string }
  ): Promise<Evaluation> {
    if (!data.reason || typeof data.reason !== 'string' || data.reason.trim() === '') {
      throw new AppError(400, 'INVALID_INPUT', 'Correction reason is required.');
    }

    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const evaluation = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
      if (!evaluation) throw new NotFound('Evaluation');

      this.checkReviewPermission(evaluation, actor);

      if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.');
      }

      if (evaluation.status !== EvaluationStatus.SUBMITTED && evaluation.status !== EvaluationStatus.MANAGER_REVIEW) {
        throw new AppError(400, 'INVALID_STATUS', 'Can only request correction for SUBMITTED or MANAGER_REVIEW evaluations.');
      }

      const updated = await this.evaluationRepo.update(evaluationId, {
        status: EvaluationStatus.OPEN,
        updated_by: actor.userId,
      }, repositoryClient);

      if (this.auditService) {
        await this.auditService.record(client, {
          entityType: 'EVALUATION',
          entityId: evaluationId,
          action: 'REQUEST_CORRECTION',
          reason: data.reason.trim(),
          oldValue: JSON.stringify({ status: evaluation.status }),
          newValue: JSON.stringify({ status: EvaluationStatus.OPEN, reason: data.reason.trim() }),
          performedBy: actor.userId,
          source: 'API',
        });
      }

      if (this.notificationService && evaluation.manager_id_snapshot) {
        const managerUser = await this.resolveUserForEmployee(evaluation.manager_id_snapshot, repositoryClient);
        if (managerUser) {
          await this.notificationService.enqueueNotification(
            {
              notificationType: NotificationType.CORRECTION_REQUESTED,
              relatedEntityType: 'EVALUATION',
              relatedEntityId: evaluationId,
              recipientUserAccountId: managerUser.userId,
              recipientEmail: managerUser.email,
              contextPayload: {
                evaluation_id: evaluationId,
                reason: data.reason.trim(),
              },
            },
            client
          );
        }
      }

      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });
      return updated;
    });
  }

  async recalculateEvaluation(evaluationId: string, actor: Actor): Promise<Record<string, unknown>> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');

    const isManager = evaluation.manager_id_snapshot === actor.employeeId || evaluation.manager_id_snapshot === actor.userId;
    const isHr = actor.role === 'HR_ADMIN' || actor.role === 'SYSTEM_ADMIN';
    if (!isManager && !isHr) {
      throw new AppError(403, 'FORBIDDEN', 'Only managers or HR can recalculate evaluations.');
    }
    if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
      throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked and cannot be recalculated.');
    }
    if (!this.auditService) {
      throw new AppError(500, 'AUDIT_UNAVAILABLE', 'Evaluation scoring audit is not configured.');
    }

    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const result = await this.calculateScoringForEvaluation(evaluationId, actor, repositoryClient);
      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });
      return result;
    });
  }

  async publishEvaluation(evaluationId: string, actor: Actor): Promise<Evaluation> {
    const isHrOrAdmin = actor.role === 'HR_ADMIN' || actor.role === 'SYSTEM_ADMIN';
    if (!isHrOrAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can publish evaluations.');
    }

    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const evaluation = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
      if (!evaluation) throw new NotFound('Evaluation');

      if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.');
      }

      if (evaluation.status === EvaluationStatus.PUBLISHED) {
        return evaluation;
      }

      if (evaluation.status !== EvaluationStatus.APPROVED) {
        throw new AppError(400, 'INVALID_STATUS', 'Evaluation must be APPROVED before it can be published.');
      }

      const updated = await this.evaluationRepo.update(evaluationId, {
        status: EvaluationStatus.PUBLISHED,
        published_at: new Date(),
        published_by: actor.userId,
        updated_by: actor.userId,
      }, repositoryClient);

      if (this.auditService) {
        await this.auditService.record(client, {
          entityType: 'EVALUATION',
          entityId: evaluationId,
          action: 'PUBLISH',
          oldValue: JSON.stringify({ status: evaluation.status }),
          newValue: JSON.stringify({ status: EvaluationStatus.PUBLISHED }),
          performedBy: actor.userId,
          source: 'API',
        });
      }

      if (this.notificationService) {
        const employeeUser = await this.resolveUserForEmployee(evaluation.employee_id, repositoryClient);
        if (employeeUser) {
          await this.notificationService.enqueueNotification(
            {
              notificationType: NotificationType.RESULT_PUBLISHED,
              relatedEntityType: 'EVALUATION',
              relatedEntityId: evaluationId,
              recipientUserAccountId: employeeUser.userId,
              recipientEmail: employeeUser.email,
              contextPayload: {
                evaluation_id: evaluationId,
              },
            },
            client
          );
        }
      }

      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });
      return updated;
    });
  }

  async lockEvaluation(
    evaluationId: string,
    actor: Actor,
    options?: { throwOnConflict?: boolean }
  ): Promise<Evaluation> {
    const isHrOrAdmin = actor.role === 'HR_ADMIN' || actor.role === 'SYSTEM_ADMIN';
    if (!isHrOrAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can lock evaluations.');
    }

    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const evaluation = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
      
      if (!evaluation) throw new NotFound('Evaluation');

      if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
        if (options?.throwOnConflict) {
          throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is already locked.');
        }
        return evaluation;
      }

      if (evaluation.status !== EvaluationStatus.PUBLISHED && evaluation.status !== EvaluationStatus.APPROVED) {
        throw new AppError(400, 'INVALID_STATUS', 'Evaluation must be APPROVED or PUBLISHED before locking.');
      }

      const updated = await this.evaluationRepo.update(evaluationId, {
        status: EvaluationStatus.LOCKED,
        is_locked: true,
        locked_at: new Date(),
        locked_by: actor.userId,
        updated_by: actor.userId,
      }, repositoryClient);

      if (this.auditService) {
        await this.auditService.record(client, {
          entityType: 'EVALUATION',
          entityId: evaluationId,
          action: 'LOCK',
          oldValue: JSON.stringify({ status: evaluation.status, is_locked: evaluation.is_locked }),
          newValue: JSON.stringify({ status: EvaluationStatus.LOCKED, is_locked: true }),
          performedBy: actor.userId,
          source: 'API',
        });
      }

      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });
      return updated;
    });
  }

  async overrideKpiScore(
    evaluationId: string,
    kpiId: string,
    actor: Actor,
    data: { manual_override_score: number; override_reason: string }
  ): Promise<EvaluationItem> {
    const isHrOrAdmin = actor.role === 'HR_ADMIN' || actor.role === 'SYSTEM_ADMIN';
    if (!isHrOrAdmin || actor.role === 'MANAGER' || actor.role === 'EMPLOYEE') {
      throw new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can manually override scores.');
    }

    if (actor.permissions && actor.permissions.length > 0) {
      const hasPerm =
        actor.permissions.includes('KPI_MANUAL_OVERRIDE') ||
        actor.permissions.includes('evaluation:manual_override');
      if (!hasPerm) {
        throw new AppError(403, 'FORBIDDEN', 'Actor lacks KPI_MANUAL_OVERRIDE permission.');
      }
    }

    if (
      data.manual_override_score === undefined ||
      data.manual_override_score === null ||
      typeof data.manual_override_score !== 'number' ||
      Number.isNaN(data.manual_override_score) ||
      data.manual_override_score < 0 ||
      data.manual_override_score > 100
    ) {
      throw new AppError(400, 'INVALID_INPUT', 'Override score must be a number between 0 and 100.');
    }
    if (!data.override_reason || typeof data.override_reason !== 'string' || data.override_reason.trim() === '') {
      throw new AppError(400, 'INVALID_INPUT', 'Override reason is required.');
    }

    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const evaluation = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
      
      if (!evaluation) throw new NotFound('Evaluation');
      if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked. Scores cannot be overridden.');
      }

      await this.checkCycleNotLocked(evaluation.evaluation_cycle_id, repositoryClient);

      // Resource scoping check: if actor is not SYSTEM_ADMIN and has managedTeamIds, check target evaluation team
      if (actor.role !== 'SYSTEM_ADMIN' && actor.managedTeamIds && actor.managedTeamIds.length > 0) {
        if (evaluation.team_id_snapshot && !actor.managedTeamIds.includes(evaluation.team_id_snapshot)) {
          throw new AppError(403, 'FORBIDDEN', 'Access denied: Target evaluation is outside of your assigned scope.');
        }
      }

      const items = await this.evaluationItemRepo.findByEvaluationId(evaluationId, repositoryClient);
      const targetItem = items.find(
        (item) => item.evaluation_item_id === kpiId || item.kpi_id_snapshot === kpiId
      );
      
      if (!targetItem) throw new NotFound('EvaluationItem');

      const updatedItem = await this.evaluationItemRepo.update(targetItem.evaluation_item_id, {
        manual_override_score: data.manual_override_score,
        override_reason: data.override_reason.trim(),
        override_by: actor.userId,
        override_at: new Date(),
        updated_by: actor.userId,
      }, repositoryClient);

      if (this.auditService) {
        await this.auditService.record(client, {
          entityType: 'EVALUATION_ITEM',
          entityId: targetItem.evaluation_item_id,
          action: 'MANUAL_OVERRIDE',
          fieldName: 'manual_override_score',
          oldValue: targetItem.manual_override_score != null ? String(targetItem.manual_override_score) : null,
          newValue: String(updatedItem.manual_override_score),
          reason: data.override_reason.trim(),
          performedBy: actor.userId,
          source: 'API',
        });
      }

      const itemIndex = items.findIndex((i) => i.evaluation_item_id === targetItem.evaluation_item_id);
      if (itemIndex !== -1) {
        items[itemIndex] = updatedItem;
      }

      // Automatically recalculate the evaluation total weighted score based on per-KPI scores normalized to %
      await this.calculateScoringForEvaluation(evaluationId, actor, repositoryClient, items);

      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });

      return updatedItem;
    });
  }

  private async calculateScoringForEvaluation(
    evaluationId: string,
    actor: Actor,
    repositoryClient: PoolClient,
    preloadedItems?: EvaluationItem[]
  ) {
    const locked = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
    if (!locked || locked.is_locked || locked.status === EvaluationStatus.LOCKED) {
      throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked and cannot be recalculated.');
    }

    const items = preloadedItems ?? await this.evaluationItemRepo.findByEvaluationId(evaluationId, repositoryClient);
    const kpis = new Map<string, ScoringKpiInput & { criteria: ScoringKpiInput['criteria'][number][] }>();
    for (const item of items) {
      const kpiId = item.kpi_id_snapshot ?? 'LEGACY_KPI';
      const existing = kpis.get(kpiId);
      const levelDefinitions = (Array.isArray(item.level_definition_snapshot) ? item.level_definition_snapshot : [])
        .map((level: Record<string, unknown>) => ({
          level: Number(level.level_no ?? level.level),
          score_value: Number(level.score_value),
        }));
      let resolvedLevel = item.resolved_level ?? null;
      if (item.measurement_value != null && this.ruleEngine) {
        const rule = item.scoring_rule_snapshot as { rule_type: string; rule_config: unknown };
        const ruleResult = this.ruleEngine.resolve({
          measurement: item.measurement_value,
          rule_type: rule.rule_type as never,
          rule_config: rule.rule_config,
          role_code: locked.role_id_snapshot,
        });
        resolvedLevel = ruleResult.resolved_level;
      }

      let rawScore: number | null = null;
      let effectiveLevelDefs = levelDefinitions;

      if (item.manual_override_score != null) {
        // Authoritative manual override score normalized to percentage (0 - 100%)
        rawScore = Number(item.manual_override_score);
        effectiveLevelDefs = [{ level: 1, score_value: 100 }];
      } else {
        rawScore = item.measurement_value != null ? (resolvedLevel == null
          ? null
          : levelDefinitions.find((level) => level.level === resolvedLevel)?.score_value ?? null)
          : item.raw_score ?? (resolvedLevel == null
          ? null
          : levelDefinitions.find((level) => level.level === resolvedLevel)?.score_value ?? null);
      }

      const criterion = {
        criterion_id: item.evaluation_item_id,
        kpi_id: kpiId,
        resolved_level: resolvedLevel,
        raw_score: rawScore,
        level_definitions: effectiveLevelDefs,
        effective_weight: item.weight_snapshot,
        is_disabled: item.is_disabled_for_employee,
      };
      if (existing) {
        existing.criteria.push(criterion);
      } else {
        kpis.set(kpiId, {
          kpi_id: kpiId,
          kpi_name: item.kpi_name_snapshot ?? 'Legacy KPI',
          effective_weight: item.kpi_weight_snapshot ?? 100,
          criteria: [criterion],
        });
      }
    }

    let scoringResult: OverallScoringResult;
    try {
      scoringResult = new ScoringEngine().calculate({ kpis: [...kpis.values()] });
    } catch (err) {
      if (err instanceof Error && err.message === 'NO_APPLICABLE_KPIS') {
        return {
          evaluation_id: evaluationId,
          kpi_results: [],
          applicable_kpi_weight: 0,
          numerator: 0,
          denominator: 0,
          overall_weighted_score: locked.final_score ?? locked.manager_score ?? 0,
          official_score: locked.final_score ?? locked.manager_score ?? 0,
        };
      }
      throw err;
    }

    const updateBatch: Array<{ id: string; expectedVersion: number; patch: Partial<EvaluationItem> }> = [];
    for (const kpi of scoringResult.kpi_results) {
      for (const criterion of kpi.criterion_results) {
        const item = items.find((candidate) => candidate.evaluation_item_id === criterion.criterion_id);
        updateBatch.push({
          id: criterion.criterion_id,
          expectedVersion: item?.version ?? 1,
          patch: {
            resolved_level: criterion.resolved_level,
            raw_score: criterion.raw_score,
            normalized_score: criterion.normalized_score,
            weighted_score: criterion.weighted_contribution,
            is_missing_score: criterion.is_na && !criterion.is_disabled,
            updated_by: actor.userId,
          },
        });
      }
    }

    if (typeof this.evaluationItemRepo.updateScoringResultsBatch === 'function') {
      const updatedItems = await this.evaluationItemRepo.updateScoringResultsBatch(updateBatch, repositoryClient);
      if (updatedItems.length !== updateBatch.length) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Evaluation item was updated by another user.');
      }
    } else if (typeof this.evaluationItemRepo.updateScoringResult === 'function') {
      for (const update of updateBatch) {
        const updatedItem = await this.evaluationItemRepo.updateScoringResult(
          update.id,
          update.expectedVersion,
          update.patch,
          repositoryClient
        );
        if (updatedItem === null) {
          throw new AppError(409, 'VERSION_CONFLICT', 'Evaluation item was updated by another user.');
        }
      }
    }

    const updated = await this.evaluationRepo.update(evaluationId, {
      manager_score: scoringResult.overall_weighted_score,
      final_score: scoringResult.overall_weighted_score,
      scoring_breakdown: scoringResult as unknown as Record<string, unknown>,
      updated_by: actor.userId,
    }, repositoryClient);

    if (this.auditService) {
      await this.auditService.record(repositoryClient as unknown as PoolClient, {
        entityType: 'EVALUATION',
        entityId: evaluationId,
        action: 'SCORE_CALCULATED',
        oldValue: JSON.stringify({ manager_score: locked.manager_score, final_score: locked.final_score }),
        newValue: JSON.stringify({
          manager_score: updated?.manager_score ?? scoringResult.overall_weighted_score,
          final_score: updated?.final_score ?? scoringResult.overall_weighted_score,
          official_score: scoringResult.official_score,
        }),
        performedBy: actor.userId,
        source: 'API',
      });
    }

    return {
      ...scoringResult,
      evaluation_id: evaluationId,
    };
  }

  async applyImportedKpiData(
    records: Array<{
      record_id: string;
      employee_code: string;
      cycle_id: string;
      kpi_code: string;
      value: number;
      comment?: string | null;
      rationale: string;
      source_snapshot: SourceSnapshot;
      import_id: string;
      evidences?: Array<{
        staging_evidence_id: string;
        evidence_type: string;
        title: string;
        evidence_url?: string | null;
        file_reference?: string | null;
        description?: string | null;
        metadata?: Record<string, unknown> | null;
      }>;
    }>,
    actor: Actor
  ): Promise<{
    applied: Array<{ recordId: string; evaluationItemId: string; finalEvidenceMap: Record<string, string> }>;
    rejected: Array<{ recordId: string; reason: string }>;
  }> {
    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const applied: Array<{ recordId: string; evaluationItemId: string; finalEvidenceMap: Record<string, string> }> = [];
      const rejected: Array<{ recordId: string; reason: string }> = [];
      const affectedEvaluations = new Set<string>();

      // Check cycle statuses with lock
      const cycleIds = [...new Set(records.map((r) => r.cycle_id))];
      const lockedCycles = new Set<string>();
      for (const cId of cycleIds) {
        const cycleRes = await repositoryClient.query(
          'SELECT status FROM evaluation_cycle WHERE evaluation_cycle_id = $1 FOR UPDATE',
          [cId]
        );
        if (cycleRes.rows.length === 0 || cycleRes.rows[0].status === 'LOCKED') {
          lockedCycles.add(cId);
        }
      }

      for (const rec of records) {
        if (lockedCycles.has(rec.cycle_id)) {
          rejected.push({ recordId: rec.record_id, reason: 'EVALUATION_CYCLE_LOCKED' });
          continue;
        }

        // 1. Resolve employee
        const empRes = await repositoryClient.query(
          'SELECT employee_id FROM employee WHERE employee_code = $1',
          [rec.employee_code]
        );
        if (empRes.rows.length === 0) {
          rejected.push({ recordId: rec.record_id, reason: 'EMPLOYEE_NOT_FOUND' });
          continue;
        }
        const employeeId = empRes.rows[0].employee_id;

        // 2. Resolve (cycle_id, employee_id, kpi_code) -> evaluation & evaluation_item
        const evalRes = await repositoryClient.query(
          `SELECT e.evaluation_id, e.status, e.is_locked,
                  ei.evaluation_item_id, ei.version
           FROM evaluation e
           JOIN evaluation_item ei ON e.evaluation_id = ei.evaluation_id
           WHERE e.evaluation_cycle_id = $1 AND e.employee_id = $2
             AND (ei.criterion_code_snapshot = $3 OR ei.kpi_code_snapshot = $3)
           FOR UPDATE OF e`,
          [rec.cycle_id, employeeId, rec.kpi_code]
        );

        if (evalRes.rows.length === 0) {
          rejected.push({ recordId: rec.record_id, reason: 'EVALUATION_ITEM_NOT_FOUND' });
          continue;
        }

        const evalRow = evalRes.rows[0];
        if (evalRow.is_locked || evalRow.status === EvaluationStatus.LOCKED) {
          rejected.push({ recordId: rec.record_id, reason: 'EVALUATION_LOCKED' });
          continue;
        }
        if (evalRow.status === EvaluationStatus.PUBLISHED) {
          rejected.push({ recordId: rec.record_id, reason: 'EVALUATION_ALREADY_PUBLISHED' });
          continue;
        }

        // 3. Check for Blueprint score to apply (Blueprint + Jira) / 2 Blending
        const bpMeasurement = await repositoryClient.query(
          `SELECT measurement_value FROM measurement
           WHERE evaluation_item_id = $1 AND (source_label ILIKE '%Blueprint%' OR source_label ILIKE '%UI_PIM%')
           ORDER BY recorded_at DESC LIMIT 1`,
          [evalRow.evaluation_item_id]
        );

        let finalValue = rec.value;
        let finalRationale = rec.rationale;
        let finalComment = rec.comment || null;

        if (bpMeasurement.rows.length > 0) {
          const bpVal = Number(bpMeasurement.rows[0].measurement_value);
          if (!isNaN(bpVal)) {
            const normBp = bpVal <= 10 ? bpVal * 10 : bpVal;
            const normIncoming = rec.value <= 10 ? rec.value * 10 : rec.value;
            finalValue = Math.round(((normBp + normIncoming) / 2) * 10) / 10;
            finalRationale = `[🔀 Điểm kết hợp Blueprint + Jira]: Blueprint: ${normBp}% | Jira: ${normIncoming}% => Điểm tích hợp 50/50: ${finalValue}%. ${rec.rationale}`;
            finalComment = `${rec.comment || ''} (Tích hợp tự động 50% Blueprint + 50% Jira)`.trim();
          }
        }

        // Update evaluation_item
        await repositoryClient.query(
          `UPDATE evaluation_item
           SET comment = COALESCE($1, comment),
               rationale = $2,
               import_id = $3,
               source_snapshot = $4,
               raw_score = $5,
               system_source = CASE WHEN $6 THEN 'BLENDED (Blueprint + Jira)' ELSE system_source END,
               updated_at = CURRENT_TIMESTAMP,
               updated_by = $7
           WHERE evaluation_item_id = $8`,
          [
            finalComment,
            finalRationale,
            rec.import_id,
            JSON.stringify(rec.source_snapshot),
            finalValue,
            bpMeasurement.rows.length > 0,
            actor.userId,
            evalRow.evaluation_item_id,
          ]
        );

        // 4. Record in measurement table for audit history
        await repositoryClient.query(
          `INSERT INTO measurement (
            measurement_id, evaluation_item_id, measurement_key, measurement_value, recorded_at, source_label, created_by
          ) VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP, $4, $5)`,
          [
            evalRow.evaluation_item_id,
            rec.kpi_code,
            finalValue,
            bpMeasurement.rows.length > 0
              ? 'BLENDED (Blueprint + Jira)'
              : (rec.source_snapshot?.source_name || rec.source_snapshot?.source_type || 'IMPORT'),
            actor.userId,
          ]
        );

        // 5. Append final evidence rows
        const finalEvidenceMap: Record<string, string> = {};
        if (rec.evidences && rec.evidences.length > 0) {
          for (const ev of rec.evidences) {
            const evRes = await repositoryClient.query(
              `INSERT INTO evidence (
                evidence_id, evaluation_item_id, evidence_type, evidence_value, title,
                evidence_url, file_reference, rationale, source, source_import_id,
                source_record_id, metadata, status, created_by
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4,
                $5, $6, $7, $8, $9,
                $10, $11, 'ACTIVE', $12
              ) RETURNING evidence_id`,
              [
                evalRow.evaluation_item_id,
                ev.evidence_type,
                ev.evidence_url || ev.file_reference || ev.title,
                ev.title,
                ev.evidence_url || null,
                ev.file_reference || null,
                rec.rationale,
                rec.source_snapshot?.source_type || null,
                rec.import_id,
                rec.record_id,
                ev.metadata ? JSON.stringify(ev.metadata) : null,
                actor.userId,
              ]
            );
            finalEvidenceMap[ev.staging_evidence_id] = evRes.rows[0].evidence_id;
          }
        }

        affectedEvaluations.add(evalRow.evaluation_id);
        applied.push({
          recordId: rec.record_id,
          evaluationItemId: evalRow.evaluation_item_id,
          finalEvidenceMap,
        });
      }

      // 6. Recalculate scoring and record audit for affected evaluations
      for (const evalId of affectedEvaluations) {
        try {
          await this.calculateScoringForEvaluation(evalId, actor, repositoryClient);
        } catch (_calcErr) {
          // If overall score cannot be computed yet (e.g. NO_APPLICABLE_KPIS),
          // the imported measurement, comment, and evidence are preserved.
        }
        if (this.auditService) {
          await this.auditService.record(repositoryClient as unknown as PoolClient, {
            entityType: 'EVALUATION',
            entityId: evalId,
            action: 'IMPORT_APPLY',
            performedBy: actor.userId,
            source: 'API',
            reason: 'Applied KPI data import batch',
          });
        }
        appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId: evalId });
      }

      return { applied, rejected };
    });
  }

  async getKpiExplainability(
    evaluationId: string,
    kpiCode: string,
    actor: Actor
  ): Promise<ExplainabilityViewDto> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');

    const isSelf = evaluation.employee_id === actor.employeeId || evaluation.employee_id === actor.userId;
    const isManager = evaluation.manager_id_snapshot === actor.employeeId || evaluation.manager_id_snapshot === actor.userId;
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';

    if (!isSelf && !isManager && !isSuperAdminOrHr) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to view evidence for this evaluation.');
    }

    const items = await this.evaluationItemRepo.findByEvaluationId(evaluationId);
    const item = items.find(
      (i) => i.criterion_code_snapshot === kpiCode || i.kpi_code_snapshot === kpiCode
    );
    if (!item) {
      throw new NotFound(`KPI '${kpiCode}' in evaluation`);
    }

    const evidenceRes = await this.pool.query(
      `SELECT * FROM evidence WHERE evaluation_item_id = $1 ORDER BY created_at DESC`,
      [item.evaluation_item_id]
    );

    let importInfo = null;
    if (item.import_id) {
      const impRes = await this.pool.query(
        `SELECT import_id, created_at, created_by FROM evaluation_data_import WHERE import_id = $1`,
        [item.import_id]
      );
      if (impRes.rows.length > 0) {
        importInfo = {
          id: impRes.rows[0].import_id,
          created_at: new Date(impRes.rows[0].created_at),
          created_by: impRes.rows[0].created_by,
        };
      }
    }

    const evidences = evidenceRes.rows.map((row) => ({
      id: row.evidence_id,
      title: row.title || '',
      type: row.evidence_type,
      url: row.evidence_url,
      file_reference: row.file_reference,
      description: row.evidence_value,
      rationale: row.rationale,
      source: row.source,
      status: row.status || 'ACTIVE',
      superseded_by: row.superseded_by,
      superseded_at: row.superseded_at ? new Date(row.superseded_at) : null,
      supersede_reason: row.supersede_reason,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      created_at: new Date(row.created_at || row.uploaded_at),
    }));

    return {
      evaluation_id: evaluation.evaluation_id,
      evaluation_item_id: item.evaluation_item_id,
      kpi_code: item.criterion_code_snapshot || item.kpi_code_snapshot || kpiCode,
      measurement: item.measurement_value ?? null,
      score: item.weighted_score ?? item.raw_score ?? null,
      comment: item.comment || null,
      rationale: item.rationale || null,
      source: (item.source_snapshot as unknown as SourceSnapshot) || null,
      import: importInfo,
      evidences,
    };
  }

  async getEmployeeKpiSummary(
    employeeId: string,
    evaluationCycleId: string,
    actor: Actor
  ): Promise<import('../../../employee/api/employee-kpi-summary.dto.js').EmployeeKpiSummaryResponse> {
    const empRes = await this.pool.query(
      `SELECT 
        e.employee_id, e.employee_code, e.full_name, e.email, e.employment_status, e.manager_id, e.team_id,
        d.department_id, d.name AS department_name, d.code AS department_code,
        t.team_id, t.name AS team_name, t.code AS team_code,
        r.role_id, r.name AS role_name, r.code AS role_code,
        jl.job_level_id, jl.name AS job_level_name, jl.code AS job_level_code,
        m.employee_id AS manager_emp_id, m.full_name AS manager_name, m.employee_code AS manager_code
       FROM employee e
       LEFT JOIN department d ON e.department_id = d.department_id
       LEFT JOIN team t ON e.team_id = t.team_id
       LEFT JOIN role r ON e.role_id = r.role_id
       LEFT JOIN job_level jl ON e.job_level_id = jl.job_level_id
       LEFT JOIN employee m ON e.manager_id = m.employee_id
       WHERE e.employee_id = $1`,
      [employeeId]
    );

    if (empRes.rows.length === 0) {
      throw new NotFound('Employee');
    }
    const empRow = empRes.rows[0];

    const cycleRes = await this.pool.query(
      `SELECT evaluation_cycle_id, name, status FROM evaluation_cycle WHERE evaluation_cycle_id = $1`,
      [evaluationCycleId]
    );
    if (cycleRes.rows.length === 0) {
      throw new NotFound('EvaluationCycle');
    }
    const cycleRow = cycleRes.rows[0];

    const isSelf = empRow.employee_id === actor.employeeId || empRow.employee_id === actor.userId;
    let isManager = false;
    if (actor.role === 'MANAGER') {
      let managerEmpId = actor.employeeId;
      if (!managerEmpId && actor.userId) {
        const uRes = await this.pool.query('SELECT employee_id FROM app_user WHERE id = $1', [actor.userId]);
        managerEmpId = uRes.rows[0]?.employee_id ?? undefined;
      }
      if (managerEmpId) {
        if (empRow.manager_id === managerEmpId) {
          isManager = true;
        } else if (empRow.team_id) {
          const teamManagerRes = await this.pool.query(
            'SELECT 1 FROM team WHERE team_id = $1 AND manager_id = $2',
            [empRow.team_id, managerEmpId]
          );
          if (teamManagerRes.rows.length > 0) {
            isManager = true;
          }
        }
      }
    }
    const isSuperAdminOrHr = actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN';

    if (!isSelf && !isManager && !isSuperAdminOrHr) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this employee KPI summary.');
    }

    const evalRes = await this.pool.query(
      `SELECT * FROM evaluation WHERE employee_id = $1 AND evaluation_cycle_id = $2`,
      [employeeId, evaluationCycleId]
    );
    if (evalRes.rows.length === 0) {
      throw new NotFound('Evaluation for employee in specified cycle');
    }
    const evaluation = evalRes.rows[0];

    const itemsRes = await this.pool.query(
      `SELECT ei.*, rev.full_name AS reviewer_name
       FROM evaluation_item ei
       LEFT JOIN employee rev ON ei.reviewer_id = rev.employee_id
       WHERE ei.evaluation_id = $1
       ORDER BY ei.created_at ASC, ei.criterion_code_snapshot ASC`,
      [evaluation.evaluation_id]
    );
    const itemRows = itemsRes.rows;
    const itemIds = itemRows.map((r: Record<string, unknown>) => r.evaluation_item_id as string);

    let evidenceRows: Record<string, unknown>[] = [];
    if (itemIds.length > 0) {
      const evRes = await this.pool.query(
        `SELECT evidence_id, evaluation_item_id, evidence_type, title, evidence_url, file_reference, rationale, source, evidence_value
         FROM evidence
         WHERE evaluation_item_id = ANY($1::uuid[])
         ORDER BY created_at ASC`,
        [itemIds]
      );
      evidenceRows = evRes.rows;
    }

    const evidenceByItemId = new Map<string, import('../../../employee/api/employee-kpi-summary.dto.js').KpiEvidenceDto[]>();
    for (const ev of evidenceRows) {
      const list = evidenceByItemId.get(ev.evaluation_item_id as string) || [];
      list.push({
        evidence_id: ev.evidence_id as string,
        evidence_type: ev.evidence_type as string,
        title: (ev.title as string) || 'Evidence',
        evidence_url: (ev.evidence_url as string) || null,
        file_reference: (ev.file_reference as string) || null,
        rationale: (ev.rationale as string) || null,
        source: (ev.source as string) || null,
      });
      evidenceByItemId.set(ev.evaluation_item_id as string, list);
    }

    interface DbItemRow {
      evaluation_item_id: string;
      criterion_code_snapshot: string;
      criterion_name_snapshot: string;
      kpi_name_snapshot?: string;
      measurement_value?: string;
      raw_score?: string;
      weighted_score?: string;
      weight_snapshot?: string;
      resolved_level?: string;
      is_disabled_for_employee?: boolean;
      is_missing_score?: boolean;
      measurement_key?: string;
      measurement_name?: string;
      measurement_unit?: string;
      system_source?: string;
      comment?: string;
      rationale?: string;
      reviewer_id?: string;
      reviewer_name?: string;
      reviewer_comment?: string;
      review_date?: Date | string;
      kpi_id_snapshot?: string;
      kpi_code_snapshot?: string;
      kpi_weight_snapshot?: string;
      scoring_rule_snapshot?: string | Record<string, unknown>;
      level_definition_snapshot?: string | Record<string, unknown>[];
    }

    const kpi_items = itemRows.map((rowRaw: unknown) => {
      const row = rowRaw as DbItemRow;
      const category = row.kpi_name_snapshot || 'Performance';
      const measurementVal = row.measurement_value !== null && row.measurement_value !== undefined
        ? parseFloat(row.measurement_value)
        : null;

      const rawScore = row.raw_score !== null && row.raw_score !== undefined ? parseFloat(row.raw_score) : null;
      const weightedScore = row.weighted_score !== null && row.weighted_score !== undefined ? parseFloat(row.weighted_score) : null;
      const weight = parseFloat(row.weight_snapshot || '0');

      return {
        evaluation_item_id: row.evaluation_item_id,
        criterion_code: row.criterion_code_snapshot,
        criterion_name: row.criterion_name_snapshot,
        category,
        weight,
        raw_score: rawScore,
        weighted_score: weightedScore,
        resolved_level: row.resolved_level !== null && row.resolved_level !== undefined ? parseInt(row.resolved_level, 10) : null,
        is_disabled: !!row.is_disabled_for_employee,
        is_missing_score: !!row.is_missing_score,
        measurement: measurementVal !== null ? {
          key: row.measurement_key || null,
          value: measurementVal,
          unit: row.measurement_unit || null,
          source: row.system_source || null,
        } : null,
        evidence: evidenceByItemId.get(row.evaluation_item_id) || [],
        comment: row.comment || null,
        rationale: row.rationale || null,
        reviewer: row.reviewer_id ? {
          id: row.reviewer_id,
          name: row.reviewer_name || null,
          review_date: row.review_date instanceof Date ? row.review_date.toISOString() : (row.review_date ? String(row.review_date) : null),
        } : null,
        kpi_relationship_snapshot: {
          kpi_id: row.kpi_id_snapshot || null,
          kpi_code: row.kpi_code_snapshot || null,
          kpi_name: row.kpi_name_snapshot || null,
          kpi_weight: row.kpi_weight_snapshot ? parseFloat(row.kpi_weight_snapshot) : null,
          scoring_rule: typeof row.scoring_rule_snapshot === 'string' ? JSON.parse(row.scoring_rule_snapshot) : row.scoring_rule_snapshot,
          level_definitions: typeof row.level_definition_snapshot === 'string' ? JSON.parse(row.level_definition_snapshot) : row.level_definition_snapshot,
        },
      };
    });

    const scoringBreakdown = typeof evaluation.scoring_breakdown === 'string'
      ? JSON.parse(evaluation.scoring_breakdown)
      : (evaluation.scoring_breakdown || {});

    const overallWeightedScore = evaluation.official_score !== null && evaluation.official_score !== undefined
      ? parseFloat(evaluation.official_score)
      : (typeof scoringBreakdown?.overall_weighted_score === 'number'
          ? scoringBreakdown.overall_weighted_score
          : (evaluation.final_score !== null && evaluation.final_score !== undefined
              ? parseFloat(evaluation.final_score)
              : (evaluation.manager_score !== null && evaluation.manager_score !== undefined
                  ? parseFloat(evaluation.manager_score)
                  : null)));

    const overallScore = evaluation.self_score !== null && evaluation.self_score !== undefined
      ? parseFloat(evaluation.self_score)
      : (evaluation.final_score !== null && evaluation.final_score !== undefined
          ? parseFloat(evaluation.final_score)
          : overallWeightedScore);

    return {
      employee: {
        id: empRow.employee_id,
        employee_code: empRow.employee_code,
        full_name: empRow.full_name,
        email: empRow.email,
        department: {
          id: empRow.department_id || null,
          name: empRow.department_name || null,
          code: empRow.department_code || null,
        },
        team: {
          id: empRow.team_id || null,
          name: empRow.team_name || null,
          code: empRow.team_code || null,
        },
        role: {
          id: empRow.role_id,
          name: empRow.role_name,
          code: empRow.role_code,
        },
        job_level: {
          id: empRow.job_level_id,
          name: empRow.job_level_name,
          code: empRow.job_level_code,
        },
        manager: empRow.manager_emp_id ? {
          id: empRow.manager_emp_id,
          name: empRow.manager_name,
          code: empRow.manager_code,
        } : null,
      },
      evaluation: {
        evaluation_id: evaluation.evaluation_id,
        cycle_id: cycleRow.evaluation_cycle_id,
        cycle_name: cycleRow.name,
        status: evaluation.status,
        submitted_at: evaluation.submitted_at instanceof Date ? evaluation.submitted_at.toISOString() : (evaluation.submitted_at ? String(evaluation.submitted_at) : null),
        approved_at: evaluation.approved_at instanceof Date ? evaluation.approved_at.toISOString() : (evaluation.approved_at ? String(evaluation.approved_at) : null),
        is_locked: !!evaluation.is_locked,
      },
      overall_score: overallScore,
      overall_weighted_score: overallWeightedScore,
      official_score_field: 'overall_weighted_score',
      kpi_items,
    };
  }
}

