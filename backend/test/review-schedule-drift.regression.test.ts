/**
 * Regression: next_review_due_date must always be derived from the real last_evaluation_completed_at (LLD §14.1
 * Rule 9). Changing a cadence re-derives from that base — never from the old due date, the change date or today —
 * and only a newly PUBLISHED evaluation moves the base.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EvaluationService } from '../src/modules/evaluation/application/services/evaluation.service.js';
import { Evaluation, EvaluationStatus } from '../src/modules/evaluation/domain/evaluation.types.js';
import { IEvaluationItemRepository, IEvaluationRepository } from '../src/modules/evaluation/domain/repositories.interface.js';
import { EmployeeCadenceService } from '../src/modules/employee/application/employee-cadence.service.js';
import { EmployeeRepository } from '../src/modules/employee/domain/employee.repository.js';
import { ReviewCadenceRepository } from '../src/modules/review-cadence/domain/review-cadence.repository.js';
import { Actor } from '../src/shared/auth/types.js';
import { createScheduleWorld, HR_USER_ID, ScheduleWorld, uuid } from './mocks/review-schedule-fixture.js';

const hrActor: Actor = { userId: HR_USER_ID, role: 'HR_ADMIN' };
const EMP = uuid(401);
const LEVEL = uuid(811);
const C3 = uuid(3);
const C6 = uuid(6);
const C12 = uuid(12);
const EVAL_1 = uuid(5101);
const EVAL_2 = uuid(5102);

describe('Review schedule drift regression', () => {
  let world: ScheduleWorld;
  let evaluations: EvaluationService;
  let employeeCadence: EmployeeCadenceService;

  function addApprovedEvaluation(id: string): void {
    world.store.evaluations.set(id, {
      evaluation_id: id,
      employee_id: EMP,
      evaluation_cycle_id: uuid(6000),
      status: EvaluationStatus.APPROVED,
      is_locked: false,
      published_at: null,
      final_score: 80,
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    world = createScheduleWorld();
    world.addCadence({ id: C3, intervalMonths: 3 });
    world.addCadence({ id: C6, intervalMonths: 6, isSystemDefault: true });
    world.addCadence({ id: C12, intervalMonths: 12 });
    world.addJobLevel(LEVEL, C6);
    world.addEmployee({ employeeId: EMP, jobLevelId: LEVEL });

    const evaluationRepo = {
      findByIdForUpdate: vi.fn(async (id: string) => ({ ...world.store.evaluations.get(id)! }) as unknown as Evaluation),
      update: vi.fn(async (id: string, patch: Partial<Evaluation>) => {
        const row = world.store.evaluations.get(id)!;
        if (patch.status) row.status = patch.status;
        if (patch.published_at) row.published_at = patch.published_at;
        return { ...row } as unknown as Evaluation;
      }),
    };
    evaluations = new EvaluationService(
      evaluationRepo as unknown as IEvaluationRepository,
      {} as unknown as IEvaluationItemRepository,
      world.pool,
      world.auditService,
      undefined,
      undefined,
      undefined,
      world.scheduleService
    );
    const cadenceRepo = {
      findById: vi.fn(async (id: string) => {
        const cadence = world.store.cadences.get(id);
        return cadence ? { ...cadence } : null;
      }),
    };
    employeeCadence = new EmployeeCadenceService(
      world.pool,
      world.auditService,
      world.scheduleService,
      {} as EmployeeRepository,
      cadenceRepo as unknown as ReviewCadenceRepository
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should_recalculate_from_last_completed_date_without_schedule_drift', async () => {
    // (1) Publish #1 on 2026-01-31 (business date, Asia/Ho_Chi_Minh), cadence 6 months.
    vi.setSystemTime(new Date('2026-01-31T03:00:00Z'));
    addApprovedEvaluation(EVAL_1);
    await evaluations.publishEvaluation(EVAL_1, hrActor);

    const firstCompletion = world.employee(EMP).lastEvaluationCompletedAt;
    expect(firstCompletion).toEqual(new Date('2026-01-31T03:00:00Z'));
    expect(world.employee(EMP).nextReviewDueDate).toBe('2026-07-31');

    // (2) HR changes the cadence 6 → 12 months on 2026-05-10, before the due date.
    vi.setSystemTime(new Date('2026-05-10T04:00:00Z'));
    await employeeCadence.updateCadenceOverride(hrActor, EMP, { review_cadence_override_id: C12 });

    const afterChange = world.employee(EMP).nextReviewDueDate;
    expect(afterChange).toBe('2027-01-31'); // original completion + 12 months
    expect(afterChange).not.toBe('2027-07-31'); // old due date + 12 months
    expect(afterChange).not.toBe('2027-05-10'); // cadence change date / today + 12 months
    expect(world.employee(EMP).lastEvaluationCompletedAt).toEqual(firstCompletion); // base untouched

    // (3) Only a newly PUBLISHED evaluation moves the base: publish #2 on 2026-09-15.
    vi.setSystemTime(new Date('2026-09-15T05:00:00Z'));
    addApprovedEvaluation(EVAL_2);
    await evaluations.publishEvaluation(EVAL_2, hrActor);

    expect(world.employee(EMP).lastEvaluationCompletedAt).toEqual(new Date('2026-09-15T05:00:00Z'));
    expect(world.employee(EMP).nextReviewDueDate).toBe('2027-09-15'); // #2 completion + effective 12 months

    const updates = world.auditOf('SCHEDULE_UPDATED', EMP).map((a) => JSON.parse(a.newValue ?? '{}'));
    expect(updates.map((u) => u.evaluation_id)).toEqual([EVAL_1, EVAL_2]);
  });

  it('TC52: repeated cadence changes never drift — each due date is base + current interval', async () => {
    vi.setSystemTime(new Date('2026-01-31T03:00:00Z'));
    addApprovedEvaluation(EVAL_1);
    await evaluations.publishEvaluation(EVAL_1, hrActor);

    const steps: Array<[string | null, string]> = [
      [C3, '2026-04-30'],
      [C12, '2027-01-31'],
      [null, '2026-07-31'], // back to the job-level default (6 months)
    ];
    let day = 1;
    for (const [overrideId, expectedDue] of steps) {
      vi.setSystemTime(new Date(`2026-03-${String(day).padStart(2, '0')}T03:00:00Z`));
      day += 7;
      await employeeCadence.updateCadenceOverride(hrActor, EMP, { review_cadence_override_id: overrideId });
      expect(world.employee(EMP).nextReviewDueDate).toBe(expectedDue);
      expect(world.employee(EMP).lastEvaluationCompletedAt).toEqual(new Date('2026-01-31T03:00:00Z'));
    }
  });
});
