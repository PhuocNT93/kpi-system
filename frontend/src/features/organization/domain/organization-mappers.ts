// Wire → Domain mappers for the Organization feature
// All snake_case → camelCase conversion happens here — never in components

import type { WireTeam, WireTeamDetail, WireDepartment, WireJobRole, WireJobLevel, WireReviewCadence, WireEmployee, WireEffectiveCadence } from '../api/organization-types';
import type { OrgTeam, OrgTeamDetail, OrgDepartment, OrgJobRole, OrgJobLevel, OrgReviewCadence, OrgEmployee, EffectiveCadence } from './organization-models';

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

export function mapWireJobRoleToDomain(wire: WireJobRole): OrgJobRole {
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    description: wire.description,
    isActive: wire.active,
    createdAt: new Date(wire.created_at),
    updatedAt: new Date(wire.updated_at),
  };
}

export function mapWireJobLevelToDomain(wire: WireJobLevel): OrgJobLevel {
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    rank: wire.rank,
    isActive: wire.active,
    defaultReviewCadenceId: wire.default_review_cadence_id ?? null,
    createdAt: new Date(wire.created_at),
    updatedAt: new Date(wire.updated_at),
  };
}

export function mapWireReviewCadenceToDomain(wire: WireReviewCadence): OrgReviewCadence {
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    intervalMonths: wire.interval_months,
    isSystemDefault: wire.is_system_default,
    isActive: wire.active,
    createdAt: new Date(wire.created_at),
    updatedAt: new Date(wire.updated_at),
  };
}

export function mapWireEffectiveCadenceToDomain(
  wire: WireEffectiveCadence | null | undefined,
): EffectiveCadence | null {
  if (!wire) return null;
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    intervalMonths: wire.interval_months,
    source: wire.source,
  };
}

export function mapWireEmployeeToDomain(wire: WireEmployee): OrgEmployee {
  return {
    id: wire.id,
    employeeCode: wire.employee_code,
    fullName: wire.full_name,
    email: wire.email,
    departmentId: wire.department_id,
    teamId: wire.team_id,
    roleId: wire.role_id,
    jobLevelId: wire.job_level_id,
    managerId: wire.manager_id,
    employmentStatus: wire.employment_status,
    joinDate: wire.join_date,
    terminationDate: wire.termination_date,
    reviewCadenceOverrideId: wire.review_cadence_override_id ?? null,
    lastEvaluationCompletedAt: wire.last_evaluation_completed_at,
    nextReviewDueDate: wire.next_review_due_date,
    effectiveCadence: mapWireEffectiveCadenceToDomain(wire.effective_cadence),
    version: wire.version,
    createdAt: new Date(wire.created_at),
    updatedAt: new Date(wire.updated_at),
  };
}
