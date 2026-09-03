/**
 * Rule Configuration Validator
 *
 * Runtime validation of rule_config for each rule type.
 * Detects malformed configurations before passing to engine.
 * Returns typed error array, throws RuleConfigValidationError if critical issues detected.
 */

import type { RuleType, RangeThresholdConfig, InverseThresholdConfig, CountThresholdConfig, OrdinalManualConfig, RoleConditionalConfig } from '../domain/rule.types.js';
import { RuleConfigValidationError } from '../domain/rule-engine.errors.js';

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export class RuleConfigValidator {
  /**
   * Validate rule configuration for a given rule type.
   * @param ruleType - The rule type to validate for
   * @param config - The configuration to validate (untrusted)
   * @returns Array of validation errors (empty if valid)
   * @throws RuleConfigValidationError if critical structural issues detected
   */
  static validate(ruleType: RuleType, config: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config === null || typeof config !== 'object') {
      throw new RuleConfigValidationError('Rule configuration must be a non-null object.', [
        { field: 'config', code: 'INVALID_CONFIG_TYPE', message: 'Expected object, got ' + typeof config }
      ]);
    }

    switch (ruleType) {
      case 'RANGE_THRESHOLD':
        this.validateRangeThreshold(config as unknown as RangeThresholdConfig, errors);
        break;
      case 'INVERSE_THRESHOLD':
        this.validateInverseThreshold(config as unknown as InverseThresholdConfig, errors);
        break;
      case 'COUNT_THRESHOLD':
        this.validateCountThreshold(config as unknown as CountThresholdConfig, errors);
        break;
      case 'ORDINAL_MANUAL':
        this.validateOrdinalManual(config as unknown as OrdinalManualConfig, errors);
        break;
      case 'ROLE_CONDITIONAL':
        this.validateRoleConditional(config as unknown as RoleConditionalConfig, errors);
        break;
      default:
        throw new RuleConfigValidationError(`Unsupported rule type: ${ruleType}`, [
          { field: 'rule_type', code: 'UNSUPPORTED_RULE_TYPE', message: `Unknown rule type: ${ruleType}` }
        ]);
    }

    if (errors.length > 0) {
      throw new RuleConfigValidationError(`Configuration validation failed for ${ruleType}.`, errors);
    }

    return errors;
  }

  private static validateRangeThreshold(config: RangeThresholdConfig, errors: ValidationError[]): void {
    if (!Array.isArray(config.ranges) || config.ranges.length === 0) {
      errors.push({
        field: 'config.ranges',
        code: 'EMPTY_RANGES',
        message: 'RANGE_THRESHOLD must contain a non-empty ranges array.',
      });
      return;
    }

    // Check each range bucket
    for (let i = 0; i < config.ranges.length; i++) {
      const bucket = config.ranges[i];
      if (!bucket) continue;

      // Validate min/max are numbers
      if (typeof bucket.min !== 'number' || isNaN(bucket.min)) {
        errors.push({
          field: `config.ranges[${i}].min`,
          code: 'INVALID_MIN',
          message: `Range min must be a valid number, got ${bucket.min}`,
        });
      }

      if (typeof bucket.max !== 'number' && bucket.max !== null) {
        errors.push({
          field: `config.ranges[${i}].max`,
          code: 'INVALID_MAX',
          message: `Range max must be a number or null, got ${bucket.max}`,
        });
      }

      if (typeof bucket.max === 'number' && isNaN(bucket.max)) {
        errors.push({
          field: `config.ranges[${i}].max`,
          code: 'INVALID_MAX',
          message: `Range max must be a valid number, got NaN`,
        });
      }

      // Validate min <= max
      if (typeof bucket.min === 'number' && typeof bucket.max === 'number' && bucket.min > bucket.max) {
        errors.push({
          field: `config.ranges[${i}]`,
          code: 'MIN_EXCEEDS_MAX',
          message: `Range min (${bucket.min}) cannot exceed max (${bucket.max}).`,
        });
      }

      // Validate level is a positive integer
      if (typeof bucket.level !== 'number' || !Number.isInteger(bucket.level) || bucket.level < 1) {
        errors.push({
          field: `config.ranges[${i}].level`,
          code: 'INVALID_LEVEL',
          message: `Level must be a positive integer, got ${bucket.level}`,
        });
      }
    }

    // Check for overlapping ranges (assuming half-open [min, max) semantics)
    const sorted = [...config.ranges]
      .filter(r => r && typeof r.min === 'number' && (typeof r.max === 'number' || r.max === null))
      .sort((a, b) => a.min - b.min);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (current && next && typeof current.max === 'number' && current.max > next.min) {
        errors.push({
          field: 'config.ranges',
          code: 'OVERLAPPING_RANGES',
          message: `Ranges overlap: [${current.min}, ${current.max}) intersects [${next.min}, ${next.max || 'null'})`,
        });
      }
    }
  }

  private static validateInverseThreshold(config: InverseThresholdConfig, errors: ValidationError[]): void {
    // INVERSE_THRESHOLD uses same structure as RANGE_THRESHOLD
    this.validateRangeThreshold(config as unknown as RangeThresholdConfig, errors);
  }

  private static validateCountThreshold(config: CountThresholdConfig, errors: ValidationError[]): void {
    if (!Array.isArray(config.thresholds)) {
      errors.push({
        field: 'config.thresholds',
        code: 'INVALID_THRESHOLDS',
        message: 'COUNT_THRESHOLD must contain a thresholds array.',
      });
      return;
    }

    // Check each threshold is a number
    for (let i = 0; i < config.thresholds.length; i++) {
      const t = config.thresholds[i];
      if (typeof t !== 'number' || isNaN(t)) {
        errors.push({
          field: `config.thresholds[${i}]`,
          code: 'INVALID_THRESHOLD',
          message: `Threshold must be a valid number, got ${t}`,
        });
      }
    }

    // Check for duplicates
    const sorted = [...config.thresholds].filter(t => typeof t === 'number');
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1]) {
        errors.push({
          field: 'config.thresholds',
          code: 'DUPLICATE_THRESHOLDS',
          message: `Duplicate threshold value: ${sorted[i]}`,
        });
      }
    }
  }

  private static validateOrdinalManual(config: OrdinalManualConfig, errors: ValidationError[]): void {
    // ORDINAL_MANUAL has minimal required structure
    // level_labels is optional and not validated here
    void config;
    void errors;
  }

  private static validateRoleConditional(config: RoleConditionalConfig, errors: ValidationError[]): void {
    if (!Array.isArray(config.branches) || config.branches.length === 0) {
      errors.push({
        field: 'config.branches',
        code: 'EMPTY_BRANCHES',
        message: 'ROLE_CONDITIONAL must contain a non-empty branches array.',
      });
      return;
    }

    // Check for duplicate role codes
    const roleCodes = new Set<string>();
    for (let i = 0; i < config.branches.length; i++) {
      const branch = config.branches[i];
      if (!branch) continue;

      if (!branch.role_code) {
        errors.push({
          field: `config.branches[${i}].role_code`,
          code: 'MISSING_ROLE_CODE',
          message: `Branch ${i} is missing role_code.`,
        });
        continue;
      }

      if (roleCodes.has(branch.role_code)) {
        errors.push({
          field: `config.branches[${i}].role_code`,
          code: 'DUPLICATE_ROLE',
          message: `Duplicate role_code in branches: ${branch.role_code}`,
        });
      }
      roleCodes.add(branch.role_code);

      // Check that branch has a nested rule
      if (!branch.rule) {
        errors.push({
          field: `config.branches[${i}].rule`,
          code: 'MISSING_NESTED_RULE',
          message: `Branch ${i} (role ${branch.role_code}) is missing a nested rule.`,
        });
        continue;
      }

      // Check nested rule has a type
      const nestedRuleType = (branch.rule as Record<string, unknown>).type as string;
      if (!nestedRuleType) {
        errors.push({
          field: `config.branches[${i}].rule.type`,
          code: 'MISSING_RULE_TYPE',
          message: `Branch ${i} (role ${branch.role_code}) nested rule is missing type.`,
        });
      }
    }
  }
}
