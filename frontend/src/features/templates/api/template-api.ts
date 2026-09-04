import { getApi, postApi, putApi, deleteApi } from '../../../shared/api/api-client';
import type {
  EvaluationTemplate,
  EvaluationTemplateVersion,
  Criterion,
  TemplateCriterion,
  TemplateValidationResult,
} from '../domain/template-models';
import {
  mapWireTemplateToDomain,
  mapWireVersionToDomain,
  mapWireCriterionToDomain,
} from '../domain/template-mappers';

export const MOCK_TEAMS = [
  { id: 'team-a', code: 'team-a', name: 'Team A (Platform Core)' },
  { id: 'team-b', code: 'team-b', name: 'Team B (Frontend Experience)' },
  { id: 'team-c', code: 'team-c', name: 'Team C (Data Infrastructure)' },
];

export async function fetchJobRoles(): Promise<Array<{ id: string; code: string; name: string }>> {
  const res = await getApi<unknown>('/api/org/roles');
  const items = Array.isArray(res) ? res : (res as { items?: unknown[] })?.items || (res as { data?: unknown[] })?.data || [];
  return items.map((r: any) => {
    const role = r as { id?: string; role_id?: string; code?: string; name?: string };
    return {
      id: role.id || role.role_id || role.code || '',
      code: role.code || role.id || '',
      name: role.name || role.code || '',
    };
  });
}

export async function fetchTeams(): Promise<Array<{ id: string; code: string; name: string }>> {
  try {
    const res = await getApi<unknown>('/api/teams');
    const items = Array.isArray(res) ? res : (res as { teams?: unknown[] })?.teams || (res as { items?: unknown[] })?.items || (res as { data?: unknown[] })?.data || [];
    if (!items.length) return MOCK_TEAMS;
    return items.map((t: any) => {
      const team = t as { id?: string; teamId?: string; team_id?: string; code?: string; name?: string };
      return {
        id: team.id || team.teamId || team.team_id || team.code || '',
        code: team.code || team.id || '',
        name: team.name || team.code || '',
      };
    });
  } catch {
    return MOCK_TEAMS;
  }
}

export async function fetchEvaluationTemplates(): Promise<EvaluationTemplate[]> {
  const data = await getApi<Record<string, unknown>[]>('/api/v1/configuration/templates');
  return (data || []).map(mapWireTemplateToDomain);
}

export async function fetchEvaluationTemplateById(id: string): Promise<EvaluationTemplate> {
  const data = await getApi<Record<string, unknown>>(`/api/v1/configuration/templates/${id}`);
  return mapWireTemplateToDomain(data);
}

export async function fetchTemplateVersionById(
  templateId: string,
  versionId: string
): Promise<EvaluationTemplateVersion> {
  const data = await getApi<Record<string, unknown>>(
    `/api/v1/configuration/templates/${templateId}/versions/${versionId}`
  );
  return mapWireVersionToDomain(data);
}

export async function fetchCriterionLibrary(): Promise<Criterion[]> {
  const data = await getApi<Record<string, unknown>[]>('/api/v1/configuration/criteria');
  return (data || []).map(mapWireCriterionToDomain);
}

export async function createEvaluationTemplate(payload: {
  code: string;
  name: string;
  description?: string;
}): Promise<EvaluationTemplate> {
  const data = await postApi<Record<string, unknown>>('/api/v1/configuration/templates', payload);
  return mapWireTemplateToDomain(data);
}

export async function createTemplateVersion(
  templateId: string,
  fromVersionId?: string
): Promise<EvaluationTemplateVersion> {
  const data = await postApi<Record<string, unknown>>(
    `/api/v1/configuration/templates/${templateId}/versions`,
    {
      from_version_id: fromVersionId,
    }
  );
  return mapWireVersionToDomain(data);
}

export async function saveTemplateCriteriaDraft(
  templateId: string,
  versionId: string,
  templateKpiId: string,
  criteria: TemplateCriterion[],
  expectedVersion: number
): Promise<EvaluationTemplateVersion> {
  const payload = {
    expected_version: expectedVersion,
    templateKpiId: templateKpiId,
    criteria: criteria.map((c) => ({
      criterion_version_id: c.criterionVersionId,
      effective_weight: c.effectiveWeight,
      applicable_role_ids: c.applicableRoleIds,
      applicable_team_ids: c.applicableTeamIds,
      is_disabled: c.isDisabled,
      is_optional: c.isOptional,
      display_order: c.displayOrder,
    })),
  };

  const data = await putApi<Record<string, unknown>>(
    `/api/v1/configuration/templates/${templateId}/versions/${versionId}/criteria`,
    payload
  );
  return mapWireVersionToDomain(data);
}

export async function addTemplateKpiApi(
  templateId: string,
  versionId: string,
  kpiId: string,
  weight: number
): Promise<unknown> {
  return postApi<unknown>(
    `/api/v1/configuration/templates/${templateId}/versions/${versionId}/kpis`,
    { kpi_id: kpiId, weight }
  );
}

export async function removeTemplateKpiApi(
  templateId: string,
  versionId: string,
  templateKpiId: string
): Promise<void> {
  await deleteApi<void>(
    `/api/v1/configuration/templates/${templateId}/versions/${versionId}/kpis/${templateKpiId}`
  );
}

export async function validateTemplateVersionApi(
  templateId: string,
  versionId: string
): Promise<TemplateValidationResult> {
  try {
    const data = await postApi<{ valid: boolean; errors?: TemplateValidationResult['errors']; warnings?: TemplateValidationResult['warnings']; actual_weight?: number }>(
      `/api/v1/configuration/templates/${templateId}/versions/${versionId}/validate`,
      {}
    );
    return {
      isValid: data.valid,
      errors: data.errors || [],
      warnings: data.warnings || [],
      configuredWeightTotal: data.actual_weight || 100,
    };
  } catch (err) {
    // Client-side fallback if backend route unavailable in mock dev environment
    return {
      isValid: false,
      errors: [
        {
          code: 'WEIGHT_TOTAL_NOT_100',
          category: 'WEIGHT',
          message: err instanceof Error ? err.message : 'Validation failed on server',
        },
      ],
      warnings: [],
      configuredWeightTotal: 0,
    };
  }
}

export async function publishTemplateVersion(
  templateId: string,
  versionId: string,
  expectedVersion: number
): Promise<EvaluationTemplateVersion> {
  const data = await postApi<Record<string, unknown>>(
    `/api/v1/configuration/templates/${templateId}/versions/${versionId}/publish`,
    { expected_version: expectedVersion }
  );
  return mapWireVersionToDomain(data);
}

export async function archiveEvaluationTemplate(templateId: string): Promise<void> {
  await postApi(`/api/v1/configuration/templates/${templateId}/deactivate`, {});
}
