import {
  RoleRepository,
  PermissionRepository,
  UserRoleRepository,
  RolePermissionRepository,
  AuditWriter,
} from '../domain/repositories.js';
import {
  AuthorizationContext,
  AuthorizationRequirement,
  AuthorizationScope,
  EffectivePermission,
  Role,
} from '../domain/types.js';
import { Forbidden, NotFound, ValidationError } from '../../../api/app-error.js';

export class AuthorizationService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permRepo: PermissionRepository,
    private readonly userRoleRepo: UserRoleRepository,
    private readonly rolePermRepo: RolePermissionRepository
  ) {}

  async getAuthorizationContext(userId: string): Promise<AuthorizationContext> {
    const userRoles = await this.userRoleRepo.findRolesByUserId(userId);

    const activeRoles: Role[] = [];
    const effectivePermsMap = new Map<string, EffectivePermission>();

    for (const ur of userRoles) {
      const role = await this.roleRepo.findById(ur.roleId);
      if (role && role.active) {
        activeRoles.push(role);
        const rolePerms = await this.rolePermRepo.findPermissionsByRoleId(role.id);

        for (const rp of rolePerms) {
          const perm = await this.permRepo.findById(rp.permissionId);
          if (perm && perm.active) {
            const currentScopeRank = getScopeRank(rp.scope);
            const existing = effectivePermsMap.get(perm.code);
            if (!existing || getScopeRank(existing.scope) < currentScopeRank) {
              effectivePermsMap.set(perm.code, {
                code: perm.code,
                resource: perm.resource,
                action: perm.action,
                scope: rp.scope,
              });
            }
          }
        }
      }
    }

    return {
      userId,
      roles: activeRoles,
      permissions: Array.from(effectivePermsMap.values()),
    };
  }

  async hasPermission(userId: string, permissionCode: string, scope?: AuthorizationScope): Promise<boolean> {
    const ctx = await this.getAuthorizationContext(userId);
    const eff = ctx.permissions.find((p) => p.code.toLowerCase() === permissionCode.toLowerCase());

    if (!eff) {
      return false;
    }

    if (!scope) {
      return true;
    }

    return getScopeRank(eff.scope) >= getScopeRank(scope);
  }

  async authorize(userId: string, requirement: AuthorizationRequirement): Promise<void> {
    const allowed = await this.hasPermission(userId, requirement.permission, requirement.scope);
    if (!allowed) {
      throw new Forbidden('You do not have permission to perform this action.');
    }
  }
}

const SCOPE_RANK: Record<AuthorizationScope, number> = {
  SELF: 1,
  TEAM: 2,
  ORGANIZATION: 3,
  SYSTEM: 4,
};

function getScopeRank(scope: AuthorizationScope): number {
  return SCOPE_RANK[scope] || 0;
}

export class RoleService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly auditWriter?: AuditWriter
  ) {}

  async getRoles(): Promise<Role[]> {
    return this.roleRepo.findAll();
  }

  async getRoleById(id: string): Promise<Role> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFound(`Role with ID ${id} not found.`);
    }
    return role;
  }

  async createRole(data: { code: string; name: string; description?: string }, actorId?: string): Promise<Role> {
    if (!data.code || !data.code.trim()) {
      throw new ValidationError('Role code is required.', [{ field: 'code', code: 'REQUIRED', message: 'Role code is required.' }]);
    }
    const code = data.code.trim().toUpperCase();
    const existing = await this.roleRepo.findByCode(code);
    if (existing) {
      throw new ValidationError(`Role code '${code}' already exists.`, [{ field: 'code', code: 'DUPLICATE', message: `Role code '${code}' already exists.` }]);
    }

    const role: Role = {
      id: `role-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code,
      name: data.name.trim(),
      description: data.description?.trim(),
      active: true,
      systemRole: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await this.roleRepo.create(role);

    if (this.auditWriter) {
      await this.auditWriter.record({
        id: crypto.randomUUID(),
        type: 'ROLE_CREATED',
        actorId,
        targetId: created.id,
        details: { code: created.code, name: created.name },
        timestamp: new Date(),
      });
    }

    return created;
  }

  async updateRole(
    id: string,
    data: { name?: string; description?: string; active?: boolean },
    actorId?: string
  ): Promise<Role> {
    const role = await this.getRoleById(id);

    if (data.name !== undefined) role.name = data.name.trim();
    if (data.description !== undefined) role.description = data.description.trim();
    if (data.active !== undefined) role.active = data.active;

    const updated = await this.roleRepo.update(role);

    if (this.auditWriter) {
      await this.auditWriter.record({
        id: crypto.randomUUID(),
        type: 'ROLE_UPDATED',
        actorId,
        targetId: updated.id,
        details: data,
        timestamp: new Date(),
      });
    }

    return updated;
  }
}

export class PermissionService {
  constructor(private readonly permRepo: PermissionRepository) {}

  async getPermissions() {
    return this.permRepo.findAll();
  }

  async getPermissionById(id: string) {
    const perm = await this.permRepo.findById(id);
    if (!perm) {
      throw new NotFound(`Permission with ID ${id} not found.`);
    }
    return perm;
  }

  async createPermission(data: { resource: string; action: string; description?: string }) {
    if (!data.resource || !data.resource.trim() || !data.action || !data.action.trim()) {
      throw new ValidationError('Resource and action are required.', [
        { field: 'resource', code: 'REQUIRED', message: 'Resource is required.' },
        { field: 'action', code: 'REQUIRED', message: 'Action is required.' },
      ]);
    }
    const resource = data.resource.trim().toLowerCase();
    const action = data.action.trim().toLowerCase();
    const code = `${resource}:${action}`;

    const existing = await this.permRepo.findByCode(code);
    if (existing) {
      throw new ValidationError(`Permission '${code}' already exists.`, [
        { field: 'code', code: 'DUPLICATE', message: `Permission '${code}' already exists.` },
      ]);
    }

    const perm = await this.permRepo.create({
      id: `perm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code,
      resource,
      action,
      description: data.description?.trim(),
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return perm;
  }
}

export class RoleAssignmentService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permRepo: PermissionRepository,
    private readonly userRoleRepo: UserRoleRepository,
    private readonly rolePermRepo: RolePermissionRepository,
    private readonly auditWriter?: AuditWriter
  ) {}

  async getUserRoles(userId: string): Promise<Role[]> {
    const userRoles = await this.userRoleRepo.findRolesByUserId(userId);
    const roles: Role[] = [];
    for (const ur of userRoles) {
      const role = await this.roleRepo.findById(ur.roleId);
      if (role) roles.push(role);
    }
    return roles;
  }

  async assignRole(userId: string, roleCode: string, actorId?: string): Promise<void> {
    const role = await this.roleRepo.findByCode(roleCode);
    if (!role) {
      throw new NotFound(`Role '${roleCode}' not found.`);
    }
    if (!role.active) {
      throw new ValidationError(`Role '${roleCode}' is inactive.`, [
        { field: 'roleCode', code: 'INACTIVE', message: `Role '${roleCode}' is inactive.` },
      ]);
    }

    await this.userRoleRepo.assignRole(userId, role.id);

    if (this.auditWriter) {
      await this.auditWriter.record({
        id: crypto.randomUUID(),
        type: 'ROLE_ASSIGNED',
        actorId,
        targetId: userId,
        details: { userId, roleCode: role.code },
        timestamp: new Date(),
      });
    }
  }

  async removeRole(userId: string, roleCode: string, actorId?: string): Promise<void> {
    const role = await this.roleRepo.findByCode(roleCode);
    if (!role) {
      throw new NotFound(`Role '${roleCode}' not found.`);
    }

    await this.userRoleRepo.removeRole(userId, role.id);

    if (this.auditWriter) {
      await this.auditWriter.record({
        id: crypto.randomUUID(),
        type: 'ROLE_REMOVED',
        actorId,
        targetId: userId,
        details: { userId, roleCode: role.code },
        timestamp: new Date(),
      });
    }
  }

  async getRolePermissions(roleId: string) {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new NotFound(`Role with ID ${roleId} not found.`);

    const rolePerms = await this.rolePermRepo.findPermissionsByRoleId(roleId);
    const result = [];
    for (const rp of rolePerms) {
      const perm = await this.permRepo.findById(rp.permissionId);
      if (perm) {
        result.push({ ...perm, scope: rp.scope });
      }
    }
    return result;
  }

  async assignPermissionToRole(
    roleId: string,
    permissionCode: string,
    scope: AuthorizationScope = 'ORGANIZATION',
    actorId?: string
  ): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new NotFound(`Role with ID ${roleId} not found.`);

    const perm = await this.permRepo.findByCode(permissionCode);
    if (!perm) throw new NotFound(`Permission '${permissionCode}' not found.`);

    await this.rolePermRepo.assignPermission(role.id, perm.id, scope);

    if (this.auditWriter) {
      await this.auditWriter.record({
        id: crypto.randomUUID(),
        type: 'PERMISSION_ASSIGNED',
        actorId,
        targetId: role.id,
        details: { roleId: role.id, permissionCode: perm.code, scope },
        timestamp: new Date(),
      });
    }
  }

  async removePermissionFromRole(roleId: string, permissionCode: string, actorId?: string): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new NotFound(`Role with ID ${roleId} not found.`);

    const perm = await this.permRepo.findByCode(permissionCode);
    if (!perm) throw new NotFound(`Permission '${permissionCode}' not found.`);

    await this.rolePermRepo.removePermission(role.id, perm.id);

    if (this.auditWriter) {
      await this.auditWriter.record({
        id: crypto.randomUUID(),
        type: 'PERMISSION_REMOVED',
        actorId,
        targetId: role.id,
        details: { roleId: role.id, permissionCode: perm.code },
        timestamp: new Date(),
      });
    }
  }
}
