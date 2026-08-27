import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '../api/organization-api';
import { organizationKeys } from '../api/organization-keys';
import type { CreateJobRoleRequest, UpdateJobRoleRequest } from '../api/organization-types';

export function useJobRoles(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: organizationKeys.roles.list(filters),
    queryFn: () => organizationApi.getJobRoles(filters),
  });
}

export function useCreateJobRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobRoleRequest) => organizationApi.createJobRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.roles.all });
    },
  });
}

export function useUpdateJobRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobRoleRequest }) =>
      organizationApi.updateJobRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.roles.all });
    },
  });
}
