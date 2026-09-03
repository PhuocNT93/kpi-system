/**
 * ORDINAL_MANUAL Strategy
 *
 * No automatic scoring. Qualitative/ordinal criteria where a reviewer must
 * manually select the appropriate level based on descriptive criteria.
 * Examples: Independence, Ownership Scope, Attitude
 *
 * Design:
 *  - Always returns requires_manual_review = true
 *  - Never calculates a level automatically
 *  - Measurement is ignored
 *  - Config may include level_labels for reviewer guidance (not used by strategy)
 *  - Purely deterministic: always returns the same result for any input
 */

import type { RuleStrategy } from '../domain/rule.strategy.js';
import type { RuleResult, RuleType } from '../domain/rule.types.js';

export class OrdinalManualStrategy implements RuleStrategy {
  evaluate(): RuleResult {
    // Always return manual review required, never auto-calculate
    return {
      resolved_level: null,
      raw_score: null,
      requires_manual_review: true,
    };
  }

  supports(ruleType: RuleType): boolean {
    return ruleType === 'ORDINAL_MANUAL';
  }
}
