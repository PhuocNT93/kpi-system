/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { ReviewDueService } from '../src/modules/review-cadence/application/review-due.service.js';
import { ReviewDueScheduler } from '../src/modules/review-cadence/application/review-due-scheduler.js';
import { EvaluationCycleService } from '../src/modules/evaluation-cycle/application/evaluation-cycle.service.js';
import { EvaluationCycleStatus } from '../src/modules/evaluation-cycle/domain/evaluation-cycle.types.js';
import type { Actor } from '../src/shared/auth/types.js';

describe('Review Due Scheduling & RBAC Integration Suite', () => {
  let mockPool: Pool;
  let reviewDueService: ReviewDueService;
  let cycleService: EvaluationCycleService;

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
    cycleService = new EvaluationCycleService(
      mockPool,
      {} as any,
      {} as any,
      {} as any
    );
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

  describe('4. Individual Evaluation Creation & Conflict / Warning Handling', () => {
    it('prevents Manager from triggering evaluations outside managed teams', async () => {
      // Mock employee lookup returning an employee from team-beta (not managed by manager)
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 'tpl-v1',
            status: 'PUBLISHED',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            employee_id: 'emp-other-team',
            employee_code: 'EMP-999',
            full_name: 'Bob Other',
            team_id: 'team-beta-002', // Not in managerActor.managedTeamIds
            role_id: 'role-dev',
            employment_status: 'ACTIVE',
          },
        ],
      });

      const mockOpeningService = {
        openCycle: vi.fn().mockResolvedValue({ evaluationCycleId: 'cycle-ind-001', status: 'OPEN' }),
      } as any;

      const result = await cycleService.createIndividualCycles(
        managerActor,
        {
          employee_ids: ['emp-other-team'],
        },
        mockOpeningService
      );

      expect(result.created).toHaveLength(0);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].code).toBe('UNAUTHORIZED_TEAM');
    });

    it('returns BATCH_CYCLE_UPCOMING soft warning when upcoming batch cycle exists within lead time', async () => {
      const empId = 'emp-charlie';

      (mockPool.query as any)
        // 1. Template lookup
        .mockResolvedValueOnce({
          rows: [{ id: 'tpl-v1', status: 'PUBLISHED' }],
        })
        // 2. Employee lookup
        .mockResolvedValueOnce({
          rows: [
            {
              employee_id: empId,
              employee_code: 'EMP-CHA',
              full_name: 'Charlie Employee',
              team_id: 'team-alpha-001',
              role_id: 'role-dev',
              employment_status: 'ACTIVE',
            },
          ],
        })
        // 3. No open evaluation
        .mockResolvedValueOnce({ rows: [] })
        // 4. Upcoming batch cycle found!
        .mockResolvedValueOnce({
          rows: [
            {
              evaluation_cycle_id: 'cycle-batch-2026',
              code: 'CYC-2026-Q3-ALL',
              name: 'Company Q3 Evaluation Cycle',
              start_date: '2026-10-01',
            },
          ],
        })
        // 5. Query for evaluation row created after open
        .mockResolvedValueOnce({
          rows: [{ evaluation_id: 'eval-ind-001' }],
        });

      // Mock createCycle and opening
      vi.spyOn(cycleService, 'createCycle').mockResolvedValueOnce({
        evaluationCycleId: 'cycle-ind-001',
        code: 'IND-EMP-CHA-1',
        name: 'Individual Review - Charlie Employee',
        status: EvaluationCycleStatus.DRAFT,
        startDate: '2026-09-24',
        endDate: '2026-10-24',
        evaluationTemplateVersionId: 'tpl-v1',
        applicableTeamIds: ['team-alpha-001'],
        applicableRoleIds: ['role-dev'],
        applicableEmployeeIds: [empId],
        approvedBy: null,
        lockedAt: null,
        calibrationEnabled: false,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const mockOpeningService = {
        openCycle: vi.fn().mockResolvedValue({ evaluationCycleId: 'cycle-ind-001', status: 'OPEN' }),
      } as any;

      const result = await cycleService.createIndividualCycles(
        managerActor,
        {
          employee_ids: [empId],
        },
        mockOpeningService
      );

      // Should succeed in creation
      expect(result.created).toHaveLength(1);
      expect(result.created[0].employee_id).toBe(empId);

      // And should also return soft warning for user awareness
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].warning.code).toBe('BATCH_CYCLE_UPCOMING');
      expect(result.warnings[0].warning.cycle_code).toBe('CYC-2026-Q3-ALL');
    });

    it('rejects creation when employee already has an active evaluation (EVALUATION_ALREADY_OPEN)', async () => {
      const empId = 'emp-busy';

      (mockPool.query as any)
        // 1. Template
        .mockResolvedValueOnce({
          rows: [{ id: 'tpl-v1', status: 'PUBLISHED' }],
        })
        // 2. Employee
        .mockResolvedValueOnce({
          rows: [
            {
              employee_id: empId,
              employee_code: 'EMP-BSY',
              full_name: 'Busy Employee',
              team_id: 'team-alpha-001',
              role_id: 'role-dev',
              employment_status: 'ACTIVE',
            },
          ],
        })
        // 3. Open evaluation exists!
        .mockResolvedValueOnce({
          rows: [{ evaluation_id: 'eval-existing', status: 'IN_PROGRESS' }],
        });

      const mockOpeningService = {
        openCycle: vi.fn().mockResolvedValue({ evaluationCycleId: 'cycle-ind-001', status: 'OPEN' }),
      } as any;

      const result = await cycleService.createIndividualCycles(
        managerActor,
        {
          employee_ids: [empId],
        },
        mockOpeningService
      );

      expect(result.created).toHaveLength(0);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].code).toBe('EVALUATION_ALREADY_OPEN');
    });
  });
});
