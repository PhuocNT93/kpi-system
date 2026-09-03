/**
 * RANGE_THRESHOLD Strategy
 *
 * Maps continuous measurements to levels based on configured ranges.
 * Example: On-time Completion (0-79.99 → level 1, 80-89.99 → level 2, etc.)
 *
 * Design:
 *  - Measurement is compared against each threshold bucket [min, max)
 *  - Returns the level of the matching bucket
 *  - Returns null if measurement is null or falls outside all configured ranges
 *  - Does not silently clamp values
 */

import type { RuleStrategy } from '../domain/rule.strategy.js';
import type { RangeThresholdConfig, RuleResult, RuleType } from '../domain/rule.types.js';
import { InvalidRuleConfig } from '../domain/rule-engine.errors.js';

export class RangeThresholdStrategy implements RuleStrategy {
  evaluate(measurement: number | null, config: unknown): RuleResult {
    if (measurement === null) {
      return {
        resolved_level: null,
        raw_score: null,
        requires_manual_review: false,
      };
    }

    const cfg = config as RangeThresholdConfig;
    if (!Array.isArray(cfg.ranges) || cfg.ranges.length === 0) {
      throw new InvalidRuleConfig('RANGE_THRESHOLD requires a non-empty ranges array.');
    }

    // Sort ranges by min value for consistent evaluation
    const sorted = [...cfg.ranges].sort((a, b) => a.min - b.min);

    for (const bucket of sorted) {
      const min = bucket.min;
      const max = bucket.max;

      // Check if measurement falls in this bucket
      // Inclusive on min, inclusive on max (or open-ended if max is null)
      const inRange = measurement >= min && (max === null || measurement <= max);
      if (inRange) {
        return {
          resolved_level: bucket.level,
          raw_score: null, // raw_score comes from level definition, not from strategy
          requires_manual_review: false,
        };
      }
    }

    // Measurement does not fall into any configured range
    return {
      resolved_level: null,
      raw_score: null,
      requires_manual_review: false,
    };
  }

  supports(ruleType: RuleType): boolean {
    return ruleType === 'RANGE_THRESHOLD';
  }
}
