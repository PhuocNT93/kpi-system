import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { iamApi } from '../api/iam-api';
import { iamKeys } from '../api/iam-keys';
import type { CreateRoleRequest, UpdateRoleRequest, AssignPermissionRequest } from '../api/iam-types';

export function useRoles() {
  return useQuery({
    queryKey: iamKeys.roles.list(),
    queryFn: () => iamApi.getRoles(),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleRequest) => iamApi.createRole(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iamKeys.roles.all });
    },
  });
}

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateRoleRequest) => iamApi.updateRole(id, body),
    onSuccess: (updatedRole) => {
      queryClient.invalidateQueries({ queryKey: iamKeys.roles.all });
      queryClient.setQueryData(iamKeys.roles.detail(id), updatedRole);
    },
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: iamKeys.permissions.list(),
    queryFn: () => iamApi.getPermissions(),
  });
}

export function useAssignPermission(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignPermissionRequest) => iamApi.assignPermission(roleId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iamKeys.roles.all });
      queryClient.invalidateQueries({ queryKey: iamKeys.permissions.all });
    },
  });
}

export function useRevokePermission(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissionCode: string) => iamApi.revokePermission(roleId, permissionCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iamKeys.roles.all });
    },
  });
}
