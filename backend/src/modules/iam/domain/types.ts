export type AuthorizationScope = 'SELF' | 'TEAM' | 'ORGANIZATION' | 'SYSTEM';

export interface UserIdentity {
  userId: string;
  employeeId?: string;
  active: boolean;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  systemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  userId: string;
  roleId: string;
  createdAt: Date;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  scope: AuthorizationScope;
  createdAt: Date;
}

export interface EffectivePermission {
  code: string;
  resource: string;
  action: string;
  scope: AuthorizationScope;
}

export interface AuthorizationContext {
  userId: string;
  roles: Role[];
  permissions: EffectivePermission[];
}

export interface AuthorizationRequirement {
  permission: string;
  scope?: AuthorizationScope;
}

export interface ScopeContext {
  userId: string;
  employeeId?: string;
  managedTeamIds?: string[];
  organizationId?: string;
}

export type AuditEventType =
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REMOVED'
  | 'PERMISSION_ASSIGNED'
  | 'PERMISSION_REMOVED';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  actorId?: string;
  targetId?: string;
  details: Record<string, unknown>;
  timestamp: Date;
}
