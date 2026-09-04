import { getApi, postApi } from '@/shared/api/api-client';

export interface ReviewCadenceDTO {
  review_cadence_id: string;
  code: string;
  name: string;
  interval_months: number;
  is_system_default: boolean;
  active: boolean;
}

export const reviewCadenceApi = {
  list: async (): Promise<ReviewCadenceDTO[]> => {
    try {
      return await getApi<ReviewCadenceDTO[]>('/api/review-cadences');
    } catch {
      // graceful fallback for frontend-first implementation
      return [
        { review_cadence_id: 'rc-1', code: 'EVERY_6_MONTHS', name: '6 months', interval_months: 6, is_system_default: true, active: true },
        { review_cadence_id: 'rc-2', code: 'EVERY_2_MONTHS', name: '2 months', interval_months: 2, is_system_default: false, active: true },
      ];
    }
  },

  create: async (payload: { code: string; name: string; interval_months: number; is_system_default?: boolean }) => {
    return await postApi('/api/review-cadences', payload);
  },
};
