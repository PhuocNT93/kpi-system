import { Pool } from 'pg';
import { TeamEvaluationFormula, FormulaComponent, RankThresholdConfig, DEFAULT_RANK_MATRIX } from '../domain/formula.types.js';

export interface UpsertFormulaParams {
  teamId?: string | null;
  departmentId?: string | null;
  isCustomOverride?: boolean;
  scaleMax?: number;
  components: FormulaComponent[];
  rankMatrix?: Record<'S' | 'A' | 'B', RankThresholdConfig>;
}

export class PostgresFormulaRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): TeamEvaluationFormula {
    return {
      id: row.id as string,
      team_id: (row.team_id as string | null) ?? null,
      department_id: (row.department_id as string | null) ?? null,
      is_custom_override: Boolean(row.is_custom_override),
      scale_max: Number(row.scale_max ?? 5.0),
      components: (typeof row.components === 'string' ? JSON.parse(row.components) : row.components) as FormulaComponent[],
      rank_matrix: row.rank_matrix
        ? ((typeof row.rank_matrix === 'string' ? JSON.parse(row.rank_matrix) : row.rank_matrix) as Record<'S' | 'A' | 'B', RankThresholdConfig>)
        : DEFAULT_RANK_MATRIX,
      version: Number(row.version ?? 1),
      created_at: row.created_at ? new Date(row.created_at as string | number | Date) : undefined,
      updated_at: row.updated_at ? new Date(row.updated_at as string | number | Date) : undefined,
    };
  }

  async getGlobalFormula(): Promise<TeamEvaluationFormula> {
    const res = await this.pool.query(
      `SELECT * FROM team_evaluation_formula WHERE team_id IS NULL AND department_id IS NULL LIMIT 1`
    );
    if (res.rows.length === 0) {
      const insertRes = await this.pool.query(
        `INSERT INTO team_evaluation_formula (team_id, department_id, is_custom_override, scale_max)
         VALUES (NULL, NULL, FALSE, 5.0)
         RETURNING *`
      );
      return this.mapRow(insertRes.rows[0]);
    }
    return this.mapRow(res.rows[0]);
  }

  async findByDepartmentId(departmentId: string): Promise<TeamEvaluationFormula | null> {
    const res = await this.pool.query(
      `SELECT * FROM team_evaluation_formula WHERE department_id = $1 AND team_id IS NULL LIMIT 1`,
      [departmentId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByTeamId(teamId: string): Promise<TeamEvaluationFormula | null> {
    const res = await this.pool.query(
      `SELECT * FROM team_evaluation_formula WHERE team_id = $1 LIMIT 1`,
      [teamId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findTeamDepartmentInfo(teamId: string): Promise<{ department_id: string; department_name: string } | null> {
    const res = await this.pool.query(
      `SELECT t.department_id, d.name as department_name
       FROM team t
       LEFT JOIN department d ON t.department_id = d.department_id
       WHERE t.team_id = $1 LIMIT 1`,
      [teamId]
    );
    if (res.rows.length === 0 || !res.rows[0].department_id) return null;
    return {
      department_id: res.rows[0].department_id,
      department_name: res.rows[0].department_name || '',
    };
  }

  async upsertFormula(params: UpsertFormulaParams): Promise<TeamEvaluationFormula> {
    const teamId = params.teamId || null;
    const departmentId = params.departmentId || null;
    const isCustomOverride = params.isCustomOverride ?? (teamId !== null || departmentId !== null);
    const scaleMax = params.scaleMax ?? 5.0;
    const componentsJson = JSON.stringify(params.components);

    if (teamId !== null) {
      // 1. Team-level formula
      const res = await this.pool.query(
        `INSERT INTO team_evaluation_formula (team_id, department_id, is_custom_override, scale_max, components, version, updated_at)
         VALUES ($1, NULL, $2, $3, $4::jsonb, 1, NOW())
         ON CONFLICT (team_id) WHERE team_id IS NOT NULL
         DO UPDATE SET
           is_custom_override = EXCLUDED.is_custom_override,
           scale_max = EXCLUDED.scale_max,
           components = EXCLUDED.components,
           version = team_evaluation_formula.version + 1,
           updated_at = NOW()
         RETURNING *`,
        [teamId, isCustomOverride, scaleMax, componentsJson]
      );
      return this.mapRow(res.rows[0]);
    } else if (departmentId !== null) {
      // 2. Department-level formula
      const res = await this.pool.query(
        `INSERT INTO team_evaluation_formula (team_id, department_id, is_custom_override, scale_max, components, version, updated_at)
         VALUES (NULL, $1, $2, $3, $4::jsonb, 1, NOW())
         ON CONFLICT (department_id) WHERE department_id IS NOT NULL AND team_id IS NULL
         DO UPDATE SET
           is_custom_override = EXCLUDED.is_custom_override,
           scale_max = EXCLUDED.scale_max,
           components = EXCLUDED.components,
           version = team_evaluation_formula.version + 1,
           updated_at = NOW()
         RETURNING *`,
        [departmentId, isCustomOverride, scaleMax, componentsJson]
      );
      return this.mapRow(res.rows[0]);
    } else {
      // 3. Global formula
      const res = await this.pool.query(
        `INSERT INTO team_evaluation_formula (team_id, department_id, is_custom_override, scale_max, components, version, updated_at)
         VALUES (NULL, NULL, FALSE, $1, $2::jsonb, 1, NOW())
         ON CONFLICT ((team_id IS NULL AND department_id IS NULL)) WHERE team_id IS NULL AND department_id IS NULL
         DO UPDATE SET
           scale_max = EXCLUDED.scale_max,
           components = EXCLUDED.components,
           version = team_evaluation_formula.version + 1,
           updated_at = NOW()
         RETURNING *`,
        [scaleMax, componentsJson]
      );
      return this.mapRow(res.rows[0]);
    }
  }

  async resetTeamFormula(teamId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM team_evaluation_formula WHERE team_id = $1`,
      [teamId]
    );
  }

  async resetDepartmentFormula(departmentId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM team_evaluation_formula WHERE department_id = $1 AND team_id IS NULL`,
      [departmentId]
    );
  }

  async getAllFormulasSummary(): Promise<Array<{
    team_id: string | null;
    department_id: string | null;
    is_custom_override: boolean;
    level: 'TEAM' | 'DEPARTMENT' | 'GLOBAL';
    updated_at?: Date;
  }>> {
    const res = await this.pool.query(
      `SELECT team_id, department_id, is_custom_override, updated_at FROM team_evaluation_formula`
    );
    return res.rows.map(r => ({
      team_id: r.team_id,
      department_id: r.department_id,
      is_custom_override: Boolean(r.is_custom_override),
      level: r.team_id ? 'TEAM' : r.department_id ? 'DEPARTMENT' : 'GLOBAL',
      updated_at: r.updated_at ? new Date(r.updated_at) : undefined,
    }));
  }
}
