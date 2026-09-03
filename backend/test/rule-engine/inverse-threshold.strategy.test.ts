/**
 * INVERSE_THRESHOLD Strategy Tests
 *
 * Table-driven tests for inverse metrics (lower is better).
 * Tests cover:
 *  - Happy path (low/medium/high counts mapping to high/medium/low levels)
 *  - Boundary conditions
 *  - Null measurement
 *  - Out-of-range
 *  - Invalid configuration
 */

import { describe, it, expect } from 'vitest';
import { InverseThresholdStrategy } from '../../src/modules/rule-engine/strategies/inverse-threshold.strategy.js';
import type { InverseThresholdConfig } from '../../src/modules/rule-engine/domain/rule.types.js';
import { InvalidRuleConfig } from '../../src/modules/rule-engine/domain/rule-engine.errors.js';

describe('InverseThresholdStrategy', () => {
  const strategy = new InverseThresholdStrategy();

  describe('Happy path - inverse logic', () => {
    const config: InverseThresholdConfig = {
      ranges: [
        { min: 0, max: 0, level: 5 },      // 0 incidents → level 5
        { min: 1, max: 2, level: 3 },      // 1-2 incidents → level 3
        { min: 3, max: null, level: 1 },   // 3+ incidents → level 1
      ],
    };

    const testCases: Array<[number, number]> = [
      [0, 5],       // Zero → best level
      [1, 3],       // Single incident
      [2, 3],       // Two incidents
      [3, 1],       // Three incidents → worst level
      [10, 1],      // Many incidents
    ];

    testCases.forEach(([measurement, expectedLevel]) => {
      it(`${measurement} incidents resolves to level ${expectedLevel}`, () => {
        const result = strategy.evaluate(measurement, config);
        expect(result.resolved_level).toBe(expectedLevel);
        expect(result.requires_manual_review).toBe(false);
      });
    });
  });

  describe('Boundary conditions', () => {
    const config: InverseThresholdConfig = {
      ranges: [
        { min: 0, max: 0, level: 5 },
        { min: 1, max: 2, level: 3 },
        { min: 3, max: 10, level: 1 },
      ],
    };

    it('exact lower boundary', () => {
      const result = strategy.evaluate(0, config);
      expect(result.resolved_level).toBe(5);
    });

    it('exact upper boundary of range', () => {
      const result = strategy.evaluate(2, config);
      expect(result.resolved_level).toBe(3);
    });

    it('transition point between ranges', () => {
      const result = strategy.evaluate(3, config);
      expect(result.resolved_level).toBe(1);
    });
  });

  describe('Gap between ranges', () => {
    const config: InverseThresholdConfig = {
      ranges: [
        { min: 0, max: 0, level: 5 },
        { min: 2, max: 5, level: 2 }, // Gap at 1
      ],
    };

    it('value in gap results in out-of-range', () => {
      const result = strategy.evaluate(1, config);
      expect(result.resolved_level).toBeNull();
    });
  });

  describe('Open-ended upper range', () => {
    const config: InverseThresholdConfig = {
      ranges: [
        { min: 0, max: 5, level: 3 },
        { min: 6, max: null, level: 1 }, // null = open-ended
      ],
    };

    it('large value in open-ended range', () => {
      const result = strategy.evaluate(1000, config);
      expect(result.resolved_level).toBe(1);
    });
  });

  describe('Null measurement', () => {
    const config: InverseThresholdConfig = {
      ranges: [{ min: 0, max: 5, level: 3 }],
    };

    it('null measurement returns null level', () => {
      const result = strategy.evaluate(null, config);
      expect(result.resolved_level).toBeNull();
      expect(result.raw_score).toBeNull();
      expect(result.requires_manual_review).toBe(false);
    });
  });

  describe('Out-of-range measurement', () => {
    const config: InverseThresholdConfig = {
      ranges: [{ min: 0, max: 10, level: 3 }],
    };

    it('negative count (invalid domain value)', () => {
      const result = strategy.evaluate(-1, config);
      expect(result.resolved_level).toBeNull();
    });

    it('value exceeding max without open-ended fallback', () => {
      const result = strategy.evaluate(15, config);
      expect(result.resolved_level).toBeNull();
    });
  });

  describe('Invalid configuration', () => {
    it('throws on empty ranges', () => {
      const config = { ranges: [] };
      expect(() => strategy.evaluate(5, config)).toThrow(InvalidRuleConfig);
    });
  });

  describe('Supports method', () => {
    it('supports INVERSE_THRESHOLD', () => {
      expect(strategy.supports('INVERSE_THRESHOLD')).toBe(true);
    });

    it('does not support other types', () => {
      expect(strategy.supports('RANGE_THRESHOLD')).toBe(false);
      expect(strategy.supports('COUNT_THRESHOLD')).toBe(false);
    });
  });
});
