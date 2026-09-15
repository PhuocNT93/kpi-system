import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { employeeSearchApi, type EmployeeSearchQueryParams } from '../api/employee-search.api';

export const employeeSearchKeys = {
  all: ['employee-search'] as const,
  list: (params: EmployeeSearchQueryParams) => ['employee-search', params] as const,
};

export function useEmployeeSearch(params: EmployeeSearchQueryParams) {
  return useQuery({
    queryKey: employeeSearchKeys.list(params),
    queryFn: () => employeeSearchApi.search(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
