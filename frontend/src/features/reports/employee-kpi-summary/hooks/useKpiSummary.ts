import { useQuery } from '@tanstack/react-query';
import {
  fetchEmployeeKpiSummary,
  fetchEmployeeKpiDetail,
} from '../api/kpi-summary.api';
import type { GetKpiSummaryParams } from '../api/kpi-summary.api';
import type { KpiSummaryData, KpiDetailData } from '../types/kpi-summary.types';

export const kpiSummaryKeys = {
  all: ['reports', 'kpi-summary'] as const,
  summary: (params: GetKpiSummaryParams) =>
    ['reports', 'kpi-summary', params.employeeId, params.evaluationCycleId, params.evaluationStatus] as const,
  detail: (employeeId: string, evaluationItemId: string) =>
    ['reports', 'kpi-summary', employeeId, 'detail', evaluationItemId] as const,
};

export function useKpiSummaryQuery(
  params: GetKpiSummaryParams,
  options: { enabled?: boolean; retry?: boolean | number } = {}
) {
  return useQuery<KpiSummaryData, Error>({
    queryKey: kpiSummaryKeys.summary(params),
    queryFn: () => fetchEmployeeKpiSummary(params),
    enabled: Boolean(params.employeeId) && (options.enabled ?? true),
    staleTime: 30_000,
    retry: options.retry ?? false,
  });
}

export function useKpiDetailQuery(
  employeeId: string,
  evaluationItemId: string | null,
  options: { enabled?: boolean; retry?: boolean | number } = {}
) {
  return useQuery<KpiDetailData, Error>({
    queryKey: kpiSummaryKeys.detail(employeeId, evaluationItemId || ''),
    queryFn: () => fetchEmployeeKpiDetail(employeeId, evaluationItemId!),
    enabled: Boolean(employeeId) && Boolean(evaluationItemId) && (options.enabled ?? true),
    staleTime: 60_000,
    retry: options.retry ?? false,
  });
}
