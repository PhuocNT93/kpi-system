import { Pool } from 'pg';
import { IReportsRepository, EmployeeEvaluationScore, EmployeeKpiScore, TeamEvaluationAggregate, TeamKpiAggregate, OrganizationAggregate } from '../domain/reports.types.js';

export class PostgresReportsRepository implements IReportsRepository {
  constructor(private pool: Pool) {}

  async upsertEmployeeEvaluationScore(score: Partial<EmployeeEvaluationScore>): Promise<void> {
    const query = `
      INSERT INTO employee_evaluation_score_read_model (
        evaluation_id, evaluation_cycle_id, employee_id, team_id, role_id, job_level_id,
        cycle_status, evaluation_status, self_score, manager_score, final_score,
        is_locked, published_at, locked_at, last_refreshed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, current_timestamp
      )
      ON CONFLICT (evaluation_id) DO UPDATE SET
        cycle_status = EXCLUDED.cycle_status,
        evaluation_status = EXCLUDED.evaluation_status,
        self_score = EXCLUDED.self_score,
        manager_score = EXCLUDED.manager_score,
        final_score = EXCLUDED.final_score,
        is_locked = EXCLUDED.is_locked,
        published_at = EXCLUDED.published_at,
        locked_at = EXCLUDED.locked_at,
        last_refreshed_at = EXCLUDED.last_refreshed_at
    `;
    const params = [
      score.evaluation_id, score.evaluation_cycle_id, score.employee_id, score.team_id || null, score.role_id || null, score.job_level_id || null,
      score.cycle_status, score.evaluation_status, score.self_score || null, score.manager_score || null, score.final_score || null,
      score.is_locked || false, score.published_at || null, score.locked_at || null
    ];
    await this.pool.query(query, params);
  }

  async upsertEmployeeKpiScore(kpiScore: Partial<EmployeeKpiScore>): Promise<void> {
    const query = `
      INSERT INTO employee_kpi_score_read_model (
        evaluation_id, evaluation_cycle_id, employee_id, team_id, criterion_code, criterion_name,
        category, weight_snapshot, resolved_level, raw_score, weighted_score,
        is_disabled_for_employee, is_missing_score, kpi_score, kpi_weighted_score, last_refreshed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, current_timestamp
      )
      ON CONFLICT (evaluation_id, criterion_code) DO UPDATE SET
        resolved_level = EXCLUDED.resolved_level,
        raw_score = EXCLUDED.raw_score,
        weighted_score = EXCLUDED.weighted_score,
        is_disabled_for_employee = EXCLUDED.is_disabled_for_employee,
        is_missing_score = EXCLUDED.is_missing_score,
        kpi_score = EXCLUDED.kpi_score,
        kpi_weighted_score = EXCLUDED.kpi_weighted_score,
        last_refreshed_at = EXCLUDED.last_refreshed_at
    `;
    const params = [
      kpiScore.evaluation_id, kpiScore.evaluation_cycle_id, kpiScore.employee_id, kpiScore.team_id || null, kpiScore.criterion_code, kpiScore.criterion_name,
      kpiScore.category || null, kpiScore.weight_snapshot, kpiScore.resolved_level || null, kpiScore.raw_score || null, kpiScore.weighted_score || null,
      kpiScore.is_disabled_for_employee || false, kpiScore.is_missing_score || false, kpiScore.kpi_score || null, kpiScore.kpi_weighted_score || null
    ];
    await this.pool.query(query, params);
  }

  async upsertTeamEvaluationAggregate(agg: Partial<TeamEvaluationAggregate>): Promise<void> {
    const query = `
      INSERT INTO team_evaluation_aggregate_read_model (
        evaluation_cycle_id, team_id, team_average_score, employee_count, completed_employee_count,
        completion_rate, score_distribution, last_refreshed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, current_timestamp
      )
      ON CONFLICT (team_id, evaluation_cycle_id) DO UPDATE SET
        team_average_score = EXCLUDED.team_average_score,
        employee_count = EXCLUDED.employee_count,
        completed_employee_count = EXCLUDED.completed_employee_count,
        completion_rate = EXCLUDED.completion_rate,
        score_distribution = EXCLUDED.score_distribution,
        last_refreshed_at = EXCLUDED.last_refreshed_at
    `;
    const params = [
      agg.evaluation_cycle_id, agg.team_id, agg.team_average_score || null, agg.employee_count || 0, agg.completed_employee_count || 0,
      agg.completion_rate || null, agg.score_distribution || null
    ];
    await this.pool.query(query, params);
  }

  async upsertTeamKpiAggregate(agg: Partial<TeamKpiAggregate>): Promise<void> {
    const query = `
      INSERT INTO team_kpi_aggregate_read_model (
        evaluation_cycle_id, team_id, criterion_code, criterion_name, category,
        employee_count, completed_employee_count, kpi_score, kpi_weighted_score, last_refreshed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, current_timestamp
      )
      ON CONFLICT (team_id, evaluation_cycle_id, criterion_code) DO UPDATE SET
        employee_count = EXCLUDED.employee_count,
        completed_employee_count = EXCLUDED.completed_employee_count,
        kpi_score = EXCLUDED.kpi_score,
        kpi_weighted_score = EXCLUDED.kpi_weighted_score,
        last_refreshed_at = EXCLUDED.last_refreshed_at
    `;
    const params = [
      agg.evaluation_cycle_id, agg.team_id, agg.criterion_code, agg.criterion_name, agg.category || null,
      agg.employee_count || 0, agg.completed_employee_count || 0, agg.kpi_score || null, agg.kpi_weighted_score || null
    ];
    await this.pool.query(query, params);
  }

  async upsertOrganizationAggregate(_agg: Partial<OrganizationAggregate>): Promise<void> {
    // simplified for brevity. we might not need all logic unless specified
  }

  async clearCycleProjections(cycleId: string): Promise<void> {
    // Atomic clear inside transaction will be done by projection service using client
    // For now this deletes everything for a full rebuild
    await this.pool.query('DELETE FROM employee_kpi_score_read_model WHERE evaluation_cycle_id = $1', [cycleId]);
    await this.pool.query('DELETE FROM employee_evaluation_score_read_model WHERE evaluation_cycle_id = $1', [cycleId]);
    await this.pool.query('DELETE FROM team_kpi_aggregate_read_model WHERE evaluation_cycle_id = $1', [cycleId]);
    await this.pool.query('DELETE FROM team_evaluation_aggregate_read_model WHERE evaluation_cycle_id = $1', [cycleId]);
    await this.pool.query('DELETE FROM organization_aggregate_read_model WHERE evaluation_cycle_id = $1', [cycleId]);
  }

  async getEmployeeReport(employeeId: string, cycleId: string): Promise<{ score: EmployeeEvaluationScore; kpis: EmployeeKpiScore[] }> {
    const scoreRes = await this.pool.query('SELECT * FROM employee_evaluation_score_read_model WHERE employee_id = $1 AND evaluation_cycle_id = $2', [employeeId, cycleId]);
    const kpisRes = await this.pool.query('SELECT * FROM employee_kpi_score_read_model WHERE employee_id = $1 AND evaluation_cycle_id = $2', [employeeId, cycleId]);
    if (scoreRes.rows.length === 0) throw new Error('Report not found');
    return {
      score: scoreRes.rows[0],
      kpis: kpisRes.rows,
    };
  }

  async getTeamReport(teamId: string, cycleId: string): Promise<{ aggregate: TeamEvaluationAggregate; kpis: TeamKpiAggregate[] }> {
    const aggRes = await this.pool.query('SELECT * FROM team_evaluation_aggregate_read_model WHERE team_id = $1 AND evaluation_cycle_id = $2', [teamId, cycleId]);
    const kpisRes = await this.pool.query('SELECT * FROM team_kpi_aggregate_read_model WHERE team_id = $1 AND evaluation_cycle_id = $2', [teamId, cycleId]);
    if (aggRes.rows.length === 0) throw new Error('Report not found');
    return {
      aggregate: aggRes.rows[0],
      kpis: kpisRes.rows,
    };
  }

  async getTeamKpiReport(teamId: string, cycleId: string): Promise<TeamKpiAggregate[]> {
    const kpisRes = await this.pool.query('SELECT * FROM team_kpi_aggregate_read_model WHERE team_id = $1 AND evaluation_cycle_id = $2', [teamId, cycleId]);
    return kpisRes.rows;
  }

  async getOrganizationReport(cycleId: string): Promise<OrganizationAggregate[]> {
    const res = await this.pool.query('SELECT * FROM organization_aggregate_read_model WHERE evaluation_cycle_id = $1', [cycleId]);
    return res.rows;
  }
}

