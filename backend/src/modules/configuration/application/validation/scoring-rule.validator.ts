import {
  ScoringRuleType,
  ScoringRuleConfig,
  RangeThresholdConfig,
  InverseThresholdConfig,
  CountThresholdConfig,
  OrdinalManualConfig,
  RoleConditionalConfig,
  ValidationErrorDetail,
} from '../../domain/configuration.types.js';

export class ScoringRuleValidator {
  public static validate(ruleType: ScoringRuleType, config: ScoringRuleConfig): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    if (!config || typeof config !== 'object') {
      errors.push({
        code: 'INVALID_SCORING_RULE',
        path: 'config',
        message: 'Scoring rule config must be a non-null object.',
      });
      return errors;
    }

    switch (ruleType) {
      case ScoringRuleType.RANGE_THRESHOLD:
        this.validateRangeThreshold(config as unknown as RangeThresholdConfig, errors);
        break;
      case ScoringRuleType.INVERSE_THRESHOLD:
        this.validateInverseThreshold(config as unknown as InverseThresholdConfig, errors);
        break;
      case ScoringRuleType.COUNT_THRESHOLD:
        this.validateCountThreshold(config as unknown as CountThresholdConfig, errors);
        break;
      case ScoringRuleType.ORDINAL_MANUAL:
        this.validateOrdinalManual(config as unknown as OrdinalManualConfig, errors);
        break;
      case ScoringRuleType.ROLE_CONDITIONAL:
        this.validateRoleConditional(config as unknown as RoleConditionalConfig, errors);
        break;
      default:
        errors.push({
          code: 'UNSUPPORTED_RULE_TYPE',
          path: 'rule_type',
          message: `Unsupported rule type: ${ruleType}`,
        });
    }

    return errors;
  }

  private static validateRangeThreshold(config: RangeThresholdConfig, errors: ValidationErrorDetail[]): void {
    if (!Array.isArray(config.ranges) || config.ranges.length === 0) {
      errors.push({
        code: 'INVALID_SCORING_RULE',
        path: 'config.ranges',
        message: 'RANGE_THRESHOLD must contain a non-empty ranges array.',
      });
      return;
    }

    // Sort ranges by min ascending
    const sorted = [...config.ranges].sort((a, b) => a.min - b.min);

    for (let i = 0; i < sorted.length; i++) {
      const bucket = sorted[i];
      if (!bucket) continue;
      if (typeof bucket.min !== 'number' || typeof bucket.max !== 'number' || isNaN(bucket.min) || isNaN(bucket.max)) {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: `config.ranges[${i}]`,
          message: 'Min and max must be valid numbers.',
        });
        continue;
      }

      if (bucket.min > bucket.max) {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: `config.ranges[${i}]`,
          message: `min (${bucket.min}) cannot be greater than max (${bucket.max}).`,
        });
      }

      if (typeof bucket.level !== 'number' || bucket.level < 1) {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: `config.ranges[${i}].level`,
          message: 'Level must be a positive integer.',
        });
      }

      // Check overlap with next bucket assuming half-open intervals [min, max)
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        if (next && bucket.max > next.min) {
          errors.push({
            code: 'INVALID_SCORING_RULE',
            path: `config.ranges`,
            message: `Overlapping range detected between [${bucket.min}, ${bucket.max}) and [${next.min}, ${next.max}).`,
            details: { current: bucket, next },
          });
        }
      }
    }
  }

  private static validateInverseThreshold(config: InverseThresholdConfig, errors: ValidationErrorDetail[]): void {
    if (!Array.isArray(config.thresholds) || config.thresholds.length === 0) {
      errors.push({
        code: 'INVALID_SCORING_RULE',
        path: 'config.thresholds',
        message: 'INVERSE_THRESHOLD must contain a non-empty thresholds array.',
      });
      return;
    }

    for (let i = 0; i < config.thresholds.length; i++) {
      const b = config.thresholds[i];
      if (!b) continue;
      if (typeof b.max_incidents !== 'number' || b.max_incidents < 0) {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: `config.thresholds[${i}].max_incidents`,
          message: 'max_incidents must be a non-negative number.',
        });
      }
      if (typeof b.level !== 'number' || b.level < 1) {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: `config.thresholds[${i}].level`,
          message: 'Level must be a positive integer.',
        });
      }
    }
  }

  private static validateCountThreshold(config: CountThresholdConfig, errors: ValidationErrorDetail[]): void {
    if (!Array.isArray(config.counts) || config.counts.length === 0) {
      errors.push({
        code: 'INVALID_SCORING_RULE',
        path: 'config.counts',
        message: 'COUNT_THRESHOLD must contain a non-empty counts array.',
      });
      return;
    }

    for (let i = 0; i < config.counts.length; i++) {
      const b = config.counts[i];
      if (!b) continue;
      if (typeof b.min_count !== 'number' || b.min_count < 0) {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: `config.counts[${i}].min_count`,
          message: 'min_count must be a non-negative integer.',
        });
      }
      if (b.max_count !== undefined && (typeof b.max_count !== 'number' || b.max_count < b.min_count)) {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: `config.counts[${i}].max_count`,
          message: 'max_count must be >= min_count.',
        });
      }
      if (typeof b.level !== 'number' || b.level < 1) {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: `config.counts[${i}].level`,
          message: 'Level must be a positive integer.',
        });
      }
    }
  }

  private static validateOrdinalManual(config: OrdinalManualConfig, errors: ValidationErrorDetail[]): void {
    if (!Array.isArray(config.allowed_levels) || config.allowed_levels.length === 0) {
      errors.push({
        code: 'INVALID_SCORING_RULE',
        path: 'config.allowed_levels',
        message: 'ORDINAL_MANUAL must contain a non-empty allowed_levels array.',
      });
      return;
    }

    for (const lvl of config.allowed_levels) {
      if (typeof lvl !== 'number' || lvl < 1) {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: 'config.allowed_levels',
          message: 'Allowed level must be a positive integer.',
        });
      }
    }
  }

  private static validateRoleConditional(config: RoleConditionalConfig, errors: ValidationErrorDetail[]): void {
    if (!Array.isArray(config.conditions) || config.conditions.length === 0) {
      errors.push({
        code: 'INVALID_SCORING_RULE',
        path: 'config.conditions',
        message: 'ROLE_CONDITIONAL must contain a non-empty conditions array.',
      });
      return;
    }

    for (let i = 0; i < config.conditions.length; i++) {
      const cond = config.conditions[i];
      if (!cond) continue;
      if (!cond.role_code || typeof cond.role_code !== 'string') {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: `config.conditions[${i}].role_code`,
          message: 'role_code is required.',
        });
      }
      if (!cond.scoring_rule_id || typeof cond.scoring_rule_id !== 'string') {
        errors.push({
          code: 'INVALID_SCORING_RULE',
          path: `config.conditions[${i}].scoring_rule_id`,
          message: 'scoring_rule_id is required.',
        });
      }
    }
  }
}
