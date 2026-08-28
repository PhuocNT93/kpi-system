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

  async findByTemplateVersionIdWithDetails(templateVersionId: string, client?: PoolClient): Promise<any[]> {
    const runner = client || this.pool;
    const query = `
      SELECT tc.*,
             c.id as c_id, c.code as c_code, c.category as c_category, c.name as c_name, c.description as c_description, c.status as c_status, c.version as c_version,
             cv.id as cv_id, cv.criterion_id as cv_criterion_id, cv.version_no as cv_version_no, cv.default_weight as cv_default_weight, cv.measurement_unit as cv_measurement_unit, cv.measurement_source_label as cv_measurement_source_label, cv.status as cv_status,
             sr.id as sr_id, sr.code as sr_code, sr.name as sr_name, sr.rule_type as sr_rule_type, sr.config as sr_config, sr.status as sr_status, sr.version as sr_version
      FROM template_criteria tc
      LEFT JOIN criterion_versions cv ON tc.criterion_version_id = cv.id
      LEFT JOIN criteria c ON cv.criterion_id = c.id
      LEFT JOIN scoring_rules sr ON cv.scoring_rule_id = sr.id
      WHERE tc.template_version_id = $1
      ORDER BY tc.display_order ASC
    `;
    const res = await runner.query(query, [templateVersionId]);
    return res.rows.map(row => {
      const tc = this.mapRow(row);
      let criterion: any = null;
      if (row.cv_id && row.c_id) {
        criterion = {
          id: row.c_id,
          code: row.c_code,
          category: row.c_category,
          name: row.c_name,
          description: row.c_description,
          status: row.c_status,
          version: row.c_version,
          current_version: {
            id: row.cv_id,
            criterion_id: row.cv_criterion_id,
            version_no: row.cv_version_no,
            default_weight: Number(row.cv_default_weight),
            measurement_unit: row.cv_measurement_unit,
            measurement_source_label: row.cv_measurement_source_label,
            status: row.cv_status,
            scoring_rule: row.sr_id ? {
              id: row.sr_id,
              code: row.sr_code,
              name: row.sr_name,
              rule_type: row.sr_rule_type,
              config: typeof row.sr_config === 'string' ? JSON.parse(row.sr_config) : row.sr_config,
              status: row.sr_status,
              version: row.sr_version,
            } : undefined,
          },
        };
      }
      return {
        ...tc,
        criterion,
      };
    });
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
