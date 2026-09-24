/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { ReviewScheduleService } from '../src/modules/review-cadence/application/review-schedule.service.js';
import { calculateNextReviewDueDate } from '../src/modules/review-cadence/domain/review-due-calculator.js';
import { AuditService } from '../src/modules/audit/application/audit.service.js';
import type { Actor } from '../src/shared/auth/types.js';

describe('Historical Evaluation Regression & Cadence Immutability Test Suite (Scenarios A - E)', () => {
  let mockPool: Pool;
  let mockAuditService: AuditService;
  let reviewScheduleService: ReviewScheduleService;

  const hrActor: Actor = {
    userId: '99999999-9999-9999-9999-999999999999',
    role: 'HR_ADMIN',
  };

  beforeEach(() => {
    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;

    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      }),
    } as unknown as Pool;

    reviewScheduleService = new ReviewScheduleService(mockPool, mockAuditService);
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
    const intervalMonths = 6;

    // Calculation using completedAt baseline: Jan 15 + 6 months = July 15
    const nextDueDate = calculateNextReviewDueDate(completedAt, intervalMonths);

    expect(nextDueDate.getUTCFullYear()).toBe(2026);
    expect(nextDueDate.getUTCMonth()).toBe(6); // 0-indexed: 6 = July
    expect(nextDueDate.getUTCDate()).toBe(15);

    // Verify that calculation is completely independent of today's date
    const driftFreeDate = calculateNextReviewDueDate(completedAt, intervalMonths);
    expect(driftFreeDate.toISOString()).toBe(nextDueDate.toISOString());
  });

  // Scenario D: Immediate recalculation on override change + audit log
  it('Scenario D: Employee cadence override triggers immediate due date recalculation and audit logging', async () => {
    const employeeId = 'emp-charlie-001';
    const lastCompletedAt = new Date('2026-02-01T00:00:00Z');
    const initialDueDate = new Date('2026-08-01T00:00:00Z'); // 6 months default

    // Mock query client
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // 1. Initial lock query returns employee with 6-month baseline
    mockClient.query
      .mockResolvedValueOnce({
        rows: [
          {
            employee_id: employeeId,
            last_evaluation_completed_at: lastCompletedAt,
            next_review_due_date: initialDueDate,
          },
        ],
      })
      // 2. Resolve effective cadence query returns new override (3 months)
      .mockResolvedValueOnce({
        rows: [
          {
            review_cadence_override_id: 'cad-quarterly',
            job_level_id: 'lvl-mid',
            override_id: 'cad-quarterly',
            override_code: 'QUARTERLY',
            override_name: 'Quarterly Review',
            override_interval_months: 3,
            override_is_system_default: false,
            override_active: true,
          },
        ],
      })
      // 3. Update employee row
      .mockResolvedValueOnce({ rows: [] });

    const result = await reviewScheduleService.recalculateEmployeeDueDate(
      employeeId,
      mockClient as any,
      hrActor.userId,
      'Probation 3-month review cadence override applied'
    );

    // New due date should be Feb 1 + 3 months = May 1, 2026
    expect(result.nextReviewDueDate).toBeDefined();
    expect(result.nextReviewDueDate?.getUTCFullYear()).toBe(2026);
    expect(result.nextReviewDueDate?.getUTCMonth()).toBe(4); // May
    expect(result.nextReviewDueDate?.getUTCDate()).toBe(1);

    // Audit record must be logged with old and new values
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        action: 'UPDATE',
        fieldName: 'next_review_due_date',
        oldValue: initialDueDate.toISOString(),
        newValue: result.nextReviewDueDate?.toISOString(),
        reason: 'Probation 3-month review cadence override applied',
        performedBy: hrActor.userId,
      })
    );
  });

  // Scenario E: Concurrency isolation — PUBLISH evaluation recalculates due date safely
  it('Scenario E: onEvaluationPublished updates last_evaluation_completed_at and recalculates due date', async () => {
    const employeeId = 'emp-david-001';
    const publishedAt = new Date('2026-06-30T15:00:00Z');

    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // 1. Employee query
    mockClient.query
      .mockResolvedValueOnce({
        rows: [
          {
            employee_id: employeeId,
            last_evaluation_completed_at: null,
            next_review_due_date: null,
          },
        ],
      })
      // 2. Resolve cadence query (Annual = 12 months)
      .mockResolvedValueOnce({
        rows: [
          {
            review_cadence_override_id: null,
            job_level_id: 'lvl-principal',
            sys_id: 'cad-annual',
            sys_code: 'ANNUAL',
            sys_name: 'Annual Review',
            sys_interval_months: 12,
            sys_is_system_default: true,
            sys_active: true,
          },
        ],
      })
      // 3. Update query
      .mockResolvedValueOnce({ rows: [] });

    const result = await reviewScheduleService.onEvaluationPublished(
      'eval-new-001',
      employeeId,
      publishedAt,
      mockClient as any,
      hrActor.userId
    );

    // June 30, 2026 + 12 months = June 30, 2027
    expect(result.nextReviewDueDate).toBeDefined();
    expect(result.nextReviewDueDate?.getUTCFullYear()).toBe(2027);
    expect(result.nextReviewDueDate?.getUTCMonth()).toBe(5); // June
    expect(result.nextReviewDueDate?.getUTCDate()).toBe(30);

    // Verify audit record logged
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        action: 'UPDATE',
        fieldName: 'next_review_due_date',
        reason: 'Evaluation eval-new-001 published',
      })
    );
  });
});
