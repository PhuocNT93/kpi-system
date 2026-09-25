import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuditActionSchema } from '../src/modules/audit/domain/audit.domain.js';
import { PostgresEmployeeScheduleRepository } from '../src/modules/employee/infrastructure/postgres-employee-schedule.repository.js';
import { QueryResultLike } from '../src/shared/database/query-executor.js';
import { createScheduleWorld, HR_USER_ID, ScheduleWorld, uuid } from './mocks/review-schedule-fixture.js';

const EMP = uuid(101);
const C6 = uuid(6);
const C12 = uuid(12);
const LEVEL = uuid(900);

describe('ReviewScheduleService (single owner of the employee review schedule)', () => {
  let world: ScheduleWorld;

  beforeEach(() => {
    world = createScheduleWorld();
    world.addCadence({ id: C6, intervalMonths: 6, isSystemDefault: true });
    world.addCadence({ id: C12, intervalMonths: 12 });
    world.addJobLevel(LEVEL, null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC16: recalculates from the existing last_evaluation_completed_at, never from today', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T02:00:00Z'));
    const base = new Date('2026-01-15T03:00:00Z');
    world.addEmployee({ employeeId: EMP, jobLevelId: LEVEL, lastEvaluationCompletedAt: base, nextReviewDueDate: '2026-07-15' });

    const snapshot = await world.scheduleService.captureEmployees(world.client, [EMP]);
    world.employee(EMP).overrideId = C12;
    const results = await world.scheduleService.applyRecalculation(world.client, snapshot, 'EMPLOYEE_OVERRIDE_CHANGED', HR_USER_ID);

    expect(world.employee(EMP).nextReviewDueDate).toBe('2027-01-15');
    expect(world.employee(EMP).nextReviewDueDate).not.toBe('2027-05-01');
    expect(world.employee(EMP).lastEvaluationCompletedAt).toEqual(base);
    expect(results.get(EMP)?.effectiveCadence?.source).toBe('EMPLOYEE_OVERRIDE');
  });

  it('TC17: an employee who never completed an evaluation keeps a NULL due date (no fabricated completion)', async () => {
    world.addEmployee({ employeeId: EMP, jobLevelId: LEVEL });

    const snapshot = await world.scheduleService.captureEmployees(world.client, [EMP]);
    world.employee(EMP).overrideId = C12;
    await world.scheduleService.applyRecalculation(world.client, snapshot, 'EMPLOYEE_OVERRIDE_CHANGED', HR_USER_ID);

    expect(world.employee(EMP).lastEvaluationCompletedAt).toBeNull();
    expect(world.employee(EMP).nextReviewDueDate).toBeNull();
    expect(world.auditOf('SCHEDULE_RECALC')).toHaveLength(0);
  });

  it('TC18: does not write or audit employees whose due date is unchanged', async () => {
    const otherSix = uuid(66);
    world.addCadence({ id: otherSix, intervalMonths: 6 });
    world.addEmployee({
      employeeId: EMP,
      jobLevelId: LEVEL,
      lastEvaluationCompletedAt: new Date('2026-01-15T03:00:00Z'),
      nextReviewDueDate: '2026-07-15',
    });

    const snapshot = await world.scheduleService.captureEmployees(world.client, [EMP]);
    world.employee(EMP).overrideId = otherSix;
    await world.scheduleService.applyRecalculation(world.client, snapshot, 'EMPLOYEE_OVERRIDE_CHANGED', HR_USER_ID);

    expect(world.scheduleRepo.calls.savedRowsPerCall).toEqual([0]);
    expect(world.auditOf('SCHEDULE_RECALC')).toHaveLength(0);
  });

  it('TC19: recalculation audit carries base, old/new due date, old/new cadence and actor — no PII', async () => {
    world.addEmployee({
      employeeId: EMP,
      jobLevelId: LEVEL,
      lastEvaluationCompletedAt: new Date('2026-01-15T03:00:00Z'),
      nextReviewDueDate: '2026-07-15',
    });

    const snapshot = await world.scheduleService.captureEmployees(world.client, [EMP]);
    world.employee(EMP).overrideId = C12;
    await world.scheduleService.applyRecalculation(world.client, snapshot, 'EMPLOYEE_OVERRIDE_CHANGED', HR_USER_ID, 'PIP');

    const [entry] = world.auditOf('SCHEDULE_RECALC', EMP);
    expect(entry).toMatchObject({ entityType: 'EMPLOYEE', fieldName: 'next_review_due_date', performedBy: HR_USER_ID });
    expect(entry?.reason).toBe('EMPLOYEE_OVERRIDE_CHANGED: PIP');
    const oldValue = JSON.parse(entry?.oldValue ?? '{}');
    const newValue = JSON.parse(entry?.newValue ?? '{}');
    expect(oldValue).toEqual({
      employee_id: EMP,
      last_evaluation_completed_at: '2026-01-15T03:00:00.000Z',
      next_review_due_date: '2026-07-15',
      effective_cadence: { id: C6, code: 'EVERY_6_MONTHS', interval_months: 6, source: 'SYSTEM_DEFAULT' },
    });
    expect(newValue).toEqual({
      employee_id: EMP,
      trigger: 'EMPLOYEE_OVERRIDE_CHANGED',
      last_evaluation_completed_at: '2026-01-15T03:00:00.000Z',
      next_review_due_date: '2027-01-15',
      effective_cadence: { id: C12, code: 'EVERY_12_MONTHS', interval_months: 12, source: 'EMPLOYEE_OVERRIDE' },
    });
    expect(JSON.stringify(entry)).not.toMatch(/full_name|email/);
  });

  it('TC20: publish sets the new base, derives the due date from it and audits with evaluation_id', async () => {
    world.addEmployee({
      employeeId: EMP,
      jobLevelId: LEVEL,
      lastEvaluationCompletedAt: new Date('2025-07-01T03:00:00Z'),
      nextReviewDueDate: '2026-01-01',
    });
    const publishedAt = new Date('2026-03-10T08:00:00Z');
    const evaluationId = uuid(5001);

    await world.scheduleService.onEvaluationsPublished(world.client, [{ evaluationId, employeeId: EMP, publishedAt }], HR_USER_ID);

    expect(world.employee(EMP).lastEvaluationCompletedAt).toEqual(publishedAt);
    expect(world.employee(EMP).nextReviewDueDate).toBe('2026-09-10');
    const [entry] = world.auditOf('SCHEDULE_UPDATED', EMP);
    expect(entry?.reason).toBe(`EVALUATION_PUBLISHED evaluation_id=${evaluationId}`);
    expect(JSON.parse(entry?.newValue ?? '{}')).toMatchObject({
      trigger: 'EVALUATION_PUBLISHED',
      evaluation_id: evaluationId,
      last_evaluation_completed_at: publishedAt.toISOString(),
      next_review_due_date: '2026-09-10',
    });
  });

  it('keeps the latest completion when one employee appears twice in a publish batch', async () => {
    world.addEmployee({ employeeId: EMP, jobLevelId: LEVEL });
    const earlier = new Date('2026-03-01T03:00:00Z');
    const later = new Date('2026-03-05T03:00:00Z');

    await world.scheduleService.onEvaluationsPublished(
      world.client,
      [
        { evaluationId: uuid(1), employeeId: EMP, publishedAt: later },
        { evaluationId: uuid(2), employeeId: EMP, publishedAt: earlier },
      ],
      HR_USER_ID
    );

    expect(world.employee(EMP).lastEvaluationCompletedAt).toEqual(later);
    expect(world.auditOf('SCHEDULE_UPDATED', EMP)).toHaveLength(1);
  });

  it('TC22: a 1,000-employee recalculation is one lock, one resolve, one save and one audit batch', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 1000; i += 1) {
      const id = uuid(10_000 + i);
      ids.push(id);
      world.addEmployee({
        employeeId: id,
        jobLevelId: LEVEL,
        lastEvaluationCompletedAt: new Date('2026-01-15T03:00:00Z'),
        nextReviewDueDate: '2026-07-15',
      });
    }

    const snapshot = await world.scheduleService.captureEmployees(world.client, ids);
    world.store.jobLevels.get(LEVEL)!.defaultReviewCadenceId = C12;
    await world.scheduleService.applyRecalculation(world.client, snapshot, 'JOB_LEVEL_DEFAULT_CHANGED', HR_USER_ID);

    expect(world.scheduleRepo.calls.lockByEmployeeIds).toBe(1);
    expect(world.scheduleRepo.calls.resolveEffectiveCadences).toBe(1);
    expect(world.scheduleRepo.calls.savedRowsPerCall).toEqual([1000]);
    expect(world.auditRepo.insertManyCalls).toBe(1);
    expect(world.auditOf('SCHEDULE_RECALC')).toHaveLength(1000);
    expect(world.employee(ids[999]!).nextReviewDueDate).toBe('2027-01-15');
  });
});

describe('PostgresEmployeeScheduleRepository SQL', () => {
  function recordingRunner(rows: Record<string, unknown>[] = []) {
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    return {
      calls,
      runner: {
        query: vi.fn(async (sql: string, values: unknown[] = []): Promise<QueryResultLike<Record<string, unknown>>> => {
          calls.push({ sql: sql.replace(/\s+/g, ' '), values });
          return { rows };
        }),
      },
    };
  }

  const repo = new PostgresEmployeeScheduleRepository();

  it('TC21: locks employee rows only, in employee_id order, then reads cadences in a separate statement', async () => {
    const { calls, runner } = recordingRunner([{ employee_id: uuid(1), last_evaluation_completed_at: null, next_review_due_date: null }]);
    await repo.lockByEmployeeIds(runner, [uuid(3), uuid(1), uuid(2)]);

    expect(calls).toHaveLength(2);
    expect(calls[0]!.sql).toContain('ORDER BY e.employee_id FOR UPDATE OF e');
    expect(calls[0]!.sql).toContain('e.employee_id = ANY($1::uuid[])');
    // cadence tiers are read AFTER the lock is held (fresh READ COMMITTED snapshot), never in the locking statement
    expect(calls[0]!.sql).not.toContain('o.interval_months');
    expect(calls[1]!.sql).not.toContain('FOR UPDATE');
    expect(calls[1]!.sql).toContain('o.active = true');
    expect(calls[1]!.values).toEqual([[uuid(1)]]);
  });

  it('locks job levels FOR SHARE in a stable order and skips empty input', async () => {
    const { calls, runner } = recordingRunner();
    await repo.lockJobLevelsForShare(runner, [uuid(9), uuid(8), uuid(9)]);
    await repo.lockJobLevelsForShare(runner, []);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.sql).toContain('ORDER BY job_level_id FOR SHARE');
    expect(calls[0]!.values).toEqual([[uuid(9), uuid(8)]]);
  });

  it('TC23: saveSchedules is one set-based UPDATE that never touches legacy cadence columns', async () => {
    const { calls, runner } = recordingRunner();
    await repo.saveSchedules(
      runner,
      [
        { employeeId: uuid(1), lastEvaluationCompletedAt: new Date('2026-01-15T03:00:00Z'), nextReviewDueDate: '2026-07-15' },
        { employeeId: uuid(2), lastEvaluationCompletedAt: null, nextReviewDueDate: null },
      ],
      HR_USER_ID
    );

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call!.sql).toContain('FROM unnest($1::uuid[], $2::timestamptz[], $3::date[])');
    expect(call!.sql).toContain("AT TIME ZONE 'UTC'");
    expect(call!.sql).not.toMatch(/review_cadence(_months)?\s*=/);
    expect(call!.values).toEqual([
      [uuid(1), uuid(2)],
      ['2026-01-15T03:00:00.000Z', null],
      ['2026-07-15', null],
      HR_USER_ID,
    ]);
  });

  it('saveSchedules issues no statement for an empty batch', async () => {
    const { calls, runner } = recordingRunner();
    await repo.saveSchedules(runner, [], HR_USER_ID);
    expect(calls).toHaveLength(0);
  });

  it('maps cadence tiers with source and normalizes the stored due date', async () => {
    const { runner } = recordingRunner([
      {
        employee_id: uuid(1),
        last_evaluation_completed_at: new Date('2026-01-15T03:00:00Z'),
        next_review_due_date: new Date('2026-07-15T00:00:00Z'),
        o_id: null,
        j_id: uuid(6),
        j_code: 'EVERY_6_MONTHS',
        j_name: 'Every 6 months',
        j_interval_months: 6,
        s_id: uuid(12),
        s_code: 'ANNUAL',
        s_name: 'Annual',
        s_interval_months: 12,
      },
    ]);
    const [state] = await repo.lockByEmployeeIds(runner, [uuid(1)]);
    expect(state).toEqual({
      employeeId: uuid(1),
      lastEvaluationCompletedAt: new Date('2026-01-15T03:00:00Z'),
      nextReviewDueDate: '2026-07-15',
      effectiveCadence: { id: uuid(6), code: 'EVERY_6_MONTHS', name: 'Every 6 months', intervalMonths: 6, source: 'JOB_LEVEL_DEFAULT' },
    });
  });
});

describe('Audit action names fit audit_log.action varchar(20)', () => {
  it('schedule audit actions are at most 20 characters', () => {
    for (const action of ['SCHEDULE_UPDATED', 'SCHEDULE_RECALC'] as const) {
      expect(AuditActionSchema.options).toContain(action);
      expect(action.length).toBeLessThanOrEqual(20);
    }
  });
});
