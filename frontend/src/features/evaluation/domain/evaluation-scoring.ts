import { COLORS } from '@/lib/theme';

import type { EvaluationDetail, EvaluationItem } from './evaluation-models';

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
  score: number;
  scoreValue: string;
  previous: number;
  weight: string;
  weightValue: string;
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

export function getCriterionCategory(
  item: Pick<EvaluationItem, 'category' | 'criterion_category_snapshot' | 'criterion_code_snapshot' | 'criterion_name_snapshot' | 'kpi_code_snapshot' | 'kpi_name_snapshot'>,
): CriterionCategory {
  if (item.criterion_category_snapshot) return item.criterion_category_snapshot;
  if (item.category) return item.category;

  const code = [item.criterion_code_snapshot, item.kpi_code_snapshot].filter(Boolean).join(' ').toLowerCase();
  const name = [getCriterionName(item.criterion_name_snapshot, item.criterion_code_snapshot), item.kpi_name_snapshot].filter(Boolean).join(' ').toLowerCase();

  if (code.startsWith('perf') || name.includes('performance')) return 'Performance';
  if (code.startsWith('cap') || name.includes('capability') || name.includes('competency')) return 'Capability';
  if (code.startsWith('con') || name.includes('contribution') || name.includes('collaboration')) return 'Contribution';
  return 'Performance';
}

export function getCriterionName(snapshot: Record<string, string> | string | undefined, fallback?: string | null): string {
  if (!snapshot) return fallback || 'Criterion';
  if (typeof snapshot === 'string') return snapshot || fallback || 'Criterion';
  return snapshot.en || Object.values(snapshot)[0] || fallback || 'Criterion';
}

export function buildEvaluationScoringSummary(evaluationDetail?: EvaluationDetail | null): EvaluationScoringSummary {
  const items = evaluationDetail?.items ?? [];

  const criterionMap = new Map<string, ScoringCriterionSummary>();

  items.forEach((item) => {
    const criterionKey = item.template_criterion_id || item.criterion_code_snapshot || getCriterionName(item.criterion_name_snapshot, item.criterion_code_snapshot);
    const criterionTitle = getCriterionName(item.criterion_name_snapshot, item.criterion_code_snapshot);
    const category = getCriterionCategory(item);
    const kpiLabel = item.kpi_name_snapshot || item.kpi_code_snapshot || 'KPI';

    const criterionEntry = criterionMap.get(criterionKey) ?? {
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
    };

    criterionEntry.category = category;

    criterionEntry.kpis.push({
      label: kpiLabel,
      score: item.resolved_level ?? 0,
      scoreValue: percentToTenPointScore(item.resolved_level),
      previous: item.raw_score ?? 0,
      weight: 'of KPI',
      weightValue: formatStoredPercent(item.kpi_weight_snapshot),
      criterionWeight: normalizeStoredPercentValue(item.weight_snapshot),
    });

    const totalCriterionWeight = criterionEntry.kpis.reduce((sum, kpi) => sum + kpi.criterionWeight, 0);
    criterionEntry.weightValue = formatStoredPercent(totalCriterionWeight);

    const childScores = criterionEntry.kpis.map((kpi) => kpi.score);
    criterionEntry.rawScore = childScores.length > 0 ? childScores.reduce((sum, value) => sum + value, 0) / childScores.length : 0;
    criterionEntry.weightedScore = criterionEntry.rawScore * (totalCriterionWeight / 100) / 10;
    criterionEntry.rawScoreValue = `${(criterionEntry.rawScore * (totalCriterionWeight / 100)).toFixed(1)}%`;
    criterionEntry.weightedScoreValue = criterionEntry.weightedScore.toFixed(1);
    criterionEntry.score = criterionEntry.weightedScore;
    criterionEntry.scoreValue = criterionEntry.weightedScoreValue;
    criterionMap.set(criterionKey, criterionEntry);
  });

  const criteria = Array.from(criterionMap.values());
  const grouped = criterionCategoryConfig.map((config) => {
    const groupCriteria = criteria
      .filter((criterion) => criterion.category === config.key)
      .map((criterion) => criterion.weightedScore);

    const average = groupCriteria.length > 0
      ? groupCriteria.reduce((sum, value) => sum + value, 0) / groupCriteria.length
      : null;

    return {
      ...config,
      average,
      criteriaCount: groupCriteria.length,
    };
  });

  const totalScore = grouped.reduce((sum, group) => sum + (group.average ?? 0), 0);
  const totalRawScoreValue = criteria.reduce((sum, criterion) => sum + (criterion.score * 10), 0);

  return { criteria, grouped, totalScore, totalRawScoreValue };
}