/**
 * Strategy interface for rule evaluation.
 * Each rule type has exactly one strategy implementation.
 * Strategy is the implementation of a rule type, fully driven by rule_config.
 */

import type { RuleType, RuleResult } from './rule.types.js';

/**
 * Generic strategy interface for rule evaluation.
 * Implementations are stateless and pure.
 */
export interface RuleStrategy {
  /**
   * Evaluate a measurement against the provided configuration.
   *
   * @param measurement - The value to evaluate (or null if not available)
   * @param config - The rule configuration (already validated)
   * @param context - Optional context (e.g., role for ROLE_CONDITIONAL)
   * @returns RuleResult with resolved_level, raw_score, and requires_manual_review flag
   * @throws AppError if evaluation fails or configuration is invalid
   */
  evaluate(measurement: number | null, config: unknown, context?: EvaluationContext): RuleResult;

  /**
   * Returns the rule type this strategy supports.
   */
  supports(ruleType: RuleType): boolean;
}

/**
 * Optional context passed during evaluation.
 * Used by ROLE_CONDITIONAL to pass role information to nested rules.
 */
export interface EvaluationContext {
  role_code?: string | null;
  registry?: StrategyRegistry; // Required for ROLE_CONDITIONAL to delegate
}

/**
 * Registry for looking up strategies by rule type.
 * Enables ROLE_CONDITIONAL to delegate without hard-coding strategy instances.
 */
export interface StrategyRegistry {
  /**
   * Get the strategy for a given rule type.
   * @throws UnsupportedRuleType if rule type is not supported
   */
  getStrategy(ruleType: RuleType): RuleStrategy;
}
