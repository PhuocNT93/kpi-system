import { getApi } from '@/shared/api/api-client';
import type { 
  EmployeeReportResponse, 
  TeamReportResponse, 
  OrganizationReportResponse, 
  TeamKpiReportResponse, 
  KpiTrendReportResponse, 
  ExplainabilityViewDto 
} from '../types/reports.types';

const camelize = (obj: unknown): unknown => {
  if (Array.isArray(obj)) return obj.map(camelize);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      acc[camelKey] = camelize((obj as Record<string, unknown>)[key]);
      return acc;
    }, {} as Record<string, unknown>);
  }
  return obj;
};

export const fetchEmployeeReport = async (employeeId: string, cycleId: string): Promise<EmployeeReportResponse | null> => {
  const data = await getApi<unknown>(`/api/reports/employees/${employeeId}?cycleId=${cycleId}`);
  if (!data) return null;
  return camelize(data) as EmployeeReportResponse;
};

export const fetchTeamReport = async (teamId: string, cycleId: string): Promise<TeamReportResponse> => {
  const data = await getApi<unknown>(`/api/reports/teams/${teamId}?cycleId=${cycleId}`);
  return camelize(data) as TeamReportResponse;
};

export const fetchTeamKpiReport = async (teamId: string, cycleId: string): Promise<TeamKpiReportResponse> => {
  const data = await getApi<unknown>(`/api/reports/kpi/team/${teamId}?cycleId=${cycleId}`);
  return camelize(data) as TeamKpiReportResponse;
};

export const fetchKpiTrend = async (currentCycleId: string, previousCycleId: string, teamId?: string, employeeId?: string): Promise<KpiTrendReportResponse> => {
  let url = `/api/reports/kpi/trend?currentCycleId=${currentCycleId}&previousCycleId=${previousCycleId}`;
  if (teamId) url += `&teamId=${teamId}`;
  if (employeeId) url += `&employeeId=${employeeId}`;
  const data = await getApi<unknown>(url);
  return camelize(data) as KpiTrendReportResponse;
};

export const fetchOrganizationReport = async (cycleId: string): Promise<OrganizationReportResponse> => {
  const data = await getApi<unknown>(`/api/reports/organization?cycleId=${cycleId}`);
  return camelize(data) as OrganizationReportResponse;
};

export const fetchKpiEvidence = async (evaluationId: string, kpiCode: string): Promise<ExplainabilityViewDto> => {
  const response = await getApi<Record<string, unknown>>(`/api/evaluations/${evaluationId}/kpis/${encodeURIComponent(kpiCode)}/evidence`);
  const payload = (response && 'data' in response && response.data) ? response.data : response;
  return camelize(payload) as ExplainabilityViewDto;
};
