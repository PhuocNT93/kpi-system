import { describe, expect, it } from 'vitest';
import { getEmployeeReviewStatus } from './employee-review-status.js';

describe('getEmployeeReviewStatus', () => {
  const referenceDate = new Date('2026-09-07T00:00:00Z');

  it('classifies a new employee with a future due date as upcoming', () => {
    const result = getEmployeeReviewStatus(
      {
        reviewCadence: 'MONTHLY',
        lastEvaluationCompletedAt: null,
        nextReviewDueDate: '2026-09-15T00:00:00Z',
      },
      { referenceDate, upcomingWindowDays: 30 }
    );

    expect(result.status).toBe('UPCOMING');
    expect(result.isUpcoming).toBe(true);
    expect(result.isOverdue).toBe(false);
    expect(result.daysUntilDue).toBe(8);
  });

  it('classifies a past due date as overdue', () => {
    const result = getEmployeeReviewStatus(
      {
        reviewCadence: 'QUARTERLY',
        lastEvaluationCompletedAt: '2026-06-07T00:00:00Z',
        nextReviewDueDate: '2026-08-01T00:00:00Z',
      },
      { referenceDate, upcomingWindowDays: 30 }
    );

    expect(result.status).toBe('OVERDUE');
    expect(result.isUpcoming).toBe(false);
    expect(result.isOverdue).toBe(true);
    expect(result.daysUntilDue).toBe(-37);
  });

  it('classifies a far future due date as not due', () => {
    const result = getEmployeeReviewStatus(
      {
        reviewCadence: 'ANNUAL',
        lastEvaluationCompletedAt: '2026-01-01T00:00:00Z',
        nextReviewDueDate: '2026-12-31T00:00:00Z',
      },
      { referenceDate, upcomingWindowDays: 30 }
    );

    expect(result.status).toBe('NOT_DUE');
    expect(result.isUpcoming).toBe(false);
    expect(result.isOverdue).toBe(false);
    expect(result.daysUntilDue).toBe(115);
  });

  it('returns no schedule when next review due date is missing', () => {
    const result = getEmployeeReviewStatus(
      {
        reviewCadence: 'MONTHLY',
        lastEvaluationCompletedAt: null,
        nextReviewDueDate: null,
      },
      { referenceDate }
    );

    expect(result.status).toBe('NO_SCHEDULE');
    expect(result.daysUntilDue).toBeNull();
  });
});
