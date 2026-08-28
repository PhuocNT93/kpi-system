import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApi, postApi, putApi, deleteApi } from '@/shared/api/api-client';

export interface Kpi {
  kpiId: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KpiRelationship {
  relationshipId: string;
  sourceKpiId: string;
  targetKpiId: string;
  relationshipType: 'DEPENDS_ON' | 'SUPPORTS' | 'INFLUENCES' | 'BLOCKS' | 'PREREQUISITE_FOR';
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface CreateKpiDto {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateKpiDto {
  name?: string;
  description?: string;
}

export interface CreateKpiRelationshipDto {
  sourceKpiId: string;
  targetKpiId: string;
  relationshipType: string;
}

// ── KPI Queries & Mutations ───────────────────────────────────────────────

export function useKpis() {
  return useQuery({
    queryKey: ['kpis'],
    queryFn: () => getApi<Kpi[]>('/api/kpi'),
  });
}

export function useCreateKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKpiDto) => postApi<Kpi>('/api/kpi', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    },
  });
}

export function useUpdateKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kpiId, data }: { kpiId: string; data: UpdateKpiDto }) =>
      putApi<Kpi>(`/api/kpi/${kpiId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    },
  });
}

export function useDeleteKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kpiId: string) => deleteApi(`/api/kpi/${kpiId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    },
  });
}

// ── KPI Relationship Queries & Mutations ──────────────────────────────────

export function useKpiRelationships() {
  return useQuery({
    queryKey: ['kpi-relationships'],
    queryFn: () => getApi<KpiRelationship[]>('/api/kpi/relationships'),
  });
}

export function useCreateKpiRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKpiRelationshipDto) => postApi<KpiRelationship>('/api/kpi/relationships', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-relationships'] });
    },
  });
}

export function useDeleteKpiRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (relationshipId: string) => deleteApi(`/api/kpi/relationships/${relationshipId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-relationships'] });
    },
  });
}
