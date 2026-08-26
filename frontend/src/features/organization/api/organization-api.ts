import { getApi, postApi, patchApi } from '../../../shared/api/api-client';
import type {
  WireTeam,
  WireTeamDetail,
  WireDepartment,
  CreateTeamRequest,
  UpdateTeamRequest,
} from './organization-types';
import {
  mapWireTeamToDomain,
  mapWireTeamDetailToDomain,
  mapWireDepartmentToDomain,
} from '../domain/organization-mappers';
import type { OrgTeam, OrgTeamDetail, OrgDepartment } from '../domain/organization-models';
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
    const data = await getApi<WireDepartment[]>(`/api/departments${params}`);
    return data.map(mapWireDepartmentToDomain);
  },
};
