/**
 * RANGE_THRESHOLD Strategy Tests
 *
 * Table-driven tests covering:
 *  - Happy path (values in various buckets)
 *  - Boundary conditions (exact min/max, adjacent values)
 *  - Null measurement
 *  - Out-of-range measurement
 *  - Invalid configuration
 */

import { describe, it, expect } from 'vitest';
import { RangeThresholdStrategy } from '../../src/modules/rule-engine/strategies/range-threshold.strategy.js';
import type { RangeThresholdConfig } from '../../src/modules/rule-engine/domain/rule.types.js';
import { InvalidRuleConfig } from '../../src/modules/rule-engine/domain/rule-engine.errors.js';

describe('RangeThresholdStrategy', () => {
  const strategy = new RangeThresholdStrategy();

  describe('Happy path - various buckets', () => {
    const config: RangeThresholdConfig = {
      ranges: [
        { min: 0, max: 79.99, level: 1 },
        { min: 80, max: 89.99, level: 2 },
        { min: 90, max: 99.99, level: 3 },
        { min: 100, max: 100, level: 4 },
      ],
    };

    const testCases: Array<[number, number]> = [
      [0, 1],
      [50, 1],
      [75.5, 1],
      [79.99, 1],
      [80, 2],
      [85, 2],
      [89.99, 2],
      [90, 3],
      [95, 3],
      [99.99, 3],
      [100, 4],
    ];

    testCases.forEach(([measurement, expectedLevel]) => {
      it(`measurement ${measurement} resolves to level ${expectedLevel}`, () => {
        const result = strategy.evaluate(measurement, config);
        expect(result.resolved_level).toBe(expectedLevel);
        expect(result.requires_manual_review).toBe(false);
      });
    });
  });

  describe('Boundary conditions', () => {
    const config: RangeThresholdConfig = {
      ranges: [
        { min: 0, max: 79.99, level: 1 },
        { min: 80, max: 89.99, level: 2 },
      ],
    };

    it('exact lower boundary', () => {
      const result = strategy.evaluate(0, config);
      expect(result.resolved_level).toBe(1);
    });

    it('exact upper boundary', () => {
      const result = strategy.evaluate(79.99, config);
      expect(result.resolved_level).toBe(1);
    });

    it('value just above upper boundary falls to next level', () => {
      const result = strategy.evaluate(80, config);
      expect(result.resolved_level).toBe(2);
    });

    it('value just below next level boundary', () => {
      const result = strategy.evaluate(79.98, config);
      expect(result.resolved_level).toBe(1);
    });
  });

  describe('Open-ended ranges', () => {
    const config: RangeThresholdConfig = {
      ranges: [
        { min: 0, max: 79.99, level: 1 },
        { min: 100, max: null, level: 5 }, // null max = open-ended
      ],
    };

    it('value within open-ended range resolves correctly', () => {
      const result = strategy.evaluate(100, config);
      expect(result.resolved_level).toBe(5);
    });

    it('large value in open-ended range', () => {
      const result = strategy.evaluate(10000, config);
      expect(result.resolved_level).toBe(5);
    });

    it('gap between ranges results in out-of-range', () => {
      const result = strategy.evaluate(85, config);
      expect(result.resolved_level).toBeNull();
    });
  });

  describe('Null measurement', () => {
    const config: RangeThresholdConfig = {
      ranges: [{ min: 0, max: 100, level: 3 }],
    };

    it('null measurement returns null level', () => {
      const result = strategy.evaluate(null, config);
      expect(result.resolved_level).toBeNull();
      expect(result.raw_score).toBeNull();
      expect(result.requires_manual_review).toBe(false);
    });
  });

  describe('Out-of-range', () => {
    const config: RangeThresholdConfig = {
      ranges: [{ min: 0, max: 100, level: 3 }],
    };

    it('negative value out of range', () => {
      const result = strategy.evaluate(-5, config);
      expect(result.resolved_level).toBeNull();
    });

    it('value exceeding configured max', () => {
      const result = strategy.evaluate(105, config);
      expect(result.resolved_level).toBeNull();
    });
  });

  describe('Invalid configuration', () => {
    it('throws on empty ranges', () => {
      const config = { ranges: [] };
      expect(() => strategy.evaluate(50, config)).toThrow(InvalidRuleConfig);
    });

    it('throws on missing ranges', () => {
      const config = {} as RangeThresholdConfig;
      expect(() => strategy.evaluate(50, config)).toThrow(InvalidRuleConfig);
    });
  });

  describe('Floating-point precision', () => {
    const config: RangeThresholdConfig = {
      ranges: [
        { min: 0, max: 69.999999, level: 1 },
        { min: 70, max: 79.99, level: 2 },
      ],
    };

    it('handles floating-point precision boundary', () => {
      const result = strategy.evaluate(69.99999, config);
      expect(result.resolved_level).toBe(1);
    });

    it('exact boundary at floating-point precision', () => {
      const result = strategy.evaluate(70, config);
      expect(result.resolved_level).toBe(2);
    });
  });

  describe('Supports method', () => {
    it('supports RANGE_THRESHOLD', () => {
      expect(strategy.supports('RANGE_THRESHOLD')).toBe(true);
    });

    it('does not support other types', () => {
      expect(strategy.supports('COUNT_THRESHOLD')).toBe(false);
      expect(strategy.supports('ORDINAL_MANUAL')).toBe(false);
    });
  });
});
