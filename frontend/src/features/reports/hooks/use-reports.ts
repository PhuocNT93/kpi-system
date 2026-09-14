import { useQuery } from '@tanstack/react-query';
import { fetchEmployeeReport, fetchTeamReport, fetchOrganizationReport } from '../api/reports.api';

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

export const useOrganizationReport = (cycleId: string) => {
  return useQuery({
    queryKey: ['organization-report', cycleId],
    queryFn: () => fetchOrganizationReport(cycleId),
    enabled: !!cycleId,
  });
};
