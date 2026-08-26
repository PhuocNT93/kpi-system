import { Pool, PoolClient } from 'pg';
import { EvaluationLevel, CriterionStatus } from '../../domain/configuration.types.js';
import { IEvaluationLevelRepository } from '../../domain/repositories.interface.js';
import { NotFound } from '../../../../api/app-error.js';

export class PostgresEvaluationLevelRepository implements IEvaluationLevelRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): EvaluationLevel {
    return {
      id: row.id as string,
      code: row.code as string,
      level_number: Number(row.level_number),
      name: row.name as string,
      description: row.description ? (row.description as string) : undefined,
      score_value: Number(row.score_value),
      status: row.status as CriterionStatus,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    };
  }

  async findById(id: string, client?: PoolClient): Promise<EvaluationLevel | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM evaluation_levels WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByCode(code: string, client?: PoolClient): Promise<EvaluationLevel | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM evaluation_levels WHERE code = $1', [code]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findAll(client?: PoolClient): Promise<EvaluationLevel[]> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM evaluation_levels ORDER BY level_number ASC');
    return res.rows.map((r) => this.mapRow(r));
  }

  async create(level: Partial<EvaluationLevel>, client?: PoolClient): Promise<EvaluationLevel> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO evaluation_levels (code, level_number, name, description, score_value, status)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'ACTIVE'))
       RETURNING *`,
      [
        level.code,
        level.level_number,
        level.name,
        level.description || null,
        level.score_value,
        level.status || 'ACTIVE',
      ]
    );
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, level: Partial<EvaluationLevel>, client?: PoolClient): Promise<EvaluationLevel> {
    const runner = client || this.pool;
    const res = await runner.query(
      `UPDATE evaluation_levels
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           level_number = COALESCE($3, level_number),
           score_value = COALESCE($4, score_value),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        level.name || null,
        level.description || null,
        level.level_number !== undefined ? level.level_number : null,
        level.score_value !== undefined ? level.score_value : null,
        level.status || null,
        id,
      ]
    );
    if (res.rows.length === 0) throw new NotFound('EvaluationLevel');
    return this.mapRow(res.rows[0]);
  }
}
