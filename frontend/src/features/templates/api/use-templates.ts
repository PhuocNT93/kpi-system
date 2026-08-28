import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchEvaluationTemplates,
  fetchEvaluationTemplateById,
  fetchTemplateVersionById,
  fetchCriterionLibrary,
  fetchJobRoles,
  fetchTeams,
  createEvaluationTemplate,
  createTemplateVersion,
  bulkUpdateTemplateStructure,
  validateTemplateVersionApi,
  publishTemplateVersion,
  archiveEvaluationTemplate,
} from './template-api';
import type { TemplateKpi } from '../domain/template-models';

export const templateKeys = {
  all: ['templates'] as const,
  list: () => [...templateKeys.all, 'list'] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
  version: (templateId: string, versionId: string) =>
    [...templateKeys.all, 'version', templateId, versionId] as const,
  criteriaLibrary: () => [...templateKeys.all, 'criteria-library'] as const,
  jobRoles: () => ['org', 'roles'] as const,
  teams: () => ['org', 'teams'] as const,
};

export function useJobRolesQuery() {
  return useQuery({
    queryKey: templateKeys.jobRoles(),
    queryFn: fetchJobRoles,
  });
}

export function useTeamsQuery() {
  return useQuery({
    queryKey: templateKeys.teams(),
    queryFn: fetchTeams,
  });
}

export function useValidateTemplateVersionMutation() {
  return useMutation({
    mutationFn: ({
      templateId,
      versionId,
    }: {
      templateId: string;
      versionId: string;
    }) => validateTemplateVersionApi(templateId, versionId),
  });
}

export function useTemplatesQuery() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: fetchEvaluationTemplates,
  });
}

export function useTemplateDetailQuery(templateId: string | undefined) {
  return useQuery({
    queryKey: templateKeys.detail(templateId!),
    queryFn: () => fetchEvaluationTemplateById(templateId!),
    enabled: Boolean(templateId),
  });
}

export function useTemplateVersionQuery(
  templateId: string | undefined,
  versionId: string | undefined
) {
  return useQuery({
    queryKey: templateKeys.version(templateId!, versionId!),
    queryFn: () => fetchTemplateVersionById(templateId!, versionId!),
    enabled: Boolean(templateId && versionId),
  });
}

export function useCriterionLibraryQuery() {
  return useQuery({
    queryKey: templateKeys.criteriaLibrary(),
    queryFn: fetchCriterionLibrary,
  });
}

export function useCreateTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvaluationTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });
}

export function useCreateVersionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      fromVersionId,
    }: {
      templateId: string;
      fromVersionId?: string;
    }) => createTemplateVersion(templateId, fromVersionId),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(templateId) });
      queryClient.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });
}

export function useSaveTemplateStructureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      versionId,
      kpis,
      expectedVersion,
    }: {
      templateId: string;
      versionId: string;
      kpis: TemplateKpi[];
      expectedVersion: number;
    }) => bulkUpdateTemplateStructure(templateId, versionId, kpis, expectedVersion),
    onSuccess: (data, { templateId, versionId }) => {
      queryClient.setQueryData(templateKeys.version(templateId, versionId), data);
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(templateId) });
    },
  });
}

export function usePublishVersionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      versionId,
      expectedVersion,
    }: {
      templateId: string;
      versionId: string;
      expectedVersion: number;
    }) => publishTemplateVersion(templateId, versionId, expectedVersion),
    onSuccess: (_, { templateId, versionId }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.version(templateId, versionId) });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(templateId) });
      queryClient.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });
}

export function useArchiveTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveEvaluationTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });
}
