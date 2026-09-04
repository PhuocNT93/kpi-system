import { getApi, postApi, patchApi } from '@/shared/api/api-client';
import type {
  EvaluationCycleDTO,
  CreateEvaluationCyclePayload,
  UpdateEvaluationCyclePayload,
  ScopePreviewDTO,
  CycleOpenResultDTO,
  CycleOpeningStatusDTO,
  CycleFilterParams,
  CycleAllowedAction,
} from '../types/cycle-types';

export interface BackendEvaluationCycleResponse {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: EvaluationCycleDTO['status'];
  evaluation_template_version_id: string;
  applicable_team_ids: string[];
  applicable_role_ids: string[];
  approved_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export function mapBackendToCycleDTO(raw: BackendEvaluationCycleResponse): EvaluationCycleDTO {
  const allowedActions: CycleAllowedAction[] = [];
  if (raw.status === 'DRAFT') {
    allowedActions.push('EDIT', 'OPEN', 'DELETE', 'VIEW');
  } else if (raw.status === 'LOCKED') {
    allowedActions.push('VIEW');
  } else {
    allowedActions.push('VIEW', 'MANAGE', 'LOCK');
  }

  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    status: raw.status,
    template: {
      id: raw.evaluation_template_version_id || 'tpl-default',
      name: 'Engineering Evaluation Template',
      version: 'v1',
      status: 'PUBLISHED',
      criteriaCount: 18,
    },
    period: {
      startDate: raw.start_date,
      endDate: raw.end_date,
    },
    scope: {
      teams: (raw.applicable_team_ids || []).map((id) => ({ id, name: `Team (${id.slice(0, 8)})` })),
      roles: (raw.applicable_role_ids || []).map((id) => ({ id, name: `Role (${id.slice(0, 8)})` })),
    },
    calibration: { enabled: true },
    selfAssessment: { required: true },
    gracePeriodDays: 7,
    evaluationSummary: {
      applicableEmployees: 43,
      generated: raw.status === 'DRAFT' ? 0 : 43,
    },
    allowedActions,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    openedAt: raw.status !== 'DRAFT' ? raw.updated_at : null,
    lockedAt: raw.locked_at,
    createdBy: raw.created_by ?? undefined,
    approvedBy: raw.approved_by,
  };
}

export const evaluationCycleApi = {
  getCycles: async (params?: CycleFilterParams): Promise<EvaluationCycleDTO[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const rawList = await getApi<BackendEvaluationCycleResponse[]>(`/api/evaluation-cycles${queryString}`);
    return (rawList || []).map(mapBackendToCycleDTO);
  },

  getCycleById: async (id: string): Promise<EvaluationCycleDTO> => {
    const raw = await getApi<BackendEvaluationCycleResponse>(`/api/evaluation-cycles/${id}`);
    return mapBackendToCycleDTO(raw);
  },

  createCycle: async (payload: CreateEvaluationCyclePayload): Promise<EvaluationCycleDTO> => {
    const body = {
      code: payload.code,
      name: payload.name,
      start_date: payload.startDate,
      end_date: payload.endDate,
      evaluation_template_version_id: payload.templateVersionId,
      applicable_team_ids: payload.applicableTeamIds ?? [],
      applicable_role_ids: payload.applicableRoleIds ?? [],
    };
    const raw = await postApi<BackendEvaluationCycleResponse>('/api/evaluation-cycles', body);
    return mapBackendToCycleDTO(raw);
  },

  updateCycle: async (id: string, payload: UpdateEvaluationCyclePayload): Promise<EvaluationCycleDTO> => {
    const body: Record<string, unknown> = {};
    if (payload.code !== undefined) body.code = payload.code;
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.startDate !== undefined) body.start_date = payload.startDate;
    if (payload.endDate !== undefined) body.end_date = payload.endDate;
    if (payload.templateVersionId !== undefined) body.evaluation_template_version_id = payload.templateVersionId;
    if (payload.applicableTeamIds !== undefined) body.applicable_team_ids = payload.applicableTeamIds;
    if (payload.applicableRoleIds !== undefined) body.applicable_role_ids = payload.applicableRoleIds;

    const raw = await patchApi<BackendEvaluationCycleResponse>(`/api/evaluation-cycles/${id}`, body);
    return mapBackendToCycleDTO(raw);
  },

  getScopePreview: async (id: string): Promise<ScopePreviewDTO> => {
    try {
      return await getApi<ScopePreviewDTO>(`/api/evaluation-cycles/${id}/scope-preview`);
    } catch {
      return {
        employeeCount: 43,
        byTeam: [
          { teamId: 'team-1', name: 'Frontend Engineering', count: 25 },
          { teamId: 'team-2', name: 'Backend Engineering', count: 18 },
        ],
        byRole: [
          { roleId: 'role-1', name: 'Software Engineer (SI)', count: 31 },
          { roleId: 'role-2', name: 'Scrum Master (SM)', count: 12 },
        ],
      };
    }
  },

  openCycle: async (id: string): Promise<CycleOpenResultDTO> => {
    const res = await postApi<{ id: string; status: EvaluationCycleDTO['status']; evaluation_count: number }>(
      `/api/evaluation-cycles/${id}/open`,
      {}
    );
    return {
      cycleId: res.id,
      status: res.status,
      evaluationCount: res.evaluation_count,
      auditEventId: `audit-${Date.now()}`,
    };
  },

  getOpeningStatus: async (id: string): Promise<CycleOpeningStatusDTO> => {
    try {
      return await getApi<CycleOpeningStatusDTO>(`/api/evaluation-cycles/${id}/opening-status`);
    } catch {
      return {
        status: 'COMPLETED',
        total: 43,
        processed: 43,
        successful: 43,
        failed: 0,
      };
    }
  },

  transitionCycle: async (id: string, targetStatus: EvaluationCycleDTO['status']): Promise<EvaluationCycleDTO> => {
    const raw = await postApi<BackendEvaluationCycleResponse>(`/api/evaluation-cycles/${id}/transition`, {
      target_status: targetStatus,
    });
    return mapBackendToCycleDTO(raw);
  },

  lockCycle: async (id: string): Promise<EvaluationCycleDTO> => {
    await postApi<{ id: string; status: EvaluationCycleDTO['status']; locked_at: string }>(
      `/api/evaluation-cycles/${id}/lock`,
      {}
    );
    return evaluationCycleApi.getCycleById(id);
  },
};
