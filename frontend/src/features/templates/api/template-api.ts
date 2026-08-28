import { getApi, postApi, putApi } from '../../../shared/api/api-client';
import type {
  EvaluationTemplate,
  EvaluationTemplateVersion,
  Criterion,
  TemplateKpi,
  TemplateValidationResult,
} from '../domain/template-models';
import {
  mapWireTemplateToDomain,
  mapWireVersionToDomain,
  mapWireCriterionToDomain,
} from '../domain/template-mappers';

export const MOCK_ROLES = [
  { id: 'role-si', code: 'role-si', name: 'Software Engineer' },
  { id: 'role-sm', code: 'role-sm', name: 'Software Manager' },
  { id: 'role-ba', code: 'role-ba', name: 'Business Analyst' },
  { id: 'role-qa', code: 'role-qa', name: 'Quality Assurance' },
];

export const MOCK_TEAMS = [
  { id: 'team-a', code: 'team-a', name: 'Team A (Platform Core)' },
  { id: 'team-b', code: 'team-b', name: 'Team B (Frontend Experience)' },
  { id: 'team-c', code: 'team-c', name: 'Team C (Data Infrastructure)' },
];

export async function fetchJobRoles(): Promise<Array<{ id: string; code: string; name: string }>> {
  try {
    const res = await getApi<any>('/api/iam/roles');
    const items = Array.isArray(res) ? res : res?.items || res?.data || [];
    if (!items.length) return MOCK_ROLES;
    return items.map((r: any) => ({
      id: r.id || r.role_id || r.code,
      code: r.code || r.id,
      name: r.name || r.code,
    }));
  } catch {
    return MOCK_ROLES;
  }
}

export async function fetchTeams(): Promise<Array<{ id: string; code: string; name: string }>> {
  try {
    const res = await getApi<any>('/api/teams');
    const items = Array.isArray(res) ? res : res?.teams || res?.items || res?.data || [];
    if (!items.length) return MOCK_TEAMS;
    return items.map((t: any) => ({
      id: t.id || t.teamId || t.team_id || t.code,
      code: t.code || t.id,
      name: t.name || t.code,
    }));
  } catch {
    return MOCK_TEAMS;
  }
}

export async function fetchEvaluationTemplates(): Promise<EvaluationTemplate[]> {
  const data = await getApi<any[]>('/api/v1/configuration/templates');
  return (data || []).map(mapWireTemplateToDomain);
}

export async function fetchEvaluationTemplateById(id: string): Promise<EvaluationTemplate> {
  const data = await getApi<any>(`/api/v1/configuration/templates/${id}`);
  return mapWireTemplateToDomain(data);
}

export async function fetchTemplateVersionById(
  templateId: string,
  versionId: string
): Promise<EvaluationTemplateVersion> {
  const data = await getApi<any>(
    `/api/v1/configuration/templates/${templateId}/versions/${versionId}`
  );
  return mapWireVersionToDomain(data);
}

export async function fetchCriterionLibrary(): Promise<Criterion[]> {
  const data = await getApi<any[]>('/api/v1/configuration/criteria');
  return (data || []).map(mapWireCriterionToDomain);
}

export async function createEvaluationTemplate(payload: {
  code: string;
  name: string;
  description?: string;
}): Promise<EvaluationTemplate> {
  const data = await postApi<any>('/api/v1/configuration/templates', payload);
  return mapWireTemplateToDomain(data);
}

export async function createTemplateVersion(
  templateId: string,
  fromVersionId?: string
): Promise<EvaluationTemplateVersion> {
  const data = await postApi<any>(
    `/api/v1/configuration/templates/${templateId}/versions`,
    {
      from_version_id: fromVersionId,
    }
  );
  return mapWireVersionToDomain(data);
}

export async function bulkUpdateTemplateStructure(
  templateId: string,
  versionId: string,
  kpis: TemplateKpi[],
  expectedVersion: number
): Promise<EvaluationTemplateVersion> {
  const payload = {
    expected_version: expectedVersion,
    kpis: kpis.map((kpi) => ({
      kpi_id: kpi.kpiId,
      weight: kpi.weight,
      display_order: kpi.displayOrder,
      criteria: kpi.criteria.map((c) => ({
        criterion_version_id: c.criterionVersionId,
        weight: c.effectiveWeight,
        applicable_role_ids: c.applicableRoleIds,
        applicable_team_ids: c.applicableTeamIds,
        is_disabled: c.isDisabled,
        is_optional: c.isOptional,
        display_order: c.displayOrder,
        custom_scoring_rule: c.customScoringRule
          ? {
              rule_type: c.customScoringRule.ruleType,
              config: c.customScoringRule.config,
            }
          : undefined,
      })),
    })),
  };

  const data = await putApi<any>(
    `/api/v1/configuration/templates/${templateId}/versions/${versionId}/structure`,
    payload
  );
  return mapWireVersionToDomain(data);
}

export async function validateTemplateVersionApi(
  templateId: string,
  versionId: string
): Promise<TemplateValidationResult> {
  try {
    const data = await postApi<any>(
      `/api/v1/configuration/templates/${templateId}/versions/${versionId}/validate`,
      {}
    );
    return {
      isValid: data.valid,
      errors: data.errors || [],
      warnings: data.warnings || [],
      configuredWeightTotal: data.actual_weight || 100,
    };
  } catch (err: any) {
    // Client-side fallback if backend route unavailable in mock dev environment
    return {
      isValid: false,
      errors: [
        {
          code: 'WEIGHT_TOTAL_NOT_100',
          category: 'WEIGHT',
          message: err.message || 'Validation failed on server',
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
  const data = await postApi<any>(
    `/api/v1/configuration/templates/${templateId}/versions/${versionId}/publish`,
    { expected_version: expectedVersion }
  );
  return mapWireVersionToDomain(data);
}

export async function archiveEvaluationTemplate(templateId: string): Promise<void> {
  await postApi(`/api/v1/configuration/templates/${templateId}/deactivate`, {});
}
