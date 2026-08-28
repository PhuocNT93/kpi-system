import { getApi, postApi, patchApi } from '../../../shared/api/api-client';
import type {
  Criterion,
  CriterionVersion,
  ScoringRule,
  CreateCriterionDto,
  UpdateCriterionDto,
  UpdateCriterionVersionDto,
  CreateScoringRuleDto,
  UpdateScoringRuleDto,
} from '../domain/criteria-models';

const CONFIG_BASE = '/api/v1/configuration';

export async function fetchCriteria(search?: string, category?: string) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  const qs = params.toString();
  const url = `${CONFIG_BASE}/criteria${qs ? '?' + qs : ''}`;
  const res = await getApi<any>(url);
  return res as Criterion[];
}

export async function fetchCriterionById(id: string) {
  const res = await getApi<any>(`${CONFIG_BASE}/criteria/${id}`);
  return res as Criterion;
}

export async function createCriterion(data: CreateCriterionDto) {
  const res = await postApi<any>(`${CONFIG_BASE}/criteria`, data);
  return res as Criterion; // { criterion, initialVersion } returned from backend, adjust if needed
}

export async function updateCriterion(id: string, data: UpdateCriterionDto) {
  const res = await patchApi<any>(`${CONFIG_BASE}/criteria/${id}`, data);
  return res as Criterion;
}

export async function fetchCriterionVersions(id: string) {
  const res = await getApi<any>(`${CONFIG_BASE}/criteria/${id}/versions`);
  return res as CriterionVersion[];
}

export async function updateCriterionVersion(criterionId: string, versionId: string, data: UpdateCriterionVersionDto) {
  const res = await patchApi<any>(`${CONFIG_BASE}/criteria/${criterionId}/versions/${versionId}`, data);
  return res as CriterionVersion;
}

export async function publishCriterionVersion(criterionId: string, versionId: string) {
  const res = await postApi<any>(`${CONFIG_BASE}/criteria/${criterionId}/versions/${versionId}/publish`, {});
  return res as CriterionVersion;
}

export async function fetchScoringRules() {
  const res = await getApi<any>(`${CONFIG_BASE}/scoring-rules`);
  return res as ScoringRule[];
}

export async function createScoringRule(data: CreateScoringRuleDto) {
  const res = await postApi<any>(`${CONFIG_BASE}/scoring-rules`, data);
  return res as ScoringRule;
}

export async function updateScoringRule(id: string, data: UpdateScoringRuleDto) {
  const res = await patchApi<any>(`${CONFIG_BASE}/scoring-rules/${id}`, data);
  return res as ScoringRule;
}

export async function publishScoringRule(id: string) {
  const res = await postApi<any>(`${CONFIG_BASE}/scoring-rules/${id}/publish`, {});
  return res as ScoringRule;
}
