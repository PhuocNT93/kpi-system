import { Pool, PoolClient } from 'pg';
import { IEvaluationRepository, IEvaluationItemRepository } from '../../domain/repositories.interface.js';
import { EvaluationStatus, Evaluation } from '../../domain/evaluation.types.js';
import { NotFound, AppError } from '../../../../api/app-error.js';
import { Actor } from '../../../../shared/auth/types.js';
import { withTransaction } from '../../../../shared/database/transaction.js';
import { AuditService } from '../../../audit/application/audit.service.js';
import { ScoringEngine, type ScoringKpiInput } from '../../domain/scoring/scoring-engine.js';
import { RuleEngine } from '../../../rule-engine/domain/rule-engine.js';

export class EvaluationService {
  constructor(
    private evaluationRepo: IEvaluationRepository,
    private evaluationItemRepo: IEvaluationItemRepository,
    private pool: Pool,
    private auditService?: AuditService,
    private ruleEngine?: RuleEngine
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
      official_score: evaluation.scoring_breakdown?.official_score ?? evaluation.manager_score ?? null,
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
      const locked = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
      if (!locked || locked.is_locked || locked.status === EvaluationStatus.LOCKED) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked and cannot be recalculated.');
      }

      const items = await this.evaluationItemRepo.findByEvaluationId(evaluationId, repositoryClient);
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
        const rawScore = item.measurement_value != null ? (resolvedLevel == null
          ? null
          : levelDefinitions.find((level) => level.level === resolvedLevel)?.score_value ?? null)
          : item.raw_score ?? (resolvedLevel == null
          ? null
          : levelDefinitions.find((level) => level.level === resolvedLevel)?.score_value ?? null);

        const criterion = {
          criterion_id: item.evaluation_item_id,
          kpi_id: kpiId,
          resolved_level: resolvedLevel,
          raw_score: rawScore,
          level_definitions: levelDefinitions,
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

      const scoringResult = new ScoringEngine().calculate({ kpis: [...kpis.values()] });
      for (const kpi of scoringResult.kpi_results) {
        for (const criterion of kpi.criterion_results) {
          const item = items.find((candidate) => candidate.evaluation_item_id === criterion.criterion_id);
          const updatedItem = await this.evaluationItemRepo.updateScoringResult(criterion.criterion_id, item?.version ?? 1, {
            resolved_level: criterion.resolved_level,
            raw_score: criterion.raw_score,
            normalized_score: criterion.normalized_score,
            weighted_score: criterion.weighted_contribution,
            is_missing_score: criterion.is_na && !criterion.is_disabled,
            updated_by: actor.userId,
          }, repositoryClient);
          if (!updatedItem) {
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

      await this.auditService!.record(client, {
          entityType: 'EVALUATION',
          entityId: evaluationId,
          action: 'SCORE_CALCULATED',
          oldValue: JSON.stringify({ manager_score: locked.manager_score, final_score: locked.final_score }),
          newValue: JSON.stringify({
            manager_score: updated.manager_score,
            final_score: updated.final_score,
            official_score: scoringResult.official_score,
          }),
          performedBy: actor.userId,
          source: 'API',
      });

      return {
        ...scoringResult,
        evaluation_id: evaluationId,
      };
    });
  }
}
