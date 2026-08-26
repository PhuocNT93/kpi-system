import { useQuery } from '@tanstack/react-query';
import { organizationApi } from '../api/organization-api';
import { organizationKeys } from '../api/organization-keys';

export function useDepartments(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: organizationKeys.departments.list(filters),
    queryFn: () => organizationApi.getDepartments(filters),
  });
}
