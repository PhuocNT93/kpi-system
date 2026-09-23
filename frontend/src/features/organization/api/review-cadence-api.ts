import { getApi, postApi, patchApi, deleteApi } from '../../../shared/api/api-client';
import { randomUUID } from '../../../shared/utils/uuid';
import type {
  WireReviewCadence,
  CreateReviewCadenceRequest,
  UpdateReviewCadenceRequest,
} from './organization-types';
import { mapWireReviewCadenceToDomain } from '../domain/organization-mappers';
import type { OrgReviewCadence } from '../domain/organization-models';

export const reviewCadenceApi = {
  getCadences: async (filters?: { active?: boolean }): Promise<OrgReviewCadence[]> => {
    const params = filters
      ? '?' +
        new URLSearchParams(
          Object.fromEntries(
            Object.entries(filters)
              .filter(([, v]) => v != null)
              .map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : '';
    const data = await getApi<WireReviewCadence[]>(`/api/review-cadences${params}`);
    return data.map(mapWireReviewCadenceToDomain);
  },

  getCadenceById: async (id: string): Promise<OrgReviewCadence> => {
    const data = await getApi<WireReviewCadence>(`/api/review-cadences/${id}`);
    return mapWireReviewCadenceToDomain(data);
  },

  createCadence: async (body: CreateReviewCadenceRequest): Promise<OrgReviewCadence> => {
    const idempotencyKey = randomUUID();
    const data = await postApi<WireReviewCadence>('/api/review-cadences', body, idempotencyKey);
    return mapWireReviewCadenceToDomain(data);
  },

  updateCadence: async (id: string, body: UpdateReviewCadenceRequest): Promise<OrgReviewCadence> => {
    const data = await patchApi<WireReviewCadence>(`/api/review-cadences/${id}`, body);
    return mapWireReviewCadenceToDomain(data);
  },

  deleteCadence: async (id: string): Promise<void> => {
    await deleteApi<null>(`/api/review-cadences/${id}`);
  },
};
