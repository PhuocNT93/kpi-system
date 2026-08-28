import { Pool, QueryResultRow } from 'pg';
import { Kpi } from '../domain/kpi.model.js';
import { CreateKpiDto, KpiRepository, UpdateKpiDto } from '../domain/kpi.repository.js';
import { BadRequest, NotFound } from '../../../api/app-error.js';

export class PostgresKpiRepository implements KpiRepository {
  constructor(private pool: Pool) {}

  private mapToModel(row: QueryResultRow): Kpi {
    return {
      kpiId: row.kpi_id,
      code: row.code,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(data: CreateKpiDto): Promise<Kpi> {
    try {
      const res = await this.pool.query(
        `INSERT INTO kpi (code, name, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.code, data.name, data.description || null]
      );
      return this.mapToModel(res.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // unique violation
        throw new BadRequest(`KPI with code ${data.code} already exists`);
      }
      throw error;
    }
  }

  async findById(kpiId: string): Promise<Kpi | null> {
    const res = await this.pool.query('SELECT * FROM kpi WHERE kpi_id = $1', [kpiId]);
    if (res.rowCount === 0) return null;
    return this.mapToModel(res.rows[0]);
  }

  async findByCode(code: string): Promise<Kpi | null> {
    const res = await this.pool.query('SELECT * FROM kpi WHERE code = $1', [code]);
    if (res.rowCount === 0) return null;
    return this.mapToModel(res.rows[0]);
  }

  async findAll(): Promise<Kpi[]> {
    const res = await this.pool.query('SELECT * FROM kpi ORDER BY code ASC');
    return res.rows.map(this.mapToModel);
  }

  async update(kpiId: string, data: UpdateKpiDto): Promise<Kpi> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (updates.length === 0) {
      const existing = await this.findById(kpiId);
      if (!existing) throw new NotFound('KPI not found');
      return existing;
    }

    values.push(kpiId);
    const res = await this.pool.query(
      `UPDATE kpi SET ${updates.join(', ')} WHERE kpi_id = $${paramIndex} RETURNING *`,
      values
    );

    if (res.rowCount === 0) throw new NotFound('KPI not found');
    return this.mapToModel(res.rows[0]);
  }

  async delete(kpiId: string): Promise<void> {
    const res = await this.pool.query('DELETE FROM kpi WHERE kpi_id = $1', [kpiId]);
    if (res.rowCount === 0) throw new NotFound('KPI not found');
  }
}
