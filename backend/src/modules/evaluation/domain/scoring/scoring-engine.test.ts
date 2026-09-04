import { describe, expect, it } from 'vitest';
import { ScoringEngine, type ScoringKpiInput } from './scoring-engine.js';

const engine = new ScoringEngine();

function criterion(
  criterionId: string,
  kpiId: string,
  rawScore: number | null,
  weight: number,
  isDisabled = false,
  levels = [1, 2, 3, 4, 5]
): ScoringKpiInput['criteria'][number] {
  return {
    criterion_id: criterionId,
    kpi_id: kpiId,
    resolved_level: rawScore,
    raw_score: rawScore,
    level_definitions: levels.map((score, index) => ({ level: index + 1, score_value: score })),
    effective_weight: weight,
    is_disabled: isDisabled,
  };
}

function kpi(kpiId: string, weight: number, criteria: ScoringKpiInput['criteria']): ScoringKpiInput {
  return { kpi_id: kpiId, kpi_name: kpiId, effective_weight: weight, criteria };
}

describe('ScoringEngine', () => {
  it.each([
    { rawScore: 1, expected: 0.2 },
    { rawScore: 3, expected: 0.6 },
    { rawScore: 5, expected: 1 },
  ])('normalizes configured score $rawScore against its maximum', ({ rawScore, expected }) => {
    const result = engine.calculate({ kpis: [kpi('kpi-1', 100, [criterion('criterion-1', 'kpi-1', rawScore, 100)])] });

    expect(result.kpi_results[0]!.criterion_results[0]!.normalized_score).toBe(expected);
  });

  it('uses configurable decimal score values', () => {
    const result = engine.calculate({
      kpis: [kpi('kpi-1', 100, [criterion('criterion-1', 'kpi-1', 7.5, 100, false, [2.5, 5, 7.5, 10])])],
    });

    expect(result.kpi_results[0]!.criterion_results[0]!.normalized_score).toBe(0.75);
  });

  it('scores a valid zero without treating it as N/A', () => {
    const result = engine.calculate({
      kpis: [kpi('kpi-1', 100, [criterion('criterion-1', 'kpi-1', 0, 100, false, [0, 5])])],
    });

    expect(result.kpi_results[0]!.criterion_results[0]!.is_na).toBe(false);
    expect(result.kpi_results[0]!.criterion_results[0]!.normalized_score).toBe(0);
  });

  it('rejects a non-positive configured maximum score', () => {
    expect(() => engine.calculate({
      kpis: [kpi('kpi-1', 100, [criterion('criterion-1', 'kpi-1', 0, 100, false, [0, 0])])],
    })).toThrow('INVALID_SCORING_CONFIGURATION');
  });

  it('excludes an N/A criterion from the KPI denominator', () => {
    const result = engine.calculate({
      kpis: [kpi('kpi-1', 100, [
        criterion('criterion-a', 'kpi-1', 4, 20),
        criterion('criterion-b', 'kpi-1', null, 30),
        criterion('criterion-c', 'kpi-1', 5, 50),
      ])],
    });

    expect(result.kpi_results[0]!.denominator).toBe(70);
    expect(result.kpi_results[0]!.normalized_score).toBeCloseTo((0.8 * 20 + 1 * 50) / 70);
  });

  it('excludes disabled criteria and N/A KPIs from the overall denominator', () => {
    const result = engine.calculate({
      kpis: [
        kpi('kpi-a', 40, [criterion('criterion-a', 'kpi-a', 4, 100)]),
        kpi('kpi-b', 30, [criterion('criterion-b', 'kpi-b', 5, 100)]),
        kpi('kpi-c', 30, [criterion('criterion-c', 'kpi-c', 5, 100, true)]),
      ],
    });

    expect(result.denominator).toBe(70);
    expect(result.overall_weighted_score).toBeCloseTo(((0.8 * 40 + 1 * 30) / 70) * 100);
    expect(result.official_score).toBe(result.overall_weighted_score);
    expect(result.kpi_results[2]!.is_na).toBe(true);
  });

  it('rounds only the final result using HALF_UP', () => {
    const result = engine.calculate({
      kpis: [
        kpi('kpi-a', 1, [criterion('criterion-a', 'kpi-a', 66.6, 1, false, [0, 66.6, 66.73, 100])]),
        kpi('kpi-b', 1, [criterion('criterion-b', 'kpi-b', 66.73, 1, false, [0, 66.6, 66.73, 100])]),
      ],
    });

    expect(result.overall_weighted_score).toBe(66.67);
    expect(result.kpi_results[0]!.normalized_score).toBe(0.666);
  });

  it('fails when every KPI is N/A', () => {
    expect(() => engine.calculate({
      kpis: [kpi('kpi-1', 100, [criterion('criterion-1', 'kpi-1', null, 100)])],
    })).toThrow('NO_APPLICABLE_KPIS');
  });
});