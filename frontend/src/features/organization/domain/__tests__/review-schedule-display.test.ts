import { describe, it, expect } from 'vitest';
import { formatCadenceLabel } from '../review-schedule-display';

const t = (_key: string, fallback?: string, params?: Record<string, string | number>): string =>
  (fallback ?? '').replace('{months}', String(params?.months ?? ''));

describe('formatCadenceLabel', () => {
  it('does not repeat the interval when the cadence name already contains it', () => {
    expect(formatCadenceLabel('Quarterly (3 months)', 3, t)).toBe('Quarterly (3 months)');
    expect(formatCadenceLabel('Every 12 months', 12, t)).toBe('Every 12 months');
  });

  it('appends the interval when the name does not mention it', () => {
    expect(formatCadenceLabel('Quarterly', 3, t)).toBe('Quarterly (3 months)');
    // "12" in the name is not the 1-month interval
    expect(formatCadenceLabel('Probation 12', 1, t)).toBe('Probation 12 (1 months)');
  });
});
