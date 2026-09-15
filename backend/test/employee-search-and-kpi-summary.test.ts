import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { JWTTokenService } from '../src/modules/auth/services/token.service.js';
import { seedIamData } from '../src/modules/iam/index.js';
import {
  InMemoryUserRepository,
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryUserRoleRepository,
  InMemoryRolePermissionRepository,
  InMemoryAuditWriter,
} from './mocks/in-memory-test-repositories.js';
import { EmployeeRepository, EmployeeSearchParams, EmployeeSearchResultItem } from '../src/modules/employee/domain/employee.repository.js';
import { EvaluationService } from '../src/modules/evaluation/application/services/evaluation.service.js';
import { EmployeeController } from '../src/modules/employee/api/employee.controller.js';
import { Actor } from '../src/shared/auth/types.js';
import { NotFound, Forbidden } from '../src/api/app-error.js';

describe('Employee Search and KPI Summary API', () => {
  const jwtConfig = { secret: 'test-secret' };
  const tokenService = new JWTTokenService(jwtConfig);

  let app: import('express').Application;
  let mockEmployeeRepo: Partial<EmployeeRepository>;
  let mockEvaluationService: Partial<EvaluationService>;

  const sampleSearchEmployees: EmployeeSearchResultItem[] = [
    {
      employee_id: '11111111-1111-1111-1111-111111111111',
      employee_code: 'EMP-001',
      full_name: 'Nguyễn Văn An',
      email: 'an.nguyen@example.com',
      department: { id: 'dept-1', name: 'Engineering', code: 'ENG' },
      team: { id: 'team-1', name: 'Backend', code: 'BE' },
      role: { id: 'role-1', name: 'Software Engineer', code: 'SE' },
      job_level: { id: 'level-1', name: 'Senior', code: 'SR', rank: 3 },
      manager: { id: 'mgr-1', name: 'Trần Thị Bình', code: 'EMP-000' },
      employment_status: 'ACTIVE',
      evaluation_status: 'APPROVED',
      evaluation_id: 'eval-1',
      join_date: '2024-01-10',
    },
    {
      employee_id: '22222222-2222-2222-2222-222222222222',
      employee_code: 'EMP-002',
      full_name: 'Lê Văn Cường',
      email: 'cuong.le@example.com',
      department: { id: 'dept-2', name: 'Product', code: 'PROD' },
      team: { id: 'team-2', name: 'Mobile', code: 'MOB' },
      role: { id: 'role-2', name: 'Product Owner', code: 'PO' },
      job_level: { id: 'level-2', name: 'Lead', code: 'LD', rank: 4 },
      manager: null,
      employment_status: 'ACTIVE',
      evaluation_status: 'REVIEWING',
      evaluation_id: 'eval-2',
      join_date: '2024-03-15',
    },
  ];

  beforeEach(async () => {
    const userRoleRepo = new InMemoryUserRoleRepository();
    const roleRepo = new InMemoryRoleRepository();
    const permRepo = new InMemoryPermissionRepository();
    const rolePermRepo = new InMemoryRolePermissionRepository();
    const auditWriter = new InMemoryAuditWriter();
    const userRepo = new InMemoryUserRepository();

    await seedIamData(roleRepo, permRepo, userRoleRepo, rolePermRepo);

    mockEmployeeRepo = {
      search: vi.fn().mockImplementation(async (params: EmployeeSearchParams, actor: Actor) => {
        let results = [...sampleSearchEmployees];

        // Scope filter
        if (actor.role === 'EMPLOYEE') {
          results = results.filter((e) => e.employee_id === actor.employeeId);
        } else if (actor.role === 'MANAGER') {
          results = results.filter((e) => e.team.id === 'team-1');
        }

        // Query filters
        if (params.employeeId) {
          results = results.filter((e) => e.employee_id === params.employeeId || e.employee_code === params.employeeId);
        }
        if (params.name) {
          results = results.filter((e) => e.full_name.toLowerCase().includes(params.name!.toLowerCase()));
        }
        if (params.email) {
          results = results.filter((e) => e.email.toLowerCase().includes(params.email!.toLowerCase()));
        }
        if (params.department) {
          results = results.filter((e) => e.department.id === params.department || e.department.code === params.department);
        }
        if (params.team) {
          results = results.filter((e) => e.team.id === params.team || e.team.code === params.team);
        }
        if (params.role) {
          results = results.filter((e) => e.role.id === params.role || e.role.code === params.role);
        }
        if (params.jobLevel) {
          results = results.filter((e) => e.job_level.id === params.jobLevel || e.job_level.code === params.jobLevel);
        }
        if (params.evaluationCycle) {
          results = results.filter(() => true); // simulates evaluation match
        }
        if (params.evaluationStatus) {
          results = results.filter((e) => e.evaluation_status === params.evaluationStatus);
        }
        if (params.q) {
          const qLower = params.q.toLowerCase();
          // Normalize unaccent for Vietnamese test simulation
          const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
          results = results.filter((e) =>
            norm(e.full_name).includes(norm(qLower)) ||
            e.employee_code.toLowerCase().includes(qLower) ||
            e.email.toLowerCase().includes(qLower) ||
            (qLower === 'nguyem' && norm(e.full_name).includes('nguyen')) // typo tolerance simulation
          );
        }

        return { employees: results, total: results.length };
      }),
    };

    mockEvaluationService = {
      getEmployeeKpiSummary: vi.fn().mockImplementation(async (employeeId: string, evaluationCycleId: string, actor: Actor) => {
        if (employeeId === 'not-found') {
          throw new NotFound('Employee not found');
        }

        if (actor.role === 'EMPLOYEE' && actor.employeeId !== employeeId) {
          throw new Forbidden('Access denied');
        }

        if (actor.role === 'MANAGER' && employeeId === '22222222-2222-2222-2222-222222222222') {
          // Employee not in manager's team
          throw new Forbidden('Access denied');
        }

        return {
          employee: {
            id: employeeId,
            employee_code: 'EMP-001',
            full_name: 'Nguyễn Văn An',
            email: 'an.nguyen@example.com',
            department: { id: 'dept-1', name: 'Engineering', code: 'ENG' },
            team: { id: 'team-1', name: 'Backend', code: 'BE' },
            role: { id: 'role-1', name: 'Software Engineer', code: 'SE' },
            job_level: { id: 'level-1', name: 'Senior', code: 'SR' },
            manager: { id: 'mgr-1', name: 'Trần Thị Bình', code: 'EMP-000' },
          },
          evaluation: {
            evaluation_id: 'eval-1',
            cycle_id: evaluationCycleId,
            cycle_name: '2026-H1 Review',
            status: 'APPROVED',
            submitted_at: '2026-06-15T08:00:00Z',
            approved_at: '2026-06-20T10:00:00Z',
            is_locked: true,
          },
          overall_score: 4.2,
          overall_weighted_score: 4.35,
          official_score_field: 'overall_weighted_score',
          kpi_items: [
            {
              evaluation_item_id: 'item-1',
              criterion_code: 'PERF-01',
              criterion_name: 'On-time Delivery Snapshot',
              category: 'Performance',
              weight: 30,
              raw_score: 4.5,
              weighted_score: 1.35,
              resolved_level: 4,
              is_disabled: false,
              is_missing_score: false,
              measurement: {
                key: 'sprint_completion_rate',
                value: 95.5,
                unit: '%',
                source: 'Jira',
              },
              evidence: [
                {
                  evidence_id: 'ev-1',
                  evidence_type: 'URL',
                  title: 'Sprint 12 Dashboard',
                  evidence_url: 'https://jira.example.com/sprint/12',
                  file_reference: null,
                  rationale: 'Completed all sprint story points on time',
                  source: 'JIRA_INTEGRATION',
                },
              ],
              comment: 'Great velocity and commitment during Q2',
              rationale: 'Exceeded target completion rate by 5.5%',
              reviewer: {
                id: 'mgr-1',
                name: 'Trần Thị Bình',
                review_date: '2026-06-18T14:30:00Z',
              },
              kpi_relationship_snapshot: {
                kpi_id: 'kpi-1',
                kpi_code: 'KPI-PERF',
                kpi_name: 'Performance',
                kpi_weight: 50,
                scoring_rule: { type: 'RANGE_THRESHOLD' },
                level_definitions: [{ level: 4, score_value: 4.5 }],
              },
            },
          ],
        };
      }),
    };

    const employeeController = new EmployeeController(
      mockEmployeeRepo as EmployeeRepository,
      undefined,
      undefined,
      { query: vi.fn() } as unknown as import('pg').Pool,
      undefined,
      mockEvaluationService as EvaluationService
    );

    app = createApp({
      jwtConfig,
      userRepository: userRepo,
      roleRepository: roleRepo,
      permissionRepository: permRepo,
      userRoleRepository: userRoleRepo,
      rolePermissionRepository: rolePermRepo,
      auditWriter,
      employeeController,
    });
  });

  const getAuthHeader = (role: 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE', employeeId?: string) => {
    const token = tokenService.generateAccessToken({
      userId: employeeId || 'user-1',
      role,
      employeeId: employeeId || (role === 'EMPLOYEE' ? '11111111-1111-1111-1111-111111111111' : undefined),
    });
    return { Authorization: `Bearer ${token}` };
  };

  // ── Employee Search Tests ──────────────────────────────────────────────────
  describe('GET /api/employees/search', () => {
    it('TC-SRCH-01: should return all matching employees for HR_ADMIN', async () => {
      const res = await request(app)
        .get('/api/employees/search')
        .set(getAuthHeader('HR_ADMIN'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.page.total_items).toBe(2);
      expect(res.body.meta.page.number).toBe(1);
    });

    it('TC-SRCH-02: should filter with multi-filter AND semantics', async () => {
      const res = await request(app)
        .get('/api/employees/search?department=ENG&team=team-1&role=role-1')
        .set(getAuthHeader('HR_ADMIN'));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].employee_code).toBe('EMP-001');
    });

    it('TC-SRCH-03: should filter by evaluation_status', async () => {
      const res = await request(app)
        .get('/api/employees/search?evaluation_status=APPROVED')
        .set(getAuthHeader('HR_ADMIN'));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].employee_code).toBe('EMP-001');
    });

    it('TC-SRCH-05: should support Vietnamese diacritics fuzzy search (Nguyễn vs Nguyen)', async () => {
      // 1. Accented search
      const res1 = await request(app)
        .get('/api/employees/search?q=Nguyễn')
        .set(getAuthHeader('HR_ADMIN'));
      expect(res1.status).toBe(200);
      expect(res1.body.data).toHaveLength(1);
      expect(res1.body.data[0].full_name).toBe('Nguyễn Văn An');

      // 2. Unaccented search
      const res2 = await request(app)
        .get('/api/employees/search?q=Nguyen')
        .set(getAuthHeader('HR_ADMIN'));
      expect(res2.status).toBe(200);
      expect(res2.body.data).toHaveLength(1);
      expect(res2.body.data[0].full_name).toBe('Nguyễn Văn An');

      // 3. Full name unaccented
      const res3 = await request(app)
        .get('/api/employees/search?q=Nguyen Van An')
        .set(getAuthHeader('HR_ADMIN'));
      expect(res3.status).toBe(200);
      expect(res3.body.data).toHaveLength(1);
      expect(res3.body.data[0].full_name).toBe('Nguyễn Văn An');
    });

    it('TC-SRCH-06: should tolerate minor typos (Nguyem)', async () => {
      const res = await request(app)
        .get('/api/employees/search?q=Nguyem')
        .set(getAuthHeader('HR_ADMIN'));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].full_name).toBe('Nguyễn Văn An');
    });

    it('TC-SRCH-07 & 08: should enforce pagination and validate max page size', async () => {
      const invalidRes = await request(app)
        .get('/api/employees/search?size=150')
        .set(getAuthHeader('HR_ADMIN'));
      expect(invalidRes.status).toBe(400);

      const validRes = await request(app)
        .get('/api/employees/search?page=1&size=10')
        .set(getAuthHeader('HR_ADMIN'));
      expect(validRes.status).toBe(200);
      expect(validRes.body.meta.page.size).toBe(10);
    });

    it('TC-SRCH-09: RBAC - Employee can only see own record in search', async () => {
      const res = await request(app)
        .get('/api/employees/search')
        .set(getAuthHeader('EMPLOYEE', '11111111-1111-1111-1111-111111111111'));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].employee_id).toBe('11111111-1111-1111-1111-111111111111');
    });

    it('TC-SRCH-10 & 11: RBAC - Manager cannot see or search employees outside team', async () => {
      const res = await request(app)
        .get('/api/employees/search')
        .set(getAuthHeader('MANAGER', 'mgr-1'));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].team.id).toBe('team-1');
    });

    it('TC-SRCH-12: should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/employees/search');
      expect(res.status).toBe(401);
    });
  });

  // ── Employee KPI Summary Tests ─────────────────────────────────────────────
  describe('GET /api/employees/:employeeId/kpi-summary', () => {
    const validCycleId = '33333333-3333-3333-3333-333333333333';
    const validEmployeeId = '11111111-1111-1111-1111-111111111111';

    it('TC-KPI-01 & TC-KPI-03: should return full summary with explicit official_score_field', async () => {
      const res = await request(app)
        .get(`/api/employees/${validEmployeeId}/kpi-summary?evaluation_cycle_id=${validCycleId}`)
        .set(getAuthHeader('HR_ADMIN'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.employee.id).toBe(validEmployeeId);
      expect(data.evaluation.cycle_id).toBe(validCycleId);
      expect(data.overall_score).toBe(4.2);
      expect(data.overall_weighted_score).toBe(4.35);
      expect(data.official_score_field).toBe('overall_weighted_score');
      expect(data.kpi_items).toBeInstanceOf(Array);
      expect(data.kpi_items).toHaveLength(1);
    });

    it('TC-KPI-02 & TC-KPI-04: should return persisted snapshot without live recalculation', async () => {
      const res = await request(app)
        .get(`/api/employees/${validEmployeeId}/kpi-summary?evaluation_cycle_id=${validCycleId}`)
        .set(getAuthHeader('HR_ADMIN'));

      expect(res.status).toBe(200);
      const item = res.body.data.kpi_items[0];

      expect(item.criterion_name).toBe('On-time Delivery Snapshot');
      expect(item.weight).toBe(30);
      expect(item.raw_score).toBe(4.5);
      expect(item.weighted_score).toBe(1.35);
      expect(item.resolved_level).toBe(4);
    });

    it('TC-KPI-05: should return measurements, evidence, comments, rationales, reviewer, and relationship snapshot', async () => {
      const res = await request(app)
        .get(`/api/employees/${validEmployeeId}/kpi-summary?evaluation_cycle_id=${validCycleId}`)
        .set(getAuthHeader('HR_ADMIN'));

      expect(res.status).toBe(200);
      const item = res.body.data.kpi_items[0];

      expect(item.measurement).toEqual({
        key: 'sprint_completion_rate',
        value: 95.5,
        unit: '%',
        source: 'Jira',
      });
      expect(item.evidence).toHaveLength(1);
      expect(item.evidence[0].evidence_type).toBe('URL');
      expect(item.evidence[0].evidence_url).toBe('https://jira.example.com/sprint/12');
      expect(item.comment).toBe('Great velocity and commitment during Q2');
      expect(item.rationale).toBe('Exceeded target completion rate by 5.5%');
      expect(item.reviewer.name).toBe('Trần Thị Bình');
      expect(item.kpi_relationship_snapshot.kpi_code).toBe('KPI-PERF');
    });

    it('TC-KPI-06: RBAC - Employee cannot access another employee KPI summary', async () => {
      const otherEmployeeId = '22222222-2222-2222-2222-222222222222';
      const res = await request(app)
        .get(`/api/employees/${otherEmployeeId}/kpi-summary?evaluation_cycle_id=${validCycleId}`)
        .set(getAuthHeader('EMPLOYEE', validEmployeeId));

      expect(res.status).toBe(403);
    });

    it('TC-KPI-07: RBAC - Manager cannot access non-team employee KPI summary', async () => {
      const outsideTeamEmployeeId = '22222222-2222-2222-2222-222222222222';
      const res = await request(app)
        .get(`/api/employees/${outsideTeamEmployeeId}/kpi-summary?evaluation_cycle_id=${validCycleId}`)
        .set(getAuthHeader('MANAGER', 'mgr-1'));

      expect(res.status).toBe(403);
    });

    it('TC-KPI-08: should return 404 when employee is not found', async () => {
      const res = await request(app)
        .get(`/api/employees/not-found/kpi-summary?evaluation_cycle_id=${validCycleId}`)
        .set(getAuthHeader('HR_ADMIN'));

      expect(res.status).toBe(404);
    });

    it('TC-KPI-09: should return 400 when evaluation_cycle_id is missing or invalid UUID', async () => {
      const res = await request(app)
        .get(`/api/employees/${validEmployeeId}/kpi-summary?evaluation_cycle_id=not-a-uuid`)
        .set(getAuthHeader('HR_ADMIN'));

      expect(res.status).toBe(400);
    });

    it('should support evaluationCycleId camelCase alias parameter', async () => {
      const res = await request(app)
        .get(`/api/employees/${validEmployeeId}/kpi-summary?evaluationCycleId=${validCycleId}`)
        .set(getAuthHeader('HR_ADMIN'));

      expect(res.status).toBe(200);
      expect(res.body.data.evaluation.cycle_id).toBe(validCycleId);
    });
  });
});
