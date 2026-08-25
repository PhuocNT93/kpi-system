// Wire → Domain mappers for IAM feature
// All snake_case → camelCase conversion happens here — never in components
import type { WireIamUser, WireIamRole, WireIamPermission } from '../api/iam-types';
import type { IamUser, IamRole, IamPermission } from './iam-models';

export function mapWireUserToDomain(wire: WireIamUser): IamUser {
  return {
    id: wire.id,
    email: wire.email,
    name: wire.name,
    roleCode: wire.role_code,
    isActive: wire.is_active,
    createdAt: new Date(wire.created_at),
    updatedAt: new Date(wire.updated_at),
  };
}

export function mapWireRoleToDomain(wire: WireIamRole): IamRole {
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    description: wire.description,
    permissionCodes: wire.permission_codes || [],
    createdAt: new Date(wire.created_at),
    updatedAt: new Date(wire.updated_at),
  };
}

export function mapWirePermissionToDomain(wire: WireIamPermission): IamPermission {
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    description: wire.description,
  };
}
