/**
 * ORDINAL_MANUAL Strategy Tests
 *
 * Tests for qualitative evaluation where no automatic scoring applies.
 * Tests cover:
 *  - Always returns manual review required
 *  - Ignores measurement
 *  - Ignores configuration
 *  - Deterministic result
 */

import { describe, it, expect } from 'vitest';
import { OrdinalManualStrategy } from '../../src/modules/rule-engine/strategies/ordinal-manual.strategy.js';
import type { OrdinalManualConfig } from '../../src/modules/rule-engine/domain/rule.types.js';

describe('OrdinalManualStrategy', () => {
  const strategy = new OrdinalManualStrategy();

  describe('Always requires manual review', () => {
    const config: OrdinalManualConfig = { type: 'ORDINAL_MANUAL' };

    it('returns manual review required for any measurement', () => {
      const result = strategy.evaluate(0, config);
      expect(result.requires_manual_review).toBe(true);
      expect(result.resolved_level).toBeNull();
      expect(result.raw_score).toBeNull();
    });

    it('returns manual review required for positive measurement', () => {
      const result = strategy.evaluate(50, config);
      expect(result.requires_manual_review).toBe(true);
      expect(result.resolved_level).toBeNull();
    });

    it('returns manual review required for large measurement', () => {
      const result = strategy.evaluate(1000, config);
      expect(result.requires_manual_review).toBe(true);
      expect(result.resolved_level).toBeNull();
    });

    it('returns manual review required for null measurement', () => {
      const result = strategy.evaluate(null, config);
      expect(result.requires_manual_review).toBe(true);
      expect(result.resolved_level).toBeNull();
    });

    it('returns manual review required for negative measurement', () => {
      const result = strategy.evaluate(-5, config);
      expect(result.requires_manual_review).toBe(true);
      expect(result.resolved_level).toBeNull();
    });
  });

  describe('Config variations', () => {
    it('minimal config', () => {
      const config: OrdinalManualConfig = {};
      const result = strategy.evaluate(50, config);
      expect(result.requires_manual_review).toBe(true);
    });

    it('config with level labels (ignored by strategy)', () => {
      const config: OrdinalManualConfig = {
        level_labels: {
          '1': 'Needs support',
          '2': 'Developing',
          '3': 'Proficient',
          '4': 'Advanced',
          '5': 'Expert',
        },
      };
      const result = strategy.evaluate(50, config);
      expect(result.requires_manual_review).toBe(true);
    });
  });

  describe('Determinism and purity', () => {
    const config: OrdinalManualConfig = { type: 'ORDINAL_MANUAL' };

    it('repeated calls produce identical results', () => {
      const result1 = strategy.evaluate(50, config);
      const result2 = strategy.evaluate(50, config);
      expect(result1).toEqual(result2);
    });

    it('different measurements produce same result', () => {
      const result1 = strategy.evaluate(0, config);
      const result2 = strategy.evaluate(100, config);
      expect(result1).toEqual(result2);
    });

    it('no state mutation between calls', () => {
      strategy.evaluate(50, config);
      const result = strategy.evaluate(50, config);
      expect(result.requires_manual_review).toBe(true);
    });
  });

  describe('Supports method', () => {
    it('supports ORDINAL_MANUAL', () => {
      expect(strategy.supports('ORDINAL_MANUAL')).toBe(true);
    });

    it('does not support other types', () => {
      expect(strategy.supports('RANGE_THRESHOLD')).toBe(false);
      expect(strategy.supports('COUNT_THRESHOLD')).toBe(false);
      expect(strategy.supports('ROLE_CONDITIONAL')).toBe(false);
    });
  });
});
