/**
 * Rule Engine
 *
 * Pure, deterministic, stateless calculation engine for resolving evaluation measurements to levels.
 * Main entry point: resolve(input: RuleInput): RuleResult
 *
 * Design:
 *  - No state, no dependencies on database/HTTP/auth
 *  - Takes untrusted input, validates against expected schema
 *  - Delegates to appropriate strategy based on rule_type
 *  - Returns typed result or throws domain error
 *  - Fully configurable via rule_config JSON
 */

import type { RuleInput, RuleResult, RuleType } from './rule.types.js';
import type { StrategyRegistry } from './rule.strategy.js';
import { RuleConfigValidator } from '../application/rule-config.validator.js';
import { UnsupportedRuleType } from './rule-engine.errors.js';

export class RuleEngine {
  constructor(private registry: StrategyRegistry) {}

  /**
   * Resolve a measurement using a configured rule.
   *
   * @param input - RuleInput containing measurement, rule type, config, and optional role context
   * @returns RuleResult with resolved level, raw score, and manual review flag
   * @throws AppError if configuration is invalid, rule type unsupported, or evaluation fails
   */
  resolve(input: RuleInput): RuleResult {
    // Validate input shape
    if (!input || typeof input !== 'object') {
      throw new Error('RuleInput must be a non-null object.');
    }

    const ruleType = input.rule_type as RuleType;

    // Validate configuration for the given rule type
    RuleConfigValidator.validate(ruleType, input.rule_config);

    // Get the strategy for this rule type
    let strategy;
    try {
      strategy = this.registry.getStrategy(ruleType);
    } catch (error) {
      if (error instanceof UnsupportedRuleType) {
        throw error;
      }
      throw new Error(`Failed to resolve strategy for rule type ${ruleType}: ${error}`);
    }

    // Delegate to strategy with evaluation context (for ROLE_CONDITIONAL)
    const context = {
      role_code: input.role_code,
      registry: this.registry,
    };

    const result = strategy.evaluate(input.measurement, input.rule_config, context);

    return result;
  }
}
