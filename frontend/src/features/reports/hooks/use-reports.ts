import { useQuery } from '@tanstack/react-query';
import { fetchEmployeeReport, fetchTeamReport, fetchTeamKpiReport, fetchKpiTrend, fetchOrganizationReport } from '../api/reports.api';

export const useEmployeeReport = (employeeId: string, cycleId: string) => {
  return useQuery({
    queryKey: ['employee-report', employeeId, cycleId],
    queryFn: () => fetchEmployeeReport(employeeId, cycleId),
    enabled: !!employeeId && !!cycleId,
  });
};

export const useTeamReport = (teamId: string, cycleId: string) => {
  return useQuery({
    queryKey: ['team-report', teamId, cycleId],
    queryFn: () => fetchTeamReport(teamId, cycleId),
    enabled: !!teamId && !!cycleId,
  });
};

export const useTeamKpiReport = (teamId: string, cycleId: string) => {
  return useQuery({
    queryKey: ['team-kpi-report', teamId, cycleId],
    queryFn: () => fetchTeamKpiReport(teamId, cycleId),
    enabled: !!teamId && !!cycleId,
  });
};

export const useKpiTrend = (currentCycleId: string, previousCycleId: string, teamId?: string, employeeId?: string) => {
  return useQuery({
    queryKey: ['kpi-trend', currentCycleId, previousCycleId, teamId, employeeId],
    queryFn: () => fetchKpiTrend(currentCycleId, previousCycleId, teamId, employeeId),
    enabled: !!currentCycleId && !!previousCycleId && (!!teamId || !!employeeId),
  });
};

export const useOrganizationReport = (cycleId: string) => {
  return useQuery({
    queryKey: ['organization-report', cycleId],
    queryFn: () => fetchOrganizationReport(cycleId),
    enabled: !!cycleId,
  });
};
