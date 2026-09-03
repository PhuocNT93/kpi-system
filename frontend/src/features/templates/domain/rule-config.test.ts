import { describe, expect, it } from 'vitest';
import {
  createDefaultNestedRuleConfig,
  createDefaultRuleConfig,
  normalizeRuleConfig,
  validateRuleConfig,
  type RoleConditionalRuleConfig,
  type RuleConfig,
} from './rule-config';

describe('rule config helpers', () => {
  it('creates backend-compatible default configs for all rule types', () => {
    expect(createDefaultRuleConfig('RANGE_THRESHOLD')).toEqual({
      type: 'RANGE_THRESHOLD',
      ranges: [
        { min: 0, max: 70, level: 1 },
        { min: 70, max: 90, level: 2 },
        { min: 90, max: null, level: 3 },
      ],
    });
    expect(createDefaultRuleConfig('COUNT_THRESHOLD')).toEqual({
      type: 'COUNT_THRESHOLD',
      thresholds: [1, 3, 5],
    });
    expect(createDefaultRuleConfig('ROLE_CONDITIONAL')).toEqual({
      type: 'ROLE_CONDITIONAL',
      branches: [],
    });
  });

  it('preserves null open-ended range boundaries', () => {
    const config = createDefaultRuleConfig('RANGE_THRESHOLD');
    expect(config.type).toBe('RANGE_THRESHOLD');
    if (config.type === 'RANGE_THRESHOLD') {
      expect(config.ranges.at(-1)?.max).toBeNull();
    }
  });

  it('injects the rule type when normalizing backend wire configs without discriminants', () => {
    expect(normalizeRuleConfig('RANGE_THRESHOLD', {
      ranges: [{ min: 0, max: null, level: 1 }],
    })).toEqual({
      type: 'RANGE_THRESHOLD',
      ranges: [{ min: 0, max: null, level: 1 }],
    });
  });

  it('validates overlapping ranges', () => {
    const config: RuleConfig = {
      type: 'RANGE_THRESHOLD',
      ranges: [
        { min: 0, max: 80, level: 1 },
        { min: 70, max: null, level: 2 },
      ],
    };

    expect(validateRuleConfig(config)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'INVALID_RANGE' })])
    );
  });

  it('validates duplicate count thresholds', () => {
    const config: RuleConfig = {
      type: 'COUNT_THRESHOLD',
      thresholds: [1, 3, 3],
    };

    expect(validateRuleConfig(config)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_THRESHOLDS' })])
    );
  });

  it('validates blank numeric inputs represented as NaN', () => {
    const config: RuleConfig = {
      type: 'RANGE_THRESHOLD',
      ranges: [{ min: Number.NaN, max: null, level: 1 }],
    };

    expect(validateRuleConfig(config)).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'config.ranges[0].min' })])
    );
  });

  it('validates empty ordinal labels without requiring scoring logic', () => {
    const config: RuleConfig = {
      type: 'ORDINAL_MANUAL',
      level_labels: { '1': 'Needs guidance', '2': ' ' },
    };

    expect(validateRuleConfig(config)).toEqual([
      expect.objectContaining({ code: 'EMPTY_LEVEL_LABEL', field: 'config.level_labels.2' }),
    ]);
  });

  it('validates role conditional branches and nested rules', () => {
    const config: RoleConditionalRuleConfig = {
      type: 'ROLE_CONDITIONAL',
      branches: [
        { role_code: 'ENG', rule: createDefaultNestedRuleConfig('RANGE_THRESHOLD') },
        { role_code: 'ENG', rule: createDefaultNestedRuleConfig('COUNT_THRESHOLD') },
      ],
    };

    expect(validateRuleConfig(config)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_ROLE' })])
    );
  });
});