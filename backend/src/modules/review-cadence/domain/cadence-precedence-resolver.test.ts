import { describe, it, expect } from 'vitest';
import { resolveEffectiveCadence, CadencePrecedenceInput } from './cadence-precedence-resolver.js';
import { ReviewCadence } from './review-cadence.types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCadence(override: Partial<ReviewCadence> = {}): ReviewCadence {
  return {
    id: 'cadence-default',
    code: 'QUARTERLY',
    name: 'Quarterly (3 months)',
    intervalMonths: 3,
    isSystemDefault: false,
    active: true,
    ...override,
  };
}

const systemDefault = makeCadence({ id: 'sys', code: 'SEMI_ANNUAL', intervalMonths: 6, isSystemDefault: true });
const jobLevelDefault = makeCadence({ id: 'jl', code: 'QUARTERLY', intervalMonths: 3 });
const employeeOverride = makeCadence({ id: 'emp', code: 'MONTHLY', intervalMonths: 1 });

// ── Table-driven tests covering all 7 precedence combinations ─────────────────

describe('resolveEffectiveCadence', () => {
  const cases: Array<{
    label: string;
    input: CadencePrecedenceInput;
    expectedId: string | null;
  }> = [
    {
      label: 'Case 1: all null → null',
      input: { employeeOverride: null, jobLevelDefault: null, systemDefault: null },
      expectedId: null,
    },
    {
      label: 'Case 2: system default only → system default wins',
      input: { employeeOverride: null, jobLevelDefault: null, systemDefault },
      expectedId: systemDefault.id,
    },
    {
      label: 'Case 3: job level default only → job level wins',
      input: { employeeOverride: null, jobLevelDefault, systemDefault: null },
      expectedId: jobLevelDefault.id,
    },
    {
      label: 'Case 4: employee override only → employee wins',
      input: { employeeOverride, jobLevelDefault: null, systemDefault: null },
      expectedId: employeeOverride.id,
    },
    {
      label: 'Case 5: job level + system default → job level wins',
      input: { employeeOverride: null, jobLevelDefault, systemDefault },
      expectedId: jobLevelDefault.id,
    },
    {
      label: 'Case 6: employee override + system default → employee wins',
      input: { employeeOverride, jobLevelDefault: null, systemDefault },
      expectedId: employeeOverride.id,
    },
    {
      label: 'Case 7: all three → employee override wins',
      input: { employeeOverride, jobLevelDefault, systemDefault },
      expectedId: employeeOverride.id,
    },
  ];

  it.each(cases)('$label', ({ input, expectedId }) => {
    const result = resolveEffectiveCadence(input);
    expect(result?.id ?? null).toBe(expectedId);
  });

  it('returns the full ReviewCadence object (not just the id)', () => {
    const result = resolveEffectiveCadence({
      employeeOverride: null,
      jobLevelDefault: null,
      systemDefault,
    });
    expect(result).toEqual(systemDefault);
  });

  it('is a pure function — does not mutate inputs', () => {
    const input: CadencePrecedenceInput = {
      employeeOverride: { ...employeeOverride },
      jobLevelDefault: { ...jobLevelDefault },
      systemDefault: { ...systemDefault },
    };
    resolveEffectiveCadence(input);
    expect(input.employeeOverride?.id).toBe(employeeOverride.id);
    expect(input.jobLevelDefault?.id).toBe(jobLevelDefault.id);
    expect(input.systemDefault?.id).toBe(systemDefault.id);
  });
});
