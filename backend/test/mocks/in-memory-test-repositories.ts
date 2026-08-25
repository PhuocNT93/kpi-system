import { User, UserRepository } from '../../src/modules/auth/domain/user.model.js';
import { NotFound, Conflict } from '../../src/api/app-error.js';
import {
  Role,
  Permission,
  UserRole,
  RolePermission,
  AuthorizationScope,
  AuditEvent,
} from '../../src/modules/iam/domain/types.js';
import {
  RoleRepository,
  PermissionRepository,
  UserRoleRepository,
  RolePermissionRepository,
  AuditWriter,
} from '../../src/modules/iam/domain/repositories.js';

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const id = this.emailIndex.get(normalizedEmail);
    if (!id) return null;
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const normalizedEmail = userData.email.toLowerCase().trim();
    if (this.emailIndex.has(normalizedEmail)) {
      throw new Conflict('Email is already registered', 'DUPLICATE_EMAIL');
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const user: User = {
      ...userData,
      email: normalizedEmail,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);
    this.emailIndex.set(normalizedEmail, id);
    return { ...user };
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new NotFound('User');
    }

    const updatedUser: User = {
      ...user,
      passwordHash,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return { ...updatedUser };
  }

  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
  }
}

export class InMemoryRoleRepository implements RoleRepository {
  private roles = new Map<string, Role>();

  async findById(id: string): Promise<Role | null> {
    return this.roles.get(id) || null;
  }

  async findByCode(code: string): Promise<Role | null> {
    const normalized = code.trim().toUpperCase();
    for (const role of this.roles.values()) {
      if (role.code.toUpperCase() === normalized) {
        return role;
      }
    }
    return null;
  }

  async findAll(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async create(role: Role): Promise<Role> {
    this.roles.set(role.id, { ...role });
    return role;
  }

  async update(role: Role): Promise<Role> {
    const existing = this.roles.get(role.id);
    if (!existing) {
      throw new Error(`Role with id ${role.id} not found.`);
    }
    const updated = { ...role, updatedAt: new Date() };
    this.roles.set(role.id, updated);
    return updated;
  }
}

export class InMemoryPermissionRepository implements PermissionRepository {
  private permissions = new Map<string, Permission>();

  async findById(id: string): Promise<Permission | null> {
    return this.permissions.get(id) || null;
  }

  async findByCode(code: string): Promise<Permission | null> {
    const normalized = code.trim().toLowerCase();
    for (const perm of this.permissions.values()) {
      if (perm.code.toLowerCase() === normalized) {
        return perm;
      }
    }
    return null;
  }

  async findAll(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  async create(permission: Permission): Promise<Permission> {
    this.permissions.set(permission.id, { ...permission });
    return permission;
  }
}

export class InMemoryUserRoleRepository implements UserRoleRepository {
  private userRoles: UserRole[] = [];

  async findRolesByUserId(userId: string): Promise<UserRole[]> {
    return this.userRoles.filter((ur) => ur.userId === userId);
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    const existing = await this.findByUserIdAndRoleId(userId, roleId);
    if (!existing) {
      this.userRoles.push({
        userId,
        roleId,
        createdAt: new Date(),
      });
    }
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    this.userRoles = this.userRoles.filter((ur) => !(ur.userId === userId && ur.roleId === roleId));
  }

  async findByUserIdAndRoleId(userId: string, roleId: string): Promise<UserRole | null> {
    return this.userRoles.find((ur) => ur.userId === userId && ur.roleId === roleId) || null;
  }
}

export class InMemoryRolePermissionRepository implements RolePermissionRepository {
  private rolePermissions: RolePermission[] = [];

  async findPermissionsByRoleId(roleId: string): Promise<RolePermission[]> {
    return this.rolePermissions.filter((rp) => rp.roleId === roleId);
  }

  async assignPermission(
    roleId: string,
    permissionId: string,
    scope: AuthorizationScope
  ): Promise<void> {
    const existingIndex = this.rolePermissions.findIndex(
      (rp) => rp.roleId === roleId && rp.permissionId === permissionId
    );
    if (existingIndex >= 0) {
      this.rolePermissions[existingIndex] = {
        roleId,
        permissionId,
        scope,
        createdAt: new Date(),
      };
    } else {
      this.rolePermissions.push({
        roleId,
        permissionId,
        scope,
        createdAt: new Date(),
      });
    }
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    this.rolePermissions = this.rolePermissions.filter(
      (rp) => !(rp.roleId === roleId && rp.permissionId === permissionId)
    );
  }

  async findByRoleIdAndPermissionId(
    roleId: string,
    permissionId: string
  ): Promise<RolePermission | null> {
    return (
      this.rolePermissions.find((rp) => rp.roleId === roleId && rp.permissionId === permissionId) || null
    );
  }
}

export class InMemoryAuditWriter implements AuditWriter {
  public events: AuditEvent[] = [];

  async record(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}
