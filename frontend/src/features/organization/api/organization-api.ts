import { getApi, postApi, patchApi } from '../../../shared/api/api-client';
import type {
  WireTeam, WireTeamDetail, WireDepartment, WireJobRole, WireJobLevel,
  CreateTeamRequest, UpdateTeamRequest,
  CreateDepartmentRequest, UpdateDepartmentRequest,
  CreateJobRoleRequest, UpdateJobRoleRequest,
  CreateJobLevelRequest, UpdateJobLevelRequest
} from './organization-types';
import {
  mapWireTeamToDomain, mapWireTeamDetailToDomain, mapWireDepartmentToDomain,
  mapWireJobRoleToDomain, mapWireJobLevelToDomain
} from '../domain/organization-mappers';
import type { 
  OrgTeam, OrgTeamDetail, OrgDepartment, OrgJobRole, OrgJobLevel 
} from '../domain/organization-models';
import { randomUUID } from '../../../shared/utils/uuid';

// Per FE Rules §2: data from the backend is always in the ApiEnvelope wrapper;
// the typed API client unwraps it before returning. Wire types here reflect the
// unwrapped `data` field only.

export const organizationApi = {
  // ── Teams ──────────────────────────────────────────────────────────────────

  getTeams: async (filters?: Record<string, unknown>): Promise<OrgTeam[]> => {
    const params = filters
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : '';
    const data = await getApi<WireTeam[]>(`/api/teams${params}`);
    return data.map(mapWireTeamToDomain);
  },

  getTeamById: async (id: string): Promise<OrgTeamDetail> => {
    const data = await getApi<WireTeamDetail>(`/api/teams/${id}`);
    return mapWireTeamDetailToDomain(data);
  },

  createTeam: async (body: CreateTeamRequest): Promise<OrgTeam> => {
    // Per FE Rule §5: generate idempotency key once per user action
    const idempotencyKey = randomUUID();
    const data = await postApi<WireTeam>('/api/teams', body, idempotencyKey);
    return mapWireTeamToDomain(data);
  },

  updateTeam: async (id: string, body: UpdateTeamRequest): Promise<OrgTeam> => {
    const data = await patchApi<WireTeam>(`/api/teams/${id}`, body);
    return mapWireTeamToDomain(data);
  },

  deactivateTeam: async (id: string): Promise<{ id: string; active: boolean }> => {
    const data = await postApi<{ id: string; active: boolean }>(`/api/teams/${id}/deactivate`, {});
    return data;
  },

  // ── Departments ─────────────────────────────────────────────────────────────

  getDepartments: async (filters?: Record<string, unknown>): Promise<OrgDepartment[]> => {
    const params = filters
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : '';
    const data = await getApi<WireDepartment[]>(`/api/org/departments${params}`);
    return data.map(mapWireDepartmentToDomain);
  },

  createDepartment: async (body: CreateDepartmentRequest): Promise<OrgDepartment> => {
    const data = await postApi<WireDepartment>('/api/org/departments', body, randomUUID());
    return mapWireDepartmentToDomain(data);
  },

  updateDepartment: async (id: string, body: UpdateDepartmentRequest): Promise<OrgDepartment> => {
    const data = await patchApi<WireDepartment>(`/api/org/departments/${id}`, body);
    return mapWireDepartmentToDomain(data);
  },

  // ── Job Roles ─────────────────────────────────────────────────────────────

  getJobRoles: async (filters?: Record<string, unknown>): Promise<OrgJobRole[]> => {
    const params = filters
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : '';
    const data = await getApi<WireJobRole[]>(`/api/org/roles${params}`);
    return data.map(mapWireJobRoleToDomain);
  },

  createJobRole: async (body: CreateJobRoleRequest): Promise<OrgJobRole> => {
    const data = await postApi<WireJobRole>('/api/org/roles', body, randomUUID());
    return mapWireJobRoleToDomain(data);
  },

  updateJobRole: async (id: string, body: UpdateJobRoleRequest): Promise<OrgJobRole> => {
    const data = await patchApi<WireJobRole>(`/api/org/roles/${id}`, body);
    return mapWireJobRoleToDomain(data);
  },

  // ── Job Levels ─────────────────────────────────────────────────────────────

  getJobLevels: async (filters?: Record<string, unknown>): Promise<OrgJobLevel[]> => {
    const params = filters
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : '';
    const data = await getApi<WireJobLevel[]>(`/api/org/job-levels${params}`);
    return data.map(mapWireJobLevelToDomain);
  },

  createJobLevel: async (body: CreateJobLevelRequest): Promise<OrgJobLevel> => {
    const data = await postApi<WireJobLevel>('/api/org/job-levels', body, randomUUID());
    return mapWireJobLevelToDomain(data);
  },

  updateJobLevel: async (id: string, body: UpdateJobLevelRequest): Promise<OrgJobLevel> => {
    const data = await patchApi<WireJobLevel>(`/api/org/job-levels/${id}`, body);
    return mapWireJobLevelToDomain(data);
  },
};
