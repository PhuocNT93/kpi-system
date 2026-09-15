import { useQuery } from '@tanstack/react-query';
import { employeeKpiSummaryApi } from '../api/employee-kpi-summary.api';

export const employeeKpiSummaryKeys = {
  all: ['employee-kpi-summary'] as const,
  detail: (employeeId: string, cycleId: string) =>
    ['employee-kpi-summary', employeeId, cycleId] as const,
};

export function useEmployeeKpiSummary(employeeId?: string, cycleId?: string) {
  return useQuery({
    queryKey: employeeKpiSummaryKeys.detail(employeeId || '', cycleId || ''),
    queryFn: () => employeeKpiSummaryApi.getSummary(employeeId!, cycleId!),
    enabled: Boolean(employeeId && cycleId),
    staleTime: 60_000,
  });
}
