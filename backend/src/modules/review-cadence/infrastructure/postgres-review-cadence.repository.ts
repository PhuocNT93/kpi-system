import { Pool } from 'pg';
import { ReviewCadenceRepository } from '../domain/review-cadence.repository.js';
import { ReviewCadence } from '../domain/review-cadence.types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export class PostgresReviewCadenceRepository implements ReviewCadenceRepository {
  constructor(private readonly pool: Pool) {}

  private mapRow(row: Row): ReviewCadence {
    return {
      id: row.review_cadence_id,
      code: row.code,
      name: row.name,
      intervalMonths: row.interval_months,
      isSystemDefault: row.is_system_default,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<ReviewCadence | null> {
    const { rows } = await this.pool.query(
      `SELECT review_cadence_id, code, name, interval_months, is_system_default, active, created_at, updated_at
       FROM review_cadence WHERE review_cadence_id = $1`,
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findByCode(code: string): Promise<ReviewCadence | null> {
    const { rows } = await this.pool.query(
      `SELECT review_cadence_id, code, name, interval_months, is_system_default, active, created_at, updated_at
       FROM review_cadence WHERE code = $1`,
      [code]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findSystemDefault(): Promise<ReviewCadence | null> {
    const { rows } = await this.pool.query(
      `SELECT review_cadence_id, code, name, interval_months, is_system_default, active, created_at, updated_at
       FROM review_cadence WHERE is_system_default = true AND active = true
       LIMIT 1`
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findAll(
    filters?: { active?: boolean },
    skip = 0,
    limit = 100
  ): Promise<[ReviewCadence[], number]> {
    let query =
      `SELECT review_cadence_id, code, name, interval_months, is_system_default, active, created_at, updated_at,` +
      ` count(*) OVER() AS full_count FROM review_cadence`;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.active !== undefined) {
      query += ` WHERE active = $${paramIndex++}`;
      params.push(filters.active);
    }

    query += ` ORDER BY is_system_default DESC, name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, skip);

    const result = await this.pool.query(query, params);
    const count = result.rows.length > 0 ? parseInt(result.rows[0].full_count, 10) : 0;
    return [result.rows.map((r) => this.mapRow(r)), count];
  }

  async create(cadence: ReviewCadence): Promise<ReviewCadence> {
    const { rows } = await this.pool.query(
      `INSERT INTO review_cadence (code, name, interval_months, is_system_default, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING review_cadence_id, code, name, interval_months, is_system_default, active, created_at, updated_at`,
      [cadence.code, cadence.name, cadence.intervalMonths, cadence.isSystemDefault, cadence.active]
    );
    return this.mapRow(rows[0]);
  }

  async update(cadence: ReviewCadence): Promise<ReviewCadence> {
    const { rows } = await this.pool.query(
      `UPDATE review_cadence
       SET name = $1, interval_months = $2, is_system_default = $3, active = $4
       WHERE review_cadence_id = $5
       RETURNING review_cadence_id, code, name, interval_months, is_system_default, active, created_at, updated_at`,
      [cadence.name, cadence.intervalMonths, cadence.isSystemDefault, cadence.active, cadence.id]
    );
    return this.mapRow(rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM review_cadence WHERE review_cadence_id = $1`,
      [id]
    );
  }

  async isReferencedByJobLevel(id: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM job_level WHERE default_review_cadence_id = $1 LIMIT 1`,
      [id]
    );
    return rows.length > 0;
  }

  async isReferencedByEmployee(id: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM employee WHERE review_cadence_override_id = $1 LIMIT 1`,
      [id]
    );
    return rows.length > 0;
  }
}
