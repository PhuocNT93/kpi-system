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
import { ReportsController } from '../src/modules/reports/api/reports.controller.js';
import { ReportsQueryService } from '../src/modules/reports/application/reports-query.service.js';
import { IReportsRepository } from '../src/modules/reports/domain/reports.types.js';
import { Actor } from '../src/shared/auth/types.js';

describe('Reporting KPI Summary Dashboard & Detail API', () => {
  const jwtConfig = { secret: 'test-secret' };
  const tokenService = new JWTTokenService(jwtConfig);

  let app: import('express').Application;
  let mockReportsRepo: Partial<IReportsRepository>;
  let queryService: ReportsQueryService;
  let reportsController: ReportsController;

  const emp1Id = 'a1111111-1111-4111-8111-111111111111';
  const emp2Id = 'b2222222-2222-4222-8222-222222222222';
  const managerId = 'c3333333-3333-4333-8333-333333333333';
  const cycleId = 'd4444444-4444-4444-8444-444444444444';
  const evalId = 'e5555555-5555-4555-8555-555555555555';
  const item1Id = 'f6666666-6666-4666-8666-666666666666';
  const item2Id = 'a7777777-7777-4777-8777-777777777777';

  const mockEmployeeScore = {
    evaluation_id: evalId,
    evaluation_cycle_id: cycleId,
    employee_id: emp1Id,
    team_id: 'team-1',
    role_id: 'role-1',
    job_level_id: 'level-1',
    cycle_status: 'PUBLISHED',
    evaluation_status: 'PUBLISHED',
    self_score: 4.0,
    manager_score: 4.2,
    final_score: 4.35, // Calibrated score
    is_locked: true,
    published_at: new Date('2025-01-15T00:00:00Z'),
    locked_at: new Date('2025-01-15T00:00:00Z'),
    last_refreshed_at: new Date('2025-01-15T00:00:00Z'),
  };

  const mockKpis = [
    {
      id: 'kpi-score-2',
      evaluation_item_id: item2Id,
      evaluation_id: evalId,
      evaluation_cycle_id: cycleId,
      employee_id: emp1Id,
      team_id: 'team-1',
      criterion_code: 'CRIT_CODE_REVIEW',
      criterion_name: 'Code Review Quality',
      category: 'Quality',
      display_order: 2,
      weight_snapshot: 30,
      resolved_level: 4,
      raw_score: 4.0,
      weighted_score: 1.2,
      is_disabled_for_employee: false,
      is_missing_score: false,
      kpi_score: 4.0,
      kpi_weighted_score: 1.2,
      has_evidence: true,
      evidence_count: 2,
      comment: 'Thorough reviews',
      measurement: { value: 95, unit: '%', source_label: 'GitLab' },
      last_refreshed_at: new Date(),
    },
    {
      id: 'kpi-score-1',
      evaluation_item_id: item1Id,
      evaluation_id: evalId,
      evaluation_cycle_id: cycleId,
      employee_id: emp1Id,
      team_id: 'team-1',
      criterion_code: 'CRIT_SYSTEM_DESIGN',
      criterion_name: 'System Architecture',
      category: 'Technical',
      display_order: 1,
      weight_snapshot: 70,
      resolved_level: 4,
      raw_score: 4.5,
      weighted_score: 3.15,
      is_disabled_for_employee: false,
      is_missing_score: false,
      kpi_score: 4.5,
      kpi_weighted_score: 3.15,
      has_evidence: true,
      evidence_count: 1,
      comment: 'Solid architecture leadership',
      measurement: { value: 4, unit: 'projects', source_label: 'Jira' },
      last_refreshed_at: new Date(),
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

    mockReportsRepo = {
      getEmployeeKpiSummary: vi.fn().mockImplementation(async (employeeId: string) => {
        if (employeeId === emp1Id) {
          return {
            score: mockEmployeeScore,
            kpis: mockKpis,
          };
        }
        return null;
      }),
      getEmployeeKpiDetail: vi.fn().mockImplementation(async (employeeId: string, itemId: string) => {
        if (employeeId === emp1Id && itemId === item1Id) {
          return {
            item: {
              evaluation_item_id: item1Id,
              evaluation_id: evalId,
              criterion_code_snapshot: 'CRIT_SYSTEM_DESIGN',
              criterion_name_snapshot: 'System Architecture',
              category: 'Technical',
              description: 'Ability to architect robust scalable systems',
              weight_snapshot: 70,
              resolved_level: 4,
              raw_score: 4.5,
              weighted_score: 3.15,
              measurement_value: 4,
              measurement_unit: 'projects',
              system_source: 'Jira',
              level_definition_snapshot: [
                { level: 1, name: 'Junior', description: 'Assists with design' },
                { level: 2, name: 'Mid', description: 'Designs modules' },
                { level: 3, name: 'Senior', description: 'Designs services' },
                { level: 4, name: 'Lead', description: 'Architects systems' },
                { level: 5, name: 'Principal', description: 'Organization-wide architecture' },
              ],
              evaluation_status: 'PUBLISHED',
              created_at: new Date('2025-01-10'),
              updated_at: new Date('2025-01-15'),
            },
            evidence: [
              {
                evidence_id: 'ev-1',
                evaluation_item_id: item1Id,
                evidence_type: 'URL',
                title: 'High-level Architecture Document',
                evidence_url: 'https://docs.example.com/arch-v2',
                evidence_value: 'https://docs.example.com/arch-v2',
                rationale: 'Core RFC approved',
                source: 'Confluence',
                created_at: new Date('2025-01-12'),
                created_by: emp1Id,
              },
            ],
          };
        }
        return null;
      }),
    };

    // Create mock Pool for metadata and scoping
    const mockPool = {
      query: vi.fn().mockImplementation(async (text: string, params: unknown[]) => {
        // Employee lookup
        if (text.includes('FROM employee e')) {
          if (params[0] === emp1Id) {
            return {
              rows: [
                {
                  employee_id: emp1Id,
                  employee_code: 'EMP-001',
                  full_name: 'Nguyễn Văn An',
                  email: 'an.nguyen@example.com',
                  department_id: 'dept-1',
                  department_name: 'Engineering',
                  team_id: 'team-1',
                  team_name: 'Backend',
                  role_id: 'role-1',
                  role_name: 'Software Engineer',
                  job_level_id: 'level-1',
                  job_level_name: 'Senior',
                  manager_id: managerId,
                  manager_name: 'Trần Thị Bình',
                },
              ],
            };
          }
        }

        // Manager check on employee table
        if (text.includes('SELECT employee_id, manager_id, team_id FROM employee WHERE employee_id = $1')) {
          if (params[0] === emp1Id) {
            return { rows: [{ employee_id: emp1Id, manager_id: managerId, team_id: 'team-1' }] };
          }
          if (params[0] === emp2Id) {
            return { rows: [{ employee_id: emp2Id, manager_id: 'other-mgr', team_id: 'team-2' }] };
          }
        }

        // Manager check on team table
        if (text.includes('SELECT 1 FROM team WHERE team_id = $1 AND manager_id = $2')) {
          if (params[0] === 'team-1' && params[1] === managerId) {
            return { rows: [{ '?column?': 1 }] };
          }
          return { rows: [] };
        }

        // Cycle name lookup
        if (text.includes('FROM evaluation_cycle WHERE evaluation_cycle_id = $1')) {
          return { rows: [{ name: 'H1 2025 Evaluation' }] };
        }

        return { rows: [] };
      }),
    } as unknown as import('pg').Pool;

    queryService = new ReportsQueryService(mockReportsRepo as IReportsRepository, mockPool);
    reportsController = new ReportsController(queryService);

    app = createApp({
      jwtConfig,
      userRepository: userRepo,
      roleRepository: roleRepo,
      permissionRepository: permRepo,
      userRoleRepository: userRoleRepo,
      rolePermissionRepository: rolePermRepo,
      auditWriter: auditWriter,
      reportsController: reportsController,
    });
  });

  const createAuthToken = (actor: Actor): string => {
    return tokenService.generateAccessToken({
      userId: actor.userId,
      email: actor.email,
      role: actor.role,
      roles: [actor.role],
      employeeId: actor.employeeId,
      departmentId: actor.departmentId,
      teamId: actor.teamId,
      managedTeamIds: actor.managedTeamIds || (actor.role === 'MANAGER' ? ['team-1'] : []),
    });
  };

  describe('1. GET /api/reports/employees/:employeeId/kpi-summary', () => {
    it('TC-07 & TC-08: should return 200 with complete KPI summary and authoritative score distinction', async () => {
      const actor: Actor = {
        userId: 'admin-user',
        email: 'admin@example.com',
        role: 'SYSTEM_ADMIN',
      };
      const token = createAuthToken(actor);

      const res = await request(app)
        .get(`/api/reports/employees/${emp1Id}/kpi-summary?evaluation_cycle_id=${cycleId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const data = res.body.data;

      // Verify Employee Info
      expect(data.employee.employee_id).toBe(emp1Id);
      expect(data.employee.full_name).toBe('Nguyễn Văn An');
      expect(data.employee.department.name).toBe('Engineering');
      expect(data.employee.manager.full_name).toBe('Trần Thị Bình');

      // Verify Evaluation Info
      expect(data.evaluation.evaluation_id).toBe(evalId);
      expect(data.evaluation.cycle_name).toBe('H1 2025 Evaluation');
      expect(data.evaluation.status).toBe('PUBLISHED');
      expect(data.evaluation.is_locked).toBe(true);

      // Verify Score Semantics (TC-08)
      // Official score is the calibrated final_score (4.35), distinct from overall_weighted_score (4.35) and overall_score (4.25)
      expect(data.score_summary.official_score).toBe(4.35);
      expect(data.score_summary.official_score_label).toContain('Official Score');
      expect(data.score_summary.overall_weighted_score).toBe(4.35);
      expect(data.score_summary.overall_score).toBe(4.25); // (4.5 + 4.0) / 2
      expect(data.score_summary.kpi_count).toBe(2);
      expect(data.score_summary.completed_count).toBe(2);

      // Verify KPI Table ordering (TC-09)
      expect(data.kpis).toHaveLength(2);
      // First item should be System Architecture with display_order: 1
      expect(data.kpis[0].criterion_code).toBe('CRIT_SYSTEM_DESIGN');
      expect(data.kpis[0].display_order).toBe(1);
      expect(data.kpis[0].weight).toBe(70);
      expect(data.kpis[0].measurement.value).toBe(4);
      expect(data.kpis[0].is_completed).toBe(true);

      // Second item should be Code Review Quality with display_order: 2
      expect(data.kpis[1].criterion_code).toBe('CRIT_CODE_REVIEW');
      expect(data.kpis[1].display_order).toBe(2);
      expect(data.kpis[1].weight).toBe(30);

      // Verify Relationships (TC-13)
      expect(data.relationships).toBeInstanceOf(Array);
      expect(data.relationships).toContainEqual({
        source_id: emp1Id,
        target_id: 'team-1',
        relationship_type: 'MEMBER_OF',
      });
      expect(data.relationships).toContainEqual({
        source_id: 'team-1',
        target_id: 'dept-1',
        relationship_type: 'PART_OF',
      });
      expect(data.relationships).toContainEqual({
        source_id: emp1Id,
        target_id: managerId,
        relationship_type: 'REPORTS_TO',
      });
      expect(data.relationships).toContainEqual({
        source_id: evalId,
        target_id: emp1Id,
        relationship_type: 'EVALUATES',
      });
    });

    it('TC-10: should allow EMPLOYEE to view own KPI summary but return 403 for another employee', async () => {
      const ownActor: Actor = {
        userId: 'user-1',
        employeeId: emp1Id,
        email: 'an.nguyen@example.com',
        role: 'EMPLOYEE',
      };
      const ownToken = createAuthToken(ownActor);

      // Self access -> 200
      await request(app)
        .get(`/api/reports/employees/${emp1Id}/kpi-summary`)
        .set('Authorization', `Bearer ${ownToken}`)
        .expect(200);

      // Access peer -> 403 Forbidden
      const peerRes = await request(app)
        .get(`/api/reports/employees/${emp2Id}/kpi-summary`)
        .set('Authorization', `Bearer ${ownToken}`)
        .expect(403);

      expect(peerRes.body.success).toBe(false);
      expect(peerRes.body.message).toContain('do not have access');
    });

    it('TC-05 & TC-10: should allow MANAGER to view team member summary but return 403 outside managed team', async () => {
      const managerActor: Actor = {
        userId: 'user-mgr',
        employeeId: managerId,
        email: 'binh.tran@example.com',
        role: 'MANAGER',
      };
      const managerToken = createAuthToken(managerActor);

      // Managed employee -> 200
      await request(app)
        .get(`/api/reports/employees/${emp1Id}/kpi-summary`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Non-managed employee -> 403
      await request(app)
        .get(`/api/reports/employees/${emp2Id}/kpi-summary`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('TC-06: should allow HR_ADMIN to view any employee summary', async () => {
      const hrActor: Actor = {
        userId: 'hr-user',
        email: 'hr@example.com',
        role: 'HR_ADMIN',
      };
      const hrToken = createAuthToken(hrActor);

      await request(app)
        .get(`/api/reports/employees/${emp1Id}/kpi-summary`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);
    });
  });

  describe('2. GET /api/reports/employees/:employeeId/kpi-summary/:evaluationItemId', () => {
    it('TC-11 & TC-12: should return granular drill-down detail with snapshot level definitions and evidence', async () => {
      const actor: Actor = {
        userId: 'admin-user',
        email: 'admin@example.com',
        role: 'SYSTEM_ADMIN',
      };
      const token = createAuthToken(actor);

      const res = await request(app)
        .get(`/api/reports/employees/${emp1Id}/kpi-summary/${item1Id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const detail = res.body.data;

      // Criteria details
      expect(detail.criteria.criterion_code).toBe('CRIT_SYSTEM_DESIGN');
      expect(detail.criteria.criterion_name).toBe('System Architecture');
      expect(detail.criteria.category).toBe('Technical');

      // Measurement
      expect(detail.measurement.value).toBe(4);
      expect(detail.measurement.unit).toBe('projects');
      expect(detail.measurement.source_label).toBe('Jira');

      // Scoring
      expect(detail.scoring.weight).toBe(70);
      expect(detail.scoring.resolved_level).toBe(4);
      expect(detail.scoring.raw_score).toBe(4.5);
      expect(detail.scoring.weighted_score).toBe(3.15);

      // Snapshot level definitions (TC-12 immutability)
      expect(detail.level_definitions).toHaveLength(5);
      expect(detail.level_definitions[3].name).toBe('Lead');

      // Evidence list
      expect(detail.evidence).toHaveLength(1);
      expect(detail.evidence[0].evidence_type).toBe('URL');
      expect(detail.evidence[0].evidence_url).toBe('https://docs.example.com/arch-v2');

      // Read-only state
      expect(detail.is_locked).toBe(true);
    });

    it('TC-10: should forbid drill-down access for unauthorized peer employee', async () => {
      const peerActor: Actor = {
        userId: 'user-2',
        employeeId: emp2Id,
        email: 'cuong.le@example.com',
        role: 'EMPLOYEE',
      };
      const token = createAuthToken(peerActor);

      await request(app)
        .get(`/api/reports/employees/${emp1Id}/kpi-summary/${item1Id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
