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
        is_disabled_for_employee, is_missing_score, kpi_score, kpi_weighted_score,
        has_evidence, evidence_count, comment, evaluation_item_id, display_order, measurement, last_refreshed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, current_timestamp
      )
      ON CONFLICT (evaluation_id, criterion_code) DO UPDATE SET
        resolved_level = EXCLUDED.resolved_level,
        raw_score = EXCLUDED.raw_score,
        weighted_score = EXCLUDED.weighted_score,
        is_disabled_for_employee = EXCLUDED.is_disabled_for_employee,
        is_missing_score = EXCLUDED.is_missing_score,
        kpi_score = EXCLUDED.kpi_score,
        kpi_weighted_score = EXCLUDED.kpi_weighted_score,
        has_evidence = EXCLUDED.has_evidence,
        evidence_count = EXCLUDED.evidence_count,
        comment = EXCLUDED.comment,
        evaluation_item_id = COALESCE(EXCLUDED.evaluation_item_id, employee_kpi_score_read_model.evaluation_item_id),
        display_order = EXCLUDED.display_order,
        measurement = COALESCE(EXCLUDED.measurement, employee_kpi_score_read_model.measurement),
        last_refreshed_at = EXCLUDED.last_refreshed_at
    `;
    const params = [
      kpiScore.evaluation_id, kpiScore.evaluation_cycle_id, kpiScore.employee_id, kpiScore.team_id || null, kpiScore.criterion_code, kpiScore.criterion_name,
      kpiScore.category || null, kpiScore.weight_snapshot, kpiScore.resolved_level || null, kpiScore.raw_score || null, kpiScore.weighted_score || null,
      kpiScore.is_disabled_for_employee || false, kpiScore.is_missing_score || false, kpiScore.kpi_score || null, kpiScore.kpi_weighted_score || null,
      kpiScore.has_evidence ?? false, kpiScore.evidence_count ?? 0, kpiScore.comment || null,
      kpiScore.evaluation_item_id || null, kpiScore.display_order ?? 0, kpiScore.measurement ? JSON.stringify(kpiScore.measurement) : null
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

  async upsertOrganizationAggregate(agg: Partial<OrganizationAggregate>): Promise<void> {
    const existing = await this.pool.query(
      `SELECT id FROM organization_aggregate_read_model 
       WHERE evaluation_cycle_id = $1 
         AND department_id IS NOT DISTINCT FROM $2 
         AND team_id IS NOT DISTINCT FROM $3 LIMIT 1`,
      [agg.evaluation_cycle_id, agg.department_id || null, agg.team_id || null]
    );

    if (existing.rows.length > 0) {
      const query = `
        UPDATE organization_aggregate_read_model SET
          employee_count = $1,
          completed_employee_count = $2,
          completion_rate = $3,
          average_score = $4,
          score_distribution = $5,
          last_refreshed_at = current_timestamp
        WHERE id = $6
      `;
      await this.pool.query(query, [
        agg.employee_count || 0,
        agg.completed_employee_count || 0,
        agg.completion_rate != null ? agg.completion_rate : null,
        agg.average_score != null ? agg.average_score : null,
        agg.score_distribution ? JSON.stringify(agg.score_distribution) : null,
        existing.rows[0].id
      ]);
    } else {
      const query = `
        INSERT INTO organization_aggregate_read_model (
          id, evaluation_cycle_id, department_id, team_id,
          employee_count, completed_employee_count, completion_rate,
          average_score, score_distribution, last_refreshed_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, current_timestamp
        )
      `;
      await this.pool.query(query, [
        agg.evaluation_cycle_id,
        agg.department_id || null,
        agg.team_id || null,
        agg.employee_count || 0,
        agg.completed_employee_count || 0,
        agg.completion_rate != null ? agg.completion_rate : null,
        agg.average_score != null ? agg.average_score : null,
        agg.score_distribution ? JSON.stringify(agg.score_distribution) : null
      ]);
    }
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

  async getEmployeeKpiSummary(
    employeeId: string,
    cycleId?: string,
    status?: string
  ): Promise<{ score: EmployeeEvaluationScore; kpis: EmployeeKpiScore[] } | null> {
    let scoreQuery = `
      SELECT * FROM employee_evaluation_score_read_model
      WHERE employee_id = $1
    `;
    const scoreParams: (string | undefined)[] = [employeeId];
    if (cycleId) {
      scoreParams.push(cycleId);
      scoreQuery += ` AND evaluation_cycle_id = $${scoreParams.length}`;
    }
    if (status) {
      scoreParams.push(status);
      scoreQuery += ` AND evaluation_status = $${scoreParams.length}`;
    }
    scoreQuery += ` ORDER BY last_refreshed_at DESC LIMIT 1`;

    const scoreRes = await this.pool.query(scoreQuery, scoreParams);
    if (scoreRes.rows.length === 0) return null;

    const score = scoreRes.rows[0];
    const kpisRes = await this.pool.query(
      `SELECT * FROM employee_kpi_score_read_model
       WHERE evaluation_id = $1
       ORDER BY display_order ASC, criterion_code ASC`,
      [score.evaluation_id]
    );

    return {
      score,
      kpis: kpisRes.rows,
    };
  }

  async getEmployeeKpiDetail(
    employeeId: string,
    evaluationItemId: string
  ): Promise<{ item: Record<string, unknown>; evidence: Record<string, unknown>[] } | null> {
    const itemRes = await this.pool.query(
      `SELECT ei.*, e.employee_id, e.evaluation_cycle_id, e.status as evaluation_status
       FROM evaluation_item ei
       JOIN evaluation e ON ei.evaluation_id = e.evaluation_id
       WHERE ei.evaluation_item_id = $1 AND e.employee_id = $2`,
      [evaluationItemId, employeeId]
    );
    if (itemRes.rows.length === 0) return null;

    const item = itemRes.rows[0];
    const evidenceRes = await this.pool.query(
      `SELECT evidence_id, evaluation_item_id, evidence_type, title, evidence_url, file_reference,
              evidence_value, rationale, source, created_at, created_by
       FROM evidence
       WHERE evaluation_item_id = $1 AND status != 'SUPERSEDED'
       ORDER BY created_at ASC`,
      [evaluationItemId]
    );

    return {
      item,
      evidence: evidenceRes.rows,
    };
  }
}

