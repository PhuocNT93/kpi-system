import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evaluationCycleApi } from '../api/cycle-api';
import type {
  CreateEvaluationCyclePayload,
  UpdateEvaluationCyclePayload,
  CycleFilterParams,
} from '../types/cycle-types';

export const CYCLE_QUERY_KEYS = {
  all: ['evaluation-cycles'] as const,
  list: (params?: CycleFilterParams) => ['evaluation-cycles', 'list', params] as const,
  detail: (id: string) => ['evaluation-cycles', 'detail', id] as const,
  scopePreview: (id: string) => ['evaluation-cycles', 'scope-preview', id] as const,
  openingStatus: (id: string) => ['evaluation-cycles', 'opening-status', id] as const,
};

export function useEvaluationCyclesQuery(params?: CycleFilterParams) {
  return useQuery({
    queryKey: CYCLE_QUERY_KEYS.list(params),
    queryFn: () => evaluationCycleApi.getCycles(params),
  });
}

export function useEvaluationCycleDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: CYCLE_QUERY_KEYS.detail(id ?? ''),
    queryFn: () => evaluationCycleApi.getCycleById(id!),
    enabled: Boolean(id),
  });
}

export function useScopePreviewQuery(id: string | undefined) {
  return useQuery({
    queryKey: CYCLE_QUERY_KEYS.scopePreview(id ?? ''),
    queryFn: () => evaluationCycleApi.getScopePreview(id!),
    enabled: Boolean(id),
  });
}

export function useCreateEvaluationCycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEvaluationCyclePayload) => evaluationCycleApi.createCycle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CYCLE_QUERY_KEYS.all });
    },
  });
}

export function useUpdateEvaluationCycleMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEvaluationCyclePayload) => evaluationCycleApi.updateCycle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CYCLE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CYCLE_QUERY_KEYS.detail(id) });
    },
  });
}

export function useOpenCycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => evaluationCycleApi.openCycle(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: CYCLE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CYCLE_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: CYCLE_QUERY_KEYS.scopePreview(id) });
    },
  });
}

export function useLockCycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => evaluationCycleApi.lockCycle(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: CYCLE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CYCLE_QUERY_KEYS.detail(id) });
    },
  });
}

export function useTransitionCycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetStatus }: { id: string; targetStatus: import('../types/cycle-types').CycleStatus }) =>
      evaluationCycleApi.transitionCycle(id, targetStatus),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: CYCLE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CYCLE_QUERY_KEYS.detail(id) });
    },
  });
}
