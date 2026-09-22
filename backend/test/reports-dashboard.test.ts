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
import type { Pool } from 'pg';
import type { UserRole } from '../src/shared/auth/types.js';

describe('Role-Based Dashboard & Summary Statistics API', () => {
  const jwtConfig = { secret: 'test-secret' };
  const tokenService = new JWTTokenService(jwtConfig);

  let app: import('express').Application;
  let mockReportsRepo: Partial<IReportsRepository>;
  let queryService: ReportsQueryService;
  let reportsController: ReportsController;

  const emp1Id = 'a1111111-1111-4111-8111-111111111111';
  const managerId = 'c3333333-3333-4333-8333-333333333333';
  const hrAdminId = 'd4444444-4444-4444-8444-444444444444';
  const sysAdminId = 'e5555555-5555-4555-8555-555555555555';
  const cycleId = 'b2222222-2222-4222-8222-222222222222';
  const team1Id = 't1111111-1111-4111-8111-111111111111';

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
            score: {
              evaluation_id: 'eval-1',
              evaluation_cycle_id: cycleId,
              employee_id: emp1Id,
              cycle_status: 'ACTIVE',
              evaluation_status: 'SELF_ASSESSMENT',
              self_score: 4.1,
              manager_score: 4.3,
              final_score: 4.35,
              is_locked: false,
              last_refreshed_at: new Date(),
            },
            kpis: [
              {
                id: 'kpi-1',
                evaluation_id: 'eval-1',
                evaluation_cycle_id: cycleId,
                employee_id: emp1Id,
                criterion_code: 'CODE_QUALITY',
                criterion_name: 'Code Quality',
                category: 'Engineering',
                weight_snapshot: 50,
                raw_score: 4.5,
                weighted_score: 2.25,
                is_disabled_for_employee: false,
                is_missing_score: false,
                last_refreshed_at: new Date(),
              },
              {
                id: 'kpi-2',
                evaluation_id: 'eval-1',
                evaluation_cycle_id: cycleId,
                employee_id: emp1Id,
                criterion_code: 'COMMUNICATION',
                criterion_name: 'Team Communication',
                category: 'Collaboration',
                weight_snapshot: 50,
                raw_score: 3.8,
                weighted_score: 1.9,
                is_disabled_for_employee: false,
                is_missing_score: false,
                last_refreshed_at: new Date(),
              },
            ],
          };
        }
        return null;
      }),
      getTeamReport: vi.fn().mockResolvedValue({
        aggregate: {
          id: 'agg-1',
          evaluation_cycle_id: cycleId,
          team_id: team1Id,
          employee_count: 5,
          completed_employee_count: 4,
          completion_rate: 80,
          team_average_score: 4.2,
          last_refreshed_at: new Date(),
        },
        kpis: [],
      }),
      getOrganizationReport: vi.fn().mockResolvedValue([
        {
          id: 'org-agg-1',
          evaluation_cycle_id: cycleId,
          employee_count: 50,
          completed_employee_count: 42,
          completion_rate: 84,
          average_score: 4.05,
          score_distribution: {},
          last_refreshed_at: new Date(),
        },
      ]),
    };

    const mockPool = {
      query: vi.fn().mockImplementation(async (text: string, _params: unknown[] = []) => {
        // Cycle lookup
        if (text.includes('FROM evaluation_cycle')) {
          return {
            rows: [
              {
                evaluation_cycle_id: cycleId,
                name: 'Q3 2026 Evaluation',
                status: 'ACTIVE',
                start_date: new Date('2026-07-01'),
                end_date: new Date('2026-09-30'),
              },
            ],
          };
        }

        // Employee profile lookup
        if (text.includes('FROM employee e')) {
          return {
            rows: [
              {
                full_name: 'Nguyen Van A',
                employee_code: 'EMP001',
                review_cadence: 'ANNUAL',
                last_evaluation_completed_at: new Date('2025-09-15'),
                next_review_due_date: new Date('2026-09-15'),
                department_name: 'Engineering',
                team_name: 'Frontend Team',
              },
            ],
          };
        }

        // Score trend lookup
        if (text.includes('FROM employee_evaluation_score_read_model s')) {
          return {
            rows: [
              {
                evaluation_cycle_id: 'c-prev',
                cycle_name: 'Q2 2026 Evaluation',
                score_val: 4.15,
                published_at: new Date('2026-06-30'),
              },
              {
                evaluation_cycle_id: cycleId,
                cycle_name: 'Q3 2026 Evaluation',
                score_val: 4.35,
                published_at: new Date('2026-09-20'),
              },
            ],
          };
        }

        // Manager managed team lookup
        if (text.includes('FROM team WHERE manager_id')) {
          return {
            rows: [
              {
                team_id: team1Id,
                name: 'Alpha Team',
                department_id: 'dept-1',
              },
            ],
          };
        }

        // Employee count in team
        if (text.includes('SELECT COUNT(*) as count FROM employee WHERE team_id')) {
          return { rows: [{ count: '5' }] };
        }

        // Evaluations in team or organization
        if (text.includes('FROM evaluation WHERE team_id') || text.includes('FROM evaluation')) {
          return {
            rows: [
              { evaluation_id: 'ev-1', status: 'PUBLISHED', final_score: 4.5, manager_score: 4.4, self_score: 4.0 },
              { evaluation_id: 'ev-2', status: 'APPROVED', final_score: 4.0, manager_score: 4.0, self_score: 3.8 },
              { evaluation_id: 'ev-3', status: 'MANAGER_ASSESSMENT', final_score: null, manager_score: null, self_score: 4.2 },
              { evaluation_id: 'ev-4', status: 'REVIEWING', final_score: null, manager_score: 3.9, self_score: 3.5 },
            ],
          };
        }

        // Review due status in team/org
        if (text.includes('SELECT last_evaluation_completed_at, review_cadence, next_review_due_date FROM employee')) {
          return {
            rows: [
              { last_evaluation_completed_at: new Date('2025-08-01'), review_cadence: 'ANNUAL', next_review_due_date: new Date('2026-08-01') }, // Overdue
              { last_evaluation_completed_at: new Date('2026-05-01'), review_cadence: 'SEMI_ANNUAL', next_review_due_date: new Date('2026-10-15') }, // Upcoming
            ],
          };
        }

        // Criterion aggregates in team
        if (text.includes('GROUP BY criterion_code, criterion_name, category')) {
          return {
            rows: [
              { criterion_code: 'CODE_QUALITY', criterion_name: 'Code Quality', category: 'Engineering', avg_score: 4.4 },
              { criterion_code: 'DELIVERY', criterion_name: 'Sprint Delivery', category: 'Productivity', avg_score: 4.1 },
            ],
          };
        }

        // HR organization employee counts
        if (text.includes('SELECT COUNT(*) as total,') && text.includes('FROM employee')) {
          return {
            rows: [{ total: '50', active: '48' }],
          };
        }

        // HR team breakdown
        if (text.includes('FROM team t') && text.includes('LEFT JOIN department d')) {
          return {
            rows: [
              {
                team_id: team1Id,
                team_name: 'Alpha Team',
                department_name: 'Engineering',
                emp_count: '10',
                completed_count: '8',
                avg_score: '4.25',
              },
            ],
          };
        }

        // System Admin counts
        if (text.includes('FROM app_user')) return { rows: [{ total: '60' }] };
        if (text.includes('FROM role')) return { rows: [{ total: '4' }] };
        if (text.includes('FROM team')) return { rows: [{ total: '8' }] };
        if (text.includes('FROM department')) return { rows: [{ total: '3' }] };
        if (text.includes('FROM evaluation_template')) return { rows: [{ total: '2' }] };
        if (text.includes('FROM audit_log') && text.includes('COUNT(*) as count FROM audit_log GROUP BY action')) {
          return {
            rows: [
              { action: 'LOGIN', count: '45' },
              { action: 'EVALUATION_PUBLISHED', count: '12' },
            ],
          };
        }
        if (text.includes('FROM audit_log') && text.includes('created_at DESC LIMIT 5')) {
          return {
            rows: [
              { id: 'aud-1', action: 'LOGIN', entity_name: 'Session', created_at: new Date() },
              { id: 'aud-2', action: 'EVALUATION_PUBLISHED', entity_name: 'Evaluation', created_at: new Date() },
            ],
          };
        }
        if (text.includes('SELECT COUNT(*) as total FROM audit_log')) {
          return { rows: [{ total: '150' }] };
        }

        return { rows: [] };
      }),
    };

    queryService = new ReportsQueryService(mockReportsRepo as IReportsRepository, mockPool as unknown as Pool);
    reportsController = new ReportsController(queryService);

    app = createApp({
      reportsController,
      jwtConfig,
      userRepository: userRepo,
      roleRepository: roleRepo,
      permissionRepository: permRepo,
      userRoleRepository: userRoleRepo,
      rolePermissionRepository: rolePermRepo,
      auditWriter: auditWriter,
    });
  });

  const generateToken = (userId: string, role: UserRole, employeeId?: string) => {
    return tokenService.generateAccessToken({
      userId,
      role,
      employeeId,
      permissions: ['report:view', 'report:read', 'report:self', 'report:team', 'report:organization'],
      managedTeamIds: role === 'MANAGER' ? [team1Id] : [],
    });
  };


  // TC-01: Employee Dashboard - Self Scope
  it('TC-01: Employee accesses own dashboard successfully', async () => {
    const token = generateToken(emp1Id, 'EMPLOYEE', emp1Id);

    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('EMPLOYEE');
    expect(res.body.data.scope.type).toBe('SELF');
    expect(res.body.data.scope.id).toBe(emp1Id);

    // Summary assertions
    expect(res.body.data.summary.current_evaluation_status).toBe('SELF_ASSESSMENT');
    expect(res.body.data.summary.current_overall_score).toBe(4.35);
    expect(res.body.data.summary.last_published_score).toBe(4.35);
    expect(res.body.data.summary.review_status).toBeDefined();

    // Details assertions
    expect(res.body.data.details.score_trend).toHaveLength(2);
    expect(res.body.data.details.score_breakdown).toHaveLength(2);
    expect(res.body.data.details.strengths).toBeDefined();
    expect(res.body.data.details.review_schedule).toBeDefined();
    expect(res.body.data.last_updated_at).toBeDefined();
  });

  // TC-02: Employee Cannot Access Other Scopes (Role-enforced server-side)
  it('TC-02: Employee request cannot be overridden by client-supplied scope parameters', async () => {
    const token = generateToken(emp1Id, 'EMPLOYEE', emp1Id);

    const res = await request(app)
      .get('/api/reports/dashboard?employeeId=another-user&teamId=other-team&role=HR_ADMIN')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Even if client sent role=HR_ADMIN or other employeeId, server strictly enforces caller's JWT role and self scope
    expect(res.body.data.role).toBe('EMPLOYEE');
    expect(res.body.data.scope.id).toBe(emp1Id);
  });

  // TC-03: Manager Accesses Managed Team Dashboard
  it('TC-03: Manager accesses managed-team dashboard with team aggregate metrics', async () => {
    const token = generateToken(managerId, 'MANAGER', managerId);

    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('MANAGER');
    expect(res.body.data.scope.type).toBe('TEAM');
    expect(res.body.data.scope.ids).toContain(team1Id);

    // Team summary metrics
    expect(res.body.data.summary.team_members_count).toBe(5);
    expect(res.body.data.summary.total_evaluations).toBe(4);
    expect(res.body.data.summary.completed_evaluations).toBe(2);
    expect(res.body.data.summary.completion_rate).toBe(50);
    expect(res.body.data.summary.team_average_score).toBeDefined();

    // Distribution & Attention
    expect(res.body.data.details.workflow_distribution).toBeDefined();
    expect(res.body.data.details.score_distribution).toHaveLength(5);
    expect(res.body.data.details.review_due_summary).toBeDefined();
  });

  // TC-04: Manager Scope Isolation
  it('TC-04: Manager cannot access unmanaged teams', async () => {
    const token = generateToken(managerId, 'MANAGER', managerId);

    const res = await request(app)
      .get('/api/reports/dashboard?teamId=unmanaged-team')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.scope.ids).toEqual([team1Id]);
    expect(res.body.data.scope.ids).not.toContain('unmanaged-team');
  });

  // TC-05: HR/Admin Organization Scope Dashboard
  it('TC-05: HR/Admin accesses organization-wide dashboard overview', async () => {
    const token = generateToken(hrAdminId, 'HR_ADMIN');

    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('HR_ADMIN');
    expect(res.body.data.scope.type).toBe('ORGANIZATION');

    // Organization summary metrics
    expect(res.body.data.summary.total_employees).toBe(50);
    expect(res.body.data.summary.active_employees).toBe(48);
    expect(res.body.data.summary.total_evaluations).toBe(4);
    expect(res.body.data.summary.completion_rate).toBeDefined();
    expect(res.body.data.summary.organization_average_score).toBeDefined();

    // Breakdown details
    expect(res.body.data.details.department_team_aggregates).toBeDefined();
    expect(res.body.data.details.workflow_distribution).toBeDefined();
    expect(res.body.data.details.score_distribution).toBeDefined();
  });

  // TC-06: System Admin Operational Overview Dashboard
  it('TC-06: System Admin accesses operational health & audit dashboard', async () => {
    const token = generateToken(sysAdminId, 'SYSTEM_ADMIN');

    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('SYSTEM_ADMIN');
    expect(res.body.data.scope.type).toBe('SYSTEM');

    // Operational counts
    expect(res.body.data.summary.total_users).toBe(60);
    expect(res.body.data.summary.total_roles).toBe(4);
    expect(res.body.data.summary.total_teams).toBe(8);

    // Audit summary
    expect(res.body.data.details.system_health.status).toBe('OPERATIONAL');
    expect(res.body.data.details.audit_summary.total_recent_events).toBe(150);
    expect(res.body.data.details.audit_summary.events_by_action).toHaveLength(2);
  });

  // TC-07: Unauthenticated Request Returns 401
  it('TC-07: Unauthenticated request to /api/reports/dashboard returns 401', async () => {
    const res = await request(app).get('/api/reports/dashboard');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // TC-08: Privacy & Anti-Ranking Mandate Verification
  it('TC-08: All dashboard responses strictly contain zero ranking, percentile, or stack-ranking properties', async () => {
    const roles: Array<{ role: UserRole; id: string; empId?: string }> = [
      { role: 'EMPLOYEE', id: emp1Id, empId: emp1Id },
      { role: 'MANAGER', id: managerId, empId: managerId },
      { role: 'HR_ADMIN', id: hrAdminId },
      { role: 'SYSTEM_ADMIN', id: sysAdminId },
    ];

    for (const item of roles) {
      const token = generateToken(item.id, item.role, item.empId);
      const res = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Convert payload to JSON string and assert absence of forbidden ranking keywords
      const stringified = JSON.stringify(res.body.data).toLowerCase();

      expect(stringified).not.toContain('"rank"');
      expect(stringified).not.toContain('"ranking"');
      expect(stringified).not.toContain('"percentile"');
      expect(stringified).not.toContain('"top_employee"');
      expect(stringified).not.toContain('"top_employees"');
      expect(stringified).not.toContain('"bottom_employee"');
      expect(stringified).not.toContain('"bottom_employees"');
    }
  });

  // TC-09: Direct alias /api/dashboard
  it('TC-09: Direct alias route /api/dashboard works with identical role-based behavior', async () => {
    const token = generateToken(emp1Id, 'EMPLOYEE', emp1Id);

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('EMPLOYEE');
  });

  // TC-10: Evaluation Cycle filter parameter
  it('TC-10: Accepts optional cycleId query parameter', async () => {
    const token = generateToken(emp1Id, 'EMPLOYEE', emp1Id);

    const res = await request(app)
      .get(`/api/reports/dashboard?cycleId=${cycleId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.cycle.id).toBe(cycleId);
  });
});
