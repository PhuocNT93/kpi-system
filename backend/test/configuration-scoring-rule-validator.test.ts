import { describe, expect, it } from 'vitest';
import { ScoringRuleValidator } from '../src/modules/configuration/application/validation/scoring-rule.validator.js';
import { ScoringRuleType } from '../src/modules/configuration/domain/configuration.types.js';

describe('ScoringRuleValidator', () => {
  it('accepts canonical count threshold config from the Rule Engine contract', () => {
    const errors = ScoringRuleValidator.validate(ScoringRuleType.COUNT_THRESHOLD, {
      type: ScoringRuleType.COUNT_THRESHOLD,
      thresholds: [1, 3, 5],
    });

    expect(errors).toEqual([]);
  });

  it('rejects stale count threshold config shape', () => {
    const errors = ScoringRuleValidator.validate(ScoringRuleType.COUNT_THRESHOLD, {
      type: ScoringRuleType.COUNT_THRESHOLD,
      counts: [{ min_count: 1, level: 1 }],
    });

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'config.thresholds' })])
    );
  });

  it('accepts canonical role conditional config with nested rule', () => {
    const errors = ScoringRuleValidator.validate(ScoringRuleType.ROLE_CONDITIONAL, {
      type: ScoringRuleType.ROLE_CONDITIONAL,
      branches: [
        {
          role_code: 'ENG',
          rule: {
            type: ScoringRuleType.RANGE_THRESHOLD,
            ranges: [{ min: 0, max: null, level: 1 }],
          },
        },
      ],
    });

    expect(errors).toEqual([]);
  });
});