import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCriteria,
  fetchCriterionById,
  createCriterion,
  fetchCriterionVersions,
  updateCriterionVersion,
  publishCriterionVersion,
  fetchScoringRules,
} from './criteria-api';

export const criteriaKeys = {
  all: ['criteria'] as const,
  list: (search?: string, category?: string) => [...criteriaKeys.all, 'list', search, category] as const,
  detail: (id: string) => [...criteriaKeys.all, 'detail', id] as const,
  versions: (id: string) => [...criteriaKeys.all, 'versions', id] as const,
  rulesAll: ['scoring-rules'] as const,
  rulesList: () => [...criteriaKeys.rulesAll, 'list'] as const,
};

export function useCriteriaQuery(search?: string, category?: string) {
  return useQuery({
    queryKey: criteriaKeys.list(search, category),
    queryFn: () => fetchCriteria(search, category),
  });
}

export function useCriterionDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: criteriaKeys.detail(id!),
    queryFn: () => fetchCriterionById(id!),
    enabled: Boolean(id),
  });
}

export function useCriterionVersionsQuery(id: string | undefined) {
  return useQuery({
    queryKey: criteriaKeys.versions(id!),
    queryFn: () => fetchCriterionVersions(id!),
    enabled: Boolean(id),
  });
}

export function useScoringRulesQuery() {
  return useQuery({
    queryKey: criteriaKeys.rulesList(),
    queryFn: fetchScoringRules,
  });
}

// Mutations
export function useCreateCriterionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCriterion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: criteriaKeys.all });
      queryClient.invalidateQueries({ queryKey: ['templates', 'criteria-library'] });
    },
  });
}

export function useUpdateCriterionVersionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ criterionId, versionId, data }: { criterionId: string, versionId: string, data: any }) => 
      updateCriterionVersion(criterionId, versionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: criteriaKeys.versions(variables.criterionId) });
      queryClient.invalidateQueries({ queryKey: criteriaKeys.list() });
      queryClient.invalidateQueries({ queryKey: ['templates', 'criteria-library'] });
    },
  });
}

export function usePublishCriterionVersionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ criterionId, versionId }: { criterionId: string, versionId: string }) => 
      publishCriterionVersion(criterionId, versionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: criteriaKeys.versions(variables.criterionId) });
      queryClient.invalidateQueries({ queryKey: criteriaKeys.list() });
      queryClient.invalidateQueries({ queryKey: ['templates', 'criteria-library'] });
    },
  });
}
