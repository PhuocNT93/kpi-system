/**
 * ROLE_CONDITIONAL Strategy
 *
 * Selects and delegates to a different rule strategy based on input role context.
 * Enables same criterion to use different scoring rules for different roles.
 * Example: Testing & Documentation - SI uses RANGE_THRESHOLD on % coverage, SM uses ORDINAL_MANUAL
 *
 * Design:
 *  - Configuration contains array of role-specific rule branches
 *  - On evaluate(), looks up the role in context and finds matching branch
 *  - Delegates to that branch's nested rule using the strategy registry
 *  - Throws error if role is missing/null or no matching branch found
 *  - Validates nested rule structure during evaluation (caught by validator at config time)
 */

import type { RuleStrategy, EvaluationContext } from '../domain/rule.strategy.js';
import type { RoleConditionalConfig, RuleResult, RuleType } from '../domain/rule.types.js';
import { RoleRequired, RoleBranchNotFound, InvalidRoleBranch } from '../domain/rule-engine.errors.js';

export class RoleConditionalStrategy implements RuleStrategy {
  evaluate(measurement: number | null, config: unknown, context?: EvaluationContext): RuleResult {
    const cfg = config as RoleConditionalConfig;

    // Extract role from context
    const role = context?.role_code;
    if (!role) {
      throw new RoleRequired();
    }

    // Find matching branch
    if (!Array.isArray(cfg.branches)) {
      throw new InvalidRoleBranch('ROLE_CONDITIONAL requires a branches array.');
    }

    const branch = cfg.branches.find(b => b.role_code === role);
    if (!branch) {
      throw new RoleBranchNotFound(role);
    }

    if (!branch.rule) {
      throw new InvalidRoleBranch(`Branch for role ${role} has no nested rule.`);
    }

    // Get registry from context to delegate
    const registry = context?.registry;
    if (!registry) {
      throw new Error('StrategyRegistry is required in context for ROLE_CONDITIONAL evaluation.');
    }

    // Delegate to the nested rule strategy
    const nestedRuleType = (branch.rule as Record<string, unknown>).type as RuleType;
    if (!nestedRuleType) {
      throw new InvalidRoleBranch(`Branch for role ${role} has no rule type specified.`);
    }

    const nestedStrategy = registry.getStrategy(nestedRuleType);
    return nestedStrategy.evaluate(measurement, branch.rule, context);
  }

  supports(ruleType: RuleType): boolean {
    return ruleType === 'ROLE_CONDITIONAL';
  }
}
