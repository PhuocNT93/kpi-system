import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '../api/organization-api';
import { organizationKeys } from '../api/organization-keys';
import type { CreateDepartmentRequest, UpdateDepartmentRequest } from '../api/organization-types';

export function useDepartments(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: organizationKeys.departments.list(filters),
    queryFn: () => organizationApi.getDepartments(filters),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentRequest) => organizationApi.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.departments.all });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentRequest }) =>
      organizationApi.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.departments.all });
    },
  });
}
