import { describe, it, expect } from 'vitest';
import {
  resolveEffectiveCadence,
  resolveEffectiveCadenceWithSource,
  CadencePrecedenceInput,
} from './cadence-precedence-resolver.js';
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

describe('resolveEffectiveCadenceWithSource', () => {
  it('TC11: employee override wins with source EMPLOYEE_OVERRIDE', () => {
    const result = resolveEffectiveCadenceWithSource({ employeeOverride, jobLevelDefault, systemDefault });
    expect(result).toEqual({ cadence: employeeOverride, source: 'EMPLOYEE_OVERRIDE' });
  });

  it('TC12: job-level default applies without an override (source JOB_LEVEL_DEFAULT)', () => {
    const result = resolveEffectiveCadenceWithSource({ employeeOverride: null, jobLevelDefault, systemDefault });
    expect(result).toEqual({ cadence: jobLevelDefault, source: 'JOB_LEVEL_DEFAULT' });
  });

  it('TC13: system default is the fallback (source SYSTEM_DEFAULT)', () => {
    const result = resolveEffectiveCadenceWithSource({ employeeOverride: null, jobLevelDefault: null, systemDefault });
    expect(result).toEqual({ cadence: systemDefault, source: 'SYSTEM_DEFAULT' });
  });

  it('TC14: an inactive override (loaded as null by the caller) falls through to the job-level default', () => {
    const result = resolveEffectiveCadenceWithSource({ employeeOverride: null, jobLevelDefault, systemDefault: null });
    expect(result?.source).toBe('JOB_LEVEL_DEFAULT');
  });

  it('TC15: no cadence configured at any tier → null', () => {
    expect(resolveEffectiveCadenceWithSource({ employeeOverride: null, jobLevelDefault: null, systemDefault: null })).toBeNull();
  });

  it('agrees with resolveEffectiveCadence for all 7 precedence combinations', () => {
    const tiers = [null, 'x'] as const;
    for (const o of tiers) {
      for (const j of tiers) {
        for (const sd of tiers) {
          const input: CadencePrecedenceInput = {
            employeeOverride: o ? employeeOverride : null,
            jobLevelDefault: j ? jobLevelDefault : null,
            systemDefault: sd ? systemDefault : null,
          };
          expect(resolveEffectiveCadenceWithSource(input)?.cadence ?? null).toEqual(resolveEffectiveCadence(input));
        }
      }
    }
  });
});
