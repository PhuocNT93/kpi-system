import { Pool, PoolClient } from 'pg';
import { ITemplateKpiRepository } from '../../domain/repositories.interface.js';
import { TemplateKpi } from '../../domain/configuration.types.js';

interface TemplateKpiRow {
  template_kpi_id: string;
  template_version_id: string;
  kpi_id: string;
  weight: string | number;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export class PostgresTemplateKpiRepository implements ITemplateKpiRepository {
  constructor(private readonly pool: Pool) {}

  private getClient(client?: PoolClient) {
    return client || this.pool;
  }

  private mapRow(row: TemplateKpiRow): TemplateKpi {
    return {
      id: row.template_kpi_id,
      template_version_id: row.template_version_id,
      kpi_id: row.kpi_id,
      weight: Number(row.weight),
      display_order: row.display_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async findById(id: string, client?: PoolClient): Promise<TemplateKpi | null> {
    const res = await this.getClient(client).query(
      `SELECT * FROM template_kpi WHERE template_kpi_id = $1`,
      [id]
    );
    return res.rows[0] ? this.mapRow(res.rows[0]) : null;
  }

  async findByTemplateVersionId(templateVersionId: string, client?: PoolClient): Promise<TemplateKpi[]> {
    const res = await this.getClient(client).query(
      `SELECT * FROM template_kpi WHERE template_version_id = $1 ORDER BY display_order ASC`,
      [templateVersionId]
    );
    return res.rows.map(this.mapRow);
  }

  async create(tk: Partial<TemplateKpi>, client?: PoolClient): Promise<TemplateKpi> {
    const res = await this.getClient(client).query(
      `INSERT INTO template_kpi (template_version_id, kpi_id, weight, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tk.template_version_id, tk.kpi_id, tk.weight, tk.display_order || 0]
    );
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, tk: Partial<TemplateKpi>, client?: PoolClient): Promise<TemplateKpi> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (tk.weight !== undefined) {
      fields.push(`weight = $${idx++}`);
      values.push(tk.weight);
    }
    if (tk.display_order !== undefined) {
      fields.push(`display_order = $${idx++}`);
      values.push(tk.display_order);
    }

    if (fields.length === 0) return this.findById(id, client) as Promise<TemplateKpi>;

    values.push(id);
    const res = await this.getClient(client).query(
      `UPDATE template_kpi SET ${fields.join(', ')} WHERE template_kpi_id = $${idx} RETURNING *`,
      values
    );
    if (res.rowCount === 0) throw new Error('TemplateKpi not found');
    return this.mapRow(res.rows[0]);
  }

  async delete(id: string, client?: PoolClient): Promise<void> {
    await this.getClient(client).query(
      `DELETE FROM template_kpi WHERE template_kpi_id = $1`,
      [id]
    );
  }

  async replaceAllForVersion(templateVersionId: string, items: Partial<TemplateKpi>[], client?: PoolClient): Promise<TemplateKpi[]> {
    const c = client || await this.pool.connect();
    try {
      if (!client) await c.query('BEGIN');

      await c.query(`DELETE FROM template_kpi WHERE template_version_id = $1`, [templateVersionId]);

      const result: TemplateKpi[] = [];
      for (const item of items) {
        const res = await c.query(
          `INSERT INTO template_kpi (template_version_id, kpi_id, weight, display_order)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [templateVersionId, item.kpi_id, item.weight, item.display_order || 0]
        );
        result.push(this.mapRow(res.rows[0]));
      }

      if (!client) await c.query('COMMIT');
      return result;
    } catch (err) {
      if (!client) await c.query('ROLLBACK');
      throw err;
    } finally {
      if (!client) c.release();
    }
  }
}
