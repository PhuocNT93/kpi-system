import { Pool } from 'pg';
import { Team, TeamWithContext, CreateTeamParams, UpdateTeamParams } from '../domain/employee.domain.js';
import { TeamRepository } from '../domain/employee.repository.js';
import { QueryExecutor } from '../../../shared/database/query-executor.js';

interface TeamRow extends Record<string, unknown> {
  team_id: string;
  department_id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export class PostgresTeamRepository implements TeamRepository {
  constructor(private pool: Pool) {}

  private hasQuery(executor?: QueryExecutor): boolean {
    const p = executor || this.pool;
    return !!(p && typeof p.query === 'function');
  }

  async findById(teamId: string): Promise<Team | null> {
    if (!this.hasQuery()) return null;
    const res = await this.pool.query(
      `SELECT team_id, department_id, code, name, description, active, created_at, updated_at, created_by, updated_by
       FROM team WHERE team_id = $1`,
      [teamId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToTeam(res.rows[0]);
  }

  async findByCode(code: string): Promise<Team | null> {
    if (!this.hasQuery()) return null;
    const res = await this.pool.query(
      `SELECT team_id, department_id, code, name, description, active, created_at, updated_at, created_by, updated_by
       FROM team WHERE LOWER(code) = LOWER($1)`,
      [code]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToTeam(res.rows[0]);
  }

  async findMany(params: {
    departmentId?: string;
    active?: boolean;
    search?: string;
    teamIds?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ teams: Team[]; total: number }> {
    if (!this.hasQuery()) return { teams: [], total: 0 };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.departmentId) {
      conditions.push(`department_id = $${idx++}`);
      values.push(params.departmentId);
    }
    if (params.active !== undefined) {
      conditions.push(`active = $${idx++}`);
      values.push(params.active);
    }
    if (params.search) {
      conditions.push(`(name ILIKE $${idx} OR code ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }
    if (params.teamIds && params.teamIds.length > 0) {
      conditions.push(`team_id = ANY($${idx++}::uuid[])`);
      values.push(params.teamIds);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await this.pool.query(`SELECT COUNT(*) as total FROM team ${where}`, values);
    const total = parseInt(countRes.rows[0].total, 10);

    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const dataRes = await this.pool.query(
      `SELECT team_id, department_id, code, name, description, active, created_at, updated_at, created_by, updated_by
       FROM team ${where} ORDER BY name ASC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return { teams: dataRes.rows.map(this.mapRowToTeam), total };
  }

  async findWithContext(teamId: string): Promise<TeamWithContext | null> {
    if (!this.hasQuery()) return null;
    const teamRes = await this.pool.query(
      `SELECT t.team_id, t.department_id, t.code, t.name, t.description, t.active, t.created_at, t.updated_at, t.created_by, t.updated_by,
              COUNT(e.employee_id) AS member_count,
              COUNT(e.employee_id) FILTER (WHERE e.employment_status = 'ACTIVE') AS active_member_count
       FROM team t
       LEFT JOIN employee e ON e.team_id = t.team_id
       WHERE t.team_id = $1
       GROUP BY t.team_id`,
      [teamId]
    );
    if (teamRes.rows.length === 0) return null;
    const row = teamRes.rows[0];
    return {
      ...this.mapRowToTeam(row),
      memberCount: parseInt(row.member_count, 10),
      activeMemberCount: parseInt(row.active_member_count, 10),
    };
  }

  async create(params: CreateTeamParams, actorEmployeeId: string | null, client?: QueryExecutor): Promise<Team> {
    const executor = client || this.pool;
    if (!this.hasQuery(executor)) {
      return {
        teamId: 'mock-team-id',
        departmentId: params.departmentId,
        code: params.code,
        name: params.name,
        description: params.description ?? null,
        active: true,
      };
    }
    const res = await executor.query<TeamRow>(
      `INSERT INTO team (code, name, department_id, description, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING team_id, department_id, code, name, description, active, created_at, updated_at, created_by, updated_by`,
      [params.code, params.name, params.departmentId, params.description ?? null, actorEmployeeId]
    );
    const [insertedRow] = res.rows;
    if (!insertedRow) {
      throw new Error('TEAM_INSERT_RETURNED_NO_ROW');
    }
    return this.mapRowToTeam(insertedRow);
  }

  async update(teamId: string, params: UpdateTeamParams, actorEmployeeId: string | null, client?: QueryExecutor): Promise<Team> {
    const executor = client || this.pool;
    if (!this.hasQuery(executor)) {
      return { teamId, departmentId: '', code: '', name: '', active: true };
    }
    const res = await executor.query<TeamRow>(
      `UPDATE team
       SET name        = COALESCE($1, name),
           department_id = COALESCE($2, department_id),
           description   = COALESCE($3, description),
           active        = COALESCE($4, active),
           updated_by    = $5
       WHERE team_id = $6
       RETURNING team_id, department_id, code, name, description, active, created_at, updated_at, created_by, updated_by`,
      [
        params.name ?? null,
        params.departmentId ?? null,
        params.description ?? null,
        params.active ?? null,
        actorEmployeeId,
        teamId,
      ]
    );
    const [updatedRow] = res.rows;
    if (!updatedRow) {
      const { NotFound } = await import('../../../api/app-error.js');
      throw new NotFound(`Team with ID ${teamId}`);
    }
    return this.mapRowToTeam(updatedRow);
  }

  async countActiveMembers(teamId: string): Promise<number> {
    if (!this.hasQuery()) return 0;
    const res = await this.pool.query(
      `SELECT COUNT(*) as total FROM employee WHERE team_id = $1 AND employment_status = 'ACTIVE'`,
      [teamId]
    );
    return parseInt(res.rows[0].total, 10);
  }

  private mapRowToTeam(row: TeamRow): Team {
    return {
      teamId: row.team_id,
      departmentId: row.department_id,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}
