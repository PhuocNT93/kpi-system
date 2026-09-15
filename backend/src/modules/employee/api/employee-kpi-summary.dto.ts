import { z } from 'zod';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const employeeKpiSummaryQuerySchema = z.object({
  evaluation_cycle_id: z.string().regex(UUID_REGEX, 'Invalid evaluation_cycle_id UUID').optional(),
  evaluationCycleId: z.string().regex(UUID_REGEX, 'Invalid evaluationCycleId UUID').optional(),
}).refine((data) => !!(data.evaluation_cycle_id || data.evaluationCycleId), {
  message: 'evaluation_cycle_id is required',
  path: ['evaluation_cycle_id'],
}).transform((data) => ({
  evaluation_cycle_id: (data.evaluation_cycle_id || data.evaluationCycleId)!,
}));

export type EmployeeKpiSummaryQuery = z.infer<typeof employeeKpiSummaryQuerySchema>;

export interface KpiEvidenceDto {
  evidence_id: string;
  evidence_type: string;
  title: string;
  evidence_url?: string | null;
  file_reference?: string | null;
  rationale?: string | null;
  source?: string | null;
}

export interface KpiItemSummaryDto {
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
  evidence: KpiEvidenceDto[];
  comment: string | null;
  rationale: string | null;
  reviewer: {
    id: string | null;
    name: string | null;
    review_date: string | null;
  } | null;
  kpi_relationship_snapshot: {
    kpi_id?: string | null;
    kpi_code?: string | null;
    kpi_name?: string | null;
    kpi_weight?: number | null;
    scoring_rule?: Record<string, unknown>;
    level_definitions?: Record<string, unknown>[];
  } | null;
}

export interface EmployeeKpiSummaryResponse {
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
    email: string;
    department: {
      id: string | null;
      name: string | null;
      code: string | null;
    };
    team: {
      id: string | null;
      name: string | null;
      code: string | null;
    };
    role: {
      id: string;
      name: string;
      code: string;
    };
    job_level: {
      id: string;
      name: string;
      code: string;
    };
    manager: {
      id: string | null;
      name: string | null;
      code: string | null;
    } | null;
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
  official_score_field: string;
  kpi_items: KpiItemSummaryDto[];
}
