import {
  Role,
  Permission,
  UserRole,
  RolePermission,
  AuthorizationScope,
  AuditEvent,
} from './types.js';

export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByCode(code: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  create(role: Role): Promise<Role>;
  update(role: Role): Promise<Role>;
}

export interface PermissionRepository {
  findById(id: string): Promise<Permission | null>;
  findByCode(code: string): Promise<Permission | null>;
  findAll(): Promise<Permission[]>;
  create(permission: Permission): Promise<Permission>;
}

export interface UserRoleRepository {
  findRolesByUserId(userId: string): Promise<UserRole[]>;
  assignRole(userId: string, roleId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
  findByUserIdAndRoleId(userId: string, roleId: string): Promise<UserRole | null>;
}

export interface RolePermissionRepository {
  findPermissionsByRoleId(roleId: string): Promise<RolePermission[]>;
  assignPermission(roleId: string, permissionId: string, scope: AuthorizationScope): Promise<void>;
  removePermission(roleId: string, permissionId: string): Promise<void>;
  findByRoleIdAndPermissionId(roleId: string, permissionId: string): Promise<RolePermission | null>;
}

export interface AuditWriter {
  record(event: AuditEvent): Promise<void>;
}
