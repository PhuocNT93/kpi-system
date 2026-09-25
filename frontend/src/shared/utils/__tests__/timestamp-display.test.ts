import { describe, it, expect } from 'vitest';
import { formatTimestampAsLocalDate } from '../timestamp-display';

describe('formatTimestampAsLocalDate (business timezone, display only)', () => {
  it('shows the Asia/Ho_Chi_Minh calendar day, not the UTC day, near midnight', () => {
    // 00:30 on Feb 1 in Asia/Ho_Chi_Minh is still Jan 31 in UTC
    expect(formatTimestampAsLocalDate('2026-01-31T17:30:00.000Z')).toBe('2026-02-01');
    expect(formatTimestampAsLocalDate('2026-01-31T16:59:59.000Z')).toBe('2026-01-31');
  });

  it('renders the empty value for missing or invalid input', () => {
    expect(formatTimestampAsLocalDate(null)).toBe('—');
    expect(formatTimestampAsLocalDate('not-a-date', 'n/a')).toBe('n/a');
  });
});
