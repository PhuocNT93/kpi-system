import type { Pool } from 'pg';
import {
  Role,
  Permission,
  UserRole,
  RolePermission,
  AuthorizationScope,
  AuditEvent,
} from '../domain/types.js';
import {
  RoleRepository,
  PermissionRepository,
  UserRoleRepository,
  RolePermissionRepository,
  AuditWriter,
} from '../domain/repositories.js';

interface RoleRow {
  role_id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  system_role: boolean;
  created_at: Date;
  updated_at: Date;
}

export class PostgresRoleRepository implements RoleRepository {
  constructor(private readonly pool: Pool) {}

  private mapRow(row: RoleRow): Role {
    return {
      id: row.role_id,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      active: row.active,
      systemRole: row.system_role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Role | null> {
    const query = `
      SELECT role_id, code, name, description, active, system_role, created_at, updated_at
      FROM role
      WHERE role_id = $1
    `;
    const res = await this.pool.query<RoleRow>(query, [id]);
    return res.rows.length > 0 ? this.mapRow(res.rows[0]!) : null;
  }

  async findByCode(code: string): Promise<Role | null> {
    const normalized = code.trim().toUpperCase();
    const query = `
      SELECT role_id, code, name, description, active, system_role, created_at, updated_at
      FROM role
      WHERE UPPER(code) = $1
    `;
    const res = await this.pool.query<RoleRow>(query, [normalized]);
    return res.rows.length > 0 ? this.mapRow(res.rows[0]!) : null;
  }

  async findAll(): Promise<Role[]> {
    const query = `
      SELECT role_id, code, name, description, active, system_role, created_at, updated_at
      FROM role
      ORDER BY code ASC
    `;
    const res = await this.pool.query<RoleRow>(query);
    return res.rows.map((row) => this.mapRow(row));
  }

  async create(role: Role): Promise<Role> {
    const query = `
      INSERT INTO role (role_id, code, name, description, active, system_role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (role_id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        active = EXCLUDED.active,
        system_role = EXCLUDED.system_role,
        updated_at = EXCLUDED.updated_at
      RETURNING role_id, code, name, description, active, system_role, created_at, updated_at
    `;
    const res = await this.pool.query<RoleRow>(query, [
      role.id,
      role.code,
      role.name,
      role.description ?? null,
      role.active,
      role.systemRole ?? false,
      role.createdAt || new Date(),
      role.updatedAt || new Date(),
    ]);
    return this.mapRow(res.rows[0]!);
  }

  async update(role: Role): Promise<Role> {
    const query = `
      UPDATE role
      SET code = $1, name = $2, description = $3, active = $4, system_role = $5, updated_at = CURRENT_TIMESTAMP
      WHERE role_id = $6
      RETURNING role_id, code, name, description, active, system_role, created_at, updated_at
    `;
    const res = await this.pool.query<RoleRow>(query, [
      role.code,
      role.name,
      role.description ?? null,
      role.active,
      role.systemRole ?? false,
      role.id,
    ]);
    if (res.rows.length === 0) {
      throw new Error(`Role with id ${role.id} not found.`);
    }
    return this.mapRow(res.rows[0]!);
  }
}

interface PermissionRow {
  permission_id: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class PostgresPermissionRepository implements PermissionRepository {
  constructor(private readonly pool: Pool) {}

  private mapRow(row: PermissionRow): Permission {
    return {
      id: row.permission_id,
      code: row.code,
      resource: row.resource,
      action: row.action,
      description: row.description ?? undefined,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Permission | null> {
    const query = `
      SELECT permission_id, code, resource, action, description, active, created_at, updated_at
      FROM permission
      WHERE permission_id = $1
    `;
    const res = await this.pool.query<PermissionRow>(query, [id]);
    return res.rows.length > 0 ? this.mapRow(res.rows[0]!) : null;
  }

  async findByCode(code: string): Promise<Permission | null> {
    const normalized = code.trim().toLowerCase();
    const query = `
      SELECT permission_id, code, resource, action, description, active, created_at, updated_at
      FROM permission
      WHERE LOWER(code) = $1
    `;
    const res = await this.pool.query<PermissionRow>(query, [normalized]);
    return res.rows.length > 0 ? this.mapRow(res.rows[0]!) : null;
  }

  async findAll(): Promise<Permission[]> {
    const query = `
      SELECT permission_id, code, resource, action, description, active, created_at, updated_at
      FROM permission
      ORDER BY code ASC
    `;
    const res = await this.pool.query<PermissionRow>(query);
    return res.rows.map((row) => this.mapRow(row));
  }

  async create(permission: Permission): Promise<Permission> {
    const query = `
      INSERT INTO permission (permission_id, code, resource, action, description, active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (permission_id) DO UPDATE SET
        code = EXCLUDED.code,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        description = EXCLUDED.description,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
      RETURNING permission_id, code, resource, action, description, active, created_at, updated_at
    `;
    const res = await this.pool.query<PermissionRow>(query, [
      permission.id,
      permission.code,
      permission.resource,
      permission.action,
      permission.description ?? null,
      permission.active,
      permission.createdAt || new Date(),
      permission.updatedAt || new Date(),
    ]);
    return this.mapRow(res.rows[0]!);
  }
}

interface UserRoleRow {
  user_id: string;
  role_id: string;
  created_at: Date;
}

export class PostgresUserRoleRepository implements UserRoleRepository {
  constructor(private readonly pool: Pool) {}

  private mapRow(row: UserRoleRow): UserRole {
    return {
      userId: row.user_id,
      roleId: row.role_id,
      createdAt: row.created_at,
    };
  }

  async findRolesByUserId(userId: string): Promise<UserRole[]> {
    const query = `
      SELECT user_id, role_id, created_at
      FROM user_role
      WHERE user_id = $1
    `;
    const res = await this.pool.query<UserRoleRow>(query, [userId]);
    return res.rows.map((row) => this.mapRow(row));
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    const query = `
      INSERT INTO user_role (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;
    await this.pool.query(query, [userId, roleId]);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const query = `
      DELETE FROM user_role
      WHERE user_id = $1 AND role_id = $2
    `;
    await this.pool.query(query, [userId, roleId]);
  }

  async findByUserIdAndRoleId(userId: string, roleId: string): Promise<UserRole | null> {
    const query = `
      SELECT user_id, role_id, created_at
      FROM user_role
      WHERE user_id = $1 AND role_id = $2
    `;
    const res = await this.pool.query<UserRoleRow>(query, [userId, roleId]);
    return res.rows.length > 0 ? this.mapRow(res.rows[0]!) : null;
  }
}

interface RolePermissionRow {
  role_id: string;
  permission_id: string;
  scope: AuthorizationScope;
  created_at: Date;
}

export class PostgresRolePermissionRepository implements RolePermissionRepository {
  constructor(private readonly pool: Pool) {}

  private mapRow(row: RolePermissionRow): RolePermission {
    return {
      roleId: row.role_id,
      permissionId: row.permission_id,
      scope: row.scope,
      createdAt: row.created_at,
    };
  }

  async findPermissionsByRoleId(roleId: string): Promise<RolePermission[]> {
    const query = `
      SELECT role_id, permission_id, scope, created_at
      FROM role_permission
      WHERE role_id = $1
    `;
    const res = await this.pool.query<RolePermissionRow>(query, [roleId]);
    return res.rows.map((row) => this.mapRow(row));
  }

  async assignPermission(
    roleId: string,
    permissionId: string,
    scope: AuthorizationScope
  ): Promise<void> {
    const query = `
      INSERT INTO role_permission (role_id, permission_id, scope)
      VALUES ($1, $2, $3)
      ON CONFLICT (role_id, permission_id) DO UPDATE SET
        scope = EXCLUDED.scope,
        created_at = CURRENT_TIMESTAMP
    `;
    await this.pool.query(query, [roleId, permissionId, scope]);
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    const query = `
      DELETE FROM role_permission
      WHERE role_id = $1 AND permission_id = $2
    `;
    await this.pool.query(query, [roleId, permissionId]);
  }

  async findByRoleIdAndPermissionId(
    roleId: string,
    permissionId: string
  ): Promise<RolePermission | null> {
    const query = `
      SELECT role_id, permission_id, scope, created_at
      FROM role_permission
      WHERE role_id = $1 AND permission_id = $2
    `;
    const res = await this.pool.query<RolePermissionRow>(query, [roleId, permissionId]);
    return res.rows.length > 0 ? this.mapRow(res.rows[0]!) : null;
  }
}

export class PostgresAuditWriter implements AuditWriter {
  constructor(private readonly pool: Pool) {}

  async record(event: AuditEvent): Promise<void> {
    const query = `
      INSERT INTO audit_event (id, type, actor_id, target_id, details, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await this.pool.query(query, [
      event.id,
      event.type,
      event.actorId ?? null,
      event.targetId ?? null,
      JSON.stringify(event.details ?? {}),
      event.timestamp || new Date(),
    ]);
  }
}
