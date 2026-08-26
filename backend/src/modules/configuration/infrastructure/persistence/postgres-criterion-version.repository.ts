import { Pool, PoolClient } from 'pg';
import { CriterionVersion, VersionStatus } from '../../domain/configuration.types.js';
import { ICriterionVersionRepository } from '../../domain/repositories.interface.js';
import { VersionMismatch, NotFound } from '../../../../api/app-error.js';

export class PostgresCriterionVersionRepository implements ICriterionVersionRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): CriterionVersion {
    return {
      id: row.id as string,
      criterion_id: row.criterion_id as string,
      version_no: Number(row.version_no),
      default_weight: Number(row.default_weight),
      measurement_unit: row.measurement_unit as string,
      measurement_source_label: row.measurement_source_label ? (row.measurement_source_label as string) : undefined,
      scoring_rule_id: row.scoring_rule_id ? (row.scoring_rule_id as string) : undefined,
      effective_from: row.effective_from ? new Date(row.effective_from as string) : undefined,
      effective_to: row.effective_to ? new Date(row.effective_to as string) : undefined,
      status: row.status as VersionStatus,
      version: Number(row.version),
      created_at: new Date(row.created_at as string),
      created_by: row.created_by ? (row.created_by as string) : undefined,
    };
  }

  async findById(id: string, client?: PoolClient): Promise<CriterionVersion | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM criterion_versions WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByCriterionIdAndVersion(criterionId: string, versionNo: number, client?: PoolClient): Promise<CriterionVersion | null> {
    const runner = client || this.pool;
    const res = await runner.query(
      'SELECT * FROM criterion_versions WHERE criterion_id = $1 AND version_no = $2',
      [criterionId, versionNo]
    );
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByCriterionId(criterionId: string, client?: PoolClient): Promise<CriterionVersion[]> {
    const runner = client || this.pool;
    const res = await runner.query(
      'SELECT * FROM criterion_versions WHERE criterion_id = $1 ORDER BY version_no DESC',
      [criterionId]
    );
    return res.rows.map((r) => this.mapRow(r));
  }

  async create(v: Partial<CriterionVersion>, client?: PoolClient): Promise<CriterionVersion> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO criterion_versions
       (criterion_id, version_no, default_weight, measurement_unit, measurement_source_label, scoring_rule_id, effective_from, effective_to, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'DRAFT'), $10)
       RETURNING *`,
      [
        v.criterion_id,
        v.version_no,
        v.default_weight ?? 0,
        v.measurement_unit,
        v.measurement_source_label || null,
        v.scoring_rule_id || null,
        v.effective_from || null,
        v.effective_to || null,
        v.status || 'DRAFT',
        v.created_by || null,
      ]
    );
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, v: Partial<CriterionVersion>, expectedVersion?: number, client?: PoolClient): Promise<CriterionVersion> {
    const runner = client || this.pool;
    if (expectedVersion !== undefined) {
      const res = await runner.query(
        `UPDATE criterion_versions
         SET default_weight = COALESCE($1, default_weight),
             measurement_unit = COALESCE($2, measurement_unit),
             measurement_source_label = COALESCE($3, measurement_source_label),
             scoring_rule_id = COALESCE($4, scoring_rule_id),
             effective_from = COALESCE($5, effective_from),
             effective_to = COALESCE($6, effective_to),
             status = COALESCE($7, status),
             version = version + 1
         WHERE id = $8 AND version = $9
         RETURNING *`,
        [
          v.default_weight !== undefined ? v.default_weight : null,
          v.measurement_unit || null,
          v.measurement_source_label || null,
          v.scoring_rule_id || null,
          v.effective_from || null,
          v.effective_to || null,
          v.status || null,
          id,
          expectedVersion,
        ]
      );
      if (res.rows.length === 0) {
        const check = await this.findById(id, client);
        if (!check) throw new NotFound('CriterionVersion');
        throw new VersionMismatch('CriterionVersion');
      }
      return this.mapRow(res.rows[0]);
    } else {
      const res = await runner.query(
        `UPDATE criterion_versions
         SET default_weight = COALESCE($1, default_weight),
             measurement_unit = COALESCE($2, measurement_unit),
             measurement_source_label = COALESCE($3, measurement_source_label),
             scoring_rule_id = COALESCE($4, scoring_rule_id),
             effective_from = COALESCE($5, effective_from),
             effective_to = COALESCE($6, effective_to),
             status = COALESCE($7, status),
             version = version + 1
         WHERE id = $8
         RETURNING *`,
        [
          v.default_weight !== undefined ? v.default_weight : null,
          v.measurement_unit || null,
          v.measurement_source_label || null,
          v.scoring_rule_id || null,
          v.effective_from || null,
          v.effective_to || null,
          v.status || null,
          id,
        ]
      );
      if (res.rows.length === 0) throw new NotFound('CriterionVersion');
      return this.mapRow(res.rows[0]);
    }
  }
}
