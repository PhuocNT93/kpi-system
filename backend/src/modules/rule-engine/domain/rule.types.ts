/**
 * Rule Engine type definitions.
 *
 * Discriminated union for rule types and their configurations.
 * Pure, immutable domain model for rule resolution contract.
 */

/**
 * Supported rule types - fixed set of five strategies.
 * Per LLD §12 and BACKEND_NODE_RULES §3, only these five types are implemented.
 */
export const RuleTypes = {
  RANGE_THRESHOLD: 'RANGE_THRESHOLD',
  INVERSE_THRESHOLD: 'INVERSE_THRESHOLD',
  COUNT_THRESHOLD: 'COUNT_THRESHOLD',
  ORDINAL_MANUAL: 'ORDINAL_MANUAL',
  ROLE_CONDITIONAL: 'ROLE_CONDITIONAL',
} as const;

export type RuleType = (typeof RuleTypes)[keyof typeof RuleTypes];

/**
 * Range bucket for RANGE_THRESHOLD and INVERSE_THRESHOLD rules.
 * Represents a threshold range [min, max) with associated level.
 */
export interface RangeThreshold {
  readonly min: number;
  readonly max: number | null; // null means open-ended upper bound
  readonly level: number;
}

/**
 * Configuration for RANGE_THRESHOLD rule.
 * Maps continuous measurements to levels based on configured ranges.
 */
export interface RangeThresholdConfig {
  readonly type?: 'RANGE_THRESHOLD';
  readonly ranges: readonly RangeThreshold[];
}

/**
 * Configuration for INVERSE_THRESHOLD rule.
 * Lower measurement = higher level (e.g., incidents, bugs, rework count).
 */
export interface InverseThresholdConfig {
  readonly type?: 'INVERSE_THRESHOLD';
  readonly ranges: readonly RangeThreshold[];
}

/**
 * Configuration for COUNT_THRESHOLD rule.
 * Accumulated event count mapped to levels.
 * thresholds: array of boundaries [1, 3, 5, 8] means:
 *   0 → level 1, 1-2 → level 2, 3-4 → level 3, 5-7 → level 4, 8+ → level 5
 */
export interface CountThresholdConfig {
  readonly type?: 'COUNT_THRESHOLD';
  readonly thresholds: readonly number[];
}

/**
 * Configuration for ORDINAL_MANUAL rule.
 * No automatic scoring - requires manual reviewer selection.
 * Optional level_labels provide descriptive guidance.
 */
export interface OrdinalManualConfig {
  readonly type?: 'ORDINAL_MANUAL';
  readonly level_labels?: Readonly<Record<string, string>>;
}

/**
 * Role-specific rule branch.
 * Delegates evaluation to a nested rule based on role context.
 */
export interface RoleConditionalBranch {
  readonly role_code: string;
  readonly rule: RuleConfigUnion;
}

/**
 * Configuration for ROLE_CONDITIONAL rule.
 * Selects and delegates to a rule branch based on input role context.
 */
export interface RoleConditionalConfig {
  readonly type?: 'ROLE_CONDITIONAL';
  readonly branches: readonly RoleConditionalBranch[];
}

/**
 * Discriminated union of all rule configurations.
 * Enables TypeScript to narrow config type based on rule_type.
 */
export type RuleConfigUnion =
  | RangeThresholdConfig
  | InverseThresholdConfig
  | CountThresholdConfig
  | OrdinalManualConfig
  | RoleConditionalConfig;

/**
 * Engine input contract.
 * Stateless calculation: measurement + rule config → level + raw score.
 */
export interface RuleInput {
  readonly measurement: number | null;
  readonly rule_type: RuleType;
  readonly rule_config: unknown; // untrusted, will be validated
  readonly role_code?: string | null; // optional, used only for ROLE_CONDITIONAL
}

/**
 * Engine output contract.
 * Result of rule evaluation: resolved level, raw score, or manual review flag.
 */
export interface RuleResult {
  readonly resolved_level: number | null;
  readonly raw_score: number | null;
  readonly requires_manual_review: boolean;
}

/**
 * Type guard: check if config matches a specific rule type.
 */
export function isRangeThresholdConfig(config: unknown): config is RangeThresholdConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'ranges' in config &&
    Array.isArray((config as Record<string, unknown>).ranges)
  );
}

export function isInverseThresholdConfig(config: unknown): config is InverseThresholdConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'ranges' in config &&
    Array.isArray((config as Record<string, unknown>).ranges)
  );
}

export function isCountThresholdConfig(config: unknown): config is CountThresholdConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'thresholds' in config &&
    Array.isArray((config as Record<string, unknown>).thresholds)
  );
}

export function isOrdinalManualConfig(config: unknown): config is OrdinalManualConfig {
  return typeof config === 'object' && config !== null;
}

export function isRoleConditionalConfig(config: unknown): config is RoleConditionalConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'branches' in config &&
    Array.isArray((config as Record<string, unknown>).branches)
  );
}
