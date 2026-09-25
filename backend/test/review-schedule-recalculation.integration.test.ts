/**
 * Immediate recalculation of next_review_due_date when the effective cadence changes (LLD §14.1, Rule 9/10).
 * Real application services + ReviewScheduleService + AuditService over a transaction-aware in-memory store.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { EmployeeCadenceService } from '../src/modules/employee/application/employee-cadence.service.js';
import { EmployeeController } from '../src/modules/employee/api/employee.controller.js';
import { Employee, EmploymentStatus } from '../src/modules/employee/domain/employee.domain.js';
import { EmployeeRepository } from '../src/modules/employee/domain/employee.repository.js';
import { PostgresEmployeeRepository } from '../src/modules/employee/infrastructure/postgres-employee.repository.js';
import { OrganizationService } from '../src/modules/organization/application/organization.service.js';
import { DepartmentRepository, JobLevelRepository, JobRoleRepository } from '../src/modules/organization/domain/repositories.js';
import { JobLevel } from '../src/modules/organization/domain/types.js';
import { ReviewCadenceService } from '../src/modules/review-cadence/application/review-cadence.service.js';
import { ReviewCadenceRepository } from '../src/modules/review-cadence/domain/review-cadence.repository.js';
import { ReviewCadence } from '../src/modules/review-cadence/domain/review-cadence.types.js';
import { Actor } from '../src/shared/auth/types.js';
import { QueryResultLike } from '../src/shared/database/query-executor.js';
import { createScheduleWorld, HR_USER_ID, MANAGER_USER_ID, ScheduleWorld, StoredEmployee, uuid } from './mocks/review-schedule-fixture.js';

const hrActor: Actor = { userId: HR_USER_ID, role: 'HR_ADMIN' };
const managerActor: Actor = { userId: MANAGER_USER_ID, role: 'MANAGER', managedTeamIds: [] };

const C3 = uuid(3);
const C6 = uuid(6);
const C9 = uuid(9);
const C12 = uuid(12);
const LEVEL_A = uuid(801);
const LEVEL_B = uuid(802);
const EMP = uuid(301);
const BASE = new Date('2026-01-15T03:00:00Z');

function toEmployee(stored: StoredEmployee): Employee {
  return {
    employeeId: stored.employeeId,
    employeeCode: `E-${stored.employeeId.slice(-4)}`,
    fullName: 'Test Employee',
    email: 'test@example.com',
    departmentId: null,
    teamId: null,
    roleId: uuid(700),
    jobLevelId: stored.jobLevelId,
    managerId: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    joinDate: '2024-01-01',
    version: stored.version,
    reviewCadenceOverrideId: stored.overrideId,
    lastEvaluationCompletedAt: stored.lastEvaluationCompletedAt?.toISOString() ?? null,
    nextReviewDueDate: stored.nextReviewDueDate,
  };
}

function employeeRepoFor(world: ScheduleWorld): EmployeeRepository {
  const repo: Partial<EmployeeRepository> = {
    findById: vi.fn(async (id: string) => {
      const stored = world.store.employees.get(id);
      return stored ? toEmployee(stored) : null;
    }),
    update: vi.fn(async (next: Employee) => {
      world.queries.push('employee:update');
      const stored = world.store.employees.get(next.employeeId);
      if (!stored || stored.version !== next.version) throw new Error('RESOURCE_VERSION_CONFLICT');
      stored.jobLevelId = next.jobLevelId;
      stored.version += 1;
      return toEmployee(stored);
    }),
  };
  return repo as EmployeeRepository;
}

function cadenceRepoFor(world: ScheduleWorld): ReviewCadenceRepository {
  const toCadence = (id: string): ReviewCadence | null => {
    const stored = world.store.cadences.get(id);
    return stored ? { ...stored } : null;
  };
  return {
    findById: vi.fn(async (id: string) => toCadence(id)),
    findByCode: vi.fn(async () => null),
    findSystemDefault: vi.fn(async () => {
      const found = [...world.store.cadences.values()].find((c) => c.isSystemDefault && c.active);
      return found ? { ...found } : null;
    }),
    findAll: vi.fn(async () => [[], 0] as [ReviewCadence[], number]),
    create: vi.fn(async (cadence: ReviewCadence) => {
      const created = { ...cadence, id: uuid(9999) };
      world.store.cadences.set(created.id, created);
      return created;
    }),
    update: vi.fn(async (cadence: ReviewCadence) => {
      world.queries.push('cadence:update');
      world.store.cadences.set(cadence.id, { ...cadence });
      return { ...cadence };
    }),
    delete: vi.fn(async (id: string) => {
      world.store.cadences.delete(id);
    }),
    isReferencedByJobLevel: vi.fn(async (id: string) =>
      [...world.store.jobLevels.values()].some((l) => l.defaultReviewCadenceId === id)
    ),
    isReferencedByEmployee: vi.fn(async (id: string) =>
      [...world.store.employees.values()].some((e) => e.overrideId === id)
    ),
  };
}

function jobLevelRepoFor(world: ScheduleWorld): JobLevelRepository {
  const toLevel = (id: string): JobLevel | null => {
    const stored = world.store.jobLevels.get(id);
    return stored ? { ...stored } : null;
  };
  return {
    findById: vi.fn(async (id: string) => toLevel(id)),
    findByCode: vi.fn(async () => null),
    findAll: vi.fn(async () => [[], 0] as [JobLevel[], number]),
    create: vi.fn(async (level: JobLevel) => level),
    update: vi.fn(async (level: JobLevel) => {
      world.queries.push('jobLevel:update');
      const stored = world.store.jobLevels.get(level.id)!;
      stored.defaultReviewCadenceId = level.defaultReviewCadenceId ?? null;
      stored.name = level.name;
      return { ...stored };
    }),
  };
}

describe('Recalculation when the effective cadence changes', () => {
  let world: ScheduleWorld;
  let employeeCadence: EmployeeCadenceService;
  let organization: OrganizationService;
  let reviewCadences: ReviewCadenceService;

  beforeEach(() => {
    world = createScheduleWorld();
    world.addCadence({ id: C3, intervalMonths: 3 });
    world.addCadence({ id: C6, intervalMonths: 6, isSystemDefault: true });
    world.addCadence({ id: C9, intervalMonths: 9 });
    world.addCadence({ id: C12, intervalMonths: 12 });
    world.addJobLevel(LEVEL_A, C6);
    world.addJobLevel(LEVEL_B, C3);
    world.addEmployee({ employeeId: EMP, jobLevelId: LEVEL_A, lastEvaluationCompletedAt: BASE, nextReviewDueDate: '2026-07-15' });

    const employeeRepo = employeeRepoFor(world);
    const cadenceRepo = cadenceRepoFor(world);
    employeeCadence = new EmployeeCadenceService(world.pool, world.auditService, world.scheduleService, employeeRepo, cadenceRepo);
    organization = new OrganizationService(
      {} as DepartmentRepository,
      {} as JobRoleRepository,
      jobLevelRepoFor(world),
      world.pool,
      world.auditService,
      world.scheduleService
    );
    reviewCadences = new ReviewCadenceService(cadenceRepo, world.auditService, world.pool, world.scheduleService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Employee override ───────────────────────────────────────────────────

  it('TC32: override 6m→12m on 2026-05-01 gives 2027-01-15 (from the last completion), NOT 2027-05-01', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T02:00:00Z'));

    const result = await employeeCadence.updateCadenceOverride(hrActor, EMP, { review_cadence_override_id: C12, reason: 'PIP' });

    expect(result.next_review_due_date).toBe('2027-01-15');
    expect(result.next_review_due_date).not.toBe('2027-05-01');
    expect(result.effective_cadence).toMatchObject({ id: C12, interval_months: 12, source: 'EMPLOYEE_OVERRIDE' });
    expect(world.employee(EMP)).toMatchObject({ overrideId: C12, nextReviewDueDate: '2027-01-15', lastEvaluationCompletedAt: BASE });
    expect(world.auditLog.find((a) => a.fieldName === 'review_cadence_override_id')).toMatchObject({
      action: 'UPDATE',
      oldValue: null,
      newValue: C12,
      performedBy: HR_USER_ID,
    });
    expect(world.auditOf('SCHEDULE_RECALC', EMP)).toHaveLength(1);
    expect(world.queries.filter((q) => q === 'BEGIN')).toHaveLength(1);
    expect(world.queries.at(-1)).toBe('COMMIT');
  });

  it('TC33: clearing the override falls back to the job-level default', async () => {
    world.employee(EMP).overrideId = C12;
    world.employee(EMP).nextReviewDueDate = '2027-01-15';

    const result = await employeeCadence.updateCadenceOverride(hrActor, EMP, { review_cadence_override_id: null });

    expect(result.next_review_due_date).toBe('2026-07-15');
    expect(result.effective_cadence?.source).toBe('JOB_LEVEL_DEFAULT');
  });

  it('TC34: an unknown or inactive override cadence is rejected with 404 and nothing is written', async () => {
    world.store.cadences.get(C9)!.active = false;

    await expect(employeeCadence.updateCadenceOverride(hrActor, EMP, { review_cadence_override_id: C9 })).rejects.toMatchObject({ status: 404 });
    await expect(employeeCadence.updateCadenceOverride(hrActor, EMP, { review_cadence_override_id: uuid(4242) })).rejects.toMatchObject({ status: 404 });
    expect(world.employee(EMP).overrideId).toBeNull();
    expect(world.auditLog).toHaveLength(0);
  });

  it('TC35: a MANAGER cannot change an override', async () => {
    await expect(employeeCadence.updateCadenceOverride(managerActor, EMP, { review_cadence_override_id: C12 })).rejects.toMatchObject({ status: 403 });
    expect(world.queries).toEqual([]);
  });

  // ── Employee job level ──────────────────────────────────────────────────

  it('TC36: job level change without override recalculates from the same base (6m → 3m)', async () => {
    const existing = toEmployee(world.employee(EMP));

    const updated = await employeeCadence.updateEmployeeWithSchedule(hrActor, existing, { ...existing, jobLevelId: LEVEL_B });

    expect(updated.nextReviewDueDate).toBe('2026-04-15');
    expect(world.employee(EMP)).toMatchObject({ jobLevelId: LEVEL_B, nextReviewDueDate: '2026-04-15', lastEvaluationCompletedAt: BASE });
    expect(world.auditLog.find((a) => a.fieldName === 'job_level_id')).toMatchObject({ oldValue: LEVEL_A, newValue: LEVEL_B });
    expect(world.auditOf('SCHEDULE_RECALC', EMP)).toHaveLength(1);
    // old and new job level are share-locked before the employee is captured (serializes with default changes)
    expect(world.queries.indexOf('schedule:lockJobLevelsForShare:2')).toBeLessThan(world.queries.indexOf('schedule:lockByEmployeeIds'));
  });

  it('TC37: job level change with an override keeps the override cadence and the schedule', async () => {
    world.employee(EMP).overrideId = C12;
    world.employee(EMP).nextReviewDueDate = '2027-01-15';
    const existing = toEmployee(world.employee(EMP));

    await employeeCadence.updateEmployeeWithSchedule(hrActor, existing, { ...existing, jobLevelId: LEVEL_B });

    expect(world.employee(EMP).nextReviewDueDate).toBe('2027-01-15');
    expect(world.auditOf('SCHEDULE_RECALC')).toHaveLength(0);
    expect(world.auditLog.find((a) => a.fieldName === 'job_level_id')).toBeDefined();
  });

  it('TC40: a MANAGER cannot change a job level', async () => {
    const existing = toEmployee(world.employee(EMP));
    await expect(
      employeeCadence.updateEmployeeWithSchedule(managerActor, existing, { ...existing, jobLevelId: LEVEL_B })
    ).rejects.toMatchObject({ status: 403 });
    expect(world.employee(EMP).jobLevelId).toBe(LEVEL_A);
  });

  it('TC41: a concurrent modification (version mismatch) returns 409 and rolls back everything', async () => {
    const existing = toEmployee(world.employee(EMP));
    world.employee(EMP).version = 2;

    await expect(
      employeeCadence.updateEmployeeWithSchedule(hrActor, existing, { ...existing, jobLevelId: LEVEL_B })
    ).rejects.toMatchObject({ status: 409, code: 'VERSION_MISMATCH' });
    expect(world.queries).toContain('ROLLBACK');
    expect(world.employee(EMP)).toMatchObject({ jobLevelId: LEVEL_A, nextReviewDueDate: '2026-07-15' });
    expect(world.auditLog).toHaveLength(0);
  });

  it('TC38: PATCH /employees ignores client-sent schedule and legacy cadence fields', async () => {
    const controller = new EmployeeController(
      employeeRepoFor(world),
      undefined,
      undefined,
      world.pool,
      undefined,
      undefined,
      employeeCadence
    );
    const req = {
      params: { employeeId: EMP },
      body: {
        full_name: 'Test Employee',
        next_review_due_date: '2030-01-01',
        last_evaluation_completed_at: '2029-01-01T00:00:00Z',
        review_cadence: 'MONTHLY',
        review_cadence_months: 1,
      },
      actor: hrActor,
    } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), locals: {} } as unknown as Response;

    await controller.updateEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(world.employee(EMP)).toMatchObject({ nextReviewDueDate: '2026-07-15', lastEvaluationCompletedAt: BASE });
  });

  it('PATCH /employees treats an empty manager_id from the form as "no manager" instead of an invalid uuid', async () => {
    const repo = employeeRepoFor(world);
    const cadenceService = new EmployeeCadenceService(world.pool, world.auditService, world.scheduleService, repo, cadenceRepoFor(world));
    const controller = new EmployeeController(repo, undefined, undefined, world.pool, undefined, undefined, cadenceService);
    const req = {
      params: { employeeId: EMP },
      body: { full_name: 'Test Employee', manager_id: '', team_id: '', department_id: '', job_level_id: '' },
      actor: hrActor,
    } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), locals: {} } as unknown as Response;

    await controller.updateEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const saved = vi.mocked(repo.update).mock.calls[0]![0];
    expect(saved.managerId).toBeNull();
    expect(saved.jobLevelId).toBe(LEVEL_A);
  });

  // ── Job-level default cadence ───────────────────────────────────────────

  it('TC42: job-level default 6m→3m recalculates employees without override; override employees unchanged', async () => {
    const followers = [uuid(311), uuid(312), uuid(313)];
    for (const id of followers) {
      world.addEmployee({ employeeId: id, jobLevelId: LEVEL_A, lastEvaluationCompletedAt: BASE, nextReviewDueDate: '2026-07-15' });
    }
    const overridden = uuid(314);
    world.addEmployee({ employeeId: overridden, jobLevelId: LEVEL_A, overrideId: C12, lastEvaluationCompletedAt: BASE, nextReviewDueDate: '2027-01-15' });

    await organization.updateJobLevel(LEVEL_A, { name: LEVEL_A, rank: 1, active: true, defaultReviewCadenceId: C3 }, hrActor);

    for (const id of [EMP, ...followers]) {
      expect(world.employee(id).nextReviewDueDate).toBe('2026-04-15');
    }
    expect(world.employee(overridden).nextReviewDueDate).toBe('2027-01-15');
    expect(world.auditLog.find((a) => a.entityType === 'JOB_LEVEL')).toMatchObject({
      fieldName: 'default_review_cadence_id',
      oldValue: C6,
      newValue: C3,
      performedBy: HR_USER_ID,
    });
    expect(world.auditOf('SCHEDULE_RECALC')).toHaveLength(4);
    expect(world.scheduleRepo.calls.lockByJobLevelWithoutOverride).toBe(1);
    expect(world.scheduleRepo.calls.savedRowsPerCall).toEqual([4]);
  });

  it('TC43: renaming a job level does not recalculate anything', async () => {
    await organization.updateJobLevel(LEVEL_A, { name: 'Renamed', rank: 1, active: true }, hrActor);

    expect(world.scheduleRepo.calls.lockByJobLevelWithoutOverride).toBe(0);
    expect(world.employee(EMP).nextReviewDueDate).toBe('2026-07-15');
  });

  it('TC44: a MANAGER cannot change a job-level default cadence', async () => {
    await expect(
      organization.updateJobLevel(LEVEL_A, { name: LEVEL_A, rank: 1, active: true, defaultReviewCadenceId: C3 }, managerActor)
    ).rejects.toMatchObject({ status: 403 });
    expect(world.store.jobLevels.get(LEVEL_A)!.defaultReviewCadenceId).toBe(C6);
  });

  // ── Review cadence edits ────────────────────────────────────────────────

  it('TC45: interval 6→9 on the effective cadence recalculates from the last completion, not the edit date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T02:00:00Z'));

    await reviewCadences.updateCadence(hrActor, C6, { intervalMonths: 9 });

    expect(world.employee(EMP).nextReviewDueDate).toBe('2026-10-15');
    expect(world.employee(EMP).lastEvaluationCompletedAt).toEqual(BASE);
    expect(world.auditLog.find((a) => a.entityType === 'REVIEW_CADENCE')?.action).toBe('UPDATE');
    expect(world.auditOf('SCHEDULE_RECALC', EMP)).toHaveLength(1);
    expect(world.queries.indexOf('schedule:lockByCadence')).toBeLessThan(world.queries.indexOf('cadence:update'));
  });

  it('TC46: deactivating an override cadence falls back to the job-level default', async () => {
    world.employee(EMP).overrideId = C12;
    world.employee(EMP).nextReviewDueDate = '2027-01-15';
    world.store.jobLevels.get(LEVEL_A)!.defaultReviewCadenceId = C9;

    await reviewCadences.updateCadence(hrActor, C12, { active: false });

    expect(world.employee(EMP).nextReviewDueDate).toBe('2026-10-15');
  });

  it('TC47: changing the system default only affects employees without override and without job-level default', async () => {
    world.store.jobLevels.get(LEVEL_A)!.defaultReviewCadenceId = null;
    const withJobDefault = uuid(321);
    world.addEmployee({ employeeId: withJobDefault, jobLevelId: LEVEL_B, lastEvaluationCompletedAt: BASE, nextReviewDueDate: '2026-04-15' });

    await reviewCadences.updateCadence(hrActor, C6, { isSystemDefault: false });
    await reviewCadences.updateCadence(hrActor, C12, { isSystemDefault: true });

    expect(world.employee(EMP).nextReviewDueDate).toBe('2027-01-15');
    expect(world.employee(withJobDefault).nextReviewDueDate).toBe('2026-04-15');
  });

  it('TC48: deleting a referenced cadence is still rejected with CADENCE_IN_USE', async () => {
    await expect(reviewCadences.deleteCadence(hrActor, C6)).rejects.toMatchObject({ status: 409, code: 'CADENCE_IN_USE' });
  });

  it('TC49: renaming a cadence does not recalculate', async () => {
    await reviewCadences.updateCadence(hrActor, C6, { name: 'Half-yearly' });

    expect(world.scheduleRepo.calls.lockByCadence).toBe(0);
    expect(world.employee(EMP).nextReviewDueDate).toBe('2026-07-15');
  });

  it('TC50: a recalculation failure rolls back the cadence edit', async () => {
    world.failAt = 'saveSchedules';

    await expect(reviewCadences.updateCadence(hrActor, C6, { intervalMonths: 9 })).rejects.toThrow('INJECTED_FAILURE:saveSchedules');

    expect(world.queries).toContain('ROLLBACK');
    expect(world.store.cadences.get(C6)!.intervalMonths).toBe(6);
    expect(world.employee(EMP).nextReviewDueDate).toBe('2026-07-15');
    expect(world.auditLog).toHaveLength(0);
  });
});

describe('Employee repository no longer writes schedule or legacy cadence columns (TC38/TC39)', () => {
  function recordingExecutor(row: Record<string, unknown>) {
    const calls: string[] = [];
    return {
      calls,
      executor: {
        query: async <R extends Record<string, unknown>>(sql: string): Promise<QueryResultLike<R>> => {
          calls.push(sql.replace(/\s+/g, ' '));
          return { rows: [row as R] };
        },
      },
    };
  }

  const row = {
    employee_id: EMP,
    employee_code: 'E-1',
    full_name: 'Test Employee',
    email: 'test@example.com',
    department_id: null,
    team_id: null,
    role_id: uuid(700),
    job_level_id: LEVEL_A,
    manager_id: null,
    employment_status: 'ACTIVE',
    join_date: '2024-01-01',
    termination_date: null,
    version: 1,
    last_evaluation_completed_at: null,
    next_review_due_date: null,
  };

  it('TC39: create inserts no schedule / legacy cadence columns (base and due stay NULL)', async () => {
    const { calls, executor } = recordingExecutor(row);
    const repo = new PostgresEmployeeRepository({} as never);
    const employee = toEmployee({ employeeId: EMP, jobLevelId: LEVEL_A, overrideId: null, lastEvaluationCompletedAt: null, nextReviewDueDate: null, version: 1 });
    await repo.create({ ...employee, nextReviewDueDate: '2030-01-01' }, executor);

    const insertColumns = calls[0]!.slice(0, calls[0]!.indexOf('VALUES'));
    expect(insertColumns).not.toMatch(/next_review_due_date|last_evaluation_completed_at|review_cadence_months|review_cadence,/);
  });

  it('TC38: update sets no schedule / legacy cadence columns', async () => {
    const { calls, executor } = recordingExecutor(row);
    const repo = new PostgresEmployeeRepository({} as never);
    const employee = toEmployee({ employeeId: EMP, jobLevelId: LEVEL_A, overrideId: null, lastEvaluationCompletedAt: null, nextReviewDueDate: null, version: 1 });
    await repo.update({ ...employee, nextReviewDueDate: '2030-01-01' }, executor);

    const setClause = calls[0]!.slice(calls[0]!.indexOf('SET'), calls[0]!.indexOf('WHERE'));
    expect(setClause).not.toMatch(/next_review_due_date|last_evaluation_completed_at|review_cadence/);
  });
});
