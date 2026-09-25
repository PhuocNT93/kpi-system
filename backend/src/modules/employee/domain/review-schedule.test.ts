import { describe, it, expect } from 'vitest';
import {
  addCalendarMonths,
  calculateNextReviewDueDate,
  computeDueDate,
  toBusinessDate,
  toDateOnlyString,
} from './review-schedule.js';

const TZ = 'Asia/Ho_Chi_Minh';

describe('review schedule date domain (business date + calendar months)', () => {
  it('TC01: normal month — 2026-01-15 + 6 months = 2026-07-15', () => {
    expect(calculateNextReviewDueDate(new Date('2026-01-15T03:00:00Z'), 6, TZ)).toBe('2026-07-15');
  });

  it('TC02: month-end in a non-leap year clamps to Feb 28', () => {
    expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('TC03: month-end in a leap year clamps to Feb 29', () => {
    expect(addCalendarMonths('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('TC04: Feb 29 + 12 months = Feb 28 of the next (non-leap) year', () => {
    expect(addCalendarMonths('2028-02-29', 12)).toBe('2029-02-28');
  });

  it('TC05: year boundary — 2026-11-30 + 3 months = 2027-02-28', () => {
    expect(addCalendarMonths('2026-11-30', 3)).toBe('2027-02-28');
  });

  it('TC06: near midnight — 00:30 Feb 1 in Asia/Ho_Chi_Minh (still Jan 31 in UTC) uses the business date', () => {
    const publishedAt = new Date('2026-01-31T17:30:00Z');
    expect(toBusinessDate(publishedAt, TZ)).toBe('2026-02-01');
    expect(calculateNextReviewDueDate(publishedAt, 6, TZ)).toBe('2026-08-01');
    expect(calculateNextReviewDueDate(publishedAt, 6, TZ)).not.toBe('2026-07-31');
  });

  it('TC07: 23:59:59 local time stays on the same business day', () => {
    const publishedAt = new Date('2026-01-31T16:59:59Z');
    expect(toBusinessDate(publishedAt, TZ)).toBe('2026-01-31');
    expect(calculateNextReviewDueDate(publishedAt, 6, TZ)).toBe('2026-07-31');
  });

  it('TC08: rejects a non-positive interval', () => {
    expect(() => addCalendarMonths('2026-01-01', 0)).toThrow(RangeError);
    expect(() => addCalendarMonths('2026-01-01', -1)).toThrow(RangeError);
    expect(() => addCalendarMonths('2026-01-01', 1.5)).toThrow(RangeError);
  });

  it('TC09: calendar months, not 30-day blocks (Jan 31 + 1 month is not Mar 2)', () => {
    const next = addCalendarMonths('2026-01-31', 1);
    expect(next).not.toBe('2026-03-02');
    expect(next).toBe('2026-02-28');
  });

  it('TC10: normalizes the stored due date (business date at 00:00 UTC) without shifting the day', () => {
    expect(toDateOnlyString(new Date('2027-01-15T00:00:00.000Z'))).toBe('2027-01-15');
    expect(toDateOnlyString('2027-01-15')).toBe('2027-01-15');
    expect(toDateOnlyString('2027-01-15T00:00:00.000Z')).toBe('2027-01-15');
    expect(toDateOnlyString(null)).toBeNull();
    expect(toDateOnlyString('not-a-date')).toBeNull();
  });

  it('computeDueDate returns null when the employee never completed an evaluation', () => {
    const cadence = { id: 'c', code: 'C', name: 'C', intervalMonths: 6, source: 'SYSTEM_DEFAULT' as const };
    expect(computeDueDate(null, cadence, TZ)).toBeNull();
    expect(computeDueDate(new Date('2026-01-15T03:00:00Z'), null, TZ)).toBeNull();
    expect(computeDueDate(new Date('2026-01-15T03:00:00Z'), cadence, TZ)).toBe('2026-07-15');
  });

  it('rejects an invalid completion timestamp', () => {
    expect(() => toBusinessDate(new Date('invalid'), TZ)).toThrow(RangeError);
  });
});
