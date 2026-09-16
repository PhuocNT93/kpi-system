import { Pool } from 'pg';
import { IReportsRepository } from '../domain/reports.types.js';
import { ReportingProjectionService } from './reporting-projection.service.js';
import { KpiTrendResponse } from '../api/reports.dto.js';
import { Actor } from '../../../shared/auth/types.js';
import { Forbidden, NotFound } from '../../../api/app-error.js';

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
}
