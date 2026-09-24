import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewDueApi } from '../api/review-due-api';
import type {
  ReviewDueFiltersDTO,
  CreateIndividualCyclesPayload,
} from '../types/review-due.types';

export const reviewDueKeys = {
  all: ['reviews', 'due'] as const,
  list: (filters?: ReviewDueFiltersDTO) => ['reviews', 'due', filters] as const,
};

export function useReviewDue(filters?: ReviewDueFiltersDTO) {
  return useQuery({
    queryKey: reviewDueKeys.list(filters),
    queryFn: () => reviewDueApi.getReviewDue(filters),
  });
}

export function useCreateIndividualCycles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateIndividualCyclesPayload) =>
      reviewDueApi.createIndividualCycles(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewDueKeys.all });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
    },
  });
}
