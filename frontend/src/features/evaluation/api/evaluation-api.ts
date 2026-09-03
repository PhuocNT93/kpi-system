import { getApi, putApi, postApi } from '@/shared/api/api-client';
import type { MyEvaluation, TeamEvaluation, EvaluationDetail } from '../domain/evaluation-models';

const EVALUATIONS_BASE = '/api/v1/evaluations';

export const evaluationApi = {
  getMyEvaluations: async (): Promise<MyEvaluation[]> => {
    return getApi<MyEvaluation[]>(`${EVALUATIONS_BASE}/my`);
  },

  getTeamEvaluations: async (): Promise<TeamEvaluation[]> => {
    return getApi<TeamEvaluation[]>(`${EVALUATIONS_BASE}/team`);
  },

  getEvaluationDetail: async (id: string): Promise<EvaluationDetail> => {
    return getApi<EvaluationDetail>(`${EVALUATIONS_BASE}/${id}`);
  },

  saveDraft: async (id: string, items: { id: string; resolved_level?: number; comment?: string }[]): Promise<void> => {
    return putApi(`${EVALUATIONS_BASE}/${id}/items`, { items });
  },

  submitEvaluation: async (id: string): Promise<void> => {
    return postApi(`${EVALUATIONS_BASE}/${id}/submit`, {});
  },

  approveEvaluation: async (id: string): Promise<void> => {
    return postApi(`${EVALUATIONS_BASE}/${id}/approve`, {});
  },
};
