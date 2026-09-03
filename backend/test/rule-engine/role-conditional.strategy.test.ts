/**
 * ROLE_CONDITIONAL Strategy Tests
 *
 * Tests for role-based rule delegation.
 * Tests cover:
 *  - Matching role branches
 *  - Unknown/missing role
 *  - Nested rule delegation
 *  - Error conditions
 */

import { describe, it, expect } from 'vitest';
import { RoleConditionalStrategy } from '../../src/modules/rule-engine/strategies/role-conditional.strategy.js';
import { DefaultStrategyRegistry } from '../../src/modules/rule-engine/strategies/strategy.registry.js';
import type { RoleConditionalConfig } from '../../src/modules/rule-engine/domain/rule.types.js';
import { RoleRequired, RoleBranchNotFound, InvalidRoleBranch } from '../../src/modules/rule-engine/domain/rule-engine.errors.js';

describe('RoleConditionalStrategy', () => {
  const strategy = new RoleConditionalStrategy();
  const registry = new DefaultStrategyRegistry();

  describe('Matching role branches', () => {
    const config: RoleConditionalConfig = {
      branches: [
        {
          role_code: 'SI',
          rule: {
            type: 'RANGE_THRESHOLD',
            ranges: [
              { min: 0, max: 79.99, level: 1 },
              { min: 80, max: 100, level: 3 },
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
    };

    it('delegates to SI branch when role is SI', () => {
      const result = strategy.evaluate(85, config, { role_code: 'SI', registry });
      expect(result.resolved_level).toBe(3);
      expect(result.requires_manual_review).toBe(false);
    });

    it('delegates to SM branch when role is SM', () => {
      const result = strategy.evaluate(2, config, { role_code: 'SM', registry });
      expect(result.resolved_level).toBe(2);
      expect(result.requires_manual_review).toBe(false);
    });

    it('different measurement in SI branch', () => {
      const result = strategy.evaluate(50, config, { role_code: 'SI', registry });
      expect(result.resolved_level).toBe(1);
    });

    it('different measurement in SM branch', () => {
      const result = strategy.evaluate(5, config, { role_code: 'SM', registry });
      expect(result.resolved_level).toBe(4);
    });
  });

  describe('Role context handling', () => {
    const config: RoleConditionalConfig = {
      branches: [
        {
          role_code: 'MANAGER',
          rule: { type: 'ORDINAL_MANUAL' },
        },
      ],
    };

    it('throws when role is missing', () => {
      expect(() =>
        strategy.evaluate(50, config, { registry })
      ).toThrow(RoleRequired);
    });

    it('throws when role is null', () => {
      expect(() =>
        strategy.evaluate(50, config, { role_code: null, registry })
      ).toThrow(RoleRequired);
    });

    it('throws when role does not match any branch', () => {
      expect(() =>
        strategy.evaluate(50, config, { role_code: 'UNKNOWN', registry })
      ).toThrow(RoleBranchNotFound);
    });
  });

  describe('Nested rule delegation', () => {
    it('delegates to nested RANGE_THRESHOLD', () => {
      const config: RoleConditionalConfig = {
        branches: [
          {
            role_code: 'A',
            rule: {
              type: 'RANGE_THRESHOLD',
              ranges: [
                { min: 0, max: 50, level: 1 },
                { min: 51, max: 100, level: 5 },
              ],
            },
          },
        ],
      };

      const result = strategy.evaluate(75, config, { role_code: 'A', registry });
      expect(result.resolved_level).toBe(5);
    });

    it('delegates to nested COUNT_THRESHOLD', () => {
      const config: RoleConditionalConfig = {
        branches: [
          {
            role_code: 'B',
            rule: {
              type: 'COUNT_THRESHOLD',
              thresholds: [1, 3, 5],
            },
          },
        ],
      };

      const result = strategy.evaluate(4, config, { role_code: 'B', registry });
      expect(result.resolved_level).toBe(3);
    });

    it('delegates to nested ORDINAL_MANUAL', () => {
      const config: RoleConditionalConfig = {
        branches: [
          {
            role_code: 'C',
            rule: { type: 'ORDINAL_MANUAL' },
          },
        ],
      };

      const result = strategy.evaluate(50, config, { role_code: 'C', registry });
      expect(result.requires_manual_review).toBe(true);
      expect(result.resolved_level).toBeNull();
    });
  });

  describe('Null measurement in nested rules', () => {
    const config: RoleConditionalConfig = {
      branches: [
        {
          role_code: 'TEST',
          rule: {
            type: 'RANGE_THRESHOLD',
            ranges: [{ min: 0, max: 100, level: 1 }],
          },
        },
      ],
    };

    it('passes null measurement to nested strategy', () => {
      const result = strategy.evaluate(null, config, { role_code: 'TEST', registry });
      expect(result.resolved_level).toBeNull();
    });
  });

  describe('Error conditions', () => {
    it('throws when registry is missing from context', () => {
      const config: RoleConditionalConfig = {
        branches: [
          {
            role_code: 'ROLE1',
            rule: { type: 'RANGE_THRESHOLD', ranges: [] },
          },
        ],
      };

      expect(() =>
        strategy.evaluate(50, config, { role_code: 'ROLE1' })
      ).toThrow();
    });

    it('throws when branches array is missing', () => {
      const config = { type: 'ROLE_CONDITIONAL' } as unknown as RoleConditionalConfig;
      expect(() =>
        strategy.evaluate(50, config, { role_code: 'ROLE1', registry })
      ).toThrow(InvalidRoleBranch);
    });

    it('throws when branch has no nested rule', () => {
      const config: RoleConditionalConfig = {
        branches: [
          {
            role_code: 'ROLE1',
            rule: undefined,
          } as unknown as { role_code: string; rule: unknown },
        ],
      };

      expect(() =>
        strategy.evaluate(50, config, { role_code: 'ROLE1', registry })
      ).toThrow(InvalidRoleBranch);
    });

    it('throws when nested rule has no type', () => {
      const config: RoleConditionalConfig = {
        branches: [
          {
            role_code: 'ROLE1',
            rule: {} as unknown,
          },
        ],
      };

      expect(() =>
        strategy.evaluate(50, config, { role_code: 'ROLE1', registry })
      ).toThrow(InvalidRoleBranch);
    });
  });

  describe('Case sensitivity', () => {
    const config: RoleConditionalConfig = {
      branches: [
        {
          role_code: 'SI',
          rule: { type: 'ORDINAL_MANUAL' },
        },
      ],
    };

    it('role matching is case-sensitive', () => {
      expect(() =>
        strategy.evaluate(50, config, { role_code: 'si', registry })
      ).toThrow(RoleBranchNotFound);
    });
  });

  describe('Multiple branches', () => {
    const config: RoleConditionalConfig = {
      branches: [
        {
          role_code: 'R1',
          rule: { type: 'RANGE_THRESHOLD', ranges: [{ min: 0, max: 100, level: 1 }] },
        },
        {
          role_code: 'R2',
          rule: { type: 'RANGE_THRESHOLD', ranges: [{ min: 0, max: 100, level: 2 }] },
        },
        {
          role_code: 'R3',
          rule: { type: 'RANGE_THRESHOLD', ranges: [{ min: 0, max: 100, level: 3 }] },
        },
      ],
    };

    it('selects first matching role', () => {
      const result = strategy.evaluate(50, config, { role_code: 'R1', registry });
      expect(result.resolved_level).toBe(1);
    });

    it('selects middle role', () => {
      const result = strategy.evaluate(50, config, { role_code: 'R2', registry });
      expect(result.resolved_level).toBe(2);
    });

    it('selects last role', () => {
      const result = strategy.evaluate(50, config, { role_code: 'R3', registry });
      expect(result.resolved_level).toBe(3);
    });
  });

  describe('Supports method', () => {
    it('supports ROLE_CONDITIONAL', () => {
      expect(strategy.supports('ROLE_CONDITIONAL')).toBe(true);
    });

    it('does not support other types', () => {
      expect(strategy.supports('RANGE_THRESHOLD')).toBe(false);
      expect(strategy.supports('COUNT_THRESHOLD')).toBe(false);
    });
  });
});
