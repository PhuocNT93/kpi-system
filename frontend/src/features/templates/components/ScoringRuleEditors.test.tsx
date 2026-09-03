// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScoringRuleEditors } from './ScoringRuleEditors';
import { createDefaultNestedRuleConfig, createDefaultRuleConfig } from '../domain/rule-config';
import type { ScoringRule } from '../domain/template-models';

afterEach(() => cleanup());

function createRule(overrides: Partial<ScoringRule> = {}): ScoringRule {
  return {
    id: 'rule-1',
    code: 'RULE_1',
    name: 'Rule 1',
    ruleType: 'RANGE_THRESHOLD',
    config: createDefaultRuleConfig('RANGE_THRESHOLD'),
    status: 'ACTIVE',
    version: 1,
    ...overrides,
  };
}

describe('ScoringRuleEditors', () => {
  it('switches rule type and emits backend-compatible count threshold config', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ScoringRuleEditors rule={createRule()} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Scoring Rule Type'), 'COUNT_THRESHOLD');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleType: 'COUNT_THRESHOLD',
        config: { type: 'COUNT_THRESHOLD', thresholds: [1, 3, 5] },
      })
    );
  });

  it('edits range fields using backend min/max/level names', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ScoringRuleEditors rule={createRule()} onChange={onChange} />);

    const minInput = screen.getByLabelText('Range 1 min');
    await user.clear(minInput);
    await user.type(minInput, '5');

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          ranges: expect.arrayContaining([expect.objectContaining({ min: 5, max: 70, level: 1 })]),
        }),
      })
    );
  });

  it('keeps blank required numeric input invalid instead of converting it to zero', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ScoringRuleEditors rule={createRule()} onChange={onChange} />);

    await user.clear(screen.getByLabelText('Range 1 min'));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          ranges: expect.arrayContaining([expect.objectContaining({ min: Number.NaN })]),
        }),
      })
    );
  });

  it('adds role conditional branches from supplied organization roles', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const rule = createRule({
      ruleType: 'ROLE_CONDITIONAL',
      config: createDefaultRuleConfig('ROLE_CONDITIONAL'),
    });

    render(
      <ScoringRuleEditors
        rule={rule}
        onChange={onChange}
        roleOptions={[{ id: 'role-1', code: 'ENG', name: 'Engineer' }]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add Role Branch' }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          type: 'ROLE_CONDITIONAL',
          branches: [
            {
              role_code: 'ENG',
              rule: createDefaultRuleConfig('RANGE_THRESHOLD'),
            },
          ],
        },
      })
    );
  });

  it('does not expose role-conditional as a nested branch rule type', async () => {
    const rule = createRule({
      ruleType: 'ROLE_CONDITIONAL',
      config: {
        type: 'ROLE_CONDITIONAL',
        branches: [{ role_code: 'ENG', rule: createDefaultNestedRuleConfig('RANGE_THRESHOLD') }],
      },
    });

    render(
      <ScoringRuleEditors
        rule={rule}
        onChange={vi.fn()}
        roleOptions={[{ id: 'role-1', code: 'ENG', name: 'Engineer' }]}
      />
    );

    const nestedSelect = screen.getByLabelText('Rule');
    expect([...nestedSelect.querySelectorAll('option')].map((option) => option.value)).not.toContain('ROLE_CONDITIONAL');
  });

  it('blocks edits in read-only mode', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ScoringRuleEditors rule={createRule()} onChange={onChange} isReadOnly />);

    await user.selectOptions(screen.getByLabelText('Scoring Rule Type'), 'COUNT_THRESHOLD');

    expect(onChange).not.toHaveBeenCalled();
  });
});