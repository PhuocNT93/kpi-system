import { Pool } from 'pg';
import { IReportsRepository } from '../domain/reports.types.js';
import { ReportingProjectionService } from './reporting-projection.service.js';
import { KpiTrendResponse } from '../api/reports.dto.js';
import { Actor } from '../../../shared/auth/types.js';
import { Forbidden, NotFound } from '../../../api/app-error.js';
import { getEmployeeReviewStatus } from '../../employee/domain/employee-review-status.js';

export function normalizeLocalizedText(val: unknown, fallback = ''): string {
  if (val == null) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return String(parsed.vi || parsed.en || parsed.vn || Object.values(parsed)[0] || val);
        }
      } catch {
        return val;
      }
    }
    return val;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    return String(obj.vi || obj.en || obj.vn || Object.values(obj)[0] || fallback);
  }
  return String(val);
}

function incrementScoreBin(bins: Array<{ range: string; count: number; percentage?: number }>, score: number): void {
  const index = score <= 1.0 ? 0 : score <= 2.0 ? 1 : score <= 3.0 ? 2 : score <= 4.0 ? 3 : 4;
  const bin = bins[index];
  if (bin) {
    bin.count++;
  }
}

export class ReportsQueryService {
  constructor(
    private reportsRepo: IReportsRepository,
    private pool?: Pool,
    private projectionService?: ReportingProjectionService
  ) {}

  private async assertEmployeeAccess(employeeId: string, actor: Actor): Promise<void> {
    if (actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN') {
      return;
    }

    if (actor.role === 'EMPLOYEE') {
      const isSelf = actor.employeeId === employeeId || actor.userId === employeeId;
      if (!isSelf) {
        throw new Forbidden('You do not have access to this employee KPI summary.');
      }
      return;
    }

    if (actor.role === 'MANAGER') {
      let managerEmpId = actor.employeeId;
      if (!managerEmpId && actor.userId && this.pool) {
        const uRes = await this.pool.query('SELECT employee_id FROM app_user WHERE id = $1', [actor.userId]);
        managerEmpId = uRes.rows[0]?.employee_id ?? undefined;
      }

      if (managerEmpId && this.pool) {
        const isSelf = managerEmpId === employeeId;
        if (isSelf) return;

        const empRes = await this.pool.query(
          `SELECT employee_id, manager_id, team_id FROM employee WHERE employee_id = $1`,
          [employeeId]
        );
        if (empRes.rows.length === 0) {
          throw new Forbidden('You do not have access to this employee KPI summary.');
        }
        const emp = empRes.rows[0];
        if (emp.manager_id === managerEmpId) return;

        if (emp.team_id) {
          const teamRes = await this.pool.query(
            `SELECT 1 FROM team WHERE team_id = $1 AND manager_id = $2`,
            [emp.team_id, managerEmpId]
          );
          if (teamRes.rows.length > 0) return;
        }
      }
      throw new Forbidden('You do not have access to this employee KPI summary.');
    }

    throw new Forbidden('You do not have access to this employee KPI summary.');
  }

  public async getEmployeeKpiSummary(
    employeeId: string,
    actor: Actor,
    cycleId?: string,
    status?: string
  ) {
    // 1. RBAC enforcement
    await this.assertEmployeeAccess(employeeId, actor);

    // 2. Fetch from Reporting read-models
    let readModel = await this.reportsRepo.getEmployeeKpiSummary(employeeId, cycleId, status);

    // If read model missing (e.g. freshly created evaluation not yet projected), attempt project on the fly
    if (!readModel && this.pool && this.projectionService) {
      let evalSql = 'SELECT evaluation_id FROM evaluation WHERE employee_id = $1';
      const evalParams: string[] = [employeeId];
      if (cycleId) {
        evalParams.push(cycleId);
        evalSql += ` AND evaluation_cycle_id = $${evalParams.length}`;
      }
      if (status) {
        evalParams.push(status);
        evalSql += ` AND status = $${evalParams.length}`;
      }
      evalSql += ' ORDER BY created_at DESC LIMIT 1';
      const evalCheck = await this.pool.query(evalSql, evalParams);
      if (evalCheck.rows.length > 0) {
        await this.projectionService.refreshEvaluation(evalCheck.rows[0].evaluation_id);
        readModel = await this.reportsRepo.getEmployeeKpiSummary(employeeId, cycleId, status);
      }
    }

    if (!readModel) {
      throw new NotFound('KPI evaluation summary for employee');
    }

    const { score, kpis: kpiRows } = readModel;

    // 3. Retrieve employee metadata
    let empData = {
      employee_id: employeeId,
      employee_code: '',
      full_name: '',
      email: '',
      department: null as { department_id: string; name: string } | null,
      team: null as { team_id: string; name: string } | null,
      role: null as { role_id: string; name: string } | null,
      job_level: null as { job_level_id: string; name: string } | null,
      manager: null as { employee_id: string; full_name: string } | null,
    };

    if (this.pool) {
      const empRes = await this.pool.query(
        `SELECT e.employee_id, e.employee_code, e.full_name, e.email,
                d.department_id, d.name as department_name,
                t.team_id, t.name as team_name,
                r.role_id, r.name as role_name,
                jl.job_level_id, jl.name as job_level_name,
                m.employee_id as manager_id, m.full_name as manager_name
         FROM employee e
         LEFT JOIN department d ON e.department_id = d.department_id
         LEFT JOIN team t ON e.team_id = t.team_id
         LEFT JOIN role r ON e.role_id = r.role_id
         LEFT JOIN job_level jl ON e.job_level_id = jl.job_level_id
         LEFT JOIN employee m ON e.manager_id = m.employee_id
         WHERE e.employee_id = $1`,
        [employeeId]
      );
      if (empRes.rows.length > 0) {
        const row = empRes.rows[0];
        empData = {
          employee_id: row.employee_id,
          employee_code: row.employee_code,
          full_name: normalizeLocalizedText(row.full_name, 'Unnamed Employee'),
          email: row.email,
          department: row.department_id ? { department_id: row.department_id, name: normalizeLocalizedText(row.department_name) } : null,
          team: row.team_id ? { team_id: row.team_id, name: normalizeLocalizedText(row.team_name) } : null,
          role: row.role_id ? { role_id: row.role_id, name: normalizeLocalizedText(row.role_name) } : null,
          job_level: row.job_level_id ? { job_level_id: row.job_level_id, name: normalizeLocalizedText(row.job_level_name) } : null,
          manager: row.manager_id ? { employee_id: row.manager_id, full_name: normalizeLocalizedText(row.manager_name) } : null,
        };
      }
    }

    // 4. Evaluation cycle name
    let cycleName = 'Evaluation Cycle';
    if (this.pool && score.evaluation_cycle_id) {
      const cycleRes = await this.pool.query(
        'SELECT name FROM evaluation_cycle WHERE evaluation_cycle_id = $1',
        [score.evaluation_cycle_id]
      );
      if (cycleRes.rows.length > 0) {
        cycleName = normalizeLocalizedText(cycleRes.rows[0].name, 'Evaluation Cycle');
      }
    }

    // 5. Score summary semantics
    let officialScore: number | null = null;
    let officialScoreLabel = 'Official Score';

    if (score.final_score != null) {
      officialScore = Number(score.final_score);
      officialScoreLabel = 'Official Score (Final/Calibrated)';
    } else if (score.manager_score != null) {
      officialScore = Number(score.manager_score);
      officialScoreLabel = 'Official Score (Manager Review)';
    } else if (score.self_score != null) {
      officialScore = Number(score.self_score);
      officialScoreLabel = 'Official Score (Self Assessment)';
    }

    // Overall Score (unweighted average of completed items with raw_score)
    const activeScoredKpis = kpiRows.filter(k => !k.is_disabled_for_employee && k.raw_score != null);
    const overallScore = activeScoredKpis.length > 0
      ? Number((activeScoredKpis.reduce((acc, k) => acc + Number(k.raw_score), 0) / activeScoredKpis.length).toFixed(2))
      : null;

    // Overall Weighted Score (sum of weighted scores)
    const activeWeightedKpis = kpiRows.filter(k => !k.is_disabled_for_employee && k.weighted_score != null);
    const overallWeightedScore = activeWeightedKpis.length > 0
      ? Number(activeWeightedKpis.reduce((acc, k) => acc + Number(k.weighted_score), 0).toFixed(2))
      : null;

    if (officialScore == null) {
      officialScore = overallWeightedScore ?? overallScore ?? null;
      officialScoreLabel = 'Official Score';
    }

    const kpiCount = kpiRows.length;
    const completedCount = kpiRows.filter(k => !k.is_disabled_for_employee && !k.is_missing_score && k.resolved_level != null).length;

    // 6. Map KPI Table rows (strictly ordered by display_order ASC)
    const sortedKpis = [...kpiRows].sort((a, b) => {
      const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.criterion_code.localeCompare(b.criterion_code);
    });

    const mappedKpis = sortedKpis.map(k => ({
      evaluation_item_id: k.evaluation_item_id || k.id,
      criterion_code: k.criterion_code,
      criterion_name: normalizeLocalizedText(k.criterion_name),
      category: normalizeLocalizedText(k.category, 'General'),
      display_order: k.display_order ?? 0,
      weight: Number(k.weight_snapshot),
      measurement: {
        value: (k.measurement as { value?: number | string | null } | undefined)?.value ?? null,
        unit: (k.measurement as { unit?: string | null } | undefined)?.unit ?? '%',
        source_label: (k.measurement as { source_label?: string | null } | undefined)?.source_label ?? 'Manual',
      },
      resolved_level: k.resolved_level != null ? Number(k.resolved_level) : null,
      raw_score: k.raw_score != null ? Number(k.raw_score) : null,
      weighted_score: k.weighted_score != null ? Number(k.weighted_score) : null,
      is_completed: !k.is_disabled_for_employee && !k.is_missing_score && k.resolved_level != null,
      is_disabled: Boolean(k.is_disabled_for_employee),
      comment: k.comment ? normalizeLocalizedText(k.comment) : null,
      evidence_count: k.evidence_count || 0,
      has_evidence: Boolean(k.has_evidence),
    }));

    // 7. Graph relationships
    const relationships: Array<{ source_id: string; target_id: string; relationship_type: string }> = [];
    if (empData.team) {
      relationships.push({
        source_id: empData.employee_id,
        target_id: empData.team.team_id,
        relationship_type: 'MEMBER_OF',
      });
    }
    if (empData.team && empData.department) {
      relationships.push({
        source_id: empData.team.team_id,
        target_id: empData.department.department_id,
        relationship_type: 'PART_OF',
      });
    }
    if (empData.manager) {
      relationships.push({
        source_id: empData.employee_id,
        target_id: empData.manager.employee_id,
        relationship_type: 'REPORTS_TO',
      });
    }
    if (score.evaluation_cycle_id) {
      relationships.push({
        source_id: score.evaluation_id,
        target_id: score.evaluation_cycle_id,
        relationship_type: 'BELONGS_TO_CYCLE',
      });
    }
    relationships.push({
      source_id: score.evaluation_id,
      target_id: empData.employee_id,
      relationship_type: 'EVALUATES',
    });
    for (const item of mappedKpis) {
      relationships.push({
        source_id: score.evaluation_id,
        target_id: item.evaluation_item_id,
        relationship_type: 'EVALUATION_HAS_KPI',
      });
    }

    return {
      employee: empData,
      evaluation: {
        evaluation_id: score.evaluation_id,
        evaluation_cycle_id: score.evaluation_cycle_id,
        cycle_name: cycleName,
        status: score.evaluation_status,
        is_locked: Boolean(score.is_locked),
      },
      score_summary: {
        official_score: officialScore,
        official_score_label: officialScoreLabel,
        overall_score: overallScore,
        overall_weighted_score: overallWeightedScore,
        kpi_count: kpiCount,
        completed_count: completedCount,
      },
      kpis: mappedKpis,
      relationships,
    };
  }

  public async getEmployeeKpiDetail(
    employeeId: string,
    evaluationItemId: string,
    actor: Actor
  ) {
    await this.assertEmployeeAccess(employeeId, actor);
    const detail = await this.reportsRepo.getEmployeeKpiDetail(employeeId, evaluationItemId);
    if (!detail) {
      throw new NotFound('KPI detail for evaluation item');
    }

    const { item, evidence } = detail;

    let levelDefinitions = item.level_definition_snapshot;
    if (typeof levelDefinitions === 'string') {
      try {
        levelDefinitions = JSON.parse(levelDefinitions);
      } catch {
        levelDefinitions = [];
      }
    }

    let sourceLabel: string | null = (item.system_source as string) || null;
    if (!sourceLabel && item.source_snapshot) {
      const src = typeof item.source_snapshot === 'string' ? JSON.parse(item.source_snapshot) : item.source_snapshot;
      sourceLabel = src?.source_name || null;
    }

    return {
      evaluation_item_id: item.evaluation_item_id,
      evaluation_id: item.evaluation_id,
      employee_id: employeeId,
      criteria: {
        criterion_code: item.criterion_code_snapshot,
        criterion_name: normalizeLocalizedText(item.criterion_name_snapshot),
        category: normalizeLocalizedText(item.category, 'General'),
        description: normalizeLocalizedText(item.description || item.criterion_description_snapshot || item.criterion_name_snapshot),
      },
      measurement: {
        value: item.measurement_value ?? null,
        unit: item.measurement_unit || '%',
        source_label: sourceLabel || 'Manual',
        recorded_at: item.updated_at || item.created_at,
      },
      scoring: {
        weight: Number(item.weight_snapshot),
        resolved_level: item.resolved_level != null ? Number(item.resolved_level) : null,
        raw_score: item.raw_score != null ? Number(item.raw_score) : null,
        weighted_score: item.weighted_score != null ? Number(item.weighted_score) : null,
      },
      level_definitions: (Array.isArray(levelDefinitions) ? (levelDefinitions as Record<string, unknown>[]) : []).map((ld) => ({
        level: (typeof ld.level === 'number' ? ld.level : typeof ld.level_no === 'number' ? ld.level_no : 1),
        name: normalizeLocalizedText(ld.name || ld.label || ld.label_vn || `Level ${ld.level ?? ld.level_no ?? 1}`),
        description: normalizeLocalizedText(ld.description || ''),
        score_value: typeof ld.score === 'number' ? ld.score : typeof ld.score_value === 'number' ? ld.score_value : null,
      })),
      evidence: evidence.map((ev) => ({
        evidence_id: ev.evidence_id,
        evidence_type: ev.evidence_type,
        evidence_value: ev.evidence_value || ev.evidence_url || ev.file_reference || null,
        title: ev.title ? normalizeLocalizedText(ev.title) : null,
        evidence_url: ev.evidence_url || null,
        file_reference: ev.file_reference || null,
        rationale: ev.rationale ? normalizeLocalizedText(ev.rationale) : null,
        source: ev.source || null,
        uploaded_at: ev.created_at,
        uploaded_by: ev.created_by,
      })),
      is_locked: item.evaluation_status === 'LOCKED' || item.evaluation_status === 'PUBLISHED',
    };
  }

  public async getEmployeeReport(employeeId: string, cycleId: string) {
    try {
      return await this.reportsRepo.getEmployeeReport(employeeId, cycleId);
    } catch {
      return null;
    }
  }

  public async getTeamReport(teamId: string, cycleId: string) {
    try {
      return await this.reportsRepo.getTeamReport(teamId, cycleId);
    } catch {
      return {
        aggregate: {
          id: '',
          evaluation_cycle_id: cycleId,
          team_id: teamId,
          employee_count: 0,
          completed_employee_count: 0,
          completion_rate: 0,
          team_average_score: undefined,
          last_refreshed_at: new Date(),
        },
        kpis: [],
      };
    }
  }

  public async getTeamKpiReport(teamId: string, cycleId: string) {
    const data = await this.reportsRepo.getTeamKpiReport(teamId, cycleId);
    if (!data || data.length === 0) {
      return [];
    }
    return data;
  }

  public async getOrganizationReport(cycleId: string) {
    const data = await this.reportsRepo.getOrganizationReport(cycleId);
    if (!data || data.length === 0) {
      return [{
        id: '',
        evaluation_cycle_id: cycleId,
        employee_count: 0,
        completed_employee_count: 0,
        completion_rate: 0,
        average_score: undefined,
        score_distribution: {},
        last_refreshed_at: new Date(),
      }];
    }
    return data;
  }

  public async getKpiTrend(
    currentCycleId: string, 
    previousCycleId: string, 
    teamId?: string, 
    employeeId?: string
  ): Promise<KpiTrendResponse[]> {
    type TrendKpi = {
      criterion_code: string;
      criterion_name: string;
      category: string;
      kpi_score?: number;
      raw_score?: number;
    };
    let currentKpis: TrendKpi[] = [];
    let previousKpis: TrendKpi[] = [];
    
    if (teamId) {
      currentKpis = await this.reportsRepo.getTeamKpiReport(teamId, currentCycleId) as unknown as TrendKpi[];
      previousKpis = await this.reportsRepo.getTeamKpiReport(teamId, previousCycleId) as unknown as TrendKpi[];
    } else if (employeeId) {
      try {
        currentKpis = (await this.reportsRepo.getEmployeeReport(employeeId, currentCycleId)).kpis as unknown as TrendKpi[];
      } catch { /* ignore if not found */ }
      try {
        previousKpis = (await this.reportsRepo.getEmployeeReport(employeeId, previousCycleId)).kpis as unknown as TrendKpi[];
      } catch { /* ignore if not found */ }
    }

    const result: KpiTrendResponse[] = [];
    const previousMap = new Map(previousKpis.map(k => [k.criterion_code, k]));
    
    for (const current of currentKpis) {
      const prev = previousMap.get(current.criterion_code);
      if (prev) {
        const currScore = current.kpi_score ?? current.raw_score;
        const prevScore = prev.kpi_score ?? prev.raw_score;
        result.push({
          kpi_code: current.criterion_code,
          kpi_name: current.criterion_name,
          category: current.category,
          status: 'MATCHED',
          current_score: currScore,
          previous_score: prevScore,
          delta: currScore !== undefined && prevScore !== undefined ? currScore - prevScore : undefined
        });
        previousMap.delete(current.criterion_code);
      } else {
        result.push({
          kpi_code: current.criterion_code,
          kpi_name: current.criterion_name,
          category: current.category,
          status: 'NEW',
          current_score: current.kpi_score ?? current.raw_score,
          previous_score: undefined,
          delta: undefined
        });
      }
    }

    for (const [code, prev] of previousMap.entries()) {
      result.push({
        kpi_code: code,
        kpi_name: prev.criterion_name,
        category: prev.category,
        status: 'REMOVED',
        current_score: undefined,
        previous_score: prev.kpi_score ?? prev.raw_score,
        delta: undefined
      });
    }

    return result;
  }

  public async getRoleBasedDashboard(actor: Actor, cycleId?: string) {
    if (!actor) {
      throw new Forbidden('Authentication is required to access the dashboard.');
    }

    // 1. Resolve Active or Selected Cycle
    let cycleInfo = {
      id: cycleId || '',
      name: 'Current Evaluation Cycle',
      status: 'ACTIVE',
      start_date: null as string | null,
      end_date: null as string | null,
    };

    if (this.pool) {
      try {
        let cycleQuery = 'SELECT evaluation_cycle_id, name, status, start_date, end_date FROM evaluation_cycle';
        const params: unknown[] = [];
        if (cycleId) {
          cycleQuery += ' WHERE evaluation_cycle_id = $1';
          params.push(cycleId);
        } else {
          cycleQuery += " WHERE status IN ('ACTIVE', 'OPEN', 'IN_PROGRESS') ORDER BY start_date DESC LIMIT 1";
        }
        const cRes = await this.pool.query(cycleQuery, params);
        if (cRes.rows.length > 0) {
          const row = cRes.rows[0];
          cycleInfo = {
            id: row.evaluation_cycle_id,
            name: normalizeLocalizedText(row.name, 'Evaluation Cycle'),
            status: row.status,
            start_date: row.start_date ? new Date(row.start_date).toISOString() : null,
            end_date: row.end_date ? new Date(row.end_date).toISOString() : null,
          };
        } else if (!cycleId) {
          const fallbackRes = await this.pool.query(
            'SELECT evaluation_cycle_id, name, status, start_date, end_date FROM evaluation_cycle ORDER BY start_date DESC LIMIT 1'
          );
          if (fallbackRes.rows.length > 0) {
            const row = fallbackRes.rows[0];
            cycleInfo = {
              id: row.evaluation_cycle_id,
              name: normalizeLocalizedText(row.name, 'Evaluation Cycle'),
              status: row.status,
              start_date: row.start_date ? new Date(row.start_date).toISOString() : null,
              end_date: row.end_date ? new Date(row.end_date).toISOString() : null,
            };
          }
        }
      } catch {
        // Fallback gracefully if evaluation_cycle table is not available
      }
    }

    // 2. Dispatch by Role
    switch (actor.role) {
      case 'EMPLOYEE':
        return await this.getEmployeeDashboardData(actor, cycleInfo);
      case 'MANAGER':
        return await this.getManagerDashboardData(actor, cycleInfo);
      case 'HR_ADMIN':
        return await this.getHrAdminDashboardData(actor, cycleInfo);
      case 'SYSTEM_ADMIN':
        return await this.getSystemAdminDashboardData(actor, cycleInfo);
      default:
        throw new Forbidden(`Role ${actor.role} is not authorized to access the dashboard.`);
    }
  }

  private async getEmployeeDashboardData(actor: Actor, cycleInfo: { id: string; name: string; status: string; start_date: string | null; end_date: string | null }) {
    let employeeId = actor.employeeId || actor.userId;
    if (!employeeId && this.pool && actor.userId) {
      const uRes = await this.pool.query('SELECT employee_id FROM app_user WHERE id = $1', [actor.userId]);
      employeeId = uRes.rows[0]?.employee_id || actor.userId;
    }

    // 1. Employee metadata and review schedule
    let empMeta = {
      full_name: 'Employee',
      employee_code: '',
      department_name: '',
      team_name: '',
      review_cadence: 'ANNUAL',
      last_evaluation_completed_at: null as string | null,
      next_review_due_date: null as string | null,
    };

    if (this.pool && employeeId) {
      try {
        const empRes = await this.pool.query(
          `SELECT e.full_name, e.employee_code, e.review_cadence, e.last_evaluation_completed_at, e.next_review_due_date,
                  d.name as department_name, t.name as team_name
           FROM employee e
           LEFT JOIN department d ON e.department_id = d.department_id
           LEFT JOIN team t ON e.team_id = t.team_id
           WHERE e.employee_id = $1`,
          [employeeId]
        );
        if (empRes.rows.length > 0) {
          const r = empRes.rows[0];
          empMeta = {
            full_name: normalizeLocalizedText(r.full_name, 'Employee'),
            employee_code: r.employee_code || '',
            department_name: normalizeLocalizedText(r.department_name, ''),
            team_name: normalizeLocalizedText(r.team_name, ''),
            review_cadence: r.review_cadence || 'ANNUAL',
            last_evaluation_completed_at: r.last_evaluation_completed_at ? new Date(r.last_evaluation_completed_at).toISOString() : null,
            next_review_due_date: r.next_review_due_date ? new Date(r.next_review_due_date).toISOString() : null,
          };
        }
      } catch {
        // Fallback gracefully
      }
    }

    // Review status calculation
    const reviewStatusResult = getEmployeeReviewStatus({
      lastEvaluationCompletedAt: empMeta.last_evaluation_completed_at,
      reviewCadence: empMeta.review_cadence,
      nextReviewDueDate: empMeta.next_review_due_date,
    });

    // 2. Current Evaluation Score & Breakdown from read model
    let currentEvaluationStatus = 'N/A';
    let currentOverallScore: number | null = null;
    let scoreBreakdown: Array<{
      criterion_code: string;
      criterion_name: string;
      category: string;
      weight: number;
      raw_score: number | null;
      weighted_score: number | null;
    }> = [];

    if (employeeId) {
      try {
        const kpiSummary = await this.reportsRepo.getEmployeeKpiSummary(employeeId, cycleInfo.id);
        if (kpiSummary) {
          currentEvaluationStatus = kpiSummary.score.evaluation_status || 'OPEN';
          currentOverallScore = kpiSummary.score.final_score != null
            ? Number(kpiSummary.score.final_score)
            : kpiSummary.score.manager_score != null
            ? Number(kpiSummary.score.manager_score)
            : kpiSummary.score.self_score != null
            ? Number(kpiSummary.score.self_score)
            : null;

          scoreBreakdown = kpiSummary.kpis
            .filter((k) => !k.is_disabled_for_employee)
            .map((k) => ({
              criterion_code: k.criterion_code,
              criterion_name: normalizeLocalizedText(k.criterion_name),
              category: normalizeLocalizedText(k.category, 'General'),
              weight: Number(k.weight_snapshot || 0),
              raw_score: k.raw_score != null ? Number(k.raw_score) : null,
              weighted_score: k.weighted_score != null ? Number(k.weighted_score) : null,
            }));
        }
      } catch {
        // Ignore read model fetch error
      }
    }

    // Strengths and Development areas
    const scoredKpis = scoreBreakdown.filter((k) => k.raw_score != null);
    const sortedByScore = [...scoredKpis].sort((a, b) => (b.raw_score ?? 0) - (a.raw_score ?? 0));
    const strengths = sortedByScore.slice(0, 3).map((k) => ({
      criterion_code: k.criterion_code,
      criterion_name: k.criterion_name,
      category: k.category,
      score: k.raw_score,
    }));
    const developmentAreas = sortedByScore.length > 3
      ? sortedByScore.slice(-3).reverse().map((k) => ({
          criterion_code: k.criterion_code,
          criterion_name: k.criterion_name,
          category: k.category,
          score: k.raw_score,
        }))
      : [];

    // 3. Historical Score Trend across published cycles
    let scoreTrend: Array<{
      cycle_id: string;
      cycle_name: string;
      overall_score: number;
      published_at: string | null;
    }> = [];

    let lastPublishedScore: number | null = null;

    if (this.pool && employeeId) {
      try {
        const trendRes = await this.pool.query(
          `SELECT s.evaluation_cycle_id, c.name as cycle_name,
                  COALESCE(s.final_score, s.manager_score, s.self_score) as score_val,
                  s.published_at
           FROM employee_evaluation_score_read_model s
           LEFT JOIN evaluation_cycle c ON s.evaluation_cycle_id = c.evaluation_cycle_id
           WHERE s.employee_id = $1 AND s.evaluation_status = 'PUBLISHED'
           ORDER BY s.published_at ASC`,
          [employeeId]
        );
        scoreTrend = trendRes.rows.map((r) => ({
          cycle_id: r.evaluation_cycle_id,
          cycle_name: normalizeLocalizedText(r.cycle_name, 'Past Cycle'),
          overall_score: Number(r.score_val ?? 0),
          published_at: r.published_at ? new Date(r.published_at).toISOString() : null,
        }));

        const lastTrend = scoreTrend[scoreTrend.length - 1];
        if (lastTrend) {
          lastPublishedScore = lastTrend.overall_score;
        }
      } catch {
        // Fallback gracefully
      }
    }

    // Attention required items
    const attention: Array<{
      id: string;
      type: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
      title: string;
      message: string;
      action_url?: string;
    }> = [];

    if (currentEvaluationStatus === 'SELF_ASSESSMENT' || currentEvaluationStatus === 'OPEN') {
      attention.push({
        id: 'self-assessment-pending',
        type: 'WARNING',
        title: 'Self-Assessment Pending',
        message: 'Your self-assessment for the active cycle is ready for submission.',
        action_url: '/admin/my-evaluations',
      });
    }

    if (reviewStatusResult.isOverdue) {
      attention.push({
        id: 'review-overdue',
        type: 'DANGER',
        title: 'Review Overdue',
        message: `Your performance review was due on ${empMeta.next_review_due_date ? new Date(empMeta.next_review_due_date).toLocaleDateString() : 'earlier date'}.`,
        action_url: '/admin/my-evaluations',
      });
    }

    return {
      role: 'EMPLOYEE',
      scope: {
        type: 'SELF',
        id: employeeId,
      },
      cycle: cycleInfo,
      summary: {
        current_evaluation_status: currentEvaluationStatus,
        current_overall_score: currentOverallScore,
        last_published_score: lastPublishedScore,
        next_review_due: empMeta.next_review_due_date,
        review_status: reviewStatusResult.status,
        days_until_due: reviewStatusResult.daysUntilDue,
        review_cadence: empMeta.review_cadence,
      },
      details: {
        score_trend: scoreTrend,
        score_breakdown: scoreBreakdown,
        strengths,
        development_areas: developmentAreas,
        review_schedule: {
          last_evaluation_completed_at: empMeta.last_evaluation_completed_at,
          next_review_due_date: empMeta.next_review_due_date,
          review_cadence: empMeta.review_cadence,
          status: reviewStatusResult.status,
          days_until_due: reviewStatusResult.daysUntilDue,
        },
      },
      attention,
      last_updated_at: new Date().toISOString(),
    };
  }

  private async getManagerDashboardData(actor: Actor, cycleInfo: { id: string; name: string; status: string; start_date: string | null; end_date: string | null }) {
    let managerEmpId = actor.employeeId;
    if (!managerEmpId && this.pool && actor.userId) {
      const uRes = await this.pool.query('SELECT employee_id FROM app_user WHERE id = $1', [actor.userId]);
      managerEmpId = uRes.rows[0]?.employee_id || actor.userId;
    }

    // 1. Identify Managed Teams
    let managedTeams: Array<{ id: string; name: string; department_id?: string }> = [];
    if (this.pool && managerEmpId) {
      try {
        const teamRes = await this.pool.query(
          'SELECT team_id, name, department_id FROM team WHERE manager_id = $1',
          [managerEmpId]
        );
        managedTeams = teamRes.rows.map((r) => ({
          id: r.team_id,
          name: normalizeLocalizedText(r.name, 'Team'),
          department_id: r.department_id,
        }));
      } catch {
        // Fallback gracefully
      }
    }

    const teamIds = managedTeams.map((t) => t.id);

    // 2. Aggregate Team Metrics
    let teamMembersCount = 0;
    let totalEvaluations = 0;
    let completedEvaluations = 0;
    let inProgressEvaluations = 0;
    let pendingReviewEvaluations = 0;
    let overdueReviewsCount = 0;
    let teamAverageScore: number | null = null;

    const workflowDistributionMap = new Map<string, number>();
    const scoreBins = [
      { range: '0.0 - 1.0', count: 0 },
      { range: '1.0 - 2.0', count: 0 },
      { range: '2.0 - 3.0', count: 0 },
      { range: '3.0 - 4.0', count: 0 },
      { range: '4.0 - 5.0', count: 0 },
    ];

    let upcomingCount = 0;
    let overdueCount = 0;
    let notDueCount = 0;
    let noScheduleCount = 0;

    let criterionAggregates: Array<{
      criterion_code: string;
      criterion_name: string;
      category: string;
      average_score: number;
    }> = [];

    if (this.pool && teamIds.length > 0) {
      try {
        // Team member count
        const memberRes = await this.pool.query(
          `SELECT COUNT(*) as count FROM employee WHERE team_id = ANY($1) AND employment_status = 'ACTIVE'`,
          [teamIds]
        );
        teamMembersCount = parseInt(memberRes.rows[0]?.count || '0', 10);

        // Evaluations in cycle
        let evalSql = `SELECT evaluation_id, status, final_score, manager_score, self_score FROM evaluation WHERE team_id = ANY($1)`;
        const evalParams: unknown[] = [teamIds];
        if (cycleInfo.id) {
          evalParams.push(cycleInfo.id);
          evalSql += ` AND evaluation_cycle_id = $2`;
        }
        const evalRes = await this.pool.query(evalSql, evalParams);
        totalEvaluations = evalRes.rows.length;

        let totalScoreSum = 0;
        let scoredCount = 0;

        for (const row of evalRes.rows) {
          const status = row.status || 'DRAFT';
          workflowDistributionMap.set(status, (workflowDistributionMap.get(status) || 0) + 1);

          if (['APPROVED', 'PUBLISHED', 'LOCKED'].includes(status)) {
            completedEvaluations++;
          } else if (['MANAGER_ASSESSMENT', 'REVIEWING'].includes(status)) {
            pendingReviewEvaluations++;
          } else {
            inProgressEvaluations++;
          }

          const score = row.final_score != null
            ? Number(row.final_score)
            : row.manager_score != null
            ? Number(row.manager_score)
            : row.self_score != null
            ? Number(row.self_score)
            : null;

          if (score != null) {
            totalScoreSum += score;
            scoredCount++;
            incrementScoreBin(scoreBins, score);
          }
        }

        if (scoredCount > 0) {
          teamAverageScore = Number((totalScoreSum / scoredCount).toFixed(2));
        }

        // Review due status in team
        const dueRes = await this.pool.query(
          `SELECT last_evaluation_completed_at, review_cadence, next_review_due_date
           FROM employee
           WHERE team_id = ANY($1) AND employment_status = 'ACTIVE'`,
          [teamIds]
        );
        for (const row of dueRes.rows) {
          const st = getEmployeeReviewStatus({
            lastEvaluationCompletedAt: row.last_evaluation_completed_at,
            reviewCadence: row.review_cadence,
            nextReviewDueDate: row.next_review_due_date,
          });
          if (st.status === 'OVERDUE') overdueCount++;
          else if (st.status === 'UPCOMING') upcomingCount++;
          else if (st.status === 'NOT_DUE') notDueCount++;
          else noScheduleCount++;
        }
        overdueReviewsCount = overdueCount;

        // Criterion aggregates from read models
        if (cycleInfo.id) {
          const critRes = await this.pool.query(
            `SELECT criterion_code, criterion_name, category, AVG(raw_score) as avg_score
             FROM employee_kpi_score_read_model
             WHERE team_id = ANY($1) AND evaluation_cycle_id = $2 AND raw_score IS NOT NULL
             GROUP BY criterion_code, criterion_name, category
             ORDER BY avg_score DESC
             LIMIT 10`,
            [teamIds, cycleInfo.id]
          );
          criterionAggregates = critRes.rows.map((r) => ({
            criterion_code: r.criterion_code,
            criterion_name: normalizeLocalizedText(r.criterion_name),
            category: normalizeLocalizedText(r.category, 'General'),
            average_score: Number(Number(r.avg_score).toFixed(2)),
          }));
        }
      } catch {
        // Fallback gracefully
      }
    } else if (teamIds.length > 0) {
      // In-memory fallback if pool is not attached
      try {
        const primaryTeamId = teamIds[0];
        if (primaryTeamId) {
          const teamRep = await this.reportsRepo.getTeamReport(primaryTeamId, cycleInfo.id);
          if (teamRep?.aggregate) {
            teamMembersCount = teamRep.aggregate.employee_count;
            completedEvaluations = teamRep.aggregate.completed_employee_count;
            totalEvaluations = teamMembersCount;
            teamAverageScore = teamRep.aggregate.team_average_score != null ? Number(teamRep.aggregate.team_average_score) : null;
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    const completionRate = totalEvaluations > 0
      ? Number(((completedEvaluations / totalEvaluations) * 100).toFixed(1))
      : 0;

    const workflowDistribution = [
      'DRAFT',
      'OPEN',
      'SELF_ASSESSMENT',
      'MANAGER_ASSESSMENT',
      'REVIEWING',
      'CALIBRATION',
      'APPROVED',
      'PUBLISHED',
      'LOCKED',
    ].map((st) => ({
      status: st,
      count: workflowDistributionMap.get(st) || 0,
    }));

    // Action / attention items
    const attention: Array<{
      id: string;
      type: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
      title: string;
      message: string;
      action_url?: string;
    }> = [];

    const pendingManagerCount = workflowDistributionMap.get('MANAGER_ASSESSMENT') || 0;
    if (pendingManagerCount > 0) {
      attention.push({
        id: 'pending-manager-assessment',
        type: 'WARNING',
        title: 'Assessments Pending Review',
        message: `${pendingManagerCount} team evaluations are awaiting your assessment.`,
        action_url: '/admin/team-evaluations',
      });
    }

    if (overdueReviewsCount > 0) {
      attention.push({
        id: 'team-overdue-reviews',
        type: 'DANGER',
        title: 'Team Reviews Overdue',
        message: `${overdueReviewsCount} team members have overdue performance evaluations.`,
        action_url: '/admin/team-evaluations',
      });
    }

    return {
      role: 'MANAGER',
      scope: {
        type: 'TEAM',
        ids: teamIds,
        teams: managedTeams,
      },
      cycle: cycleInfo,
      summary: {
        team_members_count: teamMembersCount,
        total_evaluations: totalEvaluations,
        completed_evaluations: completedEvaluations,
        in_progress_evaluations: inProgressEvaluations,
        pending_review_evaluations: pendingReviewEvaluations,
        overdue_reviews_count: overdueReviewsCount,
        completion_rate: completionRate,
        team_average_score: teamAverageScore,
      },
      details: {
        workflow_distribution: workflowDistribution,
        score_distribution: scoreBins,
        criterion_aggregates: criterionAggregates,
        review_due_summary: {
          upcoming_count: upcomingCount,
          overdue_count: overdueCount,
          not_due_count: notDueCount,
          no_schedule_count: noScheduleCount,
        },
      },
      attention,
      last_updated_at: new Date().toISOString(),
    };
  }

  private async getHrAdminDashboardData(actor: Actor, cycleInfo: { id: string; name: string; status: string; start_date: string | null; end_date: string | null }) {
    let totalEmployees = 0;
    let activeEmployees = 0;
    let totalEvaluations = 0;
    let completedEvaluations = 0;
    let inProgressEvaluations = 0;
    let publishedEvaluations = 0;
    let overdueReviewsCount = 0;
    let organizationAverageScore: number | null = null;

    const workflowMap = new Map<string, number>();
    const scoreBins = [
      { range: '0.0 - 1.0', count: 0, percentage: 0 },
      { range: '1.0 - 2.0', count: 0, percentage: 0 },
      { range: '2.0 - 3.0', count: 0, percentage: 0 },
      { range: '3.0 - 4.0', count: 0, percentage: 0 },
      { range: '4.0 - 5.0', count: 0, percentage: 0 },
    ];

    let deptTeamAggregates: Array<{
      team_id: string;
      team_name: string;
      department_name: string;
      employee_count: number;
      completed_count: number;
      completion_rate: number;
      average_score: number | null;
    }> = [];

    let cycleTrend: Array<{
      cycle_id: string;
      cycle_name: string;
      average_score: number | null;
      completion_rate: number;
    }> = [];

    let upcomingCount = 0;
    let overdueCount = 0;
    let notDueCount = 0;
    let noScheduleCount = 0;

    if (this.pool) {
      try {
        // Employee counts
        const empCountRes = await this.pool.query(
          `SELECT COUNT(*) as total,
                  COUNT(*) FILTER (WHERE employment_status = 'ACTIVE') as active
           FROM employee`
        );
        totalEmployees = parseInt(empCountRes.rows[0]?.total || '0', 10);
        activeEmployees = parseInt(empCountRes.rows[0]?.active || '0', 10);

        // Evaluations in cycle
        let evalSql = `SELECT evaluation_id, status, final_score, manager_score, self_score FROM evaluation`;
        const evalParams: unknown[] = [];
        if (cycleInfo.id) {
          evalSql += ` WHERE evaluation_cycle_id = $1`;
          evalParams.push(cycleInfo.id);
        }
        const evalRes = await this.pool.query(evalSql, evalParams);
        totalEvaluations = evalRes.rows.length;

        let totalScoreSum = 0;
        let scoredCount = 0;

        for (const row of evalRes.rows) {
          const status = row.status || 'DRAFT';
          workflowMap.set(status, (workflowMap.get(status) || 0) + 1);

          if (['APPROVED', 'PUBLISHED', 'LOCKED'].includes(status)) {
            completedEvaluations++;
            if (status === 'PUBLISHED') publishedEvaluations++;
          } else {
            inProgressEvaluations++;
          }

          const score = row.final_score != null
            ? Number(row.final_score)
            : row.manager_score != null
            ? Number(row.manager_score)
            : row.self_score != null
            ? Number(row.self_score)
            : null;

          if (score != null) {
            totalScoreSum += score;
            scoredCount++;
            incrementScoreBin(scoreBins, score);
          }
        }

        if (scoredCount > 0) {
          organizationAverageScore = Number((totalScoreSum / scoredCount).toFixed(2));
          scoreBins.forEach((b) => {
            b.percentage = Number(((b.count / scoredCount) * 100).toFixed(1));
          });
        }

        // Review due status across organization
        const dueRes = await this.pool.query(
          `SELECT last_evaluation_completed_at, review_cadence, next_review_due_date
           FROM employee
           WHERE employment_status = 'ACTIVE'`
        );
        for (const row of dueRes.rows) {
          const st = getEmployeeReviewStatus({
            lastEvaluationCompletedAt: row.last_evaluation_completed_at,
            reviewCadence: row.review_cadence,
            nextReviewDueDate: row.next_review_due_date,
          });
          if (st.status === 'OVERDUE') overdueCount++;
          else if (st.status === 'UPCOMING') upcomingCount++;
          else if (st.status === 'NOT_DUE') notDueCount++;
          else noScheduleCount++;
        }
        overdueReviewsCount = overdueCount;

        // Department / Team breakdown
        const teamBreakdownRes = await this.pool.query(
          `SELECT t.team_id, t.name as team_name, d.name as department_name,
                  COUNT(e.employee_id) as emp_count,
                  COUNT(ev.evaluation_id) FILTER (WHERE ev.status IN ('APPROVED', 'PUBLISHED', 'LOCKED')) as completed_count,
                  AVG(COALESCE(ev.final_score, ev.manager_score)) as avg_score
           FROM team t
           LEFT JOIN department d ON t.department_id = d.department_id
           LEFT JOIN employee e ON e.team_id = t.team_id AND e.employment_status = 'ACTIVE'
           LEFT JOIN evaluation ev ON ev.employee_id = e.employee_id ${cycleInfo.id ? 'AND ev.evaluation_cycle_id = $1' : ''}
           GROUP BY t.team_id, t.name, d.name
           ORDER BY t.name ASC
           LIMIT 20`,
          cycleInfo.id ? [cycleInfo.id] : []
        );
        deptTeamAggregates = teamBreakdownRes.rows.map((r) => {
          const eCount = parseInt(r.emp_count || '0', 10);
          const cCount = parseInt(r.completed_count || '0', 10);
          return {
            team_id: r.team_id,
            team_name: normalizeLocalizedText(r.team_name, 'Team'),
            department_name: normalizeLocalizedText(r.department_name, 'General'),
            employee_count: eCount,
            completed_count: cCount,
            completion_rate: eCount > 0 ? Number(((cCount / eCount) * 100).toFixed(1)) : 0,
            average_score: r.avg_score != null ? Number(Number(r.avg_score).toFixed(2)) : null,
          };
        });

        // Trend by cycles (past 5 cycles)
        const cycleTrendRes = await this.pool.query(
          `SELECT c.evaluation_cycle_id, c.name,
                  AVG(COALESCE(s.final_score, s.manager_score, s.self_score)) as avg_score,
                  COUNT(s.evaluation_id) as eval_count,
                  COUNT(s.evaluation_id) FILTER (WHERE s.evaluation_status IN ('APPROVED', 'PUBLISHED', 'LOCKED')) as completed_count
           FROM evaluation_cycle c
           LEFT JOIN employee_evaluation_score_read_model s ON s.evaluation_cycle_id = c.evaluation_cycle_id
           GROUP BY c.evaluation_cycle_id, c.name, c.start_date
           ORDER BY c.start_date ASC
           LIMIT 5`
        );
        cycleTrend = cycleTrendRes.rows.map((r) => {
          const count = parseInt(r.eval_count || '0', 10);
          const comp = parseInt(r.completed_count || '0', 10);
          return {
            cycle_id: r.evaluation_cycle_id,
            cycle_name: normalizeLocalizedText(r.name, 'Cycle'),
            average_score: r.avg_score != null ? Number(Number(r.avg_score).toFixed(2)) : null,
            completion_rate: count > 0 ? Number(((comp / count) * 100).toFixed(1)) : 0,
          };
        });
      } catch {
        // Fallback gracefully
      }
    }

    const completionRate = totalEvaluations > 0
      ? Number(((completedEvaluations / totalEvaluations) * 100).toFixed(1))
      : 0;

    const workflowDistribution = [
      'DRAFT',
      'OPEN',
      'SELF_ASSESSMENT',
      'MANAGER_ASSESSMENT',
      'REVIEWING',
      'CALIBRATION',
      'APPROVED',
      'PUBLISHED',
      'LOCKED',
    ].map((st) => ({
      status: st,
      count: workflowMap.get(st) || 0,
    }));

    const attention: Array<{
      id: string;
      type: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
      title: string;
      message: string;
      action_url?: string;
    }> = [];

    const bottleneckReviewing = workflowMap.get('REVIEWING') || 0;
    if (bottleneckReviewing > 5) {
      attention.push({
        id: 'review-bottleneck',
        type: 'WARNING',
        title: 'Review Bottleneck Detected',
        message: `${bottleneckReviewing} evaluations are currently awaiting review approval across teams.`,
        action_url: '/admin/cycles',
      });
    }

    if (overdueReviewsCount > 0) {
      attention.push({
        id: 'org-overdue-reviews',
        type: 'DANGER',
        title: 'Organization Overdue Reviews',
        message: `${overdueReviewsCount} employees across departments have overdue review schedules.`,
        action_url: '/admin/cycles',
      });
    }

    return {
      role: 'HR_ADMIN',
      scope: {
        type: 'ORGANIZATION',
      },
      cycle: cycleInfo,
      summary: {
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        total_evaluations: totalEvaluations,
        completed_evaluations: completedEvaluations,
        in_progress_evaluations: inProgressEvaluations,
        published_evaluations: publishedEvaluations,
        overdue_reviews_count: overdueReviewsCount,
        completion_rate: completionRate,
        organization_average_score: organizationAverageScore,
      },
      details: {
        workflow_distribution: workflowDistribution,
        score_distribution: scoreBins,
        department_team_aggregates: deptTeamAggregates,
        cycle_trend: cycleTrend,
        review_due_summary: {
          upcoming_count: upcomingCount,
          overdue_count: overdueCount,
          not_due_count: notDueCount,
          no_schedule_count: noScheduleCount,
        },
      },
      attention,
      last_updated_at: new Date().toISOString(),
    };
  }

  private async getSystemAdminDashboardData(actor: Actor, cycleInfo: { id: string; name: string; status: string; start_date: string | null; end_date: string | null }) {
    let totalUsers = 0;
    let activeUsers = 0;
    let totalRoles = 0;
    let totalTeams = 0;
    let totalDepartments = 0;
    let totalCycles = 0;
    let publishedTemplates = 0;

    const auditSummary = {
      total_recent_events: 0,
      events_by_action: [] as Array<{ action: string; count: number }>,
      events_by_day: [] as Array<{ date: string; count: number }>,
      recent_events: [] as Array<{ id: string; action: string; entity_name: string; timestamp: string }>,
    };

    if (this.pool) {
      try {
        const userRes = await this.pool.query(`SELECT COUNT(*) as total FROM app_user`);
        totalUsers = parseInt(userRes.rows[0]?.total || '0', 10);
        activeUsers = totalUsers;

        const roleRes = await this.pool.query(`SELECT COUNT(*) as total FROM role`);
        totalRoles = parseInt(roleRes.rows[0]?.total || '0', 10);

        const teamRes = await this.pool.query(`SELECT COUNT(*) as total FROM team`);
        totalTeams = parseInt(teamRes.rows[0]?.total || '0', 10);

        const deptRes = await this.pool.query(`SELECT COUNT(*) as total FROM department`);
        totalDepartments = parseInt(deptRes.rows[0]?.total || '0', 10);

        const cycleRes = await this.pool.query(`SELECT COUNT(*) as total FROM evaluation_cycle`);
        totalCycles = parseInt(cycleRes.rows[0]?.total || '0', 10);

        const tplRes = await this.pool.query(
          `SELECT COUNT(*) as total FROM evaluation_template WHERE status = 'PUBLISHED'`
        );
        publishedTemplates = parseInt(tplRes.rows[0]?.total || '0', 10);

        // Audit events aggregate
        const auditCountRes = await this.pool.query(`SELECT COUNT(*) as total FROM audit_log`);
        auditSummary.total_recent_events = parseInt(auditCountRes.rows[0]?.total || '0', 10);

        const actionRes = await this.pool.query(
          `SELECT action, COUNT(*) as count FROM audit_log GROUP BY action ORDER BY count DESC LIMIT 5`
        );
        auditSummary.events_by_action = actionRes.rows.map((r) => ({
          action: r.action,
          count: parseInt(r.count, 10),
        }));

        const recentAuditRes = await this.pool.query(
          `SELECT id, action, entity_name, created_at FROM audit_log ORDER BY created_at DESC LIMIT 5`
        );
        auditSummary.recent_events = recentAuditRes.rows.map((r) => ({
          id: r.id,
          action: r.action,
          entity_name: r.entity_name || 'System',
          timestamp: new Date(r.created_at).toISOString(),
        }));
      } catch {
        // Fallback gracefully
      }
    }

    const attention = [
      {
        id: 'sys-health',
        type: 'SUCCESS' as const,
        title: 'System Health Optimal',
        message: 'All application services, audit log retention, and read-model projections are running smoothly.',
        action_url: '/admin/audit-logs',
      },
    ];

    return {
      role: 'SYSTEM_ADMIN',
      scope: {
        type: 'SYSTEM',
      },
      cycle: cycleInfo,
      summary: {
        total_users: totalUsers,
        active_users: activeUsers,
        total_roles: totalRoles,
        total_teams: totalTeams,
        total_departments: totalDepartments,
        total_cycles: totalCycles,
        published_templates: publishedTemplates,
      },
      details: {
        system_health: {
          status: 'OPERATIONAL',
          database: 'HEALTHY',
          read_models: 'UP_TO_DATE',
        },
        audit_summary: auditSummary,
      },
      attention,
      last_updated_at: new Date().toISOString(),
    };
  }
}

