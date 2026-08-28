import { getApi, postApi, putApi } from '@/shared/api/api-client';
import type {
  EvaluationCycleDTO,
  CreateEvaluationCyclePayload,
  UpdateEvaluationCyclePayload,
  ScopePreviewDTO,
  CycleOpenResultDTO,
  CycleOpeningStatusDTO,
  CycleFilterParams,
} from '../types/cycle-types';

export const evaluationCycleApi = {
  getCycles: async (params?: CycleFilterParams): Promise<EvaluationCycleDTO[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.templateId && params.templateId !== 'ALL') query.append('templateId', params.templateId);
    if (params?.teamId && params.teamId !== 'ALL') query.append('teamId', params.teamId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return getApi<EvaluationCycleDTO[]>(`/evaluation-cycles${queryString}`);
  },

  getCycleById: async (id: string): Promise<EvaluationCycleDTO> => {
    return getApi<EvaluationCycleDTO>(`/evaluation-cycles/${id}`);
  },

  createCycle: async (payload: CreateEvaluationCyclePayload): Promise<EvaluationCycleDTO> => {
    return postApi<EvaluationCycleDTO>('/evaluation-cycles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCycle: async (id: string, payload: UpdateEvaluationCyclePayload): Promise<EvaluationCycleDTO> => {
    return putApi<EvaluationCycleDTO>(`/evaluation-cycles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getScopePreview: async (id: string): Promise<ScopePreviewDTO> => {
    return getApi<ScopePreviewDTO>(`/evaluation-cycles/${id}/scope-preview`);
  },

  openCycle: async (id: string): Promise<CycleOpenResultDTO> => {
    return postApi<CycleOpenResultDTO>(`/evaluation-cycles/${id}/open`, {
      method: 'POST',
    });
  },

  getOpeningStatus: async (id: string): Promise<CycleOpeningStatusDTO> => {
    return getApi<CycleOpeningStatusDTO>(`/evaluation-cycles/${id}/opening-status`);
  },

  lockCycle: async (id: string): Promise<EvaluationCycleDTO> => {
    return postApi<EvaluationCycleDTO>(`/evaluation-cycles/${id}/lock`, {
      method: 'POST',
    });
  },
};
