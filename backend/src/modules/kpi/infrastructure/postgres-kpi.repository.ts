import { Pool, PoolClient } from 'pg';
import { Kpi } from '../domain/kpi.model.js';

export interface KpiFilter {
  search?: string;
  page?: number;
  size?: number;
}

export interface KpiCreateDTO {
  code: string;
  name: string;
  description?: string | null;
}

export interface KpiUpdateDTO {
  name?: string;
  description?: string | null;
}

export class PostgresKpiRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): Kpi {
    return {
      kpiId: row.kpi_id as string,
      code: row.code as string,
      name: row.name as string,
      description: row.description ? (row.description as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  async create(data: KpiCreateDTO, client?: PoolClient): Promise<Kpi> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO kpi (code, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.code, data.name, data.description ?? null]
    );
    return this.mapRow(res.rows[0]);
  }

  async findAll(
    filter: KpiFilter,
    client?: PoolClient
  ): Promise<{ items: Kpi[]; total: number }> {
    const runner = client || this.pool;
    const page = filter.page || 1;
    const size = filter.size || 20;
    const offset = (page - 1) * size;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filter.search) {
      conditions.push(`(name ILIKE $${idx} OR code ILIKE $${idx})`);
      params.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await runner.query(
      `SELECT COUNT(*) FROM kpi ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = [...params, size, offset];
    const dataRes = await runner.query(
      `SELECT * FROM kpi ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      queryParams
    );

    return {
      items: dataRes.rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  async findById(id: string, client?: PoolClient): Promise<Kpi | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM kpi WHERE kpi_id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByCode(code: string, client?: PoolClient): Promise<Kpi | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM kpi WHERE code = $1', [code]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, data: KpiUpdateDTO, client?: PoolClient): Promise<Kpi | null> {
    const runner = client || this.pool;
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.description !== undefined) {
      sets.push(`description = $${idx++}`);
      params.push(data.description);
    }

    if (sets.length === 0) return this.findById(id);

    params.push(id);
    const res = await runner.query(
      `UPDATE kpi SET ${sets.join(', ')}, updated_at = NOW() WHERE kpi_id = $${idx} RETURNING *`,
      params
    );
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const runner = client || this.pool;
    const res = await runner.query(
      'DELETE FROM kpi WHERE kpi_id = $1 RETURNING kpi_id',
      [id]
    );
    return res.rowCount !== null && res.rowCount > 0;
  }

  async hasActiveRelationships(id: string, client?: PoolClient): Promise<boolean> {
    const runner = client || this.pool;
    const res = await runner.query(
      `SELECT 1 FROM kpi_relationship
       WHERE (source_kpi_id = $1 OR target_kpi_id = $1)
         AND (effective_to IS NULL OR effective_to > NOW())
       LIMIT 1`,
      [id]
    );
    return res.rowCount !== null && res.rowCount > 0;
  }
}
