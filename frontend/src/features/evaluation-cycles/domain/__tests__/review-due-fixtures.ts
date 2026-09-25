import type { ReviewDueResponseDTO } from '../../types/review-due.types';

/** Mirrors the real GET /api/reviews/due `data` payload (after envelope unwrapping). */
export const realReviewDueResponse: ReviewDueResponseDTO = {
  items: [
    {
      employee_id: 'emp-1',
      employee_code: 'EMP001',
      employee_name: 'Tran Thi B',
      team: { id: 'team-1', name: 'Platform' },
      job_level: { id: 'lvl-2', name: 'Senior' },
      effective_cadence: { id: 'cad-6', code: 'SEMI', name: 'Semi-annual', interval_months: 6, source: 'JOB_LEVEL_DEFAULT' },
      last_evaluation_completed_at: '2026-03-31T12:00:00.000Z',
      next_review_due_date: '2026-10-01',
      status: 'OVERDUE',
      days_overdue: 4,
    },
    {
      employee_id: 'emp-2',
      employee_code: 'EMP002',
      employee_name: 'Le Van C',
      team: { id: 'team-1', name: 'Platform' },
      job_level: { id: 'lvl-1', name: 'Junior' },
      effective_cadence: null,
      last_evaluation_completed_at: null,
      next_review_due_date: null,
      status: 'NO_SCHEDULE',
      days_overdue: 0,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 50,
  totalPages: 1,
  last_updated_at: '2026-09-25T02:00:00.000Z',
};
