import { Pool, PoolClient } from 'pg';
import { RoleOverride, TeamOverride, TemplateOverride, OverrideConfig } from '../../domain/configuration.types.js';
import { IOverrideRepository } from '../../domain/repositories.interface.js';
import { NotFound } from '../../../../api/app-error.js';

export class PostgresOverrideRepository implements IOverrideRepository {
  constructor(private pool: Pool) {}

  // ── Role Overrides ──────────────────────────────────────────────────────────

  private mapRoleOverride(row: Record<string, unknown>): RoleOverride {
    return {
      id: row.id as string,
      role_code: row.role_code as string,
      template_version_id: row.template_version_id ? (row.template_version_id as string) : undefined,
      criterion_version_id: row.criterion_version_id as string,
      override_config: (typeof row.override_config === 'string' ? JSON.parse(row.override_config) : row.override_config) as OverrideConfig,
      created_at: new Date(row.created_at as string),
      created_by: row.created_by ? (row.created_by as string) : undefined,
    };
  }

  async findRoleOverrides(templateVersionId?: string, roleCode?: string, client?: PoolClient): Promise<RoleOverride[]> {
    const runner = client || this.pool;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (templateVersionId) {
      conditions.push(`(template_version_id = $${idx} OR template_version_id IS NULL)`);
      params.push(templateVersionId);
      idx++;
    }
    if (roleCode) {
      conditions.push(`role_code = $${idx}`);
      params.push(roleCode);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await runner.query(`SELECT * FROM role_overrides ${whereClause} ORDER BY created_at DESC`, params);
    return res.rows.map((r) => this.mapRoleOverride(r));
  }

  async findRoleOverrideById(id: string, client?: PoolClient): Promise<RoleOverride | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM role_overrides WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRoleOverride(res.rows[0]);
  }

  async createRoleOverride(override: Partial<RoleOverride>, client?: PoolClient): Promise<RoleOverride> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO role_overrides (role_code, template_version_id, criterion_version_id, override_config, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        override.role_code,
        override.template_version_id || null,
        override.criterion_version_id,
        JSON.stringify(override.override_config || {}),
        override.created_by || null,
      ]
    );
    return this.mapRoleOverride(res.rows[0]);
  }

  async updateRoleOverride(id: string, override: Partial<RoleOverride>, client?: PoolClient): Promise<RoleOverride> {
    const runner = client || this.pool;
    const res = await runner.query(
      `UPDATE role_overrides
       SET role_code = COALESCE($1, role_code),
           template_version_id = COALESCE($2, template_version_id),
           override_config = COALESCE($3::jsonb, override_config)
       WHERE id = $4
       RETURNING *`,
      [
        override.role_code || null,
        override.template_version_id || null,
        override.override_config ? JSON.stringify(override.override_config) : null,
        id,
      ]
    );
    if (res.rows.length === 0) throw new NotFound('RoleOverride');
    return this.mapRoleOverride(res.rows[0]);
  }

  async deleteRoleOverride(id: string, client?: PoolClient): Promise<void> {
    const runner = client || this.pool;
    const res = await runner.query('DELETE FROM role_overrides WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new NotFound('RoleOverride');
  }

  // ── Team Overrides ──────────────────────────────────────────────────────────

  private mapTeamOverride(row: Record<string, unknown>): TeamOverride {
    return {
      id: row.id as string,
      team_code: row.team_code as string,
      template_version_id: row.template_version_id ? (row.template_version_id as string) : undefined,
      criterion_version_id: row.criterion_version_id as string,
      override_config: (typeof row.override_config === 'string' ? JSON.parse(row.override_config) : row.override_config) as OverrideConfig,
      created_at: new Date(row.created_at as string),
      created_by: row.created_by ? (row.created_by as string) : undefined,
    };
  }

  async findTeamOverrides(templateVersionId?: string, teamCode?: string, client?: PoolClient): Promise<TeamOverride[]> {
    const runner = client || this.pool;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (templateVersionId) {
      conditions.push(`(template_version_id = $${idx} OR template_version_id IS NULL)`);
      params.push(templateVersionId);
      idx++;
    }
    if (teamCode) {
      conditions.push(`team_code = $${idx}`);
      params.push(teamCode);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await runner.query(`SELECT * FROM team_overrides ${whereClause} ORDER BY created_at DESC`, params);
    return res.rows.map((r) => this.mapTeamOverride(r));
  }

  async findTeamOverrideById(id: string, client?: PoolClient): Promise<TeamOverride | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM team_overrides WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapTeamOverride(res.rows[0]);
  }

  async createTeamOverride(override: Partial<TeamOverride>, client?: PoolClient): Promise<TeamOverride> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO team_overrides (team_code, template_version_id, criterion_version_id, override_config, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        override.team_code,
        override.template_version_id || null,
        override.criterion_version_id,
        JSON.stringify(override.override_config || {}),
        override.created_by || null,
      ]
    );
    return this.mapTeamOverride(res.rows[0]);
  }

  async updateTeamOverride(id: string, override: Partial<TeamOverride>, client?: PoolClient): Promise<TeamOverride> {
    const runner = client || this.pool;
    const res = await runner.query(
      `UPDATE team_overrides
       SET team_code = COALESCE($1, team_code),
           template_version_id = COALESCE($2, template_version_id),
           override_config = COALESCE($3::jsonb, override_config)
       WHERE id = $4
       RETURNING *`,
      [
        override.team_code || null,
        override.template_version_id || null,
        override.override_config ? JSON.stringify(override.override_config) : null,
        id,
      ]
    );
    if (res.rows.length === 0) throw new NotFound('TeamOverride');
    return this.mapTeamOverride(res.rows[0]);
  }

  async deleteTeamOverride(id: string, client?: PoolClient): Promise<void> {
    const runner = client || this.pool;
    const res = await runner.query('DELETE FROM team_overrides WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new NotFound('TeamOverride');
  }

  // ── Template Overrides ──────────────────────────────────────────────────────

  private mapTemplateOverride(row: Record<string, unknown>): TemplateOverride {
    return {
      id: row.id as string,
      template_version_id: row.template_version_id as string,
      criterion_version_id: row.criterion_version_id as string,
      override_config: (typeof row.override_config === 'string' ? JSON.parse(row.override_config) : row.override_config) as OverrideConfig,
      created_at: new Date(row.created_at as string),
      created_by: row.created_by ? (row.created_by as string) : undefined,
    };
  }

  async findTemplateOverrides(templateVersionId: string, client?: PoolClient): Promise<TemplateOverride[]> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM template_overrides WHERE template_version_id = $1 ORDER BY created_at DESC', [templateVersionId]);
    return res.rows.map((r) => this.mapTemplateOverride(r));
  }

  async findTemplateOverrideById(id: string, client?: PoolClient): Promise<TemplateOverride | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM template_overrides WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapTemplateOverride(res.rows[0]);
  }

  async createTemplateOverride(override: Partial<TemplateOverride>, client?: PoolClient): Promise<TemplateOverride> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO template_overrides (template_version_id, criterion_version_id, override_config, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        override.template_version_id,
        override.criterion_version_id,
        JSON.stringify(override.override_config || {}),
        override.created_by || null,
      ]
    );
    return this.mapTemplateOverride(res.rows[0]);
  }

  async updateTemplateOverride(id: string, override: Partial<TemplateOverride>, client?: PoolClient): Promise<TemplateOverride> {
    const runner = client || this.pool;
    const res = await runner.query(
      `UPDATE template_overrides
       SET override_config = COALESCE($1::jsonb, override_config)
       WHERE id = $2
       RETURNING *`,
      [
        override.override_config ? JSON.stringify(override.override_config) : null,
        id,
      ]
    );
    if (res.rows.length === 0) throw new NotFound('TemplateOverride');
    return this.mapTemplateOverride(res.rows[0]);
  }

  async deleteTemplateOverride(id: string, client?: PoolClient): Promise<void> {
    const runner = client || this.pool;
    const res = await runner.query('DELETE FROM template_overrides WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new NotFound('TemplateOverride');
  }
}
