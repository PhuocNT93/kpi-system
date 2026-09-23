import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewCadenceApi } from '../api/review-cadence-api';
import { organizationKeys } from '../api/organization-keys';
import type { CreateReviewCadenceRequest, UpdateReviewCadenceRequest } from '../api/organization-types';

export function useReviewCadences(filters?: { active?: boolean }) {
  return useQuery({
    queryKey: organizationKeys.reviewCadences.list(filters),
    queryFn: () => reviewCadenceApi.getCadences(filters),
  });
}

export function useReviewCadence(id: string) {
  return useQuery({
    queryKey: organizationKeys.reviewCadences.detail(id),
    queryFn: () => reviewCadenceApi.getCadenceById(id),
    enabled: !!id,
  });
}

export function useCreateReviewCadence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReviewCadenceRequest) => reviewCadenceApi.createCadence(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.reviewCadences.all });
    },
  });
}

export function useUpdateReviewCadence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReviewCadenceRequest }) =>
      reviewCadenceApi.updateCadence(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.reviewCadences.all });
    },
  });
}

export function useDeleteReviewCadence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewCadenceApi.deleteCadence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.reviewCadences.all });
    },
  });
}
