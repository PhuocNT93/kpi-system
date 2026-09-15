import { Pool, PoolClient } from 'pg';
import { IEvaluationRepository, IEvaluationItemRepository } from '../../domain/repositories.interface.js';
import { EvaluationStatus, Evaluation, EvaluationItem } from '../../domain/evaluation.types.js';
import { MyEvaluationListItem, TeamEvaluationListItem } from '../../domain/repositories.interface.js';
import { NotFound, AppError } from '../../../../api/app-error.js';
import { Actor } from '../../../../shared/auth/types.js';
import { withTransaction } from '../../../../shared/database/transaction.js';
import { AuditService } from '../../../audit/application/audit.service.js';
import { ScoringEngine, type ScoringKpiInput } from '../../domain/scoring/scoring-engine.js';
import { RuleEngine } from '../../../rule-engine/domain/rule-engine.js';
import { appEventEmitter, AppEvent } from '../../../../shared/events/index.js';
import { ExplainabilityViewDto, SourceSnapshot } from '../../../evaluation-data-import/domain/evaluation-data-import.types.js';

export class EvaluationService {
  constructor(
    private evaluationRepo: IEvaluationRepository,
    private evaluationItemRepo: IEvaluationItemRepository,
    private pool: Pool,
    private auditService?: AuditService,
    private ruleEngine?: RuleEngine
  ) {}

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

    // Allow approval from OPEN, SUBMITTED, or MANAGER_REVIEW (workflow B: no mandatory self-assessment)
    const approvableStatuses = [EvaluationStatus.OPEN, EvaluationStatus.SUBMITTED, 'MANAGER_REVIEW' as EvaluationStatus];
    if (!approvableStatuses.includes(evaluation.status)) {
      throw new AppError(400, 'INVALID_STATUS', 'Evaluation must be OPEN, SUBMITTED, or MANAGER_REVIEW to be approved.');
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
      const result = await this.calculateScoringForEvaluation(evaluationId, actor, repositoryClient);
      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });
      return result;
    });
  }

  async publishEvaluation(evaluationId: string, actor: Actor): Promise<Evaluation> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) throw new NotFound('Evaluation');

    const isHrOrAdmin = actor.role === 'HR_ADMIN' || actor.role === 'SYSTEM_ADMIN';
    if (!isHrOrAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can publish evaluations.');
    }

    if (evaluation.status !== EvaluationStatus.APPROVED) {
      throw new AppError(400, 'INVALID_STATUS', 'Evaluation must be APPROVED before it can be published.');
    }

    return this.evaluationRepo.update(evaluationId, {
      status: EvaluationStatus.PUBLISHED,
      published_at: new Date(),
      published_by: actor.userId,
      updated_by: actor.userId,
    });
  }

  async lockEvaluation(evaluationId: string, actor: Actor): Promise<Evaluation> {
    const isHrOrAdmin = actor.role === 'HR_ADMIN' || actor.role === 'SYSTEM_ADMIN';
    if (!isHrOrAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can lock evaluations.');
    }

    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const evaluation = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
      
      if (!evaluation) throw new NotFound('Evaluation');
      if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is already locked.');
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
    if (!isHrOrAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Only HR or System Admins can manually override scores.');
    }

    if (data.manual_override_score < 0 || data.manual_override_score > 100) {
      throw new AppError(400, 'INVALID_INPUT', 'Override score must be between 0 and 100.');
    }
    if (!data.override_reason || data.override_reason.trim() === '') {
      throw new AppError(400, 'INVALID_INPUT', 'Override reason is required.');
    }

    return withTransaction(this.pool, async (client) => {
      const repositoryClient = client as unknown as PoolClient;
      const evaluation = await this.evaluationRepo.findByIdForUpdate(evaluationId, repositoryClient);
      
      if (!evaluation) throw new NotFound('Evaluation');
      if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
        throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked. Scores cannot be overridden.');
      }
      if (evaluation.status !== EvaluationStatus.APPROVED && evaluation.status !== EvaluationStatus.PUBLISHED) {
        throw new AppError(400, 'INVALID_STATUS', 'Can only override score when evaluation is APPROVED or PUBLISHED.');
      }

      const items = await this.evaluationItemRepo.findByEvaluationId(evaluationId, repositoryClient);
      const targetItem = items.find(item => item.evaluation_item_id === kpiId);
      
      if (!targetItem) throw new NotFound('EvaluationItem');

      const updatedItem = await this.evaluationItemRepo.update(targetItem.evaluation_item_id, {
        manual_override_score: data.manual_override_score,
        override_reason: data.override_reason,
        override_by: actor.userId,
        override_at: new Date(),
        updated_by: actor.userId,
      }, repositoryClient);

      if (this.auditService) {
        await this.auditService.record(client, {
          entityType: 'EVALUATION_ITEM',
          entityId: targetItem.evaluation_item_id,
          action: 'MANUAL_OVERRIDE',
          oldValue: JSON.stringify({ manual_override_score: targetItem.manual_override_score }),
          newValue: JSON.stringify({ manual_override_score: updatedItem.manual_override_score, override_reason: updatedItem.override_reason }),
          performedBy: actor.userId,
          source: 'API',
        });
      }

      appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, { evaluationId });

      return updatedItem;
    });
  }

  private async calculateScoringForEvaluation(
    evaluationId: string,
    actor: Actor,
    repositoryClient: PoolClient
  ) {
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

    if (this.auditService) {
      await this.auditService.record(repositoryClient as unknown as PoolClient, {
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

        // 3. Update evaluation_item
        await repositoryClient.query(
          `UPDATE evaluation_item
           SET comment = COALESCE($1, comment),
               rationale = $2,
               import_id = $3,
               source_snapshot = $4,
               updated_at = CURRENT_TIMESTAMP,
               updated_by = $5
           WHERE evaluation_item_id = $6`,
          [
            rec.comment || null,
            rec.rationale,
            rec.import_id,
            JSON.stringify(rec.source_snapshot),
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
            rec.value,
            rec.source_snapshot?.source_name || rec.source_snapshot?.source_type || 'IMPORT',
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

