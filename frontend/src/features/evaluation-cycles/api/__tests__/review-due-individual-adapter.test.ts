import { describe, it, expect } from 'vitest';
import { toReviewDueIndividualResult } from '../review-due-api';
import type { IndividualCycleCreateResponseWire } from '../cycle-api';

const cycle = {
  id: 'cycle-1',
  code: 'IND-E-A-20260924-ABCDEF',
  name: 'Individual Review - E-A',
  cycle_type: 'INDIVIDUAL_SCHEDULED' as const,
  triggered_by_employee_id: 'emp-a',
  start_date: '2026-09-24',
  end_date: '2026-10-24',
  status: 'OPEN' as const,
  evaluation_template_version_id: 'tv-1',
  applicable_team_ids: [],
  applicable_role_ids: [],
  applicable_employee_ids: ['emp-a'],
  approved_by: null,
  locked_at: null,
  created_at: '',
  updated_at: '',
  created_by: null,
  updated_by: null,
};

describe('Review Due Dashboard adapter for POST /evaluation-cycles/individual', () => {
  it('maps created / skipped / warnings to the modal shape and deduplicates warnings', () => {
    const warning = {
      code: 'UPCOMING_BATCH_CYCLE',
      employee_id: 'emp-a',
      evaluation_cycle_id: 'batch-1',
      evaluation_cycle_code: 'H2-2026',
      evaluation_cycle_name: '2026 H2',
      start_date: '2026-10-01',
      message: 'msg',
    };
    const raw: IndividualCycleCreateResponseWire = {
      created: [{ evaluation_cycle: cycle, employee_id: 'emp-a', evaluation_id: 'ev-1', evaluation_item_count: 2 }],
      skipped: [{ employee_id: 'emp-b', reason_code: 'EVALUATION_ALREADY_OPEN', existing_evaluation_id: 'ev-x', existing_evaluation_cycle_id: 'cy-x' }],
      warnings: [warning, warning],
    };

    expect(toReviewDueIndividualResult(raw)).toEqual({
      created: [{ cycle_id: 'cycle-1', evaluation_id: 'ev-1', employee_id: 'emp-a', code: 'IND-E-A-20260924-ABCDEF' }],
      warnings: [
        { employee_id: 'emp-a', warning: { code: 'UPCOMING_BATCH_CYCLE', cycle_code: 'H2-2026', cycle_name: '2026 H2', scheduled_date: '2026-10-01' } },
      ],
      conflicts: [
        { employee_id: 'emp-b', code: 'EVALUATION_ALREADY_OPEN', message: 'Employee already has an active evaluation (ev-x).' },
      ],
    });
  });
});
