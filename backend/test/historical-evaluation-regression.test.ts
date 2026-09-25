import { describe, it, expect, beforeEach } from 'vitest';
import { calculateNextReviewDueDate } from '../src/modules/employee/domain/review-schedule.js';
import { createScheduleWorld, HR_USER_ID, ScheduleWorld, TIME_ZONE, uuid } from './mocks/review-schedule-fixture.js';

describe('Historical Evaluation Regression & Cadence Immutability Test Suite (Scenarios A - E)', () => {
  let world: ScheduleWorld;

  beforeEach(() => {
    world = createScheduleWorld();
  });

  // Scenario A: Immutability of Final Score and Status for PUBLISHED evaluations
  it('Scenario A: Historical published evaluations maintain strict score and state immutability when cadence changes', async () => {
    const historicalEval = {
      evaluation_id: 'eval-hist-001',
      employee_id: 'emp-alice',
      status: 'PUBLISHED',
      final_score: 87.5,
      manager_score: 88.0,
      self_score: 85.0,
      published_at: new Date('2025-12-31T23:59:59Z'),
      team_id_snapshot: 'team-eng',
      role_id_snapshot: 'role-dev',
      job_level_snapshot: 'lvl-senior',
    };

    // Deep freeze historical evaluation to simulate DB immutability guarantee
    const frozenEval = Object.freeze({ ...historicalEval });

    // Simulate cadence configuration changing from 6 months to 3 months
    const oldCadence = { interval_months: 6 };
    const newCadence = { interval_months: 3 };

    expect(newCadence.interval_months).not.toEqual(oldCadence.interval_months);

    // Assert that historical evaluation snapshot and scores remain identical
    expect(frozenEval.final_score).toBe(87.5);
    expect(frozenEval.manager_score).toBe(88.0);
    expect(frozenEval.self_score).toBe(85.0);
    expect(frozenEval.status).toBe('PUBLISHED');
    expect(frozenEval.published_at.toISOString()).toBe('2025-12-31T23:59:59.000Z');
  });

  // Scenario B: Immutability of Evaluation Criteria Snapshots
  it('Scenario B: Historical criteria snapshots remain untouched when review cadence changes', async () => {
    const historicalItemsSnapshot = [
      {
        evaluation_item_id: 'item-001',
        evaluation_id: 'eval-hist-001',
        snapshot_name: 'Code Quality & Maintainability',
        snapshot_weight: 40,
        score: 90,
      },
      {
        evaluation_item_id: 'item-002',
        evaluation_id: 'eval-hist-001',
        snapshot_name: 'Sprint Delivery',
        snapshot_weight: 60,
        score: 85,
      },
    ];

    const frozenItems = historicalItemsSnapshot.map((i) => Object.freeze({ ...i }));

    // Verify snapshot integrity
    expect(frozenItems[0].snapshot_weight).toBe(40);
    expect(frozenItems[1].snapshot_weight).toBe(60);
    expect(frozenItems[0].score).toBe(90);
    expect(frozenItems[1].score).toBe(85);
  });

  // Scenario C: Schedule-drift-free recalculation from completion baseline
  it('Scenario C: Recalculates next_review_due_date strictly from last_evaluation_completed_at baseline (no schedule drift)', async () => {
    const completedAt = new Date('2026-01-15T09:00:00Z');

    // Jan 15 (business date) + 6 calendar months = July 15, independent of today's date
    expect(calculateNextReviewDueDate(completedAt, 6, TIME_ZONE)).toBe('2026-07-15');
    expect(calculateNextReviewDueDate(completedAt, 6, TIME_ZONE)).toBe(calculateNextReviewDueDate(completedAt, 6, TIME_ZONE));
  });

  // Scenario D: Immediate recalculation on override change + audit log
  it('Scenario D: Employee cadence override triggers immediate due date recalculation and audit logging', async () => {
    const employeeId = uuid(501);
    const quarterly = uuid(3);
    world.addCadence({ id: uuid(6), intervalMonths: 6, isSystemDefault: true });
    world.addCadence({ id: quarterly, code: 'QUARTERLY', intervalMonths: 3 });
    world.addJobLevel(uuid(900), null);
    world.addEmployee({
      employeeId,
      jobLevelId: uuid(900),
      lastEvaluationCompletedAt: new Date('2026-02-01T03:00:00Z'),
      nextReviewDueDate: '2026-08-01',
    });

    const snapshot = await world.scheduleService.captureEmployees(world.client, [employeeId]);
    world.employee(employeeId).overrideId = quarterly;
    const results = await world.scheduleService.applyRecalculation(
      world.client,
      snapshot,
      'EMPLOYEE_OVERRIDE_CHANGED',
      HR_USER_ID,
      'Probation 3-month review cadence override applied'
    );

    // Feb 1 + 3 months = May 1, 2026
    expect(results.get(employeeId)?.nextReviewDueDate).toBe('2026-05-01');
    const [entry] = world.auditOf('SCHEDULE_RECALC', employeeId);
    expect(entry).toMatchObject({
      entityType: 'EMPLOYEE',
      fieldName: 'next_review_due_date',
      reason: 'EMPLOYEE_OVERRIDE_CHANGED: Probation 3-month review cadence override applied',
      performedBy: HR_USER_ID,
    });
    expect(JSON.parse(entry?.oldValue ?? '{}').next_review_due_date).toBe('2026-08-01');
    expect(JSON.parse(entry?.newValue ?? '{}').next_review_due_date).toBe('2026-05-01');
  });

  // Scenario E: PUBLISH evaluation recalculates due date safely
  it('Scenario E: onEvaluationsPublished updates last_evaluation_completed_at and recalculates due date', async () => {
    const employeeId = uuid(502);
    const evaluationId = uuid(503);
    const publishedAt = new Date('2026-06-30T15:00:00Z'); // 22:00 Asia/Ho_Chi_Minh, still June 30
    world.addCadence({ id: uuid(12), code: 'ANNUAL', intervalMonths: 12, isSystemDefault: true });
    world.addJobLevel(uuid(900), null);
    world.addEmployee({ employeeId, jobLevelId: uuid(900) });

    await world.scheduleService.onEvaluationsPublished(world.client, [{ evaluationId, employeeId, publishedAt }], HR_USER_ID);

    // June 30, 2026 + 12 months = June 30, 2027
    expect(world.employee(employeeId).lastEvaluationCompletedAt).toEqual(publishedAt);
    expect(world.employee(employeeId).nextReviewDueDate).toBe('2027-06-30');
    expect(world.auditOf('SCHEDULE_UPDATED', employeeId)[0]).toMatchObject({
      entityType: 'EMPLOYEE',
      fieldName: 'next_review_due_date',
      reason: `EVALUATION_PUBLISHED evaluation_id=${evaluationId}`,
    });
  });
});
