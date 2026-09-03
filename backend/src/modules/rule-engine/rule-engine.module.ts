/**
 * Rule Engine Module Factory
 *
 * Creates and exports the Rule Engine module with all its dependencies.
 * Follows the module pattern used across the backend.
 */

import { RuleEngine } from './domain/rule-engine.js';
import { DefaultStrategyRegistry } from './strategies/strategy.registry.js';

export interface RuleEngineModule {
  engine: RuleEngine;
  registry: DefaultStrategyRegistry;
}

/**
 * Create and configure the Rule Engine module.
 * No database or external dependencies required.
 */
export function createRuleEngineModule(): RuleEngineModule {
  const registry = new DefaultStrategyRegistry();
  const engine = new RuleEngine(registry);

  return {
    engine,
    registry,
  };
}
