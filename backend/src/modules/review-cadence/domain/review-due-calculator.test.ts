import { describe, it, expect } from 'vitest';
import { calculateReviewDueStatus } from './review-due-calculator.js';

describe('review-due-calculator', () => {
  describe('calculateReviewDueStatus', () => {
    const referenceDate = new Date('2026-09-24T12:00:00Z');

    it('returns NO_SCHEDULE when nextReviewDueDate is null or undefined', () => {
      const res1 = calculateReviewDueStatus(null, { referenceDate });
      expect(res1.status).toBe('NO_SCHEDULE');
      expect(res1.daysOverdue).toBe(0);

      const res2 = calculateReviewDueStatus(undefined, { referenceDate });
      expect(res2.status).toBe('NO_SCHEDULE');
    });

    it('returns OVERDUE with positive days_overdue when due date is before reference date (TC01)', () => {
      const res = calculateReviewDueStatus('2026-09-20T00:00:00Z', { referenceDate });
      expect(res.status).toBe('OVERDUE');
      expect(res.daysOverdue).toBe(4);
    });

    it('returns DUE when due date is today (TC01)', () => {
      const res = calculateReviewDueStatus('2026-09-24T00:00:00Z', { referenceDate });
      expect(res.status).toBe('DUE');
      expect(res.daysOverdue).toBe(0);
      expect(res.daysUntilDue).toBe(0);
    });

    it('returns UPCOMING when due date is within lead time (TC01)', () => {
      const res = calculateReviewDueStatus('2026-10-10T00:00:00Z', { referenceDate, leadTimeDays: 30 });
      expect(res.status).toBe('UPCOMING');
      expect(res.daysOverdue).toBe(0);
      expect(res.daysUntilDue).toBe(16);
    });

    it('returns NOT_DUE when due date is beyond lead time (TC01)', () => {
      const res = calculateReviewDueStatus('2026-11-01T00:00:00Z', { referenceDate, leadTimeDays: 30 });
      expect(res.status).toBe('NOT_DUE');
      expect(res.daysOverdue).toBe(0);
      expect(res.daysUntilDue).toBe(38);
    });

    it('handles leadTimeDays = 0 correctly with no upcoming window (TC02)', () => {
      const res = calculateReviewDueStatus('2026-09-25T00:00:00Z', { referenceDate, leadTimeDays: 0 });
      expect(res.status).toBe('NOT_DUE');
    });
  });
});
