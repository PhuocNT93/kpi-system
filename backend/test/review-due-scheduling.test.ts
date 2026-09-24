/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { ReviewDueService } from '../src/modules/review-cadence/application/review-due.service.js';
import { ReviewDueScheduler } from '../src/modules/review-cadence/application/review-due-scheduler.js';
import type { Actor } from '../src/shared/auth/types.js';

describe('Review Due Scheduling & RBAC Integration Suite', () => {
  let mockPool: Pool;
  let reviewDueService: ReviewDueService;

  const hrAdmin: Actor = {
    userId: '11111111-1111-1111-1111-111111111111',
    role: 'HR_ADMIN',
  };

  const managerActor: Actor = {
    userId: '22222222-2222-2222-2222-222222222222',
    role: 'MANAGER',
    managedTeamIds: ['team-alpha-001'],
  };

  const employeeActor: Actor = {
    userId: '33333333-3333-3333-3333-333333333333',
    role: 'EMPLOYEE',
  };

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      }),
    } as unknown as Pool;

    reviewDueService = new ReviewDueService(mockPool);
  });

  describe('1. Review Due Scheduled Job', () => {
    it('executes scheduled job daily and refreshes states without auto-creating evaluations', async () => {
      // Mock employee rows needing due date recalculation
      (mockPool.query as any)
        .mockResolvedValueOnce({
          rows: [{ total: '2' }],
        })
        .mockResolvedValue({ rows: [] });

      const scheduler = new ReviewDueScheduler(reviewDueService);
      const refreshResult = await scheduler.triggerNow();

      expect(refreshResult.processedCount).toBe(2);

      // Verify NO evaluation records were created (only employee table touched)
      const queryCalls = (mockPool.query as any).mock.calls.map((c: any) => c[0]);
      const hasInsertIntoEvaluation = queryCalls.some((q: string) =>
        typeof q === 'string' && q.toUpperCase().includes('INSERT INTO EVALUATION ')
      );
      expect(hasInsertIntoEvaluation).toBe(false);
    });

    it('scheduler triggerNow delegates to reviewDueService', async () => {
      const mockResult = { processedCount: 5, timestamp: new Date() };
      vi.spyOn(reviewDueService, 'refreshReviewDueState').mockResolvedValueOnce(mockResult);

      const scheduler = new ReviewDueScheduler(reviewDueService);
      const res = await scheduler.triggerNow();
      expect(res.processedCount).toBe(5);
    });
  });

  describe('2. Active-only Filter & Inactive/Terminated Exclusion', () => {
    it('excludes INACTIVE and TERMINATED employees from review due queries', async () => {
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [
          {
            employee_id: 'emp-active',
            employee_code: 'EMP-001',
            employee_name: 'Active Employee',
            team_id: 'team-alpha-001',
            team_name: 'Alpha Team',
            job_level_id: 'lvl-1',
            job_level_name: 'Senior',
            last_evaluation_completed_at: null,
            next_review_due_date: '2026-09-01',
            cadence_id: 'cad-1',
            cadence_code: 'QUARTERLY',
            cadence_name: 'Quarterly',
            interval_months: 3,
            is_system_default: true,
            cadence_source: 'SYSTEM_DEFAULT',
            total_count: 1,
          },
        ],
      });

      const result = await reviewDueService.getReviewsDue(hrAdmin, {
        status: 'ALL',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].employee_name).toBe('Active Employee');

      // Verify the query strictly filtered by employment_status NOT IN ('INACTIVE', 'TERMINATED')
      const executedQuery = (mockPool.query as any).mock.calls[0][0];
      expect(executedQuery).toContain("e.employment_status NOT IN ('INACTIVE', 'TERMINATED')");
    });
  });

  describe('3. RBAC Scoping for Review Due Dashboard', () => {
    it('HR Admin has global scope across all teams and departments', async () => {
      (mockPool.query as any).mockResolvedValueOnce({ rows: [] });

      await reviewDueService.getReviewsDue(hrAdmin, {});

      const executedQuery = (mockPool.query as any).mock.calls[0][0];
      const queryParams = (mockPool.query as any).mock.calls[0][1];

      // HR Admin does not have managedTeamIds restriction
      expect(executedQuery).not.toContain('e.team_id = ANY');
      expect(queryParams).not.toContain(hrAdmin.userId);
    });

    it('Manager is strictly scoped to managedTeamIds', async () => {
      (mockPool.query as any).mockResolvedValueOnce({ rows: [] });

      await reviewDueService.getReviewsDue(managerActor, {});

      const executedQuery = (mockPool.query as any).mock.calls[0][0];
      const queryParams = (mockPool.query as any).mock.calls[0][1];

      // Must filter by e.team_id = ANY($n)
      expect(executedQuery).toContain('e.team_id = ANY(');
      expect(queryParams).toContain(managerActor.managedTeamIds);
    });

    it('Manager with empty managedTeamIds gets zero results immediately without query', async () => {
      const managerWithoutTeams: Actor = {
        userId: 'mgr-no-teams',
        role: 'MANAGER',
        managedTeamIds: [],
      };

      const result = await reviewDueService.getReviewsDue(managerWithoutTeams, {});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('Rejects non-manager, non-HR roles with Forbidden', async () => {
      await expect(
        reviewDueService.getReviewsDue(employeeActor, {})
      ).rejects.toThrow('You do not have permission to view review due data.');
    });
  });

  // 4. Individual evaluation creation (manager scope, upcoming batch warning, active evaluation
  //    conflict) is covered against the shared EVAL-02 implementation in
  //    test/individual-evaluation-cycle.test.ts (TC-BE-11, TC-BE-05/06, TC-BE-03a/03b).

});
