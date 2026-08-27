import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '../api/organization-api';
import { organizationKeys } from '../api/organization-keys';
import type { CreateJobLevelRequest, UpdateJobLevelRequest } from '../api/organization-types';

export function useJobLevels(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: organizationKeys.jobLevels.list(filters),
    queryFn: () => organizationApi.getJobLevels(filters),
  });
}

export function useCreateJobLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobLevelRequest) => organizationApi.createJobLevel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.jobLevels.all });
    },
  });
}

export function useUpdateJobLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobLevelRequest }) =>
      organizationApi.updateJobLevel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.jobLevels.all });
    },
  });
}
