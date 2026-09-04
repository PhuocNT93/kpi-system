export interface ScoringLevelDefinition {
  readonly level: number;
  readonly score_value: number;
}

export interface ScoringCriterionInput {
  readonly criterion_id: string;
  readonly kpi_id: string;
  readonly resolved_level: number | null;
  readonly raw_score: number | null;
  readonly level_definitions: readonly ScoringLevelDefinition[];
  readonly effective_weight: number;
  readonly is_disabled: boolean;
}

export interface ScoringKpiInput {
  readonly kpi_id: string;
  readonly kpi_name: string;
  readonly effective_weight: number;
  readonly criteria: readonly ScoringCriterionInput[];
}

export interface ScoringCriterionResult {
  readonly criterion_id: string;
  readonly resolved_level: number | null;
  readonly raw_score: number | null;
  readonly max_score: number | null;
  readonly normalized_score: number | null;
  readonly effective_weight: number;
  readonly weighted_contribution: number | null;
  readonly is_na: boolean;
  readonly is_disabled: boolean;
}

export interface ScoringKpiResult {
  readonly kpi_id: string;
  readonly kpi_name: string;
  readonly criterion_results: readonly ScoringCriterionResult[];
  readonly applicable_weight: number;
  readonly numerator: number;
  readonly denominator: number;
  readonly normalized_score: number | null;
  readonly effective_weight: number;
  readonly weighted_contribution: number | null;
  readonly is_na: boolean;
}

export interface OverallScoringResult {
  readonly kpi_results: readonly ScoringKpiResult[];
  readonly applicable_kpi_weight: number;
  readonly numerator: number;
  readonly denominator: number;
  readonly overall_weighted_score: number;
  readonly official_score: number;
}

class Decimal {
  private constructor(
    private readonly coefficient: bigint,
    private readonly scale: number
  ) {}

  static from(value: number): Decimal {
    if (!Number.isFinite(value)) {
      throw new Error('Scoring values must be finite numbers.');
    }

    const text = value.toString().toLowerCase();
    const [coefficientText = '0', exponentText] = text.split('e');
    const exponent = exponentText ? Number(exponentText) : 0;
    const [whole = '0', fraction = ''] = coefficientText.split('.');
    const digits = `${whole.replace('-', '')}${fraction}`;
    const sign = coefficientText.startsWith('-') ? -1n : 1n;
    const scale = Math.max(0, fraction.length - exponent);
    const adjustedDigits = exponent >= fraction.length
      ? `${digits}${'0'.repeat(exponent - fraction.length)}`
      : digits;

    return new Decimal(sign * BigInt(adjustedDigits || '0'), scale);
  }

  add(other: Decimal): Decimal {
    const scale = Math.max(this.scale, other.scale);
    return new Decimal(
      this.coefficient * 10n ** BigInt(scale - this.scale) +
        other.coefficient * 10n ** BigInt(scale - other.scale),
      scale
    );
  }

  multiply(other: Decimal): Decimal {
    return new Decimal(this.coefficient * other.coefficient, this.scale + other.scale);
  }

  divide(other: Decimal): Decimal {
    if (other.coefficient === 0n) {
      throw new Error('Cannot divide by zero.');
    }

    const precision = 12;
    return new Decimal(
      (this.coefficient * 10n ** BigInt(precision + other.scale)) /
        other.coefficient,
      this.scale + precision
    );
  }

  isZero(): boolean {
    return this.coefficient === 0n;
  }

  toNumber(): number {
    return Number(this.coefficient) / 10 ** this.scale;
  }

  round(scale: number): Decimal {
    if (this.scale <= scale) {
      return new Decimal(this.coefficient * 10n ** BigInt(scale - this.scale), scale);
    }

    const divisor = 10n ** BigInt(this.scale - scale);
    const absolute = this.coefficient < 0n ? -this.coefficient : this.coefficient;
    let rounded = absolute / divisor;
    if (absolute % divisor * 2n >= divisor) {
      rounded += 1n;
    }

    return new Decimal(this.coefficient < 0n ? -rounded : rounded, scale);
  }
}

function sum(values: readonly Decimal[]): Decimal {
  return values.reduce((total, value) => total.add(value), Decimal.from(0));
}

export class ScoringEngine {
  calculate(input: { readonly kpis: readonly ScoringKpiInput[] }): OverallScoringResult {
    const kpiResults = input.kpis.map((kpi) => this.calculateKpi(kpi));
    const applicableKpis = kpiResults.filter((kpi) => !kpi.is_na);
    const numerator = sum(applicableKpis.map((kpi) =>
      Decimal.from(kpi.normalized_score!).multiply(Decimal.from(kpi.effective_weight))
    ));
    const denominator = sum(applicableKpis.map((kpi) => Decimal.from(kpi.effective_weight)));

    if (denominator.isZero()) {
      throw new Error('NO_APPLICABLE_KPIS');
    }

    const overall = numerator.divide(denominator);
    const roundedOverall = overall.multiply(Decimal.from(100)).round(2).toNumber();

    return {
      kpi_results: kpiResults,
      applicable_kpi_weight: denominator.toNumber(),
      numerator: numerator.toNumber(),
      denominator: denominator.toNumber(),
      overall_weighted_score: roundedOverall,
      official_score: roundedOverall,
    };
  }

  private calculateKpi(kpi: ScoringKpiInput): ScoringKpiResult {
    const criterionResults = kpi.criteria.map((criterion) => this.calculateCriterion(criterion));
    const applicableCriteria = criterionResults.filter((criterion) => !criterion.is_na);
    const numerator = sum(applicableCriteria.map((criterion) =>
      Decimal.from(criterion.normalized_score!).multiply(Decimal.from(criterion.effective_weight))
    ));
    const denominator = sum(applicableCriteria.map((criterion) => Decimal.from(criterion.effective_weight)));
    const isNa = denominator.isZero();
    const normalizedScore = isNa ? null : numerator.divide(denominator).toNumber();
    const weightedContribution = isNa
      ? null
      : Decimal.from(normalizedScore!).multiply(Decimal.from(kpi.effective_weight)).toNumber();

    return {
      kpi_id: kpi.kpi_id,
      kpi_name: kpi.kpi_name,
      criterion_results: criterionResults,
      applicable_weight: denominator.toNumber(),
      numerator: numerator.toNumber(),
      denominator: denominator.toNumber(),
      normalized_score: normalizedScore,
      effective_weight: kpi.effective_weight,
      weighted_contribution: weightedContribution,
      is_na: isNa,
    };
  }

  private calculateCriterion(criterion: ScoringCriterionInput): ScoringCriterionResult {
    const maxScore = criterion.level_definitions.length === 0
      ? null
      : Math.max(...criterion.level_definitions.map((level) => level.score_value));
    if (maxScore !== null && (!Number.isFinite(maxScore) || maxScore <= 0)) {
      throw new Error('INVALID_SCORING_CONFIGURATION');
    }
    const isNa = criterion.is_disabled || criterion.raw_score === null || maxScore === null;
    const normalizedScore = isNa ? null : Decimal.from(criterion.raw_score!).divide(Decimal.from(maxScore)).toNumber();
    const weightedContribution = isNa
      ? null
      : Decimal.from(normalizedScore!).multiply(Decimal.from(criterion.effective_weight)).toNumber();

    return {
      criterion_id: criterion.criterion_id,
      resolved_level: criterion.resolved_level,
      raw_score: criterion.raw_score,
      max_score: maxScore,
      normalized_score: normalizedScore,
      effective_weight: criterion.effective_weight,
      weighted_contribution: weightedContribution,
      is_na: isNa,
      is_disabled: criterion.is_disabled,
    };
  }
}