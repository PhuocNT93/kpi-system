/**
 * COUNT_THRESHOLD Strategy Tests
 *
 * Table-driven tests for event count mapping.
 * Tests cover:
 *  - Happy path (counts at various thresholds)
 *  - Boundary conditions
 *  - Null measurement
 *  - Negative counts
 *  - Empty thresholds array
 *  - Invalid configuration
 */

import { describe, it, expect } from 'vitest';
import { CountThresholdStrategy } from '../../src/modules/rule-engine/strategies/count-threshold.strategy.js';
import type { CountThresholdConfig } from '../../src/modules/rule-engine/domain/rule.types.js';
import { InvalidRuleConfig } from '../../src/modules/rule-engine/domain/rule-engine.errors.js';

describe('CountThresholdStrategy', () => {
  const strategy = new CountThresholdStrategy();

  describe('Happy path - event count thresholds', () => {
    const config: CountThresholdConfig = {
      thresholds: [1, 3, 5, 8],
    };
    // Level mapping: 0 → 1, 1-2 → 2, 3-4 → 3, 5-7 → 4, 8+ → 5

    const testCases: Array<[number, number]> = [
      [0, 1],   // Below first threshold
      [1, 2],   // At first threshold
      [2, 2],   // Between first and second
      [3, 3],   // At second threshold
      [4, 3],   // Between second and third
      [5, 4],   // At third threshold
      [7, 4],   // Between third and fourth
      [8, 5],   // At fourth threshold
      [20, 5],  // Beyond highest threshold
    ];

    testCases.forEach(([count, expectedLevel]) => {
      it(`count ${count} resolves to level ${expectedLevel}`, () => {
        const result = strategy.evaluate(count, config);
        expect(result.resolved_level).toBe(expectedLevel);
        expect(result.requires_manual_review).toBe(false);
      });
    });
  });

  describe('Boundary conditions', () => {
    const config: CountThresholdConfig = {
      thresholds: [1, 5, 10],
    };

    it('exact first threshold', () => {
      const result = strategy.evaluate(1, config);
      expect(result.resolved_level).toBe(2);
    });

    it('just below first threshold', () => {
      const result = strategy.evaluate(0, config);
      expect(result.resolved_level).toBe(1);
    });

    it('exact last threshold', () => {
      const result = strategy.evaluate(10, config);
      expect(result.resolved_level).toBe(4);
    });

    it('value between thresholds', () => {
      const result = strategy.evaluate(6, config);
      expect(result.resolved_level).toBe(3);
    });
  });

  describe('Edge cases', () => {
    it('single threshold', () => {
      const config: CountThresholdConfig = { thresholds: [5] };
      expect(strategy.evaluate(4, config).resolved_level).toBe(1);
      expect(strategy.evaluate(5, config).resolved_level).toBe(2);
    });

    it('empty thresholds array defaults to level 1', () => {
      const config: CountThresholdConfig = { thresholds: [] };
      const result = strategy.evaluate(100, config);
      expect(result.resolved_level).toBe(1);
    });
  });

  describe('Null measurement', () => {
    const config: CountThresholdConfig = {
      thresholds: [1, 3, 5],
    };

    it('null measurement returns null level', () => {
      const result = strategy.evaluate(null, config);
      expect(result.resolved_level).toBeNull();
      expect(result.raw_score).toBeNull();
      expect(result.requires_manual_review).toBe(false);
    });
  });

  describe('Negative count', () => {
    const config: CountThresholdConfig = {
      thresholds: [1, 3, 5],
    };

    it('negative count is treated as below first threshold', () => {
      const result = strategy.evaluate(-1, config);
      expect(result.resolved_level).toBe(1);
    });
  });

  describe('Invalid configuration', () => {
    it('throws on missing thresholds', () => {
      const config = {} as CountThresholdConfig;
      expect(() => strategy.evaluate(5, config)).toThrow(InvalidRuleConfig);
    });

    it('throws on non-array thresholds', () => {
      const config = { thresholds: 'not-an-array' } as unknown as CountThresholdConfig;
      expect(() => strategy.evaluate(5, config)).toThrow(InvalidRuleConfig);
    });
  });

  describe('Unsorted thresholds', () => {
    const config: CountThresholdConfig = {
      thresholds: [5, 1, 3], // Out of order
    };

    it('handles unsorted thresholds by sorting internally', () => {
      // After sorting: [1, 3, 5]
      const result = strategy.evaluate(2, config);
      expect(result.resolved_level).toBe(2); // 2 < 3, so level 2
    });
  });

  describe('Supports method', () => {
    it('supports COUNT_THRESHOLD', () => {
      expect(strategy.supports('COUNT_THRESHOLD')).toBe(true);
    });

    it('does not support other types', () => {
      expect(strategy.supports('RANGE_THRESHOLD')).toBe(false);
      expect(strategy.supports('ORDINAL_MANUAL')).toBe(false);
    });
  });
});
