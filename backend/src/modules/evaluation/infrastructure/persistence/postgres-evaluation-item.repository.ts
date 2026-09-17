import { Pool, PoolClient } from 'pg';
import { EvaluationItem } from '../../domain/evaluation.types.js';
import { IEvaluationItemRepository } from '../../domain/repositories.interface.js';

export class PostgresEvaluationItemRepository implements IEvaluationItemRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): EvaluationItem {
    return {
      evaluation_item_id: row.evaluation_item_id as string,
      evaluation_id: row.evaluation_id as string,
      template_criterion_id: row.template_criterion_id as string,
      criterion_code_snapshot: row.criterion_code_snapshot as string,
      criterion_name_snapshot: row.criterion_name_snapshot as string,
      weight_snapshot: Number(row.weight_snapshot),
      kpi_id_snapshot: row.kpi_id_snapshot as string,
      kpi_code_snapshot: row.kpi_code_snapshot as string,
      kpi_name_snapshot: row.kpi_name_snapshot as string,
      kpi_weight_snapshot: row.kpi_weight_snapshot == null ? undefined : Number(row.kpi_weight_snapshot),
      scoring_rule_snapshot: typeof row.scoring_rule_snapshot === 'string' ? JSON.parse(row.scoring_rule_snapshot) : row.scoring_rule_snapshot,
      level_definition_snapshot: typeof row.level_definition_snapshot === 'string' ? JSON.parse(row.level_definition_snapshot) : row.level_definition_snapshot,
      measurement_value: row.measurement_value == null ? undefined : Number(row.measurement_value),
      resolved_level: row.resolved_level == null ? undefined : Number(row.resolved_level),
      raw_score: row.raw_score == null ? undefined : Number(row.raw_score),
      normalized_score: row.normalized_score == null ? undefined : Number(row.normalized_score),
      weighted_score: row.weighted_score ? Number(row.weighted_score) : undefined,
      is_disabled_for_employee: Boolean(row.is_disabled_for_employee),
      is_missing_score: Boolean(row.is_missing_score),
      manual_override_score: row.manual_override_score == null ? undefined : Number(row.manual_override_score),
      override_reason: row.override_reason as string | undefined,
      override_by: row.override_by as string | undefined,
      override_at: row.override_at ? new Date(row.override_at as string) : undefined,
      comment: row.comment as string,
      rationale: row.rationale as string | undefined,
      import_id: row.import_id as string | undefined,
      source_snapshot: typeof row.source_snapshot === 'string' ? JSON.parse(row.source_snapshot) : row.source_snapshot as Record<string, unknown> | undefined,
      system_note: row.system_note as string | undefined,
      system_suggested_level: row.system_suggested_level == null ? undefined : Number(row.system_suggested_level),
      system_suggested_score: row.system_suggested_score == null ? undefined : Number(row.system_suggested_score),
      system_source: row.system_source as string | undefined,
      measurement_key: row.measurement_key as string | undefined,
      measurement_unit: row.measurement_unit as string | undefined,
      reviewer_id: row.reviewer_id as string,
      review_date: row.review_date ? new Date(row.review_date as string) : undefined,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
      created_by: row.created_by as string,
      updated_by: row.updated_by as string,
      version: Number(row.version ?? 1),
    };
  }

  async findByCycleEmployeeKpi(cycleId: string, employeeId: string, kpiCode: string, client?: PoolClient): Promise<{ evaluationId: string; item: EvaluationItem } | null> {
    const runner = client || this.pool;
    const res = await runner.query(
      `SELECT ei.*, e.evaluation_id as parent_eval_id
       FROM evaluation e
       JOIN evaluation_item ei ON e.evaluation_id = ei.evaluation_id
       WHERE e.evaluation_cycle_id = $1
         AND e.employee_id = $2
         AND (ei.criterion_code_snapshot = $3 OR ei.kpi_code_snapshot = $3)
       LIMIT 1`,
      [cycleId, employeeId, kpiCode]
    );
    if (res.rows.length === 0) return null;
    return {
      evaluationId: res.rows[0].parent_eval_id as string,
      item: this.mapRow(res.rows[0]),
    };
  }

  async findByEvaluationId(evaluationId: string, client?: PoolClient): Promise<EvaluationItem[]> {
    const runner = client || this.pool;
    const res = await runner.query(
      `SELECT ei.*, 
              latest_measurement.measurement_value,
              latest_measurement.measurement_key,
              latest_measurement.measurement_unit,
              latest_measurement.source_label as measurement_source_label
       FROM evaluation_item ei
       LEFT JOIN LATERAL (
         SELECT m.measurement_value, m.measurement_key, m.measurement_unit, m.source_label
         FROM measurement m
         WHERE m.evaluation_item_id = ei.evaluation_item_id
         ORDER BY m.recorded_at DESC
         LIMIT 1
       ) latest_measurement ON true
       WHERE ei.evaluation_id = $1
       ORDER BY ei.created_at ASC`,
      [evaluationId]
    );
    return res.rows.map(r => this.mapRow(r));
  }

  async update(id: string, item: Partial<EvaluationItem>, client?: PoolClient): Promise<EvaluationItem> {
    const runner = client || this.pool;
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(item)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) throw new Error('No fields to update');
    
    values.push(id);
    const res = await runner.query(`
      UPDATE evaluation_item
      SET ${fields.join(', ')}
      WHERE evaluation_item_id = $${idx}
      RETURNING *
    `, values);
    return this.mapRow(res.rows[0]);
  }

  async updateScoringResult(id: string, expectedVersion: number, item: Partial<EvaluationItem>, client: PoolClient): Promise<EvaluationItem | null> {
    const result = await client.query(
      `UPDATE evaluation_item
       SET resolved_level = $1, raw_score = $2, normalized_score = $3,
           weighted_score = $4, is_missing_score = $5, updated_by = $6,
           updated_at = CURRENT_TIMESTAMP, version = version + 1
       WHERE evaluation_item_id = $7 AND version = $8
       RETURNING *`,
      [item.resolved_level, item.raw_score, item.normalized_score, item.weighted_score,
        item.is_missing_score, item.updated_by, id, expectedVersion]
    );
    return result.rows.length === 0 ? null : this.mapRow(result.rows[0]);
  }

  async updateScoringResultsBatch(
    updates: Array<{ id: string; expectedVersion: number; patch: Partial<EvaluationItem> }>,
    client: PoolClient
  ): Promise<EvaluationItem[]> {
    if (updates.length === 0) return [];

    const ids: string[] = [];
    const expectedVersions: number[] = [];
    const resolvedLevels: (number | null)[] = [];
    const rawScores: (number | null)[] = [];
    const normalizedScores: (number | null)[] = [];
    const weightedScores: (number | null)[] = [];
    const isMissingScores: boolean[] = [];
    const updatedBys: (string | null)[] = [];

    for (const u of updates) {
      ids.push(u.id);
      expectedVersions.push(u.expectedVersion);
      resolvedLevels.push(u.patch.resolved_level ?? null);
      rawScores.push(u.patch.raw_score ?? null);
      normalizedScores.push(u.patch.normalized_score ?? null);
      weightedScores.push(u.patch.weighted_score ?? null);
      isMissingScores.push(u.patch.is_missing_score ?? false);
      updatedBys.push(u.patch.updated_by ?? null);
    }

    const query = `
      UPDATE evaluation_item AS ei
      SET resolved_level = data.resolved_level,
          raw_score = data.raw_score,
          normalized_score = data.normalized_score,
          weighted_score = data.weighted_score,
          is_missing_score = data.is_missing_score,
          updated_by = data.updated_by,
          updated_at = CURRENT_TIMESTAMP,
          version = ei.version + 1
      FROM (
        SELECT 
          unnest($1::uuid[]) AS id,
          unnest($2::int[]) AS expected_version,
          unnest($3::int[]) AS resolved_level,
          unnest($4::numeric[]) AS raw_score,
          unnest($5::numeric[]) AS normalized_score,
          unnest($6::numeric[]) AS weighted_score,
          unnest($7::boolean[]) AS is_missing_score,
          unnest($8::uuid[]) AS updated_by
      ) AS data
      WHERE ei.evaluation_item_id = data.id AND ei.version = data.expected_version
      RETURNING ei.*
    `;

    const result = await client.query(query, [
      ids,
      expectedVersions,
      resolvedLevels,
      rawScores,
      normalizedScores,
      weightedScores,
      isMissingScores,
      updatedBys,
    ]);

    return result.rows.map((row) => this.mapRow(row));
  }

  async batchUpdate(evaluationId: string, items: { id: string; resolved_level?: number; comment?: string }[], client?: PoolClient): Promise<void> {
    if (!items.length) return;
    
    let shouldRelease = false;
    let trxClient: PoolClient;
    if (client) {
      trxClient = client;
    } else {
      trxClient = await this.pool.connect();
      await trxClient.query('BEGIN');
      shouldRelease = true;
    }

    try {
      for (const item of items) {
        await trxClient.query(
          `UPDATE evaluation_item 
           SET resolved_level = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
           WHERE evaluation_item_id = $3 AND evaluation_id = $4`,
          [item.resolved_level, item.comment, item.id, evaluationId]
        );
      }
      if (shouldRelease) {
        await trxClient.query('COMMIT');
      }
    } catch (e) {
      if (shouldRelease) {
        await trxClient.query('ROLLBACK');
      }
      throw e;
    } finally {
      if (shouldRelease) {
        trxClient.release();
      }
    }
  }
}
