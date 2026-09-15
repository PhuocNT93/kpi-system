import { IReportsRepository } from '../domain/reports.types.js';
import { KpiTrendResponse } from '../api/reports.dto.js';

export class ReportsQueryService {
  constructor(private reportsRepo: IReportsRepository) {}

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
      // Return empty array instead of 404 since it's just no data
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
    // 1. Fetch data for current cycle
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

    // 2. Perform cross-cycle matching by kpi.code
    const result: KpiTrendResponse[] = [];
    const previousMap = new Map(previousKpis.map(k => [k.criterion_code, k]));
    
    // Process current KPIs (MATCHED or NEW)
    for (const current of currentKpis) {
      const prev = previousMap.get(current.criterion_code);
      if (prev) {
        // MATCHED
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
        previousMap.delete(current.criterion_code); // Remove matched
      } else {
        // NEW
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

    // Process remaining in previousMap (REMOVED)
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
