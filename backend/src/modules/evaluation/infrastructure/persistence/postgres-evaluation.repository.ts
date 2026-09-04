import { Pool, PoolClient } from 'pg';
import { Evaluation, EvaluationStatus } from '../../domain/evaluation.types.js';
import { IEvaluationRepository, MyEvaluationListItem, TeamEvaluationListItem } from '../../domain/repositories.interface.js';

export class PostgresEvaluationRepository implements IEvaluationRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): Evaluation {
    return {
      evaluation_id: row.evaluation_id as string,
      evaluation_cycle_id: row.evaluation_cycle_id as string,
      employee_id: row.employee_id as string,
      team_id_snapshot: row.team_id_snapshot as string,
      role_id_snapshot: row.role_id_snapshot as string,
      job_level_snapshot: row.job_level_snapshot as string,
      manager_id_snapshot: row.manager_id_snapshot as string,
      status: row.status as EvaluationStatus,
      self_score: row.self_score ? Number(row.self_score) : undefined,
      manager_score: row.manager_score ? Number(row.manager_score) : undefined,
      final_score: row.final_score ? Number(row.final_score) : undefined,
      scoring_breakdown: typeof row.scoring_breakdown === 'string' ? JSON.parse(row.scoring_breakdown) : row.scoring_breakdown,
      submitted_at: row.submitted_at ? new Date(row.submitted_at as string) : undefined,
      approved_at: row.approved_at ? new Date(row.approved_at as string) : undefined,
      is_locked: Boolean(row.is_locked),
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
      created_by: row.created_by as string,
      updated_by: row.updated_by as string,
      version: Number(row.version ?? 1),
    };
  }

  async findById(id: string, client?: PoolClient): Promise<Evaluation | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM evaluation WHERE evaluation_id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByIdForUpdate(id: string, client: PoolClient): Promise<Evaluation | null> {
    const res = await client.query('SELECT * FROM evaluation WHERE evaluation_id = $1 FOR UPDATE', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findMyEvaluations(userId: string, client?: PoolClient): Promise<MyEvaluationListItem[]> {
    const runner = client || this.pool;
    const res = await runner.query(
      `SELECT e.*,
              c.name as cycle_name,
              c.start_date as cycle_start_date,
              c.end_date as cycle_end_date,
              c.status as cycle_status
       FROM evaluation e
       JOIN evaluation_cycle c ON e.evaluation_cycle_id = c.evaluation_cycle_id
       WHERE e.employee_id = $1
       ORDER BY c.end_date DESC, e.created_at DESC`,
      [userId]
    );
    return res.rows.map(row => ({
      evaluation: this.mapRow(row),
      cycle: {
        name: row.cycle_name,
        start_date: row.cycle_start_date,
        end_date: row.cycle_end_date,
        status: row.cycle_status,
      }
    }));
  }

  async findTeamEvaluations(params: { managerEmployeeId?: string; isSuperAdminOrHr?: boolean }, client?: PoolClient): Promise<TeamEvaluationListItem[]> {
    const runner = client || this.pool;
    let query = `
      SELECT e.*,
             c.name as cycle_name,
             c.start_date as cycle_start_date,
             c.end_date as cycle_end_date,
             c.status as cycle_status,
             emp.full_name as employee_name,
             emp.employee_code as employee_code,
             emp.email as employee_email,
             t.name as team_name,
             r.name as role_name
      FROM evaluation e
      JOIN evaluation_cycle c ON e.evaluation_cycle_id = c.evaluation_cycle_id
      JOIN employee emp ON e.employee_id = emp.employee_id
      LEFT JOIN team t ON e.team_id_snapshot = t.team_id
      LEFT JOIN role r ON e.role_id_snapshot = r.role_id
    `;
    const queryParams: unknown[] = [];

    if (!params.isSuperAdminOrHr) {
      if (!params.managerEmployeeId) {
        return [];
      }
      query += ` WHERE (e.manager_id_snapshot = $1 OR emp.manager_id = $1)`;
      queryParams.push(params.managerEmployeeId);
    }

    query += ` ORDER BY c.end_date DESC, emp.full_name ASC`;

    const res = await runner.query(query, queryParams);
    return res.rows.map(row => ({
      evaluation: this.mapRow(row),
      employee: {
        employee_id: row.employee_id,
        full_name: row.employee_name,
        employee_code: row.employee_code,
        email: row.employee_email,
        team_name: row.team_name,
        role_name: row.role_name,
      },
      cycle: {
        name: row.cycle_name,
        start_date: row.cycle_start_date,
        end_date: row.cycle_end_date,
        status: row.cycle_status,
      }
    }));
  }

  async update(id: string, evaluation: Partial<Evaluation>, client?: PoolClient): Promise<Evaluation> {
    const runner = client || this.pool;
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(evaluation)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      const existing = await this.findById(id, client);
      if (!existing) throw new Error('Evaluation not found');
      return existing;
    }

    values.push(id);
    const query = `
      UPDATE evaluation
      SET ${fields.join(', ')}
      WHERE evaluation_id = $${idx}
      RETURNING *
    `;
    const res = await runner.query(query, values);
    return this.mapRow(res.rows[0]);
  }
}
