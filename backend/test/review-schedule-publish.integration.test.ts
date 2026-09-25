/**
 * EVAL-06 — publish atomicity: evaluation status, employee schedule and audit commit together or not at all.
 * Real EvaluationService / CalibrationService / ReviewScheduleService / AuditService over a transaction-aware
 * in-memory store (see mocks/review-schedule-fixture.ts).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EvaluationService } from '../src/modules/evaluation/application/services/evaluation.service.js';
import { Evaluation, EvaluationStatus } from '../src/modules/evaluation/domain/evaluation.types.js';
import { IEvaluationItemRepository, IEvaluationRepository } from '../src/modules/evaluation/domain/repositories.interface.js';
import { CalibrationService } from '../src/modules/calibration/application/calibration.service.js';
import { CalibrationRepository, PublishedEvaluationRow } from '../src/modules/calibration/domain/calibration.repository.js';
import { CalibrationEvaluationRow, CalibrationSession } from '../src/modules/calibration/domain/calibration.domain.js';
import { PostgresCalibrationRepository } from '../src/modules/calibration/infrastructure/postgres-calibration.repository.js';
import { Actor } from '../src/shared/auth/types.js';
import { createScheduleWorld, HR_USER_ID, MANAGER_USER_ID, ScheduleWorld, uuid } from './mocks/review-schedule-fixture.js';

const EMP = uuid(201);
const C6 = uuid(6);
const LEVEL = uuid(901);
const EVAL = uuid(3001);
const CYCLE = uuid(4001);

const hrActor: Actor = { userId: HR_USER_ID, role: 'HR_ADMIN' };
const managerActor: Actor = { userId: MANAGER_USER_ID, role: 'MANAGER', managedTeamIds: [] };

function createEvaluationService(world: ScheduleWorld): EvaluationService {
  const evaluationRepo = {
    findByIdForUpdate: vi.fn(async (id: string) => {
      const row = world.store.evaluations.get(id);
      return row ? ({ ...row } as unknown as Evaluation) : null;
    }),
    update: vi.fn(async (id: string, patch: Partial<Evaluation>) => {
      world.queries.push('evaluation:update');
      const row = world.store.evaluations.get(id);
      if (!row) throw new Error('missing evaluation');
      if (patch.status) row.status = patch.status;
      if (patch.published_at) row.published_at = patch.published_at;
      if (patch.is_locked !== undefined) row.is_locked = patch.is_locked;
      return { ...row } as unknown as Evaluation;
    }),
  };
  return new EvaluationService(
    evaluationRepo as unknown as IEvaluationRepository,
    {} as unknown as IEvaluationItemRepository,
    world.pool,
    world.auditService,
    undefined,
    undefined,
    undefined,
    world.scheduleService
  );
}

function seed(world: ScheduleWorld): void {
  world.addCadence({ id: C6, intervalMonths: 6, isSystemDefault: true });
  world.addJobLevel(LEVEL, null);
  world.addEmployee({
    employeeId: EMP,
    jobLevelId: LEVEL,
    lastEvaluationCompletedAt: new Date('2025-07-01T03:00:00Z'),
    nextReviewDueDate: '2026-01-01',
  });
  world.store.evaluations.set(EVAL, {
    evaluation_id: EVAL,
    employee_id: EMP,
    evaluation_cycle_id: CYCLE,
    status: EvaluationStatus.APPROVED,
    is_locked: false,
    published_at: null,
    final_score: 82,
  });
}

describe('Publish atomicity (EvaluationService.publishEvaluation)', () => {
  let world: ScheduleWorld;
  let service: EvaluationService;

  beforeEach(() => {
    world = createScheduleWorld();
    seed(world);
    service = createEvaluationService(world);
  });

  it('TC24: publishes, resets the base to published_at and derives the due date in ONE transaction', async () => {
    const published = await service.publishEvaluation(EVAL, hrActor);

    const stored = world.store.evaluations.get(EVAL)!;
    expect(published.status).toBe(EvaluationStatus.PUBLISHED);
    expect(stored.status).toBe(EvaluationStatus.PUBLISHED);
    const publishedAt = stored.published_at!;
    expect(world.employee(EMP).lastEvaluationCompletedAt).toEqual(publishedAt);
    const businessDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(publishedAt);
    const [y, m, d] = businessDate.split('-').map(Number) as [number, number, number];
    const expectedMonth = ((m - 1 + 6) % 12) + 1;
    const expectedYear = y + Math.floor((m - 1 + 6) / 12);
    const daysInMonth = new Date(Date.UTC(expectedYear, expectedMonth, 0)).getUTCDate();
    const expectedDue = `${expectedYear}-${String(expectedMonth).padStart(2, '0')}-${String(Math.min(d, daysInMonth)).padStart(2, '0')}`;
    expect(world.employee(EMP).nextReviewDueDate).toBe(expectedDue);

    expect(world.auditOf('PUBLISH')).toHaveLength(1);
    expect(world.auditOf('SCHEDULE_UPDATED', EMP)).toHaveLength(1);
    expect(world.queries).toEqual([
      'BEGIN',
      'evaluation:update',
      'schedule:lockByEmployeeIds',
      'schedule:saveSchedules',
      'audit:SCHEDULE_UPDATED',
      'audit:PUBLISH',
      'COMMIT',
    ]);
  });

  it('TC25: a schedule write failure rolls back the publish — no PUBLISHED evaluation with a stale schedule', async () => {
    world.failAt = 'saveSchedules';

    await expect(service.publishEvaluation(EVAL, hrActor)).rejects.toThrow('INJECTED_FAILURE:saveSchedules');

    expect(world.queries).toContain('ROLLBACK');
    expect(world.queries).not.toContain('COMMIT');
    expect(world.store.evaluations.get(EVAL)!.status).toBe(EvaluationStatus.APPROVED);
    expect(world.employee(EMP).lastEvaluationCompletedAt).toEqual(new Date('2025-07-01T03:00:00Z'));
    expect(world.employee(EMP).nextReviewDueDate).toBe('2026-01-01');
    expect(world.auditLog).toHaveLength(0);
  });

  it('TC26: a mandatory audit failure rolls back the publish and the schedule', async () => {
    world.failAt = 'auditInsert';

    await expect(service.publishEvaluation(EVAL, hrActor)).rejects.toThrow('INJECTED_FAILURE:auditInsert');

    expect(world.queries).toContain('ROLLBACK');
    expect(world.store.evaluations.get(EVAL)!.status).toBe(EvaluationStatus.APPROVED);
    expect(world.employee(EMP).nextReviewDueDate).toBe('2026-01-01');
    expect(world.auditLog).toHaveLength(0);
  });

  it('TC29: locking a published evaluation does not touch the review schedule again', async () => {
    await service.publishEvaluation(EVAL, hrActor);
    const afterPublish = { ...world.employee(EMP) };
    world.queries.length = 0;

    await service.lockEvaluation(EVAL, hrActor);

    expect(world.store.evaluations.get(EVAL)!.status).toBe(EvaluationStatus.LOCKED);
    expect(world.queries.filter((q) => q.startsWith('schedule:'))).toEqual([]);
    expect(world.employee(EMP)).toEqual(afterPublish);
  });

  it('TC30: re-publishing an already PUBLISHED evaluation is idempotent and does not reset the base', async () => {
    await service.publishEvaluation(EVAL, hrActor);
    const afterPublish = { ...world.employee(EMP) };
    world.queries.length = 0;

    const again = await service.publishEvaluation(EVAL, hrActor);

    expect(again.status).toBe(EvaluationStatus.PUBLISHED);
    expect(world.queries.filter((q) => q.startsWith('schedule:'))).toEqual([]);
    expect(world.employee(EMP)).toEqual(afterPublish);
  });

  it('TC31: a MANAGER cannot publish and no transaction is opened', async () => {
    await expect(service.publishEvaluation(EVAL, managerActor)).rejects.toMatchObject({ status: 403 });
    expect(world.queries).toEqual([]);
  });

  it('refuses to publish when no review schedule handler is wired (no silent schedule skip)', async () => {
    const unwired = new EvaluationService(
      {} as unknown as IEvaluationRepository,
      {} as unknown as IEvaluationItemRepository,
      world.pool,
      world.auditService
    );
    await expect(unwired.publishEvaluation(EVAL, hrActor)).rejects.toMatchObject({ code: 'REVIEW_SCHEDULE_NOT_CONFIGURED' });
    expect(world.queries).toEqual([]);
  });
});

describe('Calibration finalize auto-publish (CalibrationService.finalizeSession)', () => {
  const SESSION = uuid(7001);
  const EMP2 = uuid(202);
  const EMP3 = uuid(203);
  const EVAL2 = uuid(3002);
  const EVAL3 = uuid(3003);
  let world: ScheduleWorld;
  let sessionStatus: 'OPEN' | 'FINALIZED';

  function session(): CalibrationSession {
    return {
      calibrationSessionId: SESSION,
      evaluationCycleId: CYCLE,
      scopeType: 'CYCLE',
      scopeId: null,
      status: sessionStatus,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
      createdBy: HR_USER_ID,
    } as CalibrationSession;
  }

  function createCalibrationService(): CalibrationService {
    const repo: Partial<CalibrationRepository> = {
      getSessionByIdForUpdate: vi.fn(async () => session()),
      getSessionById: vi.fn(async () => session()),
      isCycleLocked: vi.fn(async () => false),
      getEvaluationsForSession: vi.fn(async () =>
        [...world.store.evaluations.values()].map(
          (e) =>
            ({ evaluationId: e.evaluation_id, employeeId: e.employee_id, status: e.status, isLocked: e.is_locked }) as CalibrationEvaluationRow
        )
      ),
      finalizeSession: vi.fn(async () => {
        sessionStatus = 'FINALIZED';
      }),
      transitionEvaluationsAndAutoPublish: vi.fn(async (ids: string[]): Promise<PublishedEvaluationRow[]> => {
        const publishedAt = new Date('2026-03-15T02:00:00Z');
        return ids.map((id) => {
          const row = world.store.evaluations.get(id)!;
          const previousStatus = row.status;
          row.status = EvaluationStatus.PUBLISHED;
          row.published_at = publishedAt;
          return { evaluationId: id, employeeId: row.employee_id, publishedAt, previousStatus };
        });
      }),
    };
    return new CalibrationService(
      world.pool,
      repo as unknown as PostgresCalibrationRepository,
      world.auditService,
      undefined,
      world.scheduleService
    );
  }

  beforeEach(() => {
    world = createScheduleWorld();
    sessionStatus = 'OPEN';
    world.addCadence({ id: C6, intervalMonths: 6, isSystemDefault: true });
    world.addJobLevel(LEVEL, null);
    for (const [emp, evaluation] of [[EMP, EVAL], [EMP2, EVAL2], [EMP3, EVAL3]] as const) {
      world.addEmployee({ employeeId: emp, jobLevelId: LEVEL });
      world.store.evaluations.set(evaluation, {
        evaluation_id: evaluation,
        employee_id: emp,
        evaluation_cycle_id: CYCLE,
        status: 'CALIBRATION',
        is_locked: false,
        published_at: null,
        final_score: 80,
      });
    }
  });

  it('TC27: every published evaluation updates its employee schedule, in the same transaction', async () => {
    await createCalibrationService().finalizeSession(SESSION, hrActor);

    for (const emp of [EMP, EMP2, EMP3]) {
      expect(world.employee(emp).lastEvaluationCompletedAt).toEqual(new Date('2026-03-15T02:00:00Z'));
      expect(world.employee(emp).nextReviewDueDate).toBe('2026-09-15');
    }
    expect(world.auditOf('SCHEDULE_UPDATED')).toHaveLength(3);
    expect(world.queries.filter((q) => q === 'BEGIN')).toHaveLength(1);
    expect(world.queries.at(-1)).toBe('COMMIT');
    expect(world.scheduleRepo.calls.savedRowsPerCall).toEqual([3]);
  });

  it('TC27b: an evaluation that was already PUBLISHED before finalize does not move its employee base (no drift)', async () => {
    const earlierBase = new Date('2025-12-01T03:00:00Z');
    world.store.evaluations.get(EVAL3)!.status = EvaluationStatus.PUBLISHED;
    world.employee(EMP3).lastEvaluationCompletedAt = earlierBase;
    world.employee(EMP3).nextReviewDueDate = '2026-06-01';

    await createCalibrationService().finalizeSession(SESSION, hrActor);

    expect(world.employee(EMP3).lastEvaluationCompletedAt).toEqual(earlierBase);
    expect(world.employee(EMP3).nextReviewDueDate).toBe('2026-06-01');
    expect(world.employee(EMP).nextReviewDueDate).toBe('2026-09-15');
    expect(world.auditOf('SCHEDULE_UPDATED')).toHaveLength(2);
  });

  it('TC28: a schedule failure rolls back the finalize (evaluations not published, session not finalized)', async () => {
    world.failAt = 'saveSchedules';

    await expect(createCalibrationService().finalizeSession(SESSION, hrActor)).rejects.toThrow('INJECTED_FAILURE:saveSchedules');

    expect(world.queries).toContain('ROLLBACK');
    for (const evaluation of world.store.evaluations.values()) {
      expect(evaluation.status).toBe('CALIBRATION');
    }
    expect(world.employee(EMP).lastEvaluationCompletedAt).toBeNull();
    expect(world.auditLog).toHaveLength(0);
  });
});

describe('PostgresCalibrationRepository.transitionEvaluationsAndAutoPublish SQL', () => {
  it('captures the previous status under a row lock in the same statement as the publish', async () => {
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const client = {
      query: vi.fn(async (sql: string, values: unknown[] = []) => {
        calls.push({ sql: sql.replace(/\s+/g, ' '), values });
        return {
          rows: [{ evaluation_id: EVAL, employee_id: EMP, published_at: new Date('2026-03-15T02:00:00Z'), previous_status: 'CALIBRATION' }],
        };
      }),
      release: vi.fn(),
    };
    const repo = new PostgresCalibrationRepository({} as never);

    const rows = await repo.transitionEvaluationsAndAutoPublish([EVAL], HR_USER_ID, client);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.sql).toMatch(/WITH previous AS \( SELECT evaluation_id, status AS previous_status FROM evaluation .* FOR UPDATE \)/);
    expect(calls[0]!.sql).toContain('RETURNING e.evaluation_id, e.employee_id, e.published_at, p.previous_status');
    expect(rows).toEqual([
      { evaluationId: EVAL, employeeId: EMP, publishedAt: new Date('2026-03-15T02:00:00Z'), previousStatus: 'CALIBRATION' },
    ]);
  });
});
