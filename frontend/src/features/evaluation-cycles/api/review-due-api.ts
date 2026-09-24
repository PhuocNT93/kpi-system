import { getApi, postApi } from '@/shared/api/api-client';
import { randomUUID } from '@/shared/utils/uuid';
import type {
  ReviewDueFiltersDTO,
  ReviewDueResponseDTO,
  CreateIndividualCyclesPayload,
  CreateIndividualCyclesResultDTO,
} from '../types/review-due.types';

export const reviewDueApi = {
  getReviewDue: async (filters?: ReviewDueFiltersDTO): Promise<ReviewDueResponseDTO> => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters?.team_id) {
      params.append('team_id', filters.team_id);
    }
    if (filters?.cadence_id) {
      params.append('cadence_id', filters.cadence_id);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.lead_time_days !== undefined) {
      params.append('lead_time_days', String(filters.lead_time_days));
    }
    if (filters?.limit !== undefined) {
      params.append('limit', String(filters.limit));
    }
    if (filters?.offset !== undefined) {
      params.append('offset', String(filters.offset));
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return getApi<ReviewDueResponseDTO>(`/api/reviews/due${queryString}`);
  },

  createIndividualCycles: async (
    payload: CreateIndividualCyclesPayload
  ): Promise<CreateIndividualCyclesResultDTO> => {
    return postApi<CreateIndividualCyclesResultDTO>(
      '/api/evaluation-cycles/individual',
      payload,
      randomUUID()
    );
  },
};
