import { getApi } from '@/shared/api/api-client';
import type { EmployeeReport, TeamReport, OrganizationAggregate, TeamKpiAggregate, KpiTrendResponse, ReportResponse } from '../types/reports.types';

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

export const fetchEmployeeReport = async (employeeId: string, cycleId: string): Promise<ReportResponse<EmployeeReport>> => {
  const data = await getApi<unknown>(`/api/reports/employees/${employeeId}?cycleId=${cycleId}`);
  return camelize(data) as ReportResponse<EmployeeReport>;
};

export const fetchTeamReport = async (teamId: string, cycleId: string): Promise<ReportResponse<TeamReport>> => {
  const data = await getApi<unknown>(`/api/reports/teams/${teamId}?cycleId=${cycleId}`);
  return camelize(data) as ReportResponse<TeamReport>;
};

export const fetchTeamKpiReport = async (teamId: string, cycleId: string): Promise<ReportResponse<{ data: TeamKpiAggregate[] }>> => {
  const data = await getApi<unknown>(`/api/reports/kpi/team/${teamId}?cycleId=${cycleId}`);
  return camelize(data) as ReportResponse<{ data: TeamKpiAggregate[] }>;
};

export const fetchKpiTrend = async (currentCycleId: string, previousCycleId: string, teamId?: string, employeeId?: string): Promise<ReportResponse<{ data: KpiTrendResponse[] }>> => {
  let url = `/api/reports/kpi/trend?currentCycleId=${currentCycleId}&previousCycleId=${previousCycleId}`;
  if (teamId) url += `&teamId=${teamId}`;
  if (employeeId) url += `&employeeId=${employeeId}`;
  const data = await getApi<unknown>(url);
  return camelize(data) as ReportResponse<{ data: KpiTrendResponse[] }>;
};

export const fetchOrganizationReport = async (cycleId: string): Promise<ReportResponse<{ data: OrganizationAggregate[] }>> => {
  const data = await getApi<unknown>(`/api/reports/organization?cycleId=${cycleId}`);
  return camelize(data) as ReportResponse<{ data: OrganizationAggregate[] }>;
};
