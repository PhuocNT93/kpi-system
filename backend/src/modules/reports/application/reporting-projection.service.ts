import { Pool } from 'pg';
import { IReportsRepository } from '../domain/reports.types.js';
import { appEventEmitter, AppEvent } from '../../../shared/events/index.js';
import { IEvaluationRepository, IEvaluationItemRepository } from '../../evaluation/domain/repositories.interface.js';

export class ReportingProjectionService {
  constructor(
    private pool: Pool,
    private reportsRepo: IReportsRepository,
    private evaluationRepo: IEvaluationRepository,
    private evaluationItemRepo: IEvaluationItemRepository
  ) {}

  public init() {
    appEventEmitter.on(AppEvent.EVALUATION_UPDATED, async (data: { evaluationId: string }) => {
      try {
        await this.refreshEvaluation(data.evaluationId);
      } catch (err) {
        console.error('Failed to sync reporting projection for evaluation:', data.evaluationId, err);
      }
    });

    appEventEmitter.on(AppEvent.CYCLE_LOCKED, async (data: { cycleId: string }) => {
      try {
        await this.refreshAllForLockedCycle(data.cycleId);
      } catch (err) {
        console.error('Failed to batch refresh reporting projection for cycle:', data.cycleId, err);
      }
    });
  }

  public async refreshEvaluation(evaluationId: string): Promise<void> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) return;

    // 1. Upsert Employee Evaluation Score
    await this.reportsRepo.upsertEmployeeEvaluationScore({
      evaluation_id: evaluation.evaluation_id,
      evaluation_cycle_id: evaluation.evaluation_cycle_id,
      employee_id: evaluation.employee_id,
      team_id: evaluation.team_id_snapshot,
      role_id: evaluation.role_id_snapshot,
      job_level_id: evaluation.job_level_snapshot,
      cycle_status: 'OPEN', // In a real implementation, we'd fetch cycle status
      evaluation_status: evaluation.status,
      self_score: evaluation.self_score,
      manager_score: evaluation.manager_score,
      final_score: evaluation.final_score,
      is_locked: evaluation.is_locked,
      published_at: evaluation.published_at,
      locked_at: evaluation.locked_at,
    });

    // 2. Upsert KPI Scores
    const items = await this.evaluationItemRepo.findByEvaluationId(evaluationId);
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (!item) continue;
      const evRes = await this.pool.query(
        `SELECT COUNT(*)::int as count FROM evidence WHERE evaluation_item_id = $1 AND status = 'ACTIVE'`,
        [item.evaluation_item_id]
      );
      const evidenceCount = evRes.rows[0]?.count || 0;

      // Query display order from template_criteria or template_criterion if available
      let displayOrder = idx + 1;
      if (item.template_criterion_id) {
        const orderRes = await this.pool.query(
          `SELECT COALESCE(
             (SELECT display_order FROM template_criteria WHERE id = $1 LIMIT 1),
             (SELECT display_order FROM template_criterion WHERE template_criterion_id = $1 LIMIT 1),
             $2
           ) as order_num`,
          [item.template_criterion_id, idx + 1]
        );
        if (orderRes.rows.length > 0 && orderRes.rows[0].order_num != null) {
          displayOrder = Number(orderRes.rows[0].order_num);
        }
      }

      await this.reportsRepo.upsertEmployeeKpiScore({
        evaluation_id: evaluation.evaluation_id,
        evaluation_cycle_id: evaluation.evaluation_cycle_id,
        employee_id: evaluation.employee_id,
        team_id: evaluation.team_id_snapshot,
        criterion_code: item.criterion_code_snapshot,
        criterion_name: item.criterion_name_snapshot,
        weight_snapshot: item.weight_snapshot,
        resolved_level: item.resolved_level ?? undefined,
        raw_score: item.raw_score ?? undefined,
        weighted_score: item.weighted_score ?? undefined,
        is_disabled_for_employee: item.is_disabled_for_employee,
        is_missing_score: item.is_missing_score,
        kpi_score: item.raw_score ?? undefined, // Maps raw to kpi score
        kpi_weighted_score: item.weighted_score ?? undefined,
        has_evidence: evidenceCount > 0,
        evidence_count: evidenceCount,
        comment: item.comment || null,
        evaluation_item_id: item.evaluation_item_id,
        display_order: displayOrder,
        measurement: {
          value: item.measurement_value ?? null,
          unit: item.measurement_unit ?? null,
          source_label: item.system_source || (item.source_snapshot as Record<string, unknown> | null)?.source_name as string || null,
        },
      });
    }

    // 3. Refresh Team Aggregates implicitly (in a fully optimized system this would be async or grouped)
    if (evaluation.team_id_snapshot) {
      await this.refreshTeam(evaluation.evaluation_cycle_id, evaluation.team_id_snapshot);
    }

    // 4. Refresh Organization Aggregates
    await this.refreshOrganization(evaluation.evaluation_cycle_id);
  }

  public async refreshOrganization(evaluationCycleId: string): Promise<void> {
    const query = `
      SELECT 
        COUNT(*) as employee_count,
        SUM(CASE WHEN evaluation_status IN ('APPROVED', 'PUBLISHED', 'LOCKED') THEN 1 ELSE 0 END) as completed_count,
        AVG(CASE WHEN evaluation_status IN ('APPROVED', 'PUBLISHED', 'LOCKED') THEN final_score ELSE NULL END) as avg_score
      FROM employee_evaluation_score_read_model
      WHERE evaluation_cycle_id = $1
    `;
    const res = await this.pool.query(query, [evaluationCycleId]);
    const row = res.rows[0];
    const count = parseInt(row?.employee_count || '0', 10);
    const completed = parseInt(row?.completed_count || '0', 10);
    const rate = count > 0 ? (completed / count) * 100 : 0;

    if (typeof this.reportsRepo.upsertOrganizationAggregate === 'function') {
      await this.reportsRepo.upsertOrganizationAggregate({
        evaluation_cycle_id: evaluationCycleId,
        employee_count: count,
        completed_employee_count: completed,
        completion_rate: rate,
        average_score: row?.avg_score != null ? parseFloat(row.avg_score) : undefined,
      });
    }
  }

  public async refreshTeam(evaluationCycleId: string, teamId: string): Promise<void> {
    // This aggregates over the newly populated employee read models for this team
    const query = `
      SELECT 
        COUNT(*) as employee_count,
        SUM(CASE WHEN evaluation_status IN ('APPROVED', 'PUBLISHED', 'LOCKED') THEN 1 ELSE 0 END) as completed_count,
        AVG(CASE WHEN evaluation_status IN ('APPROVED', 'PUBLISHED', 'LOCKED') THEN final_score ELSE NULL END) as avg_score
      FROM employee_evaluation_score_read_model
      WHERE team_id = $1 AND evaluation_cycle_id = $2
    `;
    const res = await this.pool.query(query, [teamId, evaluationCycleId]);
    const row = res.rows[0];

    const count = parseInt(row?.employee_count || '0', 10);
    const completed = parseInt(row?.completed_count || '0', 10);
    const rate = count > 0 ? (completed / count) * 100 : 0;
    
    await this.reportsRepo.upsertTeamEvaluationAggregate({
      evaluation_cycle_id: evaluationCycleId,
      team_id: teamId,
      employee_count: count,
      completed_employee_count: completed,
      completion_rate: rate,
      team_average_score: row?.avg_score != null ? parseFloat(row.avg_score) : undefined,
    });

    // KPI aggregates
    const kpiQuery = `
      SELECT 
        criterion_code, MAX(criterion_name) as criterion_name,
        COUNT(*) as employee_count,
        SUM(CASE WHEN resolved_level IS NOT NULL THEN 1 ELSE 0 END) as completed_count,
        AVG(kpi_score) as avg_kpi_score,
        AVG(kpi_weighted_score) as avg_weighted_score
      FROM employee_kpi_score_read_model
      WHERE team_id = $1 AND evaluation_cycle_id = $2 AND is_disabled_for_employee = false
      GROUP BY criterion_code
    `;
    const kpiRes = await this.pool.query(kpiQuery, [teamId, evaluationCycleId]);
    for (const krow of kpiRes.rows) {
      await this.reportsRepo.upsertTeamKpiAggregate({
        evaluation_cycle_id: evaluationCycleId,
        team_id: teamId,
        criterion_code: krow.criterion_code,
        criterion_name: krow.criterion_name,
        employee_count: parseInt(krow.employee_count, 10),
        completed_employee_count: parseInt(krow.completed_count, 10),
        kpi_score: krow.avg_kpi_score != null ? parseFloat(krow.avg_kpi_score) : undefined,
        kpi_weighted_score: krow.avg_weighted_score != null ? parseFloat(krow.avg_weighted_score) : undefined,
      });
    }
  }

  public async refreshAllForCycle(evaluationCycleId: string): Promise<void> {
    const res = await this.pool.query('SELECT evaluation_id FROM evaluation WHERE evaluation_cycle_id = $1', [evaluationCycleId]);
    for (const row of res.rows) {
      await this.refreshEvaluation(row.evaluation_id);
    }
    await this.refreshOrganization(evaluationCycleId);
  }

  public async refreshAllForLockedCycle(evaluationCycleId: string): Promise<void> {
    await this.refreshAllForCycle(evaluationCycleId);
  }

  public async syncAll(): Promise<void> {
    const res = await this.pool.query('SELECT DISTINCT evaluation_cycle_id FROM evaluation');
    for (const row of res.rows) {
      await this.refreshAllForCycle(row.evaluation_cycle_id);
    }
  }
}
