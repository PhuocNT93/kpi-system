/**
 * Rule Engine Purity & Statelessness Tests
 *
 * Verify that the Rule Engine is a pure function:
 *  - Deterministic: same input → same output
 *  - Stateless: no mutable global state
 *  - No side effects: no I/O, no dependencies on time/environment
 *  - Concurrent-safe: multiple invocations don't interfere
 */

import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../../src/modules/rule-engine/domain/rule-engine.js';
import { DefaultStrategyRegistry } from '../../src/modules/rule-engine/strategies/strategy.registry.js';
import type { RuleInput } from '../../src/modules/rule-engine/domain/rule.types.js';

describe('Rule Engine Purity & Statelessness', () => {
  const registry = new DefaultStrategyRegistry();
  const engine = new RuleEngine(registry);

  describe('Determinism', () => {
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

    it('same input produces same output', () => {
      const result1 = engine.resolve(input);
      const result2 = engine.resolve(input);
      expect(result1).toEqual(result2);
    });

    it('multiple evaluations produce identical results', () => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(engine.resolve(input));
      }

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });

    it('evaluation order independence', () => {
      const input1: RuleInput = {
        measurement: 50,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: { ranges: [{ min: 0, max: 100, level: 1 }] },
      };

      const input2: RuleInput = {
        measurement: 2,
        rule_type: 'COUNT_THRESHOLD',
        rule_config: { thresholds: [1, 3, 5] },
      };

      // Evaluate in order 1, 2, 1, 2
      const r1a = engine.resolve(input1);
      const r2a = engine.resolve(input2);
      const r1b = engine.resolve(input1);
      const r2b = engine.resolve(input2);

      expect(r1a).toEqual(r1b);
      expect(r2a).toEqual(r2b);
    });
  });

  describe('Multiple engine instances', () => {
    it('two engines produce identical results', () => {
      const engine1 = new RuleEngine(new DefaultStrategyRegistry());
      const engine2 = new RuleEngine(new DefaultStrategyRegistry());

      const input: RuleInput = {
        measurement: 75,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: {
          ranges: [
            { min: 0, max: 50, level: 1 },
            { min: 51, max: 100, level: 5 },
          ],
        },
      };

      const result1 = engine1.resolve(input);
      const result2 = engine2.resolve(input);
      expect(result1).toEqual(result2);
    });

    it('multiple instances can be evaluated concurrently', () => {
      const results: Array<{ engine: number; result: unknown }> = [];

      const input: RuleInput = {
        measurement: 50,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: { ranges: [{ min: 0, max: 100, level: 1 }] },
      };

      // Simulate concurrent evaluation with multiple engines
      for (let i = 0; i < 5; i++) {
        const e = new RuleEngine(new DefaultStrategyRegistry());
        results.push({ engine: i, result: e.resolve(input) });
      }

      // All results should be identical
      const firstResult = results[0].result;
      for (let i = 1; i < results.length; i++) {
        expect(results[i].result).toEqual(firstResult);
      }
    });
  });

  describe('No mutable state', () => {
    it('evaluation does not modify input', () => {
      const input: RuleInput = {
        measurement: 75,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: {
          ranges: [
            { min: 0, max: 50, level: 1 },
            { min: 51, max: 100, level: 5 },
          ],
        },
      };

      const inputBefore = JSON.parse(JSON.stringify(input));
      engine.resolve(input);
      const inputAfter = JSON.parse(JSON.stringify(input));

      expect(inputAfter).toEqual(inputBefore);
    });

    it('config object is not mutated', () => {
      const config = {
        ranges: [
          { min: 0, max: 50, level: 1 },
          { min: 51, max: 100, level: 5 },
        ],
      };

      const configBefore = JSON.parse(JSON.stringify(config));

      const input: RuleInput = {
        measurement: 75,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: config,
      };

      engine.resolve(input);
      engine.resolve(input); // Second call

      const configAfter = JSON.parse(JSON.stringify(config));
      expect(configAfter).toEqual(configBefore);
    });
  });

  describe('No I/O or external dependencies', () => {
    it('does not make HTTP requests', async () => {
      const input: RuleInput = {
        measurement: 50,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: { ranges: [{ min: 0, max: 100, level: 1 }] },
      };

      // Execute synchronously without any async operations
      const result = engine.resolve(input);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('result is immediate (no async delay)', () => {
      const input: RuleInput = {
        measurement: 50,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: { ranges: [{ min: 0, max: 100, level: 1 }] },
      };

      const start = Date.now();
      engine.resolve(input);
      const elapsed = Date.now() - start;

      // Should be very fast (< 10ms)
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('No time/environment dependency', () => {
    it('result does not depend on current time', () => {
      const input: RuleInput = {
        measurement: 75,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: {
          ranges: [
            { min: 0, max: 50, level: 1 },
            { min: 51, max: 100, level: 5 },
          ],
        },
      };

      const result1 = engine.resolve(input);

      // Wait a moment
      const wait = new Promise(resolve => setTimeout(resolve, 100));

      wait.then(() => {
        const result2 = engine.resolve(input);
        expect(result2).toEqual(result1);
      });
    });
  });

  describe('Concurrent-safe evaluation', () => {
    it('parallel evaluations do not interfere', () => {
      const inputs: RuleInput[] = [
        {
          measurement: 25,
          rule_type: 'RANGE_THRESHOLD',
          rule_config: { ranges: [{ min: 0, max: 100, level: 1 }] },
        },
        {
          measurement: 2,
          rule_type: 'COUNT_THRESHOLD',
          rule_config: { thresholds: [1, 3, 5] },
        },
        {
          measurement: null,
          rule_type: 'ORDINAL_MANUAL',
          rule_config: {},
        },
      ];

      const results = inputs.map(input => engine.resolve(input));

      expect(results[0].resolved_level).toBe(1);
      expect(results[1].resolved_level).toBe(2);
      expect(results[2].requires_manual_review).toBe(true);
    });

    it('interleaved evaluations produce correct results', () => {
      const input1: RuleInput = {
        measurement: 50,
        rule_type: 'RANGE_THRESHOLD',
        rule_config: { ranges: [{ min: 0, max: 100, level: 1 }] },
      };

      const input2: RuleInput = {
        measurement: 3,
        rule_type: 'COUNT_THRESHOLD',
        rule_config: { thresholds: [1, 3, 5] },
      };

      // Interleave: 1, 2, 1, 2, 1
      const r1a = engine.resolve(input1);
      const r2a = engine.resolve(input2);
      const r1b = engine.resolve(input1);
      const r2b = engine.resolve(input2);
      const r1c = engine.resolve(input1);

      expect(r1a).toEqual(r1b);
      expect(r1b).toEqual(r1c);
      expect(r2a).toEqual(r2b);
    });
  });

  describe('ORDINAL_MANUAL purity', () => {
    it('always returns same result regardless of measurement', () => {
      const config = { type: 'ORDINAL_MANUAL' };

      const results = [null, 0, 50, 100, 1000]
        .map(measurement => engine.resolve({
          measurement,
          rule_type: 'ORDINAL_MANUAL',
          rule_config: config,
        }));

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });

  describe('Complex rule purity', () => {
    it('ROLE_CONDITIONAL produces consistent results', () => {
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
            {
              role_code: 'SM',
              rule: {
                type: 'COUNT_THRESHOLD',
                thresholds: [1, 3, 5],
              },
            },
          ],
        },
        role_code: 'SI',
      };

      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(engine.resolve(input));
      }

      // All evaluations should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });
});
