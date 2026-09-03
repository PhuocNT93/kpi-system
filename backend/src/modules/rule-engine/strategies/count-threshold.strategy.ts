/**
 * COUNT_THRESHOLD Strategy
 *
 * Maps accumulated event counts to levels based on threshold array.
 * Example: Knowledge Sharing count (thresholds: [1, 3, 5, 8])
 *   0 → level 1, 1-2 → level 2, 3-4 → level 3, 5-7 → level 4, 8+ → level 5
 *
 * Design:
 *  - thresholds array defines boundaries: [t1, t2, t3, ...]
 *  - Level is determined by: floor(index) + 1, where index is the first threshold > measurement
 *  - Returns null if measurement is null
 *  - Handles negative counts gracefully (returns null, does not throw)
 */

import type { RuleStrategy } from '../domain/rule.strategy.js';
import type { CountThresholdConfig, RuleResult, RuleType } from '../domain/rule.types.js';
import { InvalidRuleConfig } from '../domain/rule-engine.errors.js';

export class CountThresholdStrategy implements RuleStrategy {
  evaluate(measurement: number | null, config: unknown): RuleResult {
    if (measurement === null) {
      return {
        resolved_level: null,
        raw_score: null,
        requires_manual_review: false,
      };
    }

    const cfg = config as CountThresholdConfig;
    if (!Array.isArray(cfg.thresholds)) {
      throw new InvalidRuleConfig('COUNT_THRESHOLD requires a thresholds array.');
    }

    // Handle empty thresholds array
    if (cfg.thresholds.length === 0) {
      return {
        resolved_level: 1, // Default to level 1 if no thresholds configured
        raw_score: null,
        requires_manual_review: false,
      };
    }

    // Sort thresholds to ensure correct comparison
    const sorted = [...cfg.thresholds].sort((a, b) => a - b);

    // Find the first threshold that is greater than the measurement
    for (let i = 0; i < sorted.length; i++) {
      if (measurement < sorted[i]) {
        // measurement is below this threshold, so it belongs to level i + 1
        return {
          resolved_level: i + 1,
          raw_score: null,
          requires_manual_review: false,
        };
      }
    }

    // Measurement is >= the highest threshold
    // Level is beyond the highest threshold index
    return {
      resolved_level: sorted.length + 1,
      raw_score: null,
      requires_manual_review: false,
    };
  }

  supports(ruleType: RuleType): boolean {
    return ruleType === 'COUNT_THRESHOLD';
  }
}
