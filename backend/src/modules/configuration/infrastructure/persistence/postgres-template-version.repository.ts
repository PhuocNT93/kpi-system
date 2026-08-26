import { Pool, PoolClient } from 'pg';
import { EvaluationTemplateVersion, VersionStatus, WeightPolicy } from '../../domain/configuration.types.js';
import { ITemplateVersionRepository } from '../../domain/repositories.interface.js';
import { VersionMismatch, NotFound } from '../../../../api/app-error.js';

export class PostgresTemplateVersionRepository implements ITemplateVersionRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): EvaluationTemplateVersion {
    return {
      id: row.id as string,
      template_id: row.template_id as string,
      version_no: Number(row.version_no),
      status: row.status as VersionStatus,
      weight_total_policy: row.weight_total_policy as WeightPolicy,
      effective_from: row.effective_from ? new Date(row.effective_from as string) : undefined,
      effective_to: row.effective_to ? new Date(row.effective_to as string) : undefined,
      version: Number(row.version),
      created_at: new Date(row.created_at as string),
      created_by: row.created_by ? (row.created_by as string) : undefined,
    };
  }

  async findById(id: string, client?: PoolClient): Promise<EvaluationTemplateVersion | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM evaluation_template_versions WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByTemplateIdAndVersion(templateId: string, versionNo: number, client?: PoolClient): Promise<EvaluationTemplateVersion | null> {
    const runner = client || this.pool;
    const res = await runner.query(
      'SELECT * FROM evaluation_template_versions WHERE template_id = $1 AND version_no = $2',
      [templateId, versionNo]
    );
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByTemplateId(templateId: string, client?: PoolClient): Promise<EvaluationTemplateVersion[]> {
    const runner = client || this.pool;
    const res = await runner.query(
      'SELECT * FROM evaluation_template_versions WHERE template_id = $1 ORDER BY version_no DESC',
      [templateId]
    );
    return res.rows.map((r) => this.mapRow(r));
  }

  async create(v: Partial<EvaluationTemplateVersion>, client?: PoolClient): Promise<EvaluationTemplateVersion> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO evaluation_template_versions
       (template_id, version_no, status, weight_total_policy, effective_from, effective_to, created_by)
       VALUES ($1, $2, COALESCE($3, 'DRAFT'), COALESCE($4, 'EXACT_100'), $5, $6, $7)
       RETURNING *`,
      [
        v.template_id,
        v.version_no,
        v.status || 'DRAFT',
        v.weight_total_policy || 'EXACT_100',
        v.effective_from || null,
        v.effective_to || null,
        v.created_by || null,
      ]
    );
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, v: Partial<EvaluationTemplateVersion>, expectedVersion?: number, client?: PoolClient): Promise<EvaluationTemplateVersion> {
    const runner = client || this.pool;
    if (expectedVersion !== undefined) {
      const res = await runner.query(
        `UPDATE evaluation_template_versions
         SET status = COALESCE($1, status),
             weight_total_policy = COALESCE($2, weight_total_policy),
             effective_from = COALESCE($3, effective_from),
             effective_to = COALESCE($4, effective_to),
             version = version + 1
         WHERE id = $5 AND version = $6
         RETURNING *`,
        [
          v.status || null,
          v.weight_total_policy || null,
          v.effective_from || null,
          v.effective_to || null,
          id,
          expectedVersion,
        ]
      );
      if (res.rows.length === 0) {
        const check = await this.findById(id, client);
        if (!check) throw new NotFound('EvaluationTemplateVersion');
        throw new VersionMismatch('EvaluationTemplateVersion');
      }
      return this.mapRow(res.rows[0]);
    } else {
      const res = await runner.query(
        `UPDATE evaluation_template_versions
         SET status = COALESCE($1, status),
             weight_total_policy = COALESCE($2, weight_total_policy),
             effective_from = COALESCE($3, effective_from),
             effective_to = COALESCE($4, effective_to),
             version = version + 1
         WHERE id = $5
         RETURNING *`,
        [
          v.status || null,
          v.weight_total_policy || null,
          v.effective_from || null,
          v.effective_to || null,
          id,
        ]
      );
      if (res.rows.length === 0) throw new NotFound('EvaluationTemplateVersion');
      return this.mapRow(res.rows[0]);
    }
  }
}
