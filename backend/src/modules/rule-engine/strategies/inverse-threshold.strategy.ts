/**
 * INVERSE_THRESHOLD Strategy
 *
 * Maps measurements to levels where lower values are better (inverse of RANGE_THRESHOLD).
 * Example: Production Incident count (0 → level 5, 1 → level 3, 2+ → level 1)
 *
 * Design:
 *  - Same range bucket structure as RANGE_THRESHOLD
 *  - Logic is identical: find matching bucket [min, max), return level
 *  - The "inverse" aspect is purely in configuration - set up buckets to map lower counts to higher levels
 *  - Returns null if measurement is null or out-of-range
 */

import type { RuleStrategy } from '../domain/rule.strategy.js';
import type { InverseThresholdConfig, RuleResult, RuleType } from '../domain/rule.types.js';
import { InvalidRuleConfig } from '../domain/rule-engine.errors.js';

export class InverseThresholdStrategy implements RuleStrategy {
  evaluate(measurement: number | null, config: unknown): RuleResult {
    if (measurement === null) {
      return {
        resolved_level: null,
        raw_score: null,
        requires_manual_review: false,
      };
    }

    const cfg = config as InverseThresholdConfig;
    if (!Array.isArray(cfg.ranges) || cfg.ranges.length === 0) {
      throw new InvalidRuleConfig('INVERSE_THRESHOLD requires a non-empty ranges array.');
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
    return ruleType === 'INVERSE_THRESHOLD';
  }
}
