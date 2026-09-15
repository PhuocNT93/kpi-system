import { getApi } from '../../../shared/api/api-client';

export interface WireKpiEvidence {
  evidence_id: string;
  evidence_type: string;
  title: string;
  evidence_url?: string | null;
  file_reference?: string | null;
  rationale?: string | null;
  source?: string | null;
}

export interface WireKpiItemSummary {
  evaluation_item_id: string;
  criterion_code: string;
  criterion_name: string;
  category: string;
  weight: number;
  raw_score: number | null;
  weighted_score: number | null;
  resolved_level: number | null;
  is_disabled: boolean;
  is_missing_score: boolean;
  measurement: {
    key: string | null;
    value: number | null;
    unit: string | null;
    source: string | null;
  } | null;
  evidence: WireKpiEvidence[];
  comment: string | null;
  rationale: string | null;
  reviewer: {
    id: string | null;
    name: string | null;
    review_date: string | null;
  } | null;
  kpi_relationship_snapshot: Record<string, unknown> | null;
}

export interface WireEmployeeKpiSummary {
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
    email: string;
    department: { id: string | null; name: string | null; code: string | null };
    team: { id: string | null; name: string | null; code: string | null };
    role: { id: string; name: string; code: string };
    job_level: { id: string; name: string; code: string };
    manager: { id: string | null; name: string | null; code: string | null } | null;
  };
  evaluation: {
    evaluation_id: string;
    cycle_id: string;
    cycle_name: string;
    status: string;
    submitted_at: string | null;
    approved_at: string | null;
    is_locked: boolean;
  };
  overall_score: number | null;
  overall_weighted_score: number | null;
  official_score_field: 'overall_weighted_score' | 'overall_score';
  kpi_items: WireKpiItemSummary[];
}

export interface KpiEvidence {
  evidenceId: string;
  evidenceType: string;
  title: string;
  evidenceUrl?: string | null;
  fileReference?: string | null;
  rationale?: string | null;
  source?: string | null;
}

export interface KpiItemSummary {
  evaluationItemId: string;
  criterionCode: string;
  criterionName: string;
  category: string;
  weight: number;
  rawScore: number | null;
  weightedScore: number | null;
  resolvedLevel: number | null;
  isDisabled: boolean;
  isMissingScore: boolean;
  measurement: {
    key: string | null;
    value: number | null;
    unit: string | null;
    source: string | null;
  } | null;
  evidence: KpiEvidence[];
  comment: string | null;
  rationale: string | null;
  reviewer: {
    id: string | null;
    name: string | null;
    reviewDate: string | null;
  } | null;
  kpiRelationshipSnapshot: Record<string, unknown> | null;
}

export interface EmployeeKpiSummary {
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string;
    department: { id: string | null; name: string | null; code: string | null };
    team: { id: string | null; name: string | null; code: string | null };
    role: { id: string; name: string; code: string };
    jobLevel: { id: string; name: string; code: string };
    manager: { id: string | null; name: string | null; code: string | null } | null;
  };
  evaluation: {
    evaluationId: string;
    cycleId: string;
    cycleName: string;
    status: string;
    submittedAt: string | null;
    approvedAt: string | null;
    isLocked: boolean;
  };
  overallScore: number | null;
  overallWeightedScore: number | null;
  officialScoreField: 'overall_weighted_score' | 'overall_score';
  officialScoreValue: number | null;
  kpiItems: KpiItemSummary[];
}

export function mapWireEmployeeKpiSummary(wire: WireEmployeeKpiSummary): EmployeeKpiSummary {
  const officialScoreValue =
    wire.official_score_field === 'overall_score'
      ? wire.overall_score
      : wire.overall_weighted_score;

  return {
    employee: {
      id: wire.employee.id,
      employeeCode: wire.employee.employee_code,
      fullName: wire.employee.full_name,
      email: wire.employee.email,
      department: wire.employee.department,
      team: wire.employee.team,
      role: wire.employee.role,
      jobLevel: wire.employee.job_level,
      manager: wire.employee.manager,
    },
    evaluation: {
      evaluationId: wire.evaluation.evaluation_id,
      cycleId: wire.evaluation.cycle_id,
      cycleName: wire.evaluation.cycle_name,
      status: wire.evaluation.status,
      submittedAt: wire.evaluation.submitted_at,
      approvedAt: wire.evaluation.approved_at,
      isLocked: wire.evaluation.is_locked,
    },
    overallScore: wire.overall_score,
    overallWeightedScore: wire.overall_weighted_score,
    officialScoreField: wire.official_score_field,
    officialScoreValue,
    kpiItems: wire.kpi_items.map((item) => ({
      evaluationItemId: item.evaluation_item_id,
      criterionCode: item.criterion_code,
      criterionName: item.criterion_name,
      category: item.category,
      weight: item.weight,
      rawScore: item.raw_score,
      weightedScore: item.weighted_score,
      resolvedLevel: item.resolved_level,
      isDisabled: item.is_disabled,
      isMissingScore: item.is_missing_score,
      measurement: item.measurement,
      evidence: item.evidence.map((ev) => ({
        evidenceId: ev.evidence_id,
        evidenceType: ev.evidence_type,
        title: ev.title,
        evidenceUrl: ev.evidence_url,
        fileReference: ev.file_reference,
        rationale: ev.rationale,
        source: ev.source,
      })),
      comment: item.comment,
      rationale: item.rationale,
      reviewer: item.reviewer
        ? {
            id: item.reviewer.id,
            name: item.reviewer.name,
            reviewDate: item.reviewer.review_date,
          }
        : null,
      kpiRelationshipSnapshot: item.kpi_relationship_snapshot,
    })),
  };
}

export const employeeKpiSummaryApi = {
  getSummary: async (employeeId: string, evaluationCycleId: string): Promise<EmployeeKpiSummary> => {
    const wire = await getApi<WireEmployeeKpiSummary>(
      `/api/employees/${employeeId}/kpi-summary?evaluation_cycle_id=${encodeURIComponent(evaluationCycleId)}`
    );
    return mapWireEmployeeKpiSummary(wire);
  },
};
