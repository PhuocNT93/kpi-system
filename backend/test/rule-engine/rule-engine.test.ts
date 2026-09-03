/**
 * Rule Engine Integration Tests
 *
 * End-to-end tests for the RuleEngine class.
 */

import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../../src/modules/rule-engine/domain/rule-engine.js';
import { DefaultStrategyRegistry } from '../../src/modules/rule-engine/strategies/strategy.registry.js';
import type { RuleInput } from '../../src/modules/rule-engine/domain/rule.types.js';
import { RuleConfigValidationError } from '../../src/modules/rule-engine/domain/rule-engine.errors.js';

describe('RuleEngine Integration', () => {
  const registry = new DefaultStrategyRegistry();
  const engine = new RuleEngine(registry);

  describe('RuleInput contract', () => {
    it('resolves RANGE_THRESHOLD rule', () => {
      const input: RuleInput = {
        measurement: 85,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: {
          ranges: [
            { min: 0, max: 79.99, level: 1 },
            { min: 80, max: 100, level: 3 },
          ],
        },
      };

      const result = engine.resolve(input);
      expect(result.resolved_level).toBe(3);
      expect(result.requires_manual_review).toBe(false);
    });

    it('resolves COUNT_THRESHOLD rule', () => {
      const input: RuleInput = {
        measurement: 2,
        rule_type: 'COUNT_THRESHOLD',
        rule_config: {
          thresholds: [1, 3, 5],
        },
      };

      const result = engine.resolve(input);
      expect(result.resolved_level).toBe(2);
    });

    it('resolves ORDINAL_MANUAL rule', () => {
      const input: RuleInput = {
        measurement: 50,
        rule_type: 'ORDINAL_MANUAL',
        rule_config: {},
      };

      const result = engine.resolve(input);
      expect(result.requires_manual_review).toBe(true);
      expect(result.resolved_level).toBeNull();
    });

    it('resolves ROLE_CONDITIONAL rule', () => {
      const input: RuleInput = {
        measurement: 75,
        rule_type: 'ROLE_CONDITIONAL',
        rule_config: {
          branches: [
            {
              role_code: 'SI',
              rule: {
                type: 'RANGE_THRESHOLD',
                ranges: [
                  { min: 0, max: 50, level: 1 },
                  { min: 51, max: 100, level: 5 },
                ],
              },
            },
          ],
        },
        role_code: 'SI',
      };

      const result = engine.resolve(input);
      expect(result.resolved_level).toBe(5);
    });
  });

  describe('RuleResult contract', () => {
    it('returns complete RuleResult shape', () => {
      const input: RuleInput = {
        measurement: 50,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: {
          ranges: [{ min: 0, max: 100, level: 1 }],
        },
      };

      const result = engine.resolve(input);
      expect(result).toHaveProperty('resolved_level');
      expect(result).toHaveProperty('raw_score');
      expect(result).toHaveProperty('requires_manual_review');
      expect(typeof result.resolved_level).toBe('number');
      expect(result.raw_score).toBeNull();
      expect(typeof result.requires_manual_review).toBe('boolean');
    });
  });

  describe('Configuration validation', () => {
    it('rejects invalid range threshold config', () => {
      const input: RuleInput = {
        measurement: 50,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: { ranges: [] }, // empty - invalid
      };

      expect(() => engine.resolve(input)).toThrow(RuleConfigValidationError);
    });

    it('rejects overlapping ranges', () => {
      const input: RuleInput = {
        measurement: 50,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: {
          ranges: [
            { min: 0, max: 100, level: 1 },
            { min: 50, max: 150, level: 2 },
          ],
        },
      };

      expect(() => engine.resolve(input)).toThrow(RuleConfigValidationError);
    });

    it('rejects duplicate role branches', () => {
      const input: RuleInput = {
        measurement: 50,
        rule_type: 'ROLE_CONDITIONAL',
        rule_config: {
          branches: [
            {
              role_code: 'SI',
              rule: { type: 'ORDINAL_MANUAL' },
            },
            {
              role_code: 'SI', // duplicate
              rule: { type: 'ORDINAL_MANUAL' },
            },
          ],
        },
        role_code: 'SI',
      };

      expect(() => engine.resolve(input)).toThrow(RuleConfigValidationError);
    });
  });

  describe('Error handling', () => {
    it('throws error for unknown rule type', () => {
      const input: RuleInput = {
        measurement: 50,
        rule_type: 'UNKNOWN_TYPE' as never,
        rule_config: {},
      };

      expect(() => engine.resolve(input)).toThrow(RuleConfigValidationError);
    });

    it('throws when ROLE_CONDITIONAL has no role in input', () => {
      const input: RuleInput = {
        measurement: 50,
        rule_type: 'ROLE_CONDITIONAL',
        rule_config: {
          branches: [
            {
              role_code: 'SI',
              rule: { type: 'ORDINAL_MANUAL' },
            },
          ],
        },
        // no role_code provided
      };

      expect(() => engine.resolve(input)).toThrow();
    });
  });

  describe('Null measurement handling', () => {
    it('handles null measurement in RANGE_THRESHOLD', () => {
      const input: RuleInput = {
        measurement: null,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: {
          ranges: [{ min: 0, max: 100, level: 1 }],
        },
      };

      const result = engine.resolve(input);
      expect(result.resolved_level).toBeNull();
      expect(result.raw_score).toBeNull();
    });

    it('handles null measurement in COUNT_THRESHOLD', () => {
      const input: RuleInput = {
        measurement: null,
        rule_type: 'COUNT_THRESHOLD',
        rule_config: { thresholds: [1, 3, 5] },
      };

      const result = engine.resolve(input);
      expect(result.resolved_level).toBeNull();
    });

    it('always returns manual review for ORDINAL_MANUAL even with null', () => {
      const input: RuleInput = {
        measurement: null,
        rule_type: 'ORDINAL_MANUAL',
        rule_config: {},
      };

      const result = engine.resolve(input);
      expect(result.requires_manual_review).toBe(true);
    });
  });

  describe('Multiple rule types in sequence', () => {
    it('can evaluate different rule types sequentially', () => {
      const input1: RuleInput = {
        measurement: 50,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: { ranges: [{ min: 0, max: 100, level: 1 }] },
      };
      const result1 = engine.resolve(input1);
      expect(result1.resolved_level).toBe(1);

      const input2: RuleInput = {
        measurement: 2,
        rule_type: 'COUNT_THRESHOLD',
        rule_config: { thresholds: [1, 3, 5] },
      };
      const result2 = engine.resolve(input2);
      expect(result2.resolved_level).toBe(2);

      // First evaluation result should not affect second
      expect(result1.resolved_level).toBe(1);
    });
  });

  describe('Complex nested ROLE_CONDITIONAL', () => {
    it('evaluates role-conditional with multiple role options', () => {
      const config = {
        branches: [
          {
            role_code: 'ROLE_A',
            rule: {
              type: 'RANGE_THRESHOLD',
              ranges: [
                { min: 0, max: 50, level: 1 },
                { min: 51, max: 100, level: 5 },
              ],
            },
          },
          {
            role_code: 'ROLE_B',
            rule: {
              type: 'COUNT_THRESHOLD',
              thresholds: [1, 3, 5],
            },
          },
        ],
      };

      const input1: RuleInput = {
        measurement: 75,
        rule_type: 'ROLE_CONDITIONAL',
        rule_config: config,
        role_code: 'ROLE_A',
      };

      const result1 = engine.resolve(input1);
      expect(result1.resolved_level).toBe(5); // From RANGE_THRESHOLD for ROLE_A

      const input2: RuleInput = {
        measurement: 2,
        rule_type: 'ROLE_CONDITIONAL',
        rule_config: config,
        role_code: 'ROLE_B',
      };

      const result2 = engine.resolve(input2);
      expect(result2.resolved_level).toBe(2); // From COUNT_THRESHOLD for ROLE_B
    });
  });
});
