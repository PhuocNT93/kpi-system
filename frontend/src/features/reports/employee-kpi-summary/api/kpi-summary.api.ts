import { getApi } from '../../../../shared/api/api-client';
import type {
  KpiSummaryData,
  KpiDetailData,
  EmployeeInfo,
  EvaluationInfo,
  ScoreSummary,
  KpiItem,
  RelationshipTuple,
} from '../types/kpi-summary.types';

export interface GetKpiSummaryParams {
  employeeId: string;
  evaluationCycleId?: string;
  evaluationStatus?: string;
}

// Wire interfaces (snake_case)
interface WireEmployee {
  employee_id: string;
  employee_code?: string;
  full_name?: string;
  email?: string;
  department?: { department_id: string; name: string } | null;
  team?: { team_id: string; name: string } | null;
  role?: { role_id: string; name: string } | null;
  job_level?: { job_level_id: string; name: string } | null;
  manager?: { employee_id: string; full_name: string } | null;
}

interface WireEvaluation {
  evaluation_id: string;
  evaluation_cycle_id: string;
  cycle_name?: string;
  status: string;
  is_locked: boolean;
}

interface WireScoreSummary {
  official_score?: number | null;
  official_score_label?: string;
  overall_score?: number | null;
  overall_weighted_score?: number | null;
  kpi_count?: number;
  completed_count?: number;
}

interface WireKpiItem {
  evaluation_item_id: string;
  criterion_code: string;
  criterion_name: string;
  category?: string;
  display_order?: number;
  weight: number;
  measurement?: {
    value?: number | string | null;
    unit?: string | null;
    source_label?: string | null;
  };
  resolved_level?: number | null;
  raw_score?: number | null;
  weighted_score?: number | null;
  is_completed?: boolean;
  is_disabled?: boolean;
  comment?: string | null;
  evidence_count?: number;
  has_evidence?: boolean;
}

interface WireRelationship {
  source_id: string;
  target_id: string;
  relationship_type: string;
}

interface WireKpiSummaryResponse {
  employee: WireEmployee;
  evaluation: WireEvaluation;
  score_summary: WireScoreSummary;
  kpis: WireKpiItem[];
  relationships: WireRelationship[];
}

export function resolveLocalizedText(val: unknown, fallback = ''): string {
  if (val == null) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return String(parsed.vi || parsed.en || parsed.vn || Object.values(parsed)[0] || val);
        }
      } catch {
        return val;
      }
    }
    return val;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    return String(obj.vi || obj.en || obj.vn || Object.values(obj)[0] || fallback);
  }
  return String(val);
}

export function mapWireKpiSummary(wire: WireKpiSummaryResponse): KpiSummaryData {
  const employee: EmployeeInfo = {
    employeeId: wire.employee.employee_id,
    employeeCode: wire.employee.employee_code || '',
    fullName: resolveLocalizedText(wire.employee.full_name, 'Unnamed Employee'),
    email: wire.employee.email || '',
    department: wire.employee.department
      ? { departmentId: wire.employee.department.department_id, name: resolveLocalizedText(wire.employee.department.name) }
      : null,
    team: wire.employee.team
      ? { teamId: wire.employee.team.team_id, name: resolveLocalizedText(wire.employee.team.name) }
      : null,
    role: wire.employee.role
      ? { roleId: wire.employee.role.role_id, name: resolveLocalizedText(wire.employee.role.name) }
      : null,
    jobLevel: wire.employee.job_level
      ? { jobLevelId: wire.employee.job_level.job_level_id, name: resolveLocalizedText(wire.employee.job_level.name) }
      : null,
    manager: wire.employee.manager
      ? { employeeId: wire.employee.manager.employee_id, fullName: resolveLocalizedText(wire.employee.manager.full_name) }
      : null,
  };

  const evaluation: EvaluationInfo = {
    evaluationId: wire.evaluation.evaluation_id,
    evaluationCycleId: wire.evaluation.evaluation_cycle_id,
    cycleName: resolveLocalizedText(wire.evaluation.cycle_name, 'Evaluation Cycle'),
    status: wire.evaluation.status,
    isLocked: Boolean(wire.evaluation.is_locked),
  };

  const scoreSummary: ScoreSummary = {
    officialScore: wire.score_summary.official_score != null ? Number(wire.score_summary.official_score) : null,
    officialScoreLabel: resolveLocalizedText(wire.score_summary.official_score_label, 'Official Score'),
    overallScore: wire.score_summary.overall_score != null ? Number(wire.score_summary.overall_score) : null,
    overallWeightedScore: wire.score_summary.overall_weighted_score != null ? Number(wire.score_summary.overall_weighted_score) : null,
    kpiCount: wire.score_summary.kpi_count || 0,
    completedCount: wire.score_summary.completed_count || 0,
  };

  const kpis: KpiItem[] = (wire.kpis || []).map((item) => ({
    evaluationItemId: item.evaluation_item_id,
    criterionCode: resolveLocalizedText(item.criterion_code),
    criterionName: resolveLocalizedText(item.criterion_name),
    category: resolveLocalizedText(item.category, 'General'),
    displayOrder: item.display_order ?? 0,
    weight: Number(item.weight),
    measurement: {
      value:
        typeof item.measurement?.value === 'object' && item.measurement?.value !== null
          ? resolveLocalizedText(item.measurement.value)
          : item.measurement?.value ?? null,
      unit: item.measurement?.unit ? resolveLocalizedText(item.measurement.unit) : null,
      sourceLabel: item.measurement?.source_label ? resolveLocalizedText(item.measurement.source_label) : null,
    },
    resolvedLevel: item.resolved_level != null ? Number(item.resolved_level) : null,
    rawScore: item.raw_score != null ? Number(item.raw_score) : null,
    weightedScore: item.weighted_score != null ? Number(item.weighted_score) : null,
    isCompleted: Boolean(item.is_completed),
    isDisabled: Boolean(item.is_disabled),
    comment: item.comment ? resolveLocalizedText(item.comment) : null,
    evidenceCount: item.evidence_count || 0,
    hasEvidence: Boolean(item.has_evidence),
  }));

  const relationships: RelationshipTuple[] = (wire.relationships || []).map((rel) => ({
    sourceId: rel.source_id,
    targetId: rel.target_id,
    relationshipType: rel.relationship_type,
  }));

  return {
    employee,
    evaluation,
    scoreSummary,
    kpis,
    relationships,
  };
}

export async function fetchEmployeeKpiSummary(params: GetKpiSummaryParams): Promise<KpiSummaryData> {
  const queryParts: string[] = [];
  if (params.evaluationCycleId) {
    queryParts.push(`evaluation_cycle_id=${encodeURIComponent(params.evaluationCycleId)}`);
  }
  if (params.evaluationStatus) {
    queryParts.push(`evaluation_status=${encodeURIComponent(params.evaluationStatus)}`);
  }
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const path = `/api/reports/employees/${encodeURIComponent(params.employeeId)}/kpi-summary${queryString}`;

  const data = await getApi<WireKpiSummaryResponse>(path);
  return mapWireKpiSummary(data);
}

interface WireLevelDef {
  level: number;
  name?: string;
  label?: string;
  description?: string;
  score_value?: number;
}

interface WireEvidenceItem {
  evidence_id: string;
  evidence_type: string;
  evidence_value: string | null;
  title: string | null;
  evidence_url: string | null;
  file_reference: string | null;
  rationale: string | null;
  source: string | null;
  uploaded_at: string;
  uploaded_by?: string;
}

interface WireDetailResponse {
  evaluation_item_id: string;
  evaluation_id: string;
  employee_id: string;
  criteria: {
    criterion_code: string;
    criterion_name: string;
    category: string;
    description: string;
  };
  measurement: {
    value: number | string | null;
    unit: string;
    source_label: string;
    recorded_at?: string;
  };
  scoring: {
    weight: number;
    resolved_level: number | null;
    raw_score: number | null;
    weighted_score: number | null;
  };
  level_definitions: WireLevelDef[];
  evidence: WireEvidenceItem[];
  is_locked: boolean;
}

export async function fetchEmployeeKpiDetail(employeeId: string, evaluationItemId: string): Promise<KpiDetailData> {
  const path = `/api/reports/employees/${encodeURIComponent(employeeId)}/kpi-summary/${encodeURIComponent(evaluationItemId)}`;
  const data = await getApi<WireDetailResponse>(path);

  return {
    evaluationItemId: data.evaluation_item_id,
    evaluationId: data.evaluation_id,
    employeeId: data.employee_id,
    criteria: {
      criterionCode: resolveLocalizedText(data.criteria.criterion_code),
      criterionName: resolveLocalizedText(data.criteria.criterion_name),
      category: resolveLocalizedText(data.criteria.category, 'General'),
      description: resolveLocalizedText(data.criteria.description),
    },
    measurement: {
      value: data.measurement.value,
      unit: resolveLocalizedText(data.measurement.unit, '%'),
      sourceLabel: resolveLocalizedText(data.measurement.source_label, 'Manual'),
      recordedAt: data.measurement.recorded_at,
    },
    scoring: {
      weight: Number(data.scoring.weight),
      resolvedLevel: data.scoring.resolved_level != null ? Number(data.scoring.resolved_level) : null,
      rawScore: data.scoring.raw_score != null ? Number(data.scoring.raw_score) : null,
      weightedScore: data.scoring.weighted_score != null ? Number(data.scoring.weighted_score) : null,
    },
    levelDefinitions: (data.level_definitions || []).map((ld: WireLevelDef) => ({
      level: ld.level,
      name: resolveLocalizedText(ld.name || ld.label || `Level ${ld.level}`),
      description: ld.description ? resolveLocalizedText(ld.description) : undefined,
      scoreValue: ld.score_value,
    })),
    evidence: (data.evidence || []).map((ev: WireEvidenceItem) => ({
      evidenceId: ev.evidence_id,
      evidenceType: ev.evidence_type,
      evidenceValue: ev.evidence_value,
      title: ev.title ? resolveLocalizedText(ev.title) : null,
      evidenceUrl: ev.evidence_url,
      fileReference: ev.file_reference,
      rationale: ev.rationale ? resolveLocalizedText(ev.rationale) : null,
      source: ev.source,
      uploadedAt: ev.uploaded_at,
      uploadedBy: ev.uploaded_by,
    })),
    isLocked: Boolean(data.is_locked),
  };
}
