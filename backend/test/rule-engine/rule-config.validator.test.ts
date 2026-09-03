/**
 * Rule Configuration Validator Tests
 *
 * Tests for configuration validation for each rule type.
 */

import { describe, it, expect } from 'vitest';
import { RuleConfigValidator } from '../../src/modules/rule-engine/application/rule-config.validator.js';
import { RuleConfigValidationError } from '../../src/modules/rule-engine/domain/rule-engine.errors.js';

describe('RuleConfigValidator', () => {
  describe('RANGE_THRESHOLD validation', () => {
    it('accepts valid RANGE_THRESHOLD config', () => {
      const config = {
        ranges: [
          { min: 0, max: 79.99, level: 1 },
          { min: 80, max: 100, level: 2 },
        ],
      };
      expect(() => RuleConfigValidator.validate('RANGE_THRESHOLD', config)).not.toThrow();
    });

    it('rejects empty ranges array', () => {
      const config = { ranges: [] };
      expect(() => RuleConfigValidator.validate('RANGE_THRESHOLD', config)).toThrow(RuleConfigValidationError);
    });

    it('rejects min > max', () => {
      const config = {
        ranges: [{ min: 100, max: 50, level: 1 }],
      };
      expect(() => RuleConfigValidator.validate('RANGE_THRESHOLD', config)).toThrow(RuleConfigValidationError);
    });

    it('rejects overlapping ranges', () => {
      const config = {
        ranges: [
          { min: 0, max: 100, level: 1 },
          { min: 50, max: 150, level: 2 },
        ],
      };
      expect(() => RuleConfigValidator.validate('RANGE_THRESHOLD', config)).toThrow(RuleConfigValidationError);
    });

    it('rejects non-numeric min', () => {
      const config = {
        ranges: [{ min: 'not-a-number', max: 100, level: 1 }],
      };
      expect(() => RuleConfigValidator.validate('RANGE_THRESHOLD', config)).toThrow(RuleConfigValidationError);
    });

    it('rejects invalid level', () => {
      const config = {
        ranges: [{ min: 0, max: 100, level: -1 }],
      };
      expect(() => RuleConfigValidator.validate('RANGE_THRESHOLD', config)).toThrow(RuleConfigValidationError);
    });

    it('accepts null max (open-ended)', () => {
      const config = {
        ranges: [{ min: 100, max: null, level: 5 }],
      };
      expect(() => RuleConfigValidator.validate('RANGE_THRESHOLD', config)).not.toThrow();
    });
  });

  describe('INVERSE_THRESHOLD validation', () => {
    it('accepts valid INVERSE_THRESHOLD config', () => {
      const config = {
        ranges: [
          { min: 0, max: 0, level: 5 },
          { min: 1, max: 5, level: 2 },
        ],
      };
      expect(() => RuleConfigValidator.validate('INVERSE_THRESHOLD', config)).not.toThrow();
    });

    it('rejects empty ranges (same as RANGE_THRESHOLD)', () => {
      const config = { ranges: [] };
      expect(() => RuleConfigValidator.validate('INVERSE_THRESHOLD', config)).toThrow(RuleConfigValidationError);
    });
  });

  describe('COUNT_THRESHOLD validation', () => {
    it('accepts valid COUNT_THRESHOLD config', () => {
      const config = { thresholds: [1, 3, 5, 8] };
      expect(() => RuleConfigValidator.validate('COUNT_THRESHOLD', config)).not.toThrow();
    });

    it('rejects non-array thresholds', () => {
      const config = { thresholds: 'not-an-array' };
      expect(() => RuleConfigValidator.validate('COUNT_THRESHOLD', config)).toThrow(RuleConfigValidationError);
    });

    it('rejects non-numeric threshold', () => {
      const config = { thresholds: [1, 'three', 5] };
      expect(() => RuleConfigValidator.validate('COUNT_THRESHOLD', config)).toThrow(RuleConfigValidationError);
    });

    it('rejects duplicate thresholds', () => {
      const config = { thresholds: [1, 3, 3, 5] };
      expect(() => RuleConfigValidator.validate('COUNT_THRESHOLD', config)).toThrow(RuleConfigValidationError);
    });
  });

  describe('ORDINAL_MANUAL validation', () => {
    it('accepts minimal ORDINAL_MANUAL config', () => {
      const config = {};
      expect(() => RuleConfigValidator.validate('ORDINAL_MANUAL', config)).not.toThrow();
    });

    it('accepts ORDINAL_MANUAL with level labels', () => {
      const config = {
        level_labels: {
          '1': 'Needs support',
          '5': 'Expert',
        },
      };
      expect(() => RuleConfigValidator.validate('ORDINAL_MANUAL', config)).not.toThrow();
    });
  });

  describe('ROLE_CONDITIONAL validation', () => {
    it('accepts valid ROLE_CONDITIONAL config', () => {
      const config = {
        branches: [
          {
            role_code: 'SI',
            rule: {
              type: 'RANGE_THRESHOLD',
              ranges: [{ min: 0, max: 100, level: 1 }],
            },
          },
        ],
      };
      expect(() => RuleConfigValidator.validate('ROLE_CONDITIONAL', config)).not.toThrow();
    });

    it('rejects empty branches', () => {
      const config = { branches: [] };
      expect(() => RuleConfigValidator.validate('ROLE_CONDITIONAL', config)).toThrow(RuleConfigValidationError);
    });

    it('rejects duplicate role codes', () => {
      const config = {
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
      };
      expect(() => RuleConfigValidator.validate('ROLE_CONDITIONAL', config)).toThrow(RuleConfigValidationError);
    });

    it('rejects missing role code', () => {
      const config = {
        branches: [
          {
            rule: { type: 'ORDINAL_MANUAL' },
          },
        ],
      };
      expect(() => RuleConfigValidator.validate('ROLE_CONDITIONAL', config)).toThrow(RuleConfigValidationError);
    });

    it('rejects missing nested rule', () => {
      const config = {
        branches: [
          {
            role_code: 'SI',
          },
        ],
      };
      expect(() => RuleConfigValidator.validate('ROLE_CONDITIONAL', config)).toThrow(RuleConfigValidationError);
    });
  });

  describe('Generic validation', () => {
    it('rejects null config', () => {
      expect(() => RuleConfigValidator.validate('RANGE_THRESHOLD', null)).toThrow(RuleConfigValidationError);
    });

    it('rejects non-object config', () => {
      expect(() => RuleConfigValidator.validate('RANGE_THRESHOLD', 'not-an-object')).toThrow(RuleConfigValidationError);
    });

    it('rejects unknown rule type', () => {
      expect(() => RuleConfigValidator.validate('UNKNOWN' as never, {})).toThrow(RuleConfigValidationError);
    });
  });
});
