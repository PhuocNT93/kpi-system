import { getApi, putApi, postApi } from '@/shared/api/api-client';
import type { MyEvaluation, EvaluationDetail } from '../domain/evaluation-models';

export const evaluationApi = {
  getMyEvaluations: async (): Promise<MyEvaluation[]> => {
    return getApi<MyEvaluation[]>('/api/v1/evaluations/my');
  },

  getEvaluationDetail: async (id: string): Promise<EvaluationDetail> => {
    return getApi<EvaluationDetail>(`/api/v1/evaluations/${id}`);
  },

  saveDraft: async (id: string, items: { id: string; resolved_level?: number; comment?: string }[]): Promise<void> => {
    return putApi(`/api/v1/evaluations/${id}/items`, { items });
  },

  submitEvaluation: async (id: string): Promise<void> => {
    return postApi(`/api/v1/evaluations/${id}/submit`, {});
  },
};
