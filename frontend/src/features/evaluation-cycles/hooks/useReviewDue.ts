import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewDueApi } from '../api/review-due-api';
import { reviewDueKeys } from '../api/review-due-keys';
import type { CreateIndividualCyclesPayload } from '../types/review-due.types';
import type { ReviewDueFilters } from '../domain/review-due-models';

export { reviewDueKeys };

export function useReviewDue(filters?: ReviewDueFilters) {
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
