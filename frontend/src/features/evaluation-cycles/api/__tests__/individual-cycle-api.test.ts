import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postApi } from '@/shared/api/api-client';
import {
  evaluationCycleApi,
  mapIndividualCycleCreationResult,
  mapIndividualCycleCreateRequest,
  type IndividualCycleCreateResponseWire,
} from '../cycle-api';

vi.mock('@/shared/api/api-client', () => ({
  getApi: vi.fn(),
  postApi: vi.fn(),
  patchApi: vi.fn(),
}));

const cycleWire = {
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
  created_at: '2026-09-24T00:00:00.000Z',
  updated_at: '2026-09-24T00:00:00.000Z',
  created_by: null,
  updated_by: null,
};

const warningWire = {
  code: 'UPCOMING_BATCH_CYCLE',
  employee_id: 'emp-a',
  evaluation_cycle_id: 'batch-1',
  evaluation_cycle_code: 'H2-2026',
  evaluation_cycle_name: '2026 H2',
  start_date: '2026-10-01',
  message: 'Employee E-A is included in batch cycle H2-2026 scheduled to open on 2026-10-01.',
};

const responseWire: IndividualCycleCreateResponseWire = {
  created: [{ evaluation_cycle: cycleWire, employee_id: 'emp-a', evaluation_id: 'eval-1', evaluation_item_count: 18 }],
  skipped: [{ employee_id: 'emp-b', reason_code: 'EVALUATION_ALREADY_OPEN', existing_evaluation_id: 'ev-x', existing_evaluation_cycle_id: 'cy-x' }],
  warnings: [warningWire, { ...warningWire }],
};

describe('individual cycle API mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-FE-02: maps camelCase input to the snake_case wire body at the API boundary', async () => {
    vi.mocked(postApi).mockResolvedValue(responseWire);

    await evaluationCycleApi.createIndividualCycles({
      name: '  Probation  ',
      templateVersionId: 'tv-1',
      employeeIds: ['emp-a', 'emp-b', 'emp-a'],
      startDate: '2026-09-24',
      endDate: '2026-10-24',
    });

    expect(postApi).toHaveBeenCalledWith('/api/evaluation-cycles/individual', {
      name: 'Probation',
      evaluation_template_version_id: 'tv-1',
      employee_ids: ['emp-a', 'emp-b'],
      start_date: '2026-09-24',
      end_date: '2026-10-24',
    });
  });

  it('omits an empty name so the backend default applies', () => {
    expect(
      mapIndividualCycleCreateRequest({ name: '  ', templateVersionId: 'tv-1', employeeIds: ['emp-a'], startDate: '2026-09-24', endDate: '2026-09-25' })
    ).not.toHaveProperty('name');
  });

  it('maps created / skipped / warnings to the camelCase domain model', () => {
    const mapped = mapIndividualCycleCreationResult(responseWire);

    expect(mapped.created).toEqual([
      expect.objectContaining({
        employeeId: 'emp-a',
        evaluationId: 'eval-1',
        evaluationItemCount: 18,
        cycle: expect.objectContaining({ id: 'cycle-1', cycleType: 'INDIVIDUAL_SCHEDULED', triggeredByEmployeeId: 'emp-a', status: 'OPEN' }),
      }),
    ]);
    expect(mapped.skipped).toEqual([
      { employeeId: 'emp-b', reasonCode: 'EVALUATION_ALREADY_OPEN', existingEvaluationId: 'ev-x', existingEvaluationCycleId: 'cy-x' },
    ]);
  });

  it('TC-FE-06: deduplicates warnings per (employee, batch cycle)', () => {
    const mapped = mapIndividualCycleCreationResult(responseWire);

    expect(mapped.warnings).toEqual([
      {
        code: 'UPCOMING_BATCH_CYCLE',
        employeeId: 'emp-a',
        evaluationCycleId: 'batch-1',
        evaluationCycleCode: 'H2-2026',
        evaluationCycleName: '2026 H2',
        startDate: '2026-10-01',
        message: warningWire.message,
      },
    ]);
  });

  it('defaults legacy cycles without cycle_type to BATCH', () => {
    const { cycle_type: _cycleType, triggered_by_employee_id: _trigger, ...legacy } = cycleWire;
    const mapped = mapIndividualCycleCreationResult({ created: [{ evaluation_cycle: legacy, employee_id: 'e', evaluation_id: 'v', evaluation_item_count: 1 }], skipped: [], warnings: [] });
    expect(mapped.created[0]!.cycle).toMatchObject({ cycleType: 'BATCH', triggeredByEmployeeId: null });
  });
});
