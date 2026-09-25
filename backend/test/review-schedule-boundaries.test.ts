/**
 * Boundaries of the single schedule owner: other modules can no longer write the schedule (Jira collector),
 * read models expose the effective cadence source, and historical evaluations are never touched.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Request, Response } from 'express';
import { JiraCrawlerController } from '../src/modules/jira-crawler/jira-crawler.controller.js';
import { ReviewDueService } from '../src/modules/review-cadence/application/review-due.service.js';
import { EmployeeController } from '../src/modules/employee/api/employee.controller.js';
import { EmployeeCadenceService } from '../src/modules/employee/application/employee-cadence.service.js';
import { EmployeeRepository } from '../src/modules/employee/domain/employee.repository.js';
import { Employee, EmploymentStatus } from '../src/modules/employee/domain/employee.domain.js';
import { ReviewCadenceRepository } from '../src/modules/review-cadence/domain/review-cadence.repository.js';
import { Actor } from '../src/shared/auth/types.js';
import { createScheduleWorld, HR_USER_ID, uuid } from './mocks/review-schedule-fixture.js';

const hrActor: Actor = { userId: HR_USER_ID, role: 'HR_ADMIN' };

function mockResponse() {
  const res = { status: vi.fn(), json: vi.fn(), locals: {} };
  res.status.mockReturnValue(res);
  return res;
}

function jsonBody(res: ReturnType<typeof mockResponse>): Record<string, unknown> {
  return res.json.mock.calls[0]?.[0] as Record<string, unknown>;
}

describe('Jira collector cannot write the review schedule', () => {
  function jiraClient() {
    const queries: string[] = [];
    const query = vi.fn(async (sql: string) => {
      queries.push(sql.replace(/\s+/g, ' ').trim());
      if (sql.includes('FROM employee WHERE employee_code')) {
        return { rows: [{ employee_id: uuid(1), full_name: 'Jira Member', review_cadence: null }] };
      }
      if (sql.includes('FROM evaluation_cycle WHERE code')) {
        return { rows: [{ evaluation_cycle_id: uuid(2), status: 'OPEN' }] };
      }
      if (sql.includes('FROM evaluation WHERE evaluation_cycle_id')) {
        return { rows: [{ evaluation_id: uuid(3), status: 'IN_PROGRESS' }] };
      }
      if (sql.startsWith('UPDATE employee SET')) {
        return { rows: [{ employee_code: 'E-1', full_name: 'Jira Member', next_review_due_date: null, blueprint_username: 'jm' }] };
      }
      return { rows: [] };
    });
    const client = { query, release: vi.fn() };
    const pool = { connect: vi.fn(async () => client), query } as unknown as Pool;
    return { queries, pool };
  }

  it('TC53: markReviewed no longer updates last_evaluation_completed_at / next_review_due_date', async () => {
    const { queries, pool } = jiraClient();
    const controller = new JiraCrawlerController(pool);
    const res = mockResponse();

    await controller.applyMemberKpis(
      { body: { employeeCode: 'E-1', records: [{ kpi_code: 'KPI-1' }], markReviewed: true } } as unknown as Request,
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(jsonBody(res)['data']).toMatchObject({ reviewMarked: true });
    expect(queries.some((q) => /last_evaluation_completed_at|next_review_due_date/.test(q))).toBe(false);
    expect(queries).toContain('COMMIT');
  });

  it('TC54: PATCH …/cadence with schedule fields is rejected with 422 REVIEW_SCHEDULE_READ_ONLY', async () => {
    const { queries, pool } = jiraClient();
    const controller = new JiraCrawlerController(pool);

    for (const body of [{ nextReviewDueDate: '2030-01-01' }, { reviewCadenceMonths: 3 }]) {
      const res = mockResponse();
      await controller.updateMemberCadence({ params: { code: 'E-1' }, body } as unknown as Request, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(422);
      expect((jsonBody(res)['meta'] as { error: { code: string } }).error.code).toBe('REVIEW_SCHEDULE_READ_ONLY');
    }
    expect(queries).toEqual([]);
  });

  it('TC55: PATCH …/cadence still updates the blueprint username only', async () => {
    const { queries, pool } = jiraClient();
    const controller = new JiraCrawlerController(pool);
    const res = mockResponse();

    await controller.updateMemberCadence(
      { params: { code: 'E-1' }, body: { blueprintUsername: 'jm' } } as unknown as Request,
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatch(/^UPDATE employee SET blueprint_username = \$1 WHERE employee_code = \$2/);
  });
});

describe('Read models expose the effective cadence source', () => {
  it('TC56: GET /reviews/due returns effective_cadence.source and a YYYY-MM-DD due date', async () => {
    const baseRow = {
      employee_code: 'E',
      employee_name: 'Name',
      team_id: uuid(50),
      team_name: 'Team',
      job_level_id: uuid(60),
      job_level_name: 'Level',
      cadence_code: 'C',
      cadence_name: 'Cadence',
      cadence_interval_months: 6,
      last_evaluation_completed_at: new Date('2026-01-15T03:00:00Z'),
      next_review_due_date: new Date('2026-07-15T00:00:00Z'),
      full_count: '3',
    };
    const rows = [
      { ...baseRow, employee_id: uuid(1), cadence_id: uuid(11), cadence_source: 'EMPLOYEE_OVERRIDE' },
      { ...baseRow, employee_id: uuid(2), cadence_id: uuid(12), cadence_source: 'JOB_LEVEL_DEFAULT' },
      { ...baseRow, employee_id: uuid(3), cadence_id: uuid(13), cadence_source: 'SYSTEM_DEFAULT' },
    ];
    const pool = { query: vi.fn(async () => ({ rows })) } as unknown as Pool;
    const service = new ReviewDueService(pool);

    const result = await service.getReviewsDue(hrActor, { page: 1, pageSize: 20 });

    expect(result.items.map((i) => i.effective_cadence?.source)).toEqual(['EMPLOYEE_OVERRIDE', 'JOB_LEVEL_DEFAULT', 'SYSTEM_DEFAULT']);
    expect(result.items[0]).toMatchObject({ employee_code: 'E', employee_name: 'Name', next_review_due_date: '2026-07-15' });
    const sql = (pool.query as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0])).join('\n');
    expect(sql).toContain("THEN 'JOB_LEVEL_DEFAULT'");
  });

  it('TC57: GET /employees resolves the effective cadence of the whole page in one query', async () => {
    const world = createScheduleWorld();
    const C6 = uuid(6);
    const C12 = uuid(12);
    world.addCadence({ id: C6, intervalMonths: 6, isSystemDefault: true });
    world.addCadence({ id: C12, intervalMonths: 12 });
    world.addJobLevel(uuid(70), null);
    const ids = [uuid(1), uuid(2)];
    world.addEmployee({ employeeId: ids[0]!, jobLevelId: uuid(70), overrideId: C12 });
    world.addEmployee({ employeeId: ids[1]!, jobLevelId: uuid(70) });

    const employees: Employee[] = ids.map((id) => ({
      employeeId: id,
      employeeCode: id.slice(-4),
      fullName: 'N',
      email: 'n@example.com',
      departmentId: null,
      teamId: null,
      roleId: uuid(80),
      jobLevelId: uuid(70),
      managerId: null,
      employmentStatus: EmploymentStatus.ACTIVE,
      joinDate: '2024-01-01',
      version: 1,
    }));
    const employeeRepo = { findMany: vi.fn(async () => ({ employees, total: 2 })) } as unknown as EmployeeRepository;
    const cadenceService = new EmployeeCadenceService(
      world.pool,
      world.auditService,
      world.scheduleService,
      employeeRepo,
      {} as ReviewCadenceRepository
    );
    const controller = new EmployeeController(employeeRepo, undefined, undefined, world.pool, undefined, undefined, cadenceService);
    const res = mockResponse();

    await controller.getEmployees({ query: {} } as unknown as Request, res as unknown as Response);

    const data = jsonBody(res)['data'] as Array<{ id: string; effective_cadence: { id: string; source: string; interval_months: number } }>;
    expect(data.map((d) => d.effective_cadence)).toEqual([
      expect.objectContaining({ id: C12, interval_months: 12, source: 'EMPLOYEE_OVERRIDE' }),
      expect.objectContaining({ id: C6, interval_months: 6, source: 'SYSTEM_DEFAULT' }),
    ]);
    expect(world.scheduleRepo.calls.resolveEffectiveCadences).toBe(1);
  });
});

describe('Historical evaluations are never touched by cadence changes', () => {
  it('TC58: override and job-level changes only write employee schedule rows — no evaluation / evaluation_item writes', async () => {
    const world = createScheduleWorld();
    const C6 = uuid(6);
    const C12 = uuid(12);
    world.addCadence({ id: C6, intervalMonths: 6, isSystemDefault: true });
    world.addCadence({ id: C12, intervalMonths: 12 });
    world.addJobLevel(uuid(70), null);
    const EMP = uuid(1);
    world.addEmployee({ employeeId: EMP, jobLevelId: uuid(70), lastEvaluationCompletedAt: new Date('2026-01-15T03:00:00Z'), nextReviewDueDate: '2026-07-15' });
    const publishedAt = new Date('2026-01-15T03:00:00Z');
    world.store.evaluations.set(uuid(900), {
      evaluation_id: uuid(900),
      employee_id: EMP,
      evaluation_cycle_id: uuid(901),
      status: 'PUBLISHED',
      is_locked: false,
      published_at: publishedAt,
      final_score: 87.5,
    });
    const cadenceService = new EmployeeCadenceService(
      world.pool,
      world.auditService,
      world.scheduleService,
      {} as EmployeeRepository,
      { findById: vi.fn(async (id: string) => world.store.cadences.get(id) ?? null) } as unknown as ReviewCadenceRepository
    );

    await cadenceService.updateCadenceOverride(hrActor, EMP, { review_cadence_override_id: C12 });

    expect(world.queries.some((q) => /evaluation(_item)?\b/i.test(q) && /UPDATE|INSERT|DELETE/i.test(q))).toBe(false);
    expect(world.store.evaluations.get(uuid(900))).toMatchObject({ status: 'PUBLISHED', final_score: 87.5, published_at: publishedAt });
  });
});
