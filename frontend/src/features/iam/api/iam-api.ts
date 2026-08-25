import { getApi, postApi, putApi, deleteApi } from '../../../shared/api/api-client';
import type {
  WireIamUser, WireIamRole, WireIamPermission,
  CreateUserRequest, UpdateUserRequest,
  CreateRoleRequest, UpdateRoleRequest,
  AssignPermissionRequest,
} from './iam-types';
import { mapWireUserToDomain, mapWireRoleToDomain, mapWirePermissionToDomain } from '../domain/iam-mappers';
import type { IamUser, IamRole, IamPermission } from '../domain/iam-models';
import { randomUUID } from '../../../shared/utils/uuid';

// ── Users ──────────────────────────────────────────────────────────────────────
export const iamApi = {
  // Users
  getUsers: async (filters?: Record<string, unknown>): Promise<IamUser[]> => {
    const params = filters
      ? '?' + new URLSearchParams(filters as Record<string, string>).toString()
      : '';
    const data = await getApi<WireIamUser[]>(`/api/iam/users${params}`);
    return data.map(mapWireUserToDomain);
  },

  getUserById: async (id: string): Promise<IamUser> => {
    const data = await getApi<WireIamUser>(`/api/iam/users/${id}`);
    return mapWireUserToDomain(data);
  },

  createUser: async (body: CreateUserRequest): Promise<IamUser> => {
    // Per FE Rule §5: generate idempotency key once per user action
    const idempotencyKey = randomUUID();
    const data = await postApi<WireIamUser>('/api/iam/users', body, idempotencyKey);
    return mapWireUserToDomain(data);
  },

  updateUser: async (id: string, body: UpdateUserRequest): Promise<IamUser> => {
    const data = await putApi<WireIamUser>(`/api/iam/users/${id}`, body);
    return mapWireUserToDomain(data);
  },

  deactivateUser: async (id: string): Promise<IamUser> => {
    const data = await postApi<WireIamUser>(`/api/iam/users/${id}/deactivate`, {});
    return mapWireUserToDomain(data);
  },

  activateUser: async (id: string): Promise<IamUser> => {
    const data = await postApi<WireIamUser>(`/api/iam/users/${id}/activate`, {});
    return mapWireUserToDomain(data);
  },

  // Roles
  getRoles: async (): Promise<IamRole[]> => {
    const data = await getApi<WireIamRole[]>('/api/iam/roles');
    return data.map(mapWireRoleToDomain);
  },

  getRoleById: async (id: string): Promise<IamRole> => {
    const data = await getApi<WireIamRole>(`/api/iam/roles/${id}`);
    return mapWireRoleToDomain(data);
  },

  createRole: async (body: CreateRoleRequest): Promise<IamRole> => {
    const idempotencyKey = randomUUID();
    const data = await postApi<WireIamRole>('/api/iam/roles', body, idempotencyKey);
    return mapWireRoleToDomain(data);
  },

  updateRole: async (id: string, body: UpdateRoleRequest): Promise<IamRole> => {
    const data = await putApi<WireIamRole>(`/api/iam/roles/${id}`, body);
    return mapWireRoleToDomain(data);
  },

  // Permissions
  getPermissions: async (): Promise<IamPermission[]> => {
    const data = await getApi<WireIamPermission[]>('/api/iam/permissions');
    return data.map(mapWirePermissionToDomain);
  },

  assignPermission: async (roleId: string, body: AssignPermissionRequest): Promise<IamRole> => {
    const data = await postApi<WireIamRole>(`/api/iam/roles/${roleId}/permissions`, body);
    return mapWireRoleToDomain(data);
  },

  revokePermission: async (roleId: string, permissionCode: string): Promise<IamRole> => {
    const data = await deleteApi<WireIamRole>(
      `/api/iam/roles/${roleId}/permissions/${permissionCode}`,
    );
    return mapWireRoleToDomain(data);
  },
};
