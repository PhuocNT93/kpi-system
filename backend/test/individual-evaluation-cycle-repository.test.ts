import { describe, it, expect, vi } from 'vitest';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Pool, PoolClient } from 'pg';
import {
  PostgresEvaluationCycleRepository,
  PostgresEvaluationRepository,
} from '../src/modules/evaluation-cycle/infrastructure/postgres-evaluation-cycle.repository.js';
import { EvaluationCycleStatus, EvaluationCycleType } from '../src/modules/evaluation-cycle/domain/evaluation-cycle.types.js';
import {
  DEFAULT_UPCOMING_BATCH_CYCLE_WINDOW_WEEKS,
  getBusinessToday,
  getUpcomingBatchCycleWindow,
  getUpcomingBatchCycleWindowWeeks,
} from '../src/config/evaluation-cycle.config.js';

function recordingClient(rows: Record<string, unknown>[] = []) {
  const query = vi.fn(async (_sql: string, _params?: unknown[]) => ({ rows }));
  return { client: { query } as unknown as PoolClient, query };
}

const normalise = (sql: unknown) => String(sql).replace(/\s+/g, ' ').trim();

const cycleRow = {
  evaluation_cycle_id: 'c1',
  code: 'H2',
  name: 'H2',
  cycle_type: null,
  triggered_by_employee_id: null,
  start_date: '2026-10-01',
  end_date: '2026-12-31',
  status: 'DRAFT',
  evaluation_template_version_id: 'tv',
  applicable_team_ids: null,
  applicable_role_ids: null,
  applicable_employee_ids: null,
  approved_by: null,
  locked_at: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  created_by: null,
  updated_by: null,
};

describe('Postgres repositories — individual cycle queries', () => {
  it('TC-BE-12: locks employees with FOR UPDATE OF e in employee_id order', async () => {
    const { client, query } = recordingClient([
      { employee_id: 'e1', employee_code: 'E1', team_id: 't', role_id: 'r', job_level_id: null, manager_id: null, employment_status: 'ACTIVE' },
    ]);
    const repo = new PostgresEvaluationRepository({} as Pool);

    const employees = await repo.lockEmployeesForEvaluation(['e1'], client);

    const sql = normalise(query.mock.calls[0]![0]);
    expect(sql).toContain('WHERE e.employee_id = ANY($1::uuid[]) ORDER BY e.employee_id FOR UPDATE OF e');
    expect(query.mock.calls[0]![1]).toEqual([['e1']]);
    expect(employees).toEqual([
      { employeeId: 'e1', employeeCode: 'E1', teamId: 't', roleId: 'r', jobLevelId: null, managerId: null, employmentStatus: 'ACTIVE' },
    ]);
  });

  it('TC-BE-03c: active evaluations exclude finished statuses, locked evaluations and locked cycles', async () => {
    const { client, query } = recordingClient([]);
    const repo = new PostgresEvaluationRepository({} as Pool);

    await repo.findActiveEvaluationsByEmployees(['e1', 'e2'], client);

    const sql = normalise(query.mock.calls[0]![0]);
    expect(sql).toContain('ev.status <> ALL($2::varchar[])');
    expect(sql).toContain('ev.is_locked = false');
    expect(sql).toContain('ec.status <> $3');
    expect(query.mock.calls[0]![1]).toEqual([['e1', 'e2'], ['APPROVED', 'PUBLISHED', 'LOCKED', 'REJECTED'], 'LOCKED']);
  });

  it('skips the database when there is nothing to lock or check', async () => {
    const { client, query } = recordingClient([]);
    const repo = new PostgresEvaluationRepository({} as Pool);

    expect(await repo.lockEmployeesForEvaluation([], client)).toEqual([]);
    expect(await repo.findActiveEvaluationsByEmployees([], client)).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('TC-BE-05b: upcoming batch cycles are DRAFT BATCH cycles starting within the window', async () => {
    const { client, query } = recordingClient([cycleRow]);
    const repo = new PostgresEvaluationCycleRepository({} as Pool);

    const cycles = await repo.findUpcomingBatchCycles('2026-09-24', '2026-10-22', client);

    const sql = normalise(query.mock.calls[0]![0]);
    expect(sql).toContain('WHERE cycle_type = $1 AND status = $2 AND start_date BETWEEN $3::date AND $4::date');
    expect(query.mock.calls[0]![1]).toEqual(['BATCH', 'DRAFT', '2026-09-24', '2026-10-22']);
    expect(cycles[0]).toMatchObject({ evaluationCycleId: 'c1', status: EvaluationCycleStatus.DRAFT });
  });

  it('TC-BE-19: maps legacy rows without cycle_type to BATCH and persists the new columns on create', async () => {
    const { client, query } = recordingClient([
      { ...cycleRow, cycle_type: 'INDIVIDUAL_SCHEDULED', triggered_by_employee_id: 'e1', applicable_employee_ids: ['e1'] },
    ]);
    const repo = new PostgresEvaluationCycleRepository({} as Pool);

    const legacy = await new PostgresEvaluationCycleRepository({} as Pool).findUpcomingBatchCycles('a', 'b', recordingClient([cycleRow]).client);
    expect(legacy[0]).toMatchObject({ cycleType: EvaluationCycleType.BATCH, triggeredByEmployeeId: null });

    const created = await repo.create(
      {
        code: 'IND-E1',
        name: 'Individual Review - E1',
        cycleType: EvaluationCycleType.INDIVIDUAL_SCHEDULED,
        triggeredByEmployeeId: 'e1',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        status: EvaluationCycleStatus.OPEN,
        evaluationTemplateVersionId: 'tv',
        applicableTeamIds: [],
        applicableRoleIds: [],
        applicableEmployeeIds: ['e1'],
        approvedBy: null,
        lockedAt: null,
        createdBy: null,
        updatedBy: null,
      },
      client
    );

    const sql = normalise(query.mock.calls[0]![0]);
    expect(sql).toContain('created_by, updated_by, cycle_type, triggered_by_employee_id');
    expect(query.mock.calls[0]![1]).toEqual(expect.arrayContaining(['INDIVIDUAL_SCHEDULED', 'e1']));
    expect(created).toMatchObject({ cycleType: 'INDIVIDUAL_SCHEDULED', triggeredByEmployeeId: 'e1' });
  });

  it('TC-BE-19: batch creation without a cycle type defaults to BATCH', async () => {
    const { client, query } = recordingClient([cycleRow]);
    const repo = new PostgresEvaluationCycleRepository({} as Pool);

    await repo.create(
      {
        code: 'H2',
        name: 'H2',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        status: EvaluationCycleStatus.DRAFT,
        evaluationTemplateVersionId: 'tv',
        applicableTeamIds: [],
        applicableRoleIds: [],
        applicableEmployeeIds: [],
        approvedBy: null,
        lockedAt: null,
        createdBy: null,
        updatedBy: null,
      },
      client
    );

    const params = query.mock.calls[0]![1] as unknown[];
    expect(params.slice(-2)).toEqual(['BATCH', null]);
  });
});

describe('Upcoming batch cycle window configuration', () => {
  it('TC-BE-18: defaults to 4 weeks and falls back on invalid values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(getUpcomingBatchCycleWindowWeeks({})).toBe(DEFAULT_UPCOMING_BATCH_CYCLE_WINDOW_WEEKS);
    expect(getUpcomingBatchCycleWindowWeeks({ BATCH_CYCLE_LEAD_TIME_WEEKS: '6' })).toBe(6);
    expect(getUpcomingBatchCycleWindowWeeks({ BATCH_CYCLE_LEAD_TIME_WEEKS: '0' })).toBe(4);
    expect(getUpcomingBatchCycleWindowWeeks({ BATCH_CYCLE_LEAD_TIME_WEEKS: 'abc' })).toBe(4);
    expect(getUpcomingBatchCycleWindowWeeks({ BATCH_CYCLE_LEAD_TIME_WEEKS: '2.5' })).toBe(4);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it('TC-BE-18: computes the window from the business-timezone date', () => {
    // 2026-09-23T20:00Z is already 2026-09-24 in Asia/Ho_Chi_Minh (UTC+7).
    const now = new Date('2026-09-23T20:00:00Z');
    const env = { BUSINESS_TIMEZONE: 'Asia/Ho_Chi_Minh', BATCH_CYCLE_LEAD_TIME_WEEKS: '2' };
    expect(getBusinessToday(now, env)).toBe('2026-09-24');
    expect(getUpcomingBatchCycleWindow(now, env)).toEqual({ fromDate: '2026-09-24', toDate: '2026-10-08' });
  });
});

describe('Migration 1791000000004', () => {
  it('TC-BE-20: exists and uses a timestamp prefix no other migration shares', () => {
    const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
    const files = readdirSync(migrationsDir);
    const target = files.filter((file) => file.startsWith('1791000000004_'));
    expect(target).toEqual(['1791000000004_add-cycle-type-and-trigger-to-evaluation-cycle.ts']);
  });
});
