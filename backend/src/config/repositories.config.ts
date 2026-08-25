import { Pool } from 'pg';
import { UserRepository, PostgresUserRepository } from '../modules/auth/index.js';
import {
  RoleRepository,
  PermissionRepository,
  UserRoleRepository,
  RolePermissionRepository,
  AuditWriter,
  PostgresRoleRepository,
  PostgresPermissionRepository,
  PostgresUserRoleRepository,
  PostgresRolePermissionRepository,
  PostgresAuditWriter,
} from '../modules/iam/index.js';

export interface RepositoryOptions {
  userRepository?: UserRepository;
  roleRepository?: RoleRepository;
  permissionRepository?: PermissionRepository;
  userRoleRepository?: UserRoleRepository;
  rolePermissionRepository?: RolePermissionRepository;
  auditWriter?: AuditWriter;
}

export interface ResolvedRepositories {
  userRepository: UserRepository;
  roleRepository: RoleRepository;
  permissionRepository: PermissionRepository;
  userRoleRepository: UserRoleRepository;
  rolePermissionRepository: RolePermissionRepository;
  auditWriter: AuditWriter;
}

export function resolveRepositories(pool?: Pool, options: RepositoryOptions = {}): ResolvedRepositories {
  const userRepository =
    options.userRepository ||
    (pool ? new PostgresUserRepository(pool) : (undefined as unknown as UserRepository));

  const roleRepository =
    options.roleRepository ||
    (pool ? new PostgresRoleRepository(pool) : (undefined as unknown as RoleRepository));

  const permissionRepository =
    options.permissionRepository ||
    (pool ? new PostgresPermissionRepository(pool) : (undefined as unknown as PermissionRepository));

  const userRoleRepository =
    options.userRoleRepository ||
    (pool ? new PostgresUserRoleRepository(pool) : (undefined as unknown as UserRoleRepository));

  const rolePermissionRepository =
    options.rolePermissionRepository ||
    (pool ? new PostgresRolePermissionRepository(pool) : (undefined as unknown as RolePermissionRepository));

  const auditWriter =
    options.auditWriter ||
    (pool ? new PostgresAuditWriter(pool) : (undefined as unknown as AuditWriter));

  return {
    userRepository,
    roleRepository,
    permissionRepository,
    userRoleRepository,
    rolePermissionRepository,
    auditWriter,
  };
}
