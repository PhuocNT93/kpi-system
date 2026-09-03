import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchKpis,
  fetchKpiById,
  createKpi,
  updateKpi,
  deleteKpi,
  fetchKpiRelationships,
  createRelationship,
  deleteRelationship,
} from './kpi-api';
import type {
  KpiFilter,
  KpiCreateDTO,
  KpiUpdateDTO,
  RelationshipCreateDTO,
} from './kpi-api';

export const kpiKeys = {
  all: ['kpis'] as const,
  list: (filter?: KpiFilter) => [...kpiKeys.all, 'list', filter] as const,
  detail: (id: string) => [...kpiKeys.all, 'detail', id] as const,
  relationships: () => [...kpiKeys.all, 'relationships'] as const,
};

export function useKpisQuery(filter?: KpiFilter) {
  return useQuery({
    queryKey: kpiKeys.list(filter),
    queryFn: () => fetchKpis(filter),
  });
}

export function useKpiDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: kpiKeys.detail(id!),
    queryFn: () => fetchKpiById(id!),
    enabled: Boolean(id),
  });
}

export function useKpiRelationshipsQuery() {
  return useQuery({
    queryKey: kpiKeys.relationships(),
    queryFn: fetchKpiRelationships,
  });
}

export function useCreateKpiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: KpiCreateDTO) => createKpi(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kpiKeys.all });
    },
  });
}

export function useUpdateKpiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: KpiUpdateDTO }) => updateKpi(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kpiKeys.all });
    },
  });
}

export function useDeleteKpiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteKpi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kpiKeys.all });
    },
  });
}

export function useCreateRelationshipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: RelationshipCreateDTO) => createRelationship(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kpiKeys.relationships() });
    },
  });
}

export function useDeleteRelationshipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRelationship(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kpiKeys.relationships() });
    },
  });
}
