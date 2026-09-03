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
  createdAt: string;
  updatedAt: string;
}

export interface KpiListResponse {
  items: Kpi[];
  total: number;
}

export interface KpiFilter {
  search?: string;
  page?: number;
  size?: number;
}

export interface KpiCreateDTO {
  code: string;
  name: string;
  description?: string | null;
}

export interface KpiUpdateDTO {
  name?: string;
  description?: string | null;
}

export interface RelationshipCreateDTO {
  sourceKpiId: string;
  targetKpiId: string;
  relationshipType: KpiRelationship['relationshipType'];
}

export async function fetchKpis(filter?: KpiFilter): Promise<KpiListResponse> {
  const params = new URLSearchParams();
  if (filter?.search) params.set('search', filter.search);
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.size) params.set('size', String(filter.size));
  const query = params.toString();
  return getApi<KpiListResponse>(`/api/kpis${query ? `?${query}` : ''}`);
}

export async function fetchKpiById(id: string): Promise<Kpi> {
  return getApi<Kpi>(`/api/kpis/${id}`);
}

export async function createKpi(dto: KpiCreateDTO): Promise<Kpi> {
  return postApi<Kpi>('/api/kpis', dto);
}

export async function updateKpi(id: string, dto: KpiUpdateDTO): Promise<Kpi> {
  return putApi<Kpi>(`/api/kpis/${id}`, dto);
}

export async function deleteKpi(id: string): Promise<void> {
  return deleteApi<void>(`/api/kpis/${id}`);
}

export async function fetchKpiRelationships(): Promise<KpiRelationship[]> {
  return getApi<KpiRelationship[]>('/api/kpis/relationships');
}

export async function createRelationship(dto: RelationshipCreateDTO): Promise<KpiRelationship> {
  return postApi<KpiRelationship>('/api/kpis/relationships', dto);
}

export async function deleteRelationship(id: string): Promise<void> {
  return deleteApi<void>(`/api/kpis/relationships/${id}`);
}
