import { describe, it, expect } from 'vitest';
import { mapReviewDueFiltersToWire, mapReviewDueResponseToDomain } from '../review-due-mappers';
import { realReviewDueResponse } from './review-due-fixtures';

describe('review-due mappers', () => {
  it('TC72 maps the real backend shape (employee_name, team object, JOB_LEVEL_DEFAULT, NO_SCHEDULE) to the domain model', () => {
    const page = mapReviewDueResponseToDomain(realReviewDueResponse);

    expect(page).toEqual({
      items: [
        {
          employeeId: 'emp-1',
          employeeCode: 'EMP001',
          employeeName: 'Tran Thi B',
          teamName: 'Platform',
          jobLevelName: 'Senior',
          effectiveCadence: { id: 'cad-6', code: 'SEMI', name: 'Semi-annual', intervalMonths: 6, source: 'JOB_LEVEL_DEFAULT' },
          lastEvaluationCompletedAt: '2026-03-31T12:00:00.000Z',
          nextReviewDueDate: '2026-10-01',
          status: 'OVERDUE',
          daysOverdue: 4,
        },
        {
          employeeId: 'emp-2',
          employeeCode: 'EMP002',
          employeeName: 'Le Van C',
          teamName: 'Platform',
          jobLevelName: 'Junior',
          effectiveCadence: null,
          lastEvaluationCompletedAt: null,
          nextReviewDueDate: null,
          status: 'NO_SCHEDULE',
          daysOverdue: 0,
        },
      ],
      total: 2,
      page: 1,
      pageSize: 50,
      totalPages: 1,
      lastUpdatedAt: '2026-09-25T02:00:00.000Z',
    });
  });

  it('TC72b maps filters to the accepted wire params (page/page_size, no limit/offset/lead_time_days)', () => {
    const wire = mapReviewDueFiltersToWire({ status: 'DUE', teamId: 't-1', cadenceId: 'c-1', search: 'an', page: 2, pageSize: 50 });

    expect(wire).toEqual({ status: 'DUE', team_id: 't-1', cadence_id: 'c-1', search: 'an', page: 2, page_size: 50 });
    expect(wire).not.toHaveProperty('limit');
    expect(wire).not.toHaveProperty('offset');
    expect(wire).not.toHaveProperty('lead_time_days');
  });
});
