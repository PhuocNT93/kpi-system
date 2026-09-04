import { Pool, PoolClient } from 'pg';
import {
  EvaluationCycle,
  Evaluation,
  EvaluationItem,
  EvaluationCycleStatus,
  EvaluationStatus,
  ListEvaluationCycleQuery,
} from '../domain/evaluation-cycle.types.js';
import {
  IEvaluationCycleRepository,
  IEvaluationRepository,
  IEvaluationItemRepository,
} from '../domain/evaluation-cycle.repository.js';

export class PostgresEvaluationCycleRepository implements IEvaluationCycleRepository {
  constructor(private pool: Pool) {}

  private getExecutor(client?: PoolClient) {
    return client || this.pool;
  }

  private hasQuery(executor: any): boolean {
    return !!(executor && typeof executor.query === 'function');
  }

  async findById(id: string, client?: PoolClient): Promise<EvaluationCycle | null> {
    const executor = this.getExecutor(client);
    if (!this.hasQuery(executor)) return null;

    const res = await executor.query(
      `SELECT evaluation_cycle_id, code, name, start_date, end_date, status,
              evaluation_template_version_id, applicable_team_ids, applicable_role_ids,
              approved_by, locked_at, created_at, updated_at, created_by, updated_by
       FROM evaluation_cycle
       WHERE evaluation_cycle_id = $1`,
      [id]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToCycle(res.rows[0]);
  }

  async findByIdForUpdate(id: string, client: PoolClient): Promise<EvaluationCycle | null> {
    if (!this.hasQuery(client)) return null;

    const res = await client.query(
      `SELECT evaluation_cycle_id, code, name, start_date, end_date, status,
              evaluation_template_version_id, applicable_team_ids, applicable_role_ids,
              approved_by, locked_at, created_at, updated_at, created_by, updated_by
       FROM evaluation_cycle
       WHERE evaluation_cycle_id = $1
       FOR UPDATE`,
      [id]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToCycle(res.rows[0]);
  }

  async findByCode(code: string, client?: PoolClient): Promise<EvaluationCycle | null> {
    const executor = this.getExecutor(client);
    if (!this.hasQuery(executor)) return null;

    const res = await executor.query(
      `SELECT evaluation_cycle_id, code, name, start_date, end_date, status,
              evaluation_template_version_id, applicable_team_ids, applicable_role_ids,
              approved_by, locked_at, created_at, updated_at, created_by, updated_by
       FROM evaluation_cycle
       WHERE code = $1`,
      [code]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToCycle(res.rows[0]);
  }

  async findMany(query: ListEvaluationCycleQuery, client?: PoolClient): Promise<{ items: EvaluationCycle[]; total: number }> {
    const executor = this.getExecutor(client);
    if (!this.hasQuery(executor)) return { items: [], total: 0 };

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (query.status) {
      conditions.push(`status = $${idx++}`);
      values.push(query.status);
    }

    if (query.search) {
      conditions.push(`(code ILIKE $${idx} OR name ILIKE $${idx})`);
      values.push(`%${query.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await executor.query(
      `SELECT COUNT(*) as total FROM evaluation_cycle ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const sortColumn = query.sort === 'name' ? 'name' : query.sort === 'code' ? 'code' : 'created_at';
    const sortDir = query.sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataRes = await executor.query(
      `SELECT evaluation_cycle_id, code, name, start_date, end_date, status,
              evaluation_template_version_id, applicable_team_ids, applicable_role_ids,
              approved_by, locked_at, created_at, updated_at, created_by, updated_by
       FROM evaluation_cycle
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, pageSize, offset]
    );

    return {
      items: dataRes.rows.map(this.mapRowToCycle),
      total,
    };
  }

  async create(
    cycle: Omit<EvaluationCycle, 'evaluationCycleId' | 'createdAt' | 'updatedAt'>,
    client?: PoolClient
  ): Promise<EvaluationCycle> {
    const executor = this.getExecutor(client);

    const res = await executor.query(
      `INSERT INTO evaluation_cycle (
        code, name, start_date, end_date, status,
        evaluation_template_version_id, applicable_team_ids, applicable_role_ids,
        approved_by, locked_at, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING evaluation_cycle_id, code, name, start_date, end_date, status,
                evaluation_template_version_id, applicable_team_ids, applicable_role_ids,
                approved_by, locked_at, created_at, updated_at, created_by, updated_by`,
      [
        cycle.code,
        cycle.name,
        cycle.startDate,
        cycle.endDate,
        cycle.status,
        cycle.evaluationTemplateVersionId,
        cycle.applicableTeamIds ?? [],
        cycle.applicableRoleIds ?? [],
        cycle.approvedBy,
        cycle.lockedAt,
        cycle.createdBy,
        cycle.updatedBy,
      ]
    );

    return this.mapRowToCycle(res.rows[0]);
  }

  async update(cycle: EvaluationCycle, client?: PoolClient): Promise<EvaluationCycle> {
    const executor = this.getExecutor(client);

    const res = await executor.query(
      `UPDATE evaluation_cycle
       SET code = $1, name = $2, start_date = $3, end_date = $4, status = $5,
           evaluation_template_version_id = $6, applicable_team_ids = $7, applicable_role_ids = $8,
           approved_by = $9, locked_at = $10, updated_by = $11
       WHERE evaluation_cycle_id = $12
       RETURNING evaluation_cycle_id, code, name, start_date, end_date, status,
                 evaluation_template_version_id, applicable_team_ids, applicable_role_ids,
                 approved_by, locked_at, created_at, updated_at, created_by, updated_by`,
      [
        cycle.code,
        cycle.name,
        cycle.startDate,
        cycle.endDate,
        cycle.status,
        cycle.evaluationTemplateVersionId,
        cycle.applicableTeamIds ?? [],
        cycle.applicableRoleIds ?? [],
        cycle.approvedBy,
        cycle.lockedAt,
        cycle.updatedBy,
        cycle.evaluationCycleId,
      ]
    );

    return this.mapRowToCycle(res.rows[0]);
  }

  async lockCycle(id: string, lockedAt: string, client: PoolClient): Promise<EvaluationCycle> {
    const res = await client.query(
      `UPDATE evaluation_cycle
       SET status = $1, locked_at = $2
       WHERE evaluation_cycle_id = $3
       RETURNING evaluation_cycle_id, code, name, start_date, end_date, status,
                 evaluation_template_version_id, applicable_team_ids, applicable_role_ids,
                 approved_by, locked_at, created_at, updated_at, created_by, updated_by`,
      [EvaluationCycleStatus.LOCKED, lockedAt, id]
    );

    return this.mapRowToCycle(res.rows[0]);
  }

  private mapRowToCycle(row: any): EvaluationCycle {
    return {
      evaluationCycleId: row.evaluation_cycle_id,
      code: row.code,
      name: row.name,
      startDate: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : row.start_date,
      endDate: row.end_date instanceof Date ? row.end_date.toISOString().split('T')[0] : row.end_date,
      status: row.status as EvaluationCycleStatus,
      evaluationTemplateVersionId: row.evaluation_template_version_id,
      applicableTeamIds: row.applicable_team_ids || [],
      applicableRoleIds: row.applicable_role_ids || [],
      approvedBy: row.approved_by,
      lockedAt: row.locked_at ? new Date(row.locked_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}

export class PostgresEvaluationRepository implements IEvaluationRepository {
  constructor(private pool: Pool) {}

  async batchCreate(
    evaluations: Omit<Evaluation, 'evaluationId' | 'createdAt' | 'updatedAt'>[],
    client: PoolClient
  ): Promise<Evaluation[]> {
    if (evaluations.length === 0) return [];

    const created: Evaluation[] = [];
    const chunkSize = 200;

    for (let i = 0; i < evaluations.length; i += chunkSize) {
      const chunk = evaluations.slice(i, i + chunkSize);
      const valueTuples: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      for (const item of chunk) {
        valueTuples.push(
          `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
        );
        values.push(
          item.evaluationCycleId,
          item.employeeId,
          item.teamIdSnapshot,
          item.roleIdSnapshot,
          item.jobLevelSnapshot,
          item.managerIdSnapshot,
          item.status,
          item.createdBy,
          item.updatedBy
        );
      }

      const res = await client.query(
        `INSERT INTO evaluation (
          evaluation_cycle_id, employee_id, team_id_snapshot, role_id_snapshot,
          job_level_snapshot, manager_id_snapshot, status, created_by, updated_by
        ) VALUES ${valueTuples.join(', ')}
        RETURNING evaluation_id, evaluation_cycle_id, employee_id, team_id_snapshot, role_id_snapshot,
                  job_level_snapshot, manager_id_snapshot, status, self_score, manager_score,
                  final_score, submitted_at, approved_at, is_locked, created_at, updated_at,
                  created_by, updated_by`,
        values
      );

      for (const row of res.rows) {
        created.push(this.mapRowToEvaluation(row));
      }
    }

    return created;
  }

  async lockEvaluationsByCycleId(cycleId: string, client: PoolClient): Promise<void> {
    await client.query(
      `UPDATE evaluation
       SET is_locked = true, status = $1
       WHERE evaluation_cycle_id = $2`,
      [EvaluationStatus.LOCKED, cycleId]
    );
  }

  async findByCycleAndEmployee(cycleId: string, employeeId: string, client?: PoolClient): Promise<Evaluation | null> {
    const executor = client || this.pool;
    const res = await executor.query(
      `SELECT evaluation_id, evaluation_cycle_id, employee_id, team_id_snapshot, role_id_snapshot,
              job_level_snapshot, manager_id_snapshot, status, self_score, manager_score,
              final_score, submitted_at, approved_at, is_locked, created_at, updated_at,
              created_by, updated_by
       FROM evaluation
       WHERE evaluation_cycle_id = $1 AND employee_id = $2`,
      [cycleId, employeeId]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToEvaluation(res.rows[0]);
  }

  private mapRowToEvaluation(row: any): Evaluation {
    return {
      evaluationId: row.evaluation_id,
      evaluationCycleId: row.evaluation_cycle_id,
      employeeId: row.employee_id,
      teamIdSnapshot: row.team_id_snapshot,
      roleIdSnapshot: row.role_id_snapshot,
      jobLevelSnapshot: row.job_level_snapshot,
      managerIdSnapshot: row.manager_id_snapshot,
      status: row.status as EvaluationStatus,
      selfScore: row.self_score ? parseFloat(row.self_score) : null,
      managerScore: row.manager_score ? parseFloat(row.manager_score) : null,
      finalScore: row.final_score ? parseFloat(row.final_score) : null,
      submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
      approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : null,
      isLocked: row.is_locked,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}

export class PostgresEvaluationItemRepository implements IEvaluationItemRepository {
  constructor(private pool: Pool) {}

  async batchCreate(
    items: Omit<EvaluationItem, 'evaluationItemId' | 'createdAt' | 'updatedAt'>[],
    client: PoolClient
  ): Promise<EvaluationItem[]> {
    if (items.length === 0) return [];

    const created: EvaluationItem[] = [];
    const chunkSize = 150; // max parameters = 150 * 11 = 1650

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const valueTuples: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      for (const item of chunk) {
        valueTuples.push(
          `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
        );
        values.push(
          item.evaluationId,
          item.templateCriterionId,
          item.criterionCodeSnapshot,
          item.criterionNameSnapshot,
          item.weightSnapshot,
          item.kpiIdSnapshot ?? null,
          item.kpiCodeSnapshot ?? null,
          item.kpiNameSnapshot ?? null,
          item.kpiWeightSnapshot ?? null,
          JSON.stringify(item.scoringRuleSnapshot),
          JSON.stringify(item.levelDefinitionSnapshot),
          item.isDisabledForEmployee,
          item.isMissingScore,
          item.createdBy,
          item.updatedBy
        );
      }

      const res = await client.query(
        `INSERT INTO evaluation_item (
          evaluation_id, template_criterion_id, criterion_code_snapshot, criterion_name_snapshot,
          weight_snapshot, kpi_id_snapshot, kpi_code_snapshot, kpi_name_snapshot, kpi_weight_snapshot,
          scoring_rule_snapshot, level_definition_snapshot,
          is_disabled_for_employee, is_missing_score, created_by, updated_by
        ) VALUES ${valueTuples.join(', ')}
        RETURNING evaluation_item_id, evaluation_id, template_criterion_id, criterion_code_snapshot,
                  criterion_name_snapshot, weight_snapshot, kpi_id_snapshot, kpi_code_snapshot, kpi_name_snapshot,
                  kpi_weight_snapshot, scoring_rule_snapshot, level_definition_snapshot,
                  resolved_level, raw_score, weighted_score, is_disabled_for_employee, is_missing_score,
                  comment, reviewer_id, review_date, created_at, updated_at, created_by, updated_by`,
        values
      );

      for (const row of res.rows) {
        created.push(this.mapRowToItem(row));
      }
    }

    return created;
  }

  private mapRowToItem(row: any): EvaluationItem {
    return {
      evaluationItemId: row.evaluation_item_id,
      evaluationId: row.evaluation_id,
      templateCriterionId: row.template_criterion_id,
      criterionCodeSnapshot: row.criterion_code_snapshot,
      criterionNameSnapshot: row.criterion_name_snapshot,
      weightSnapshot: parseFloat(row.weight_snapshot),
      kpiIdSnapshot: row.kpi_id_snapshot,
      kpiCodeSnapshot: row.kpi_code_snapshot,
      kpiNameSnapshot: row.kpi_name_snapshot,
      kpiWeightSnapshot: row.kpi_weight_snapshot == null ? undefined : parseFloat(row.kpi_weight_snapshot),
      scoringRuleSnapshot: typeof row.scoring_rule_snapshot === 'string' ? JSON.parse(row.scoring_rule_snapshot) : row.scoring_rule_snapshot,
      levelDefinitionSnapshot: typeof row.level_definition_snapshot === 'string' ? JSON.parse(row.level_definition_snapshot) : row.level_definition_snapshot,
      resolvedLevel: row.resolved_level == null ? null : parseInt(row.resolved_level, 10),
      rawScore: row.raw_score == null ? null : parseFloat(row.raw_score),
      normalizedScore: row.normalized_score == null ? null : parseFloat(row.normalized_score),
      weightedScore: row.weighted_score ? parseFloat(row.weighted_score) : null,
      isDisabledForEmployee: row.is_disabled_for_employee,
      isMissingScore: row.is_missing_score,
      comment: row.comment,
      reviewerId: row.reviewer_id,
      reviewDate: row.review_date ? new Date(row.review_date).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}
