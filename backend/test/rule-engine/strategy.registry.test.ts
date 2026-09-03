/**
 * Strategy Registry Tests
 *
 * Tests for strategy lookup and registration.
 */

import { describe, it, expect } from 'vitest';
import { DefaultStrategyRegistry } from '../../src/modules/rule-engine/strategies/strategy.registry.js';
import { UnsupportedRuleType } from '../../src/modules/rule-engine/domain/rule-engine.errors.js';

describe('DefaultStrategyRegistry', () => {
  const registry = new DefaultStrategyRegistry();

  describe('Strategy registration', () => {
    it('has RANGE_THRESHOLD registered', () => {
      expect(registry.hasStrategy('RANGE_THRESHOLD')).toBe(true);
    });

    it('has INVERSE_THRESHOLD registered', () => {
      expect(registry.hasStrategy('INVERSE_THRESHOLD')).toBe(true);
    });

    it('has COUNT_THRESHOLD registered', () => {
      expect(registry.hasStrategy('COUNT_THRESHOLD')).toBe(true);
    });

    it('has ORDINAL_MANUAL registered', () => {
      expect(registry.hasStrategy('ORDINAL_MANUAL')).toBe(true);
    });

    it('has ROLE_CONDITIONAL registered', () => {
      expect(registry.hasStrategy('ROLE_CONDITIONAL')).toBe(true);
    });
  });

  describe('Strategy resolution', () => {
    it('returns RANGE_THRESHOLD strategy', () => {
      const strategy = registry.getStrategy('RANGE_THRESHOLD');
      expect(strategy).toBeDefined();
      expect(strategy.supports('RANGE_THRESHOLD')).toBe(true);
    });

    it('returns COUNT_THRESHOLD strategy', () => {
      const strategy = registry.getStrategy('COUNT_THRESHOLD');
      expect(strategy).toBeDefined();
      expect(strategy.supports('COUNT_THRESHOLD')).toBe(true);
    });

    it('returns ORDINAL_MANUAL strategy', () => {
      const strategy = registry.getStrategy('ORDINAL_MANUAL');
      expect(strategy).toBeDefined();
      expect(strategy.supports('ORDINAL_MANUAL')).toBe(true);
    });

    it('returns ROLE_CONDITIONAL strategy', () => {
      const strategy = registry.getStrategy('ROLE_CONDITIONAL');
      expect(strategy).toBeDefined();
      expect(strategy.supports('ROLE_CONDITIONAL')).toBe(true);
    });
  });

  describe('Unknown rule type', () => {
    it('throws UnsupportedRuleType for unknown type', () => {
      expect(() => registry.getStrategy('UNKNOWN' as never)).toThrow(UnsupportedRuleType);
    });

    it('throws UnsupportedRuleType for null', () => {
      expect(() => registry.getStrategy(null as never)).toThrow(UnsupportedRuleType);
    });
  });

  describe('Strategy instances', () => {
    it('returns same strategy instance on repeated calls', () => {
      const strategy1 = registry.getStrategy('RANGE_THRESHOLD');
      const strategy2 = registry.getStrategy('RANGE_THRESHOLD');
      expect(strategy1).toBe(strategy2);
    });

    it('returns different strategy instances for different types', () => {
      const rangeStrategy = registry.getStrategy('RANGE_THRESHOLD');
      const countStrategy = registry.getStrategy('COUNT_THRESHOLD');
      expect(rangeStrategy).not.toBe(countStrategy);
    });
  });

  describe('Get all strategies', () => {
    it('returns map with all five strategies', () => {
      const allStrategies = registry.getAllStrategies();
      expect(allStrategies.size).toBe(5);
      expect(allStrategies.has('RANGE_THRESHOLD')).toBe(true);
      expect(allStrategies.has('INVERSE_THRESHOLD')).toBe(true);
      expect(allStrategies.has('COUNT_THRESHOLD')).toBe(true);
      expect(allStrategies.has('ORDINAL_MANUAL')).toBe(true);
      expect(allStrategies.has('ROLE_CONDITIONAL')).toBe(true);
    });
  });
});
