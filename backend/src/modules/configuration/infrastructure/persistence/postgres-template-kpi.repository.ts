import { Pool, PoolClient } from 'pg';
import { TemplateKpi } from '../../domain/configuration.types.js';
import { ITemplateKpiRepository } from '../../domain/repositories.interface.js';
import { NotFound } from '../../../../api/app-error.js';

export class PostgresTemplateKpiRepository implements ITemplateKpiRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): TemplateKpi {
    return {
      id: row.id as string,
      template_version_id: row.template_version_id as string,
      kpi_id: row.kpi_id as string,
      weight: Number(row.weight),
      display_order: Number(row.display_order),
      created_at: new Date(row.created_at as string),
    };
  }

  async findById(id: string, client?: PoolClient): Promise<TemplateKpi | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM template_kpis WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByTemplateVersionId(templateVersionId: string, client?: PoolClient): Promise<TemplateKpi[]> {
    const runner = client || this.pool;
    const res = await runner.query(
      'SELECT * FROM template_kpis WHERE template_version_id = $1 ORDER BY display_order ASC',
      [templateVersionId]
    );
    return res.rows.map((r) => this.mapRow(r));
  }

  async create(tk: Partial<TemplateKpi>, client?: PoolClient): Promise<TemplateKpi> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO template_kpis
       (template_version_id, kpi_id, weight, display_order)
       VALUES ($1, $2, COALESCE($3, 0), COALESCE($4, 1))
       RETURNING *`,
      [
        tk.template_version_id,
        tk.kpi_id,
        tk.weight ?? 0,
        tk.display_order ?? 1,
      ]
    );
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, tk: Partial<TemplateKpi>, client?: PoolClient): Promise<TemplateKpi> {
    const runner = client || this.pool;
    const res = await runner.query(
      `UPDATE template_kpis
       SET weight = COALESCE($1, weight),
           display_order = COALESCE($2, display_order)
       WHERE id = $3
       RETURNING *`,
      [
        tk.weight !== undefined ? tk.weight : null,
        tk.display_order !== undefined ? tk.display_order : null,
        id,
      ]
    );
    if (res.rows.length === 0) throw new NotFound('TemplateKpi');
    return this.mapRow(res.rows[0]);
  }

  async delete(id: string, client?: PoolClient): Promise<void> {
    const runner = client || this.pool;
    const res = await runner.query('DELETE FROM template_kpis WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new NotFound('TemplateKpi');
  }

  async replaceAllForVersion(templateVersionId: string, items: Partial<TemplateKpi>[], client?: PoolClient): Promise<TemplateKpi[]> {
    const runner = client || this.pool;
    await runner.query('DELETE FROM template_kpis WHERE template_version_id = $1', [templateVersionId]);
    const results: TemplateKpi[] = [];
    for (const item of items) {
      const created = await this.create({ ...item, template_version_id: templateVersionId }, runner as PoolClient);
      results.push(created);
    }
    return results;
  }
}
