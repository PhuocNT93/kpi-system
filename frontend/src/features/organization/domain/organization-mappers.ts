// Wire → Domain mappers for the Organization feature
// All snake_case → camelCase conversion happens here — never in components

import type { WireTeam, WireTeamDetail, WireDepartment } from '../api/organization-types';
import type { OrgTeam, OrgTeamDetail, OrgDepartment } from './organization-models';

export function mapWireTeamToDomain(wire: WireTeam): OrgTeam {
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    description: wire.description,
    departmentId: wire.department_id,
    isActive: wire.active,
    createdAt: new Date(wire.created_at),
    updatedAt: new Date(wire.updated_at),
  };
}

export function mapWireTeamDetailToDomain(wire: WireTeamDetail): OrgTeamDetail {
  return {
    ...mapWireTeamToDomain(wire),
    memberCount: wire.member_count,
    activeMemberCount: wire.active_member_count,
  };
}

export function mapWireDepartmentToDomain(wire: WireDepartment): OrgDepartment {
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    isActive: wire.active,
    createdAt: new Date(wire.created_at),
    updatedAt: new Date(wire.updated_at),
  };
}
