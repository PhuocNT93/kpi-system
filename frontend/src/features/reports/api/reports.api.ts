import { getApi } from '@/shared/api/api-client';
import type { EmployeeReport, TeamReport, OrganizationAggregate } from '../types/reports.types';

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

export const fetchEmployeeReport = async (employeeId: string, cycleId: string): Promise<EmployeeReport> => {
  const data = await getApi<unknown>(`/reports/employees/${employeeId}?cycleId=${cycleId}`);
  return camelize(data) as EmployeeReport;
};

export const fetchTeamReport = async (teamId: string, cycleId: string): Promise<TeamReport> => {
  const data = await getApi<unknown>(`/reports/teams/${teamId}?cycleId=${cycleId}`);
  return camelize(data) as TeamReport;
};

export const fetchOrganizationReport = async (cycleId: string): Promise<OrganizationAggregate[]> => {
  const data = await getApi<unknown>(`/reports/organization?cycleId=${cycleId}`);
  return camelize(data) as OrganizationAggregate[];
};
