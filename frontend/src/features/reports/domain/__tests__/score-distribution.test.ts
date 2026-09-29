import { describe, expect, it } from 'vitest';
import { toScoreDistributionBins } from '../score-distribution';

describe('toScoreDistributionBins', () => {
  it('maps range bins and keeps provided percentages', () => {
    expect(
      toScoreDistributionBins([
        { range: '0.0 - 1.0', count: 1, percentage: 25 },
        { range: '1.0 - 2.0', count: 3, percentage: 75 },
      ])
    ).toEqual([
      { label: '0.0 - 1.0', count: 1, percentage: 25 },
      { label: '1.0 - 2.0', count: 3, percentage: 75 },
    ]);
  });

  it('computes percentages when missing and supports label maps', () => {
    expect(toScoreDistributionBins({ EXCELLENT: 5, GOOD: 15 })).toEqual([
      { label: 'EXCELLENT', count: 5, percentage: 25 },
      { label: 'GOOD', count: 15, percentage: 75 },
    ]);
  });

  it('returns an empty list for empty, all-zero or malformed input', () => {
    expect(toScoreDistributionBins({})).toEqual([]);
    expect(toScoreDistributionBins(null)).toEqual([]);
    expect(toScoreDistributionBins(undefined)).toEqual([]);
    expect(toScoreDistributionBins('oops')).toEqual([]);
    expect(toScoreDistributionBins([{ range: '0 - 1', count: 0 }])).toEqual([]);
    expect(toScoreDistributionBins([{ foo: 1 }, { range: 2, count: 'x' }])).toEqual([]);
  });

  it('drops invalid entries but keeps valid ones', () => {
    expect(toScoreDistributionBins([{ range: 'A', count: 2 }, { range: 'B', count: -1 }, null])).toEqual([
      { label: 'A', count: 2, percentage: 100 },
    ]);
  });
});
