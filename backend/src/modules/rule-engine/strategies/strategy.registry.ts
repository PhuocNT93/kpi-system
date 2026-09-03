/**
 * Strategy Registry
 *
 * Central registry mapping rule types to their strategy implementations.
 * Enables strategy resolution and ROLE_CONDITIONAL delegation.
 */

import type { RuleStrategy, StrategyRegistry } from '../domain/rule.strategy.js';
import type { RuleType } from '../domain/rule.types.js';
import { UnsupportedRuleType } from '../domain/rule-engine.errors.js';
import { RangeThresholdStrategy } from './range-threshold.strategy.js';
import { InverseThresholdStrategy } from './inverse-threshold.strategy.js';
import { CountThresholdStrategy } from './count-threshold.strategy.js';
import { OrdinalManualStrategy } from './ordinal-manual.strategy.js';
import { RoleConditionalStrategy } from './role-conditional.strategy.js';

/**
 * Default strategy registry with all five strategies registered.
 * Implements the StrategyRegistry interface for dependency injection.
 */
export class DefaultStrategyRegistry implements StrategyRegistry {
  private strategies: Map<RuleType, RuleStrategy>;

  constructor() {
    this.strategies = new Map([
      ['RANGE_THRESHOLD', new RangeThresholdStrategy()],
      ['INVERSE_THRESHOLD', new InverseThresholdStrategy()],
      ['COUNT_THRESHOLD', new CountThresholdStrategy()],
      ['ORDINAL_MANUAL', new OrdinalManualStrategy()],
      ['ROLE_CONDITIONAL', new RoleConditionalStrategy()],
    ]);
  }

  getStrategy(ruleType: RuleType): RuleStrategy {
    const strategy = this.strategies.get(ruleType);
    if (!strategy) {
      throw new UnsupportedRuleType(ruleType);
    }
    return strategy;
  }

  /**
   * Get all registered strategies.
   * Useful for testing and diagnostics.
   */
  getAllStrategies(): Map<RuleType, RuleStrategy> {
    return new Map(this.strategies);
  }

  /**
   * Check if a rule type is registered.
   */
  hasStrategy(ruleType: RuleType): boolean {
    return this.strategies.has(ruleType);
  }
}
