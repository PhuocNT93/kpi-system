import { COLORS } from "@/shared/theme";
import { getCriterionName } from "./evaluation-scoring";

export enum EvaluationStatus {
  OPEN = 'OPEN',
  SUBMITTED = 'SUBMITTED',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
  LOCKED = 'LOCKED',
}

export interface EvaluationCycle {
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface MyEvaluation {
  evaluation: {
    evaluation_id: string;
    evaluation_cycle_id: string;
    employee_id: string;
    status: EvaluationStatus;
    self_score?: number;
    manager_score?: number;
    final_score?: number;
    submitted_at?: string;
    approved_at?: string;
    is_locked: boolean;
  };
  cycle: EvaluationCycle;
  employee?: EmployeeSummary;
}

export interface EvaluationItem {
  evaluation_item_id: string;
  evaluation_id: string;
  template_criterion_id: string;
  criterion_code_snapshot: string;
  criterion_name_snapshot: Record<string, string> | string | undefined;
  category?: CriterionCategory;
  criterion_category_snapshot?: CriterionCategory;
  weight_snapshot: number;
  kpi_id_snapshot?: string;
  kpi_code_snapshot?: string;
  kpi_name_snapshot?: string;
  kpi_weight_snapshot?: number;
  scoring_rule_snapshot: unknown;
  level_definition_snapshot: unknown;
  resolved_level?: number;
  raw_score?: number;
  normalized_score?: number;
  weighted_score?: number;
  is_missing_score: boolean;
  manual_override_score?: number | null;
  override_reason?: string | null;
  comment?: string;
  system_note?: string | null;
  system_suggested_level?: number | null;
  system_suggested_score?: number | null;
  system_source?: string | null;
  measurement_value?: number;
  measurement_key?: string;
  measurement_unit?: string;
}

export interface ScoringCriterionResult {
  criterion_id: string;
  resolved_level: number | null;
  raw_score: number | null;
  max_score: number | null;
  normalized_score: number | null;
  effective_weight: number;
  weighted_contribution: number | null;
  is_na: boolean;
  is_disabled: boolean;
}

export interface ScoringKpiResult {
  kpi_id: string;
  kpi_name: string;
  criterion_results: ScoringCriterionResult[];
  applicable_weight: number;
  numerator: number;
  denominator: number;
  normalized_score: number | null;
  effective_weight: number;
  weighted_contribution: number | null;
  is_na: boolean;
}

export interface EvaluationScoringBreakdown {
  kpi_results: ScoringKpiResult[];
  applicable_kpi_weight: number;
  numerator: number;
  denominator: number;
  overall_weighted_score: number;
  official_score: number;
}

export interface EmployeeSummary {
  employee_id: string;
  full_name: string;
  employee_code: string;
  email: string;
  team_name?: string;
  role_name?: string;
  join_date?: string;
  created_at?: string;
  next_review_due_date?: string;
}

export interface TeamEvaluation {
  evaluation: {
    evaluation_id: string;
    evaluation_cycle_id: string;
    employee_id: string;
    team_id_snapshot?: string;
    role_id_snapshot?: string;
    job_level_snapshot?: string;
    manager_id_snapshot?: string;
    status: EvaluationStatus;
    self_score?: number;
    manager_score?: number;
    final_score?: number;
    submitted_at?: string;
    approved_at?: string;
    is_locked: boolean;
    created_at?: string;
  };
  employee: EmployeeSummary;
  cycle: EvaluationCycle;
}

export interface EvaluationDetail {
  evaluation_id: string;
  evaluation_cycle_id: string;
  employee_id: string;
  cycle?: EvaluationCycle;
  status: EvaluationStatus;
  self_score?: number;
  manager_score?: number;
  final_score?: number;
  official_score?: number | null;
  scoring_breakdown?: EvaluationScoringBreakdown;
  development_blocks?: Array<{
    title: string;
    desc?: string;
    accent?: string;
    value: string;
  }>;
  is_locked?: boolean;
  submitted_at?: string;
  approved_at?: string;
  published_at?: string;
  locked_at?: string;
  is_manager_reviewer?: boolean;
  items: EvaluationItem[];
}

export function getLocalizedText(val: Record<string, string> | string | undefined, locale: string = 'en'): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[locale] || val['en'] || Object.values(val)[0] || '';
}

export const criterionCategoryConfig = [
  {
    key: 'Performance',
    weight: 40,
    accent: COLORS.primary.DEFAULT,
    description: 'Kết quả đầu ra, mức độ hoàn thành mục tiêu và KPI theo kỳ đánh giá.',
  },
  {
    key: 'Capability',
    weight: 30,
    accent: COLORS.semantic.success.DEFAULT,
    description: 'Năng lực chuyên môn, kỹ năng làm việc và mức độ đáp ứng vai trò.',
  },
  {
    key: 'Contribution',
    weight: 30,
    accent: COLORS.semantic.warning.DEFAULT,
    description: 'Đóng góp cho tập thể, hỗ trợ đồng đội và ảnh hưởng tích cực đến tổ chức.',
  },
] as const;

export type CriterionCategory = (typeof criterionCategoryConfig)[number]['key'];

export interface ScoringCriterionKpi {
  label: string;
  rawScore: number;
  rawScoreValue: string;
  score: number;
  scoreValue: string;
  weightPercent: number;
  previous: number;
  weight: string;
  weightValue: string;
  rawWeightValue?: number;
  criterionWeight: number;
}

export interface ScoringCriterionSummary {
  title: string;
  category: CriterionCategory;
  score: number;
  scoreValue: string;
  rawScore: number;
  rawScoreValue: string;
  weightedScore: number;
  weightedScoreValue: string;
  weight: string;
  weightValue: string;
  status: string;
  accent: string;
  kpis: ScoringCriterionKpi[];
  rawWeightValue: number | undefined;
}

export interface ScoringGroupSummary {
  key: CriterionCategory;
  weight: number;
  accent: string;
  description: string;
  average: number | null;
  criteriaCount: number;
}

export interface EvaluationScoringSummary {
  criteria: ScoringCriterionSummary[];
  grouped: ScoringGroupSummary[];
  totalScore: number;
  totalRawScoreValue: number;
}

export function formatStoredPercent(value: number | string | null | undefined): string {
  if (value == null || value === '') {
    return 'N/A';
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numericValue)) {
    return 'N/A';
  }

  const normalizedValue = numericValue > 0 && numericValue <= 1 ? numericValue * 100 : numericValue;
  return `${normalizedValue.toFixed(normalizedValue % 1 === 0 ? 0 : 1)}%`;
}

export function normalizeStoredPercentValue(value: number | string | null | undefined): number {
  if (value == null || value === '') {
    return 0;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numericValue)) {
    return 0;
  }

  return numericValue > 0 && numericValue <= 1 ? numericValue * 100 : numericValue;
}

export function percentToTenPointScore(value: number | string | null | undefined): string {
  if (value == null || value === '') {
    return 'N/A';
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numericValue)) {
    return 'N/A';
  }

  const percentValue = numericValue > 0 && numericValue <= 1 ? numericValue * 100 : numericValue;
  return (percentValue / 10).toFixed(percentValue % 10 === 0 ? 0 : 1);
}

export function getCriterionCategory(item: Pick<EvaluationItem, 'category' | 'criterion_category_snapshot' | 'criterion_code_snapshot' | 'criterion_name_snapshot' | 'kpi_code_snapshot' | 'kpi_name_snapshot'>): CriterionCategory {
  if (item.criterion_category_snapshot) return item.criterion_category_snapshot;
  if (item.category) return item.category;
  const code = [item.criterion_code_snapshot, item.kpi_code_snapshot].filter(Boolean).join(' ').toLowerCase();
  const name = [getCriterionName(item.criterion_name_snapshot, item.criterion_code_snapshot), item.kpi_name_snapshot].filter(Boolean).join(' ').toLowerCase();

  if (code.includes('performance') || code.startsWith('perf') || name.includes('performance')) return 'Performance';
  if (code.includes('capability') || code.startsWith('cap') || name.includes('capability') || name.includes('competency') || name.includes('competence') || name.includes('skill')) return 'Capability';
  if (code.includes('contribution') || code.startsWith('con') || name.includes('contribution') || name.includes('collaboration') || name.includes('teamwork') || name.includes('support')) return 'Contribution';
  return 'Performance';
}

function parsePercentValue(value: string): number {
  const numericValue = Number.parseFloat(value.replace('%', ''));
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

export function buildEvaluationScoringSummary(evaluationDetail?: EvaluationDetail | null): EvaluationScoringSummary {
  const items = evaluationDetail?.items ?? [];
  const criterionMap = new Map<string, ScoringCriterionSummary>();

  items.forEach((item) => {
    const criterionKey = item.template_criterion_id || item.criterion_code_snapshot || getCriterionName(item.criterion_name_snapshot, item.criterion_code_snapshot);
    const criterionTitle = getCriterionName(item.criterion_name_snapshot, item.criterion_code_snapshot);
    const category = getCriterionCategory(item);
    const kpiLabel = item.kpi_name_snapshot || item.kpi_code_snapshot || 'KPI';

    const criterionEntry: ScoringCriterionSummary = criterionMap.get(criterionKey) ?? {
      title: criterionTitle,
      category,
      score: 0,
      scoreValue: percentToTenPointScore(item.resolved_level),
      rawScore: 0,
      rawScoreValue: percentToTenPointScore(item.resolved_level),
      weightedScore: 0,
      weightedScoreValue: '0.0',
      weight: 'of overall evaluation',
      weightValue: 'N/A',
      status: item.is_missing_score ? 'Missing score' : 'Calculated by API',
      accent: COLORS.primary.DEFAULT,
      kpis: [],
      rawWeightValue: item.weight_snapshot,
    };

    criterionEntry.kpis.push({
      label: kpiLabel,
      rawScore: item.resolved_level ?? 0,
      rawScoreValue: percentToTenPointScore(item.resolved_level ?? 0),
      score: (item.resolved_level ?? 0) * normalizeStoredPercentValue(item.kpi_weight_snapshot) / 100,
      scoreValue: percentToTenPointScore(item.resolved_level ?? 0),
      weightPercent: normalizeStoredPercentValue(item.kpi_weight_snapshot),
      previous: item.raw_score ?? 0,
      weight: 'of KPI',
      weightValue: formatStoredPercent(item.kpi_weight_snapshot),
      rawWeightValue: item.kpi_weight_snapshot,
      criterionWeight: normalizeStoredPercentValue(item.weight_snapshot),
    });

    const totalCriterionWeight = criterionEntry.kpis.reduce((sum, kpi) => sum + kpi.criterionWeight, 0);
    criterionEntry.weightValue = formatStoredPercent(totalCriterionWeight);
    criterionEntry.rawWeightValue = totalCriterionWeight;

    const childScores = criterionEntry.kpis.map((kpi) => kpi.score);
    criterionEntry.rawScore = childScores.length > 0 ? childScores.reduce((sum, value) => sum + value, 0) : 0;
    criterionEntry.weightedScore = (criterionEntry.rawScore * (totalCriterionWeight / 100));
    criterionEntry.rawScoreValue = `${(criterionEntry.rawScore * (totalCriterionWeight / 100)).toFixed(2)}%`;
    criterionEntry.weightedScoreValue = criterionEntry.weightedScore.toFixed(2);
    criterionEntry.score = criterionEntry.weightedScore;
    criterionEntry.scoreValue = criterionEntry.weightedScoreValue;
    criterionMap.set(criterionKey, criterionEntry);
  });

  const criteria = Array.from(criterionMap.values());
  const grouped = criterionCategoryConfig.map((config) => {
    const groupCriteria = criteria.filter((criterion) => criterion.category === config.key);
    const max = groupCriteria.reduce((sum, criterion) => sum + (criterion.rawWeightValue ?? 0), 0);
    const weightedScoreTotal = groupCriteria.reduce((sum, criterion) => sum + criterion.weightedScore, 0);
    const average = max > 0 ? (weightedScoreTotal / max) * 5 : null;

    return {
      ...config,
      average,
      criteriaCount: groupCriteria.length,
    };
  });

  const totalScore = grouped.reduce((sum, group) => sum + ((group.average ?? 0) * (group.weight / 100)), 0);
  const totalRawScoreValue = criteria.reduce((sum, criterion) => sum + parsePercentValue(criterion.rawScoreValue), 0);

  return { criteria, grouped, totalScore, totalRawScoreValue };
}
