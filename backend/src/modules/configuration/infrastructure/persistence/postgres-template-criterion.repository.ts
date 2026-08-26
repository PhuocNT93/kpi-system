import { Pool, PoolClient } from 'pg';
import { TemplateCriterion, ApplicabilityRule } from '../../domain/configuration.types.js';
import { ITemplateCriterionRepository } from '../../domain/repositories.interface.js';
import { NotFound } from '../../../../api/app-error.js';

export class PostgresTemplateCriterionRepository implements ITemplateCriterionRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): TemplateCriterion {
    return {
      id: row.id as string,
      template_version_id: row.template_version_id as string,
      criterion_version_id: row.criterion_version_id as string,
      weight: Number(row.weight),
      display_order: Number(row.display_order),
      required: Boolean(row.required),
      enabled: Boolean(row.enabled),
      applicability: (typeof row.applicability === 'string' ? JSON.parse(row.applicability) : row.applicability) as ApplicabilityRule,
      created_at: new Date(row.created_at as string),
    };
  }

  async findById(id: string, client?: PoolClient): Promise<TemplateCriterion | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM template_criteria WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByTemplateVersionId(templateVersionId: string, client?: PoolClient): Promise<TemplateCriterion[]> {
    const runner = client || this.pool;
    const res = await runner.query(
      'SELECT * FROM template_criteria WHERE template_version_id = $1 ORDER BY display_order ASC',
      [templateVersionId]
    );
    return res.rows.map((r) => this.mapRow(r));
  }

  async create(tc: Partial<TemplateCriterion>, client?: PoolClient): Promise<TemplateCriterion> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO template_criteria
       (template_version_id, criterion_version_id, weight, display_order, required, enabled, applicability)
       VALUES ($1, $2, COALESCE($3, 0), COALESCE($4, 1), COALESCE($5, true), COALESCE($6, true), $7)
       RETURNING *`,
      [
        tc.template_version_id,
        tc.criterion_version_id,
        tc.weight ?? 0,
        tc.display_order ?? 1,
        tc.required ?? true,
        tc.enabled ?? true,
        JSON.stringify(tc.applicability || {}),
      ]
    );
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, tc: Partial<TemplateCriterion>, client?: PoolClient): Promise<TemplateCriterion> {
    const runner = client || this.pool;
    const res = await runner.query(
      `UPDATE template_criteria
       SET weight = COALESCE($1, weight),
           display_order = COALESCE($2, display_order),
           required = COALESCE($3, required),
           enabled = COALESCE($4, enabled),
           applicability = COALESCE($5::jsonb, applicability)
       WHERE id = $6
       RETURNING *`,
      [
        tc.weight !== undefined ? tc.weight : null,
        tc.display_order !== undefined ? tc.display_order : null,
        tc.required !== undefined ? tc.required : null,
        tc.enabled !== undefined ? tc.enabled : null,
        tc.applicability ? JSON.stringify(tc.applicability) : null,
        id,
      ]
    );
    if (res.rows.length === 0) throw new NotFound('TemplateCriterion');
    return this.mapRow(res.rows[0]);
  }

  async delete(id: string, client?: PoolClient): Promise<void> {
    const runner = client || this.pool;
    const res = await runner.query('DELETE FROM template_criteria WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new NotFound('TemplateCriterion');
  }

  async replaceAllForVersion(templateVersionId: string, items: Partial<TemplateCriterion>[], client?: PoolClient): Promise<TemplateCriterion[]> {
    const runner = client || this.pool;
    await runner.query('DELETE FROM template_criteria WHERE template_version_id = $1', [templateVersionId]);
    const results: TemplateCriterion[] = [];
    for (const item of items) {
      const created = await this.create({ ...item, template_version_id: templateVersionId }, runner as PoolClient);
      results.push(created);
    }
    return results;
  }
}
