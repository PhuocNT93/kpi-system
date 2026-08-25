import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { iamApi } from '../api/iam-api';
import { iamKeys } from '../api/iam-keys';
import type { CreateUserRequest, UpdateUserRequest } from '../api/iam-types';

export function useUsers(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: iamKeys.users.list(filters),
    queryFn: () => iamApi.getUsers(filters),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserRequest) => iamApi.createUser(body),
    onSuccess: () => {
      // Invalidate exact user list queries per FE Rule §2
      queryClient.invalidateQueries({ queryKey: iamKeys.users.all });
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserRequest) => iamApi.updateUser(id, body),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: iamKeys.users.all });
      queryClient.setQueryData(iamKeys.users.detail(id), updatedUser);
    },
  });
}

export function useToggleUserStatus(id: string, isCurrentlyActive: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      isCurrentlyActive ? iamApi.deactivateUser(id) : iamApi.activateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iamKeys.users.all });
    },
  });
}
