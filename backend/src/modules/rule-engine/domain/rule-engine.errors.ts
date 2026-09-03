/**
 * Rule Engine domain errors.
 * Typed exceptions for configuration, rule type, measurement, and role issues.
 */

import { AppError } from '../../../api/app-error.js';

/**
 * Invalid rule configuration structure or values.
 */
export class InvalidRuleConfig extends AppError {
  constructor(message: string, details?: string) {
    super(400, 'INVALID_RULE_CONFIG', message, 'rule_config');
    void details; // Mark as intentionally unused
  }
}

/**
 * Unsupported or unknown rule type.
 */
export class UnsupportedRuleType extends AppError {
  constructor(ruleType: unknown) {
    super(400, 'UNSUPPORTED_RULE_TYPE', `Unsupported rule type: ${ruleType}`, 'rule_type');
  }
}

/**
 * Measurement is required but not provided.
 */
export class MeasurementRequired extends AppError {
  constructor() {
    super(400, 'MEASUREMENT_REQUIRED', 'Measurement is required for this rule type.', 'measurement');
  }
}

/**
 * Measurement is outside all configured ranges or thresholds.
 */
export class MeasurementOutOfRange extends AppError {
  constructor(measurement: number) {
    super(400, 'MEASUREMENT_OUT_OF_RANGE', `Measurement ${measurement} does not fall into any configured range.`, 'measurement');
  }
}

/**
 * Role context is required but not provided (for ROLE_CONDITIONAL).
 */
export class RoleRequired extends AppError {
  constructor() {
    super(400, 'ROLE_REQUIRED', 'Role context is required for ROLE_CONDITIONAL rule type.', 'role');
  }
}

/**
 * No matching role branch found in ROLE_CONDITIONAL configuration.
 */
export class RoleBranchNotFound extends AppError {
  constructor(role: string) {
    super(400, 'ROLE_BRANCH_NOT_FOUND', `No matching role branch found for role: ${role}`, 'role');
  }
}

/**
 * Role branch configuration is invalid or incomplete.
 */
export class InvalidRoleBranch extends AppError {
  constructor(message: string) {
    super(400, 'INVALID_ROLE_BRANCH', message, 'branches');
  }
}

/**
 * Configuration validation errors for a specific rule type.
 */
export class RuleConfigValidationError extends AppError {
  constructor(message: string, public readonly validationErrors: Array<{ field: string; code: string; message: string }>) {
    super(400, 'RULE_CONFIG_VALIDATION_ERROR', message, 'rule_config');
  }
}
