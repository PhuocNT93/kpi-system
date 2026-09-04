/**
 * team-crud-rbac.test.ts
 *
 * Tests Team CRUD RBAC, scope validation, domain invariants, and
 * Manager assignment rules using in-memory fakes (no live DB required).
 *
 * Positive cases:  HR_ADMIN creates / updates / deactivates teams
 * Negative cases:  MANAGER / EMPLOYEE blocked on write operations
 * Scope cases:     Manager scope filter; foreign-team access rejected
 * Domain cases:    Missing dept, duplicate code, active-member guard, code immutability
 * Manager cases:   Same-team, active, role, non-self, no-circular validations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeamService } from '../src/modules/employee/application/team.service.js';
import { Team, TeamWithContext } from '../src/modules/employee/domain/employee.domain.js';
import type { TeamRepository, EmployeeRepository } from '../src/modules/employee/domain/employee.repository.js';
import type { Actor } from '../src/shared/auth/types.js';

// ── In-memory Team Repository ───────────────────────────────────────────────

class InMemoryTeamRepository implements TeamRepository {
  private teams: Map<string, Team & { memberCount: number; activeMemberCount: number }> = new Map();
  private idCounter = 0;

  async findById(teamId: string) {
    return this.teams.get(teamId) ?? null;
  }
  async findByCode(code: string) {
    return [...this.teams.values()].find(t => t.code.toLowerCase() === code.toLowerCase()) ?? null;
  }
  async findMany(params: any) {
    let list = [...this.teams.values()];
    if (params.departmentId) list = list.filter(t => t.departmentId === params.departmentId);
    if (params.active !== undefined) list = list.filter(t => t.active === params.active);
    if (params.teamIds) list = list.filter(t => params.teamIds.includes(t.teamId));
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
    }
    return { teams: list as Team[], total: list.length };
  }
  async findWithContext(teamId: string): Promise<TeamWithContext | null> {
    const t = this.teams.get(teamId);
    if (!t) return null;
    return { ...t };
  }
  async create(params: any, _actorId: string | null) {
    const id = `team-${++this.idCounter}`;
    const team: Team & { memberCount: number; activeMemberCount: number } = {
      teamId: id,
      departmentId: params.departmentId,
      code: params.code,
      name: params.name,
      description: params.description ?? null,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberCount: 0,
      activeMemberCount: 0,
    };
    this.teams.set(id, team);
    return team;
  }
  async update(teamId: string, params: any, _actorId: string | null) {
    const t = this.teams.get(teamId);
    if (!t) throw new Error('NOT_FOUND');
    const updated = {
      ...t,
      ...(params.name !== undefined ? { name: params.name } : {}),
      ...(params.departmentId !== undefined ? { departmentId: params.departmentId } : {}),
      ...(params.description !== undefined ? { description: params.description } : {}),
      ...(params.active !== undefined ? { active: params.active } : {}),
    };
    this.teams.set(teamId, updated);
    return updated;
  }
  async countActiveMembers(teamId: string) {
    return this.teams.get(teamId)?.activeMemberCount ?? 0;
  }

  // Test helper
  seed(team: Partial<Team> & { teamId: string; activeMemberCount?: number }) {
    this.teams.set(team.teamId, {
      departmentId: 'dept-1',
      code: team.code ?? 'TM',
      name: team.name ?? 'Team',
      description: null,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberCount: 0,
      activeMemberCount: team.activeMemberCount ?? 0,
      ...team,
    } as any);
  }
}

// ── In-memory Employee Repository (partial) ─────────────────────────────────

class InMemoryEmployeeRepository implements Partial<EmployeeRepository> {
  private employees = new Map<string, any>();

  async findById(id: string) {
    return this.employees.get(id) ?? null;
  }
  async findMany(_params: any) { return { employees: [], total: 0 }; }

  seed(emp: any) { this.employees.set(emp.employeeId, emp); }
}

// ── Mock Pool ────────────────────────────────────────────────────────────────

function buildMockPool(deptRow?: { active: boolean }, userRow?: { access_role: string }) {
  return {
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }),
    query: vi.fn().mockImplementation((sql: string, _params: any[]) => {
      if (sql.includes('FROM department')) {
        return Promise.resolve({ rows: deptRow ? [deptRow] : [] });
      }
      if (sql.includes('FROM user_account')) {
        return Promise.resolve({ rows: userRow ? [userRow] : [] });
      }
      return Promise.resolve({ rows: [] });
    }),
  } as any;
}

// ── Actors ───────────────────────────────────────────────────────────────────

const HR_ADMIN: Actor = { userId: 'u1', role: 'HR_ADMIN', employeeId: 'emp-hr', managedTeamIds: [] };
const SYSTEM_ADMIN: Actor = { userId: 'u2', role: 'SYSTEM_ADMIN', employeeId: undefined, managedTeamIds: [] };
const MANAGER: Actor = { userId: 'u3', role: 'MANAGER', employeeId: 'emp-mgr', managedTeamIds: ['team-1'] };
const EMPLOYEE: Actor = { userId: 'u4', role: 'EMPLOYEE', employeeId: 'emp-4', managedTeamIds: [] };

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TeamService — CRUD RBAC', () => {
  let teamRepo: InMemoryTeamRepository;
  let employeeRepo: InMemoryEmployeeRepository;
  let pool: ReturnType<typeof buildMockPool>;
  let svc: TeamService;

  beforeEach(() => {
    teamRepo = new InMemoryTeamRepository();
    employeeRepo = new InMemoryEmployeeRepository();
    pool = buildMockPool({ active: true });
    svc = new TeamService(teamRepo, employeeRepo as any, pool, { record: vi.fn() } as any);
  });

  // ── CREATE ──────────────────────────────────────────────────────────────

  describe('createTeam', () => {
    it('HR_ADMIN can create a team (200+)', async () => {
      const team = await svc.createTeam(HR_ADMIN, {
        code: 'FRONTEND',
        name: 'Frontend Team',
        departmentId: 'dept-1',
      });
      expect(team.teamId).toBeDefined();
      expect(team.code).toBe('FRONTEND');
    });

    it('SYSTEM_ADMIN can create a team', async () => {
      const team = await svc.createTeam(SYSTEM_ADMIN, {
        code: 'OPS',
        name: 'Operations',
        departmentId: 'dept-1',
      });
      expect(team.code).toBe('OPS');
    });

    it('MANAGER is forbidden from creating a team (403)', async () => {
      await expect(
        svc.createTeam(MANAGER, { code: 'XY', name: 'XY', departmentId: 'dept-1' })
      ).rejects.toMatchObject({ status: 403 });
    });

    it('EMPLOYEE is forbidden from creating a team (403)', async () => {
      await expect(
        svc.createTeam(EMPLOYEE, { code: 'XY', name: 'XY', departmentId: 'dept-1' })
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rejects missing code (400)', async () => {
      await expect(
        svc.createTeam(HR_ADMIN, { code: '', name: 'Frontend Team', departmentId: 'dept-1' })
      ).rejects.toMatchObject({ status: 400, code: 'TEAM_CODE_REQUIRED' });
    });

    it('rejects missing department_id (400)', async () => {
      await expect(
        svc.createTeam(HR_ADMIN, { code: 'FE', name: 'Frontend Team', departmentId: '' })
      ).rejects.toMatchObject({ status: 400, code: 'DEPARTMENT_ID_REQUIRED' });
    });

    it('rejects non-existent department (404)', async () => {
      const poolNoDept = buildMockPool(undefined); // returns empty row
      const svcNoDept = new TeamService(teamRepo, employeeRepo as any, poolNoDept);
      await expect(
        svcNoDept.createTeam(HR_ADMIN, { code: 'FE', name: 'FE Team', departmentId: 'no-dept' })
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rejects inactive department (422)', async () => {
      const poolInactiveDept = buildMockPool({ active: false });
      const svcInactive = new TeamService(teamRepo, employeeRepo as any, poolInactiveDept);
      await expect(
        svcInactive.createTeam(HR_ADMIN, { code: 'FE', name: 'FE Team', departmentId: 'dept-inactive' })
      ).rejects.toMatchObject({ status: 422, code: 'DEPARTMENT_INACTIVE' });
    });

    it('rejects duplicate code (409)', async () => {
      teamRepo.seed({ teamId: 'team-existing', code: 'FRONTEND' });
      await expect(
        svc.createTeam(HR_ADMIN, { code: 'FRONTEND', name: 'Frontend 2', departmentId: 'dept-1' })
      ).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_TEAM_CODE' });
    });
  });

  // ── GET LIST (scope) ─────────────────────────────────────────────────────

  describe('getTeams — scope filtering', () => {
    beforeEach(() => {
      teamRepo.seed({ teamId: 'team-1', code: 'FE', name: 'Frontend' });
      teamRepo.seed({ teamId: 'team-2', code: 'BE', name: 'Backend' });
    });

    it('HR_ADMIN sees all teams', async () => {
      const result = await svc.getTeams(HR_ADMIN, {});
      expect(result.total).toBe(2);
    });

    it('Manager sees only managed team(s)', async () => {
      const result = await svc.getTeams(MANAGER, {});
      expect(result.total).toBe(1);
      expect(result.teams[0].teamId).toBe('team-1');
    });

    it('Manager with no managedTeamIds sees nothing', async () => {
      const managerNoTeam: Actor = { ...MANAGER, managedTeamIds: [] };
      const result = await svc.getTeams(managerNoTeam, {});
      expect(result.total).toBe(0);
    });

    it('Employee sees all teams (reference only — no filter)', async () => {
      const result = await svc.getTeams(EMPLOYEE, {});
      expect(result.total).toBe(2);
    });
  });

  // ── GET BY ID (scope) ────────────────────────────────────────────────────

  describe('getTeamById — scope guard', () => {
    beforeEach(() => {
      teamRepo.seed({ teamId: 'team-1', code: 'FE', name: 'Frontend' });
      teamRepo.seed({ teamId: 'team-2', code: 'BE', name: 'Backend' });
    });

    it('HR_ADMIN can get any team', async () => {
      const team = await svc.getTeamById(HR_ADMIN, 'team-2');
      expect(team.teamId).toBe('team-2');
    });

    it('Manager can get their own team', async () => {
      const team = await svc.getTeamById(MANAGER, 'team-1');
      expect(team.teamId).toBe('team-1');
    });

    it('Manager gets 403 for a foreign team', async () => {
      await expect(svc.getTeamById(MANAGER, 'team-2')).rejects.toMatchObject({ status: 403 });
    });

    it('returns 404 for non-existent team', async () => {
      await expect(svc.getTeamById(HR_ADMIN, 'ghost')).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── UPDATE ───────────────────────────────────────────────────────────────

  describe('updateTeam', () => {
    beforeEach(() => {
      teamRepo.seed({ teamId: 'team-1', code: 'FE', name: 'Frontend', departmentId: 'dept-1' });
    });

    it('HR_ADMIN can update name', async () => {
      const updated = await svc.updateTeam(HR_ADMIN, 'team-1', { name: 'Frontend Revamped' });
      expect(updated.name).toBe('Frontend Revamped');
    });

    it('MANAGER cannot update team (403)', async () => {
      await expect(svc.updateTeam(MANAGER, 'team-1', { name: 'New' })).rejects.toMatchObject({ status: 403 });
    });

    it('rejects code change (422 TEAM_CODE_IMMUTABLE)', async () => {
      await expect(
        svc.updateTeam(HR_ADMIN, 'team-1', { code: 'BE' } as any)
      ).rejects.toMatchObject({ status: 422, code: 'TEAM_CODE_IMMUTABLE' });
    });

    it('returns 404 for non-existent team', async () => {
      await expect(svc.updateTeam(HR_ADMIN, 'ghost', { name: 'X' })).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── DEACTIVATE ───────────────────────────────────────────────────────────

  describe('deactivateTeam', () => {
    it('HR_ADMIN can deactivate a team with no active members', async () => {
      teamRepo.seed({ teamId: 'team-1', code: 'FE', name: 'Frontend', activeMemberCount: 0 });
      const team = await svc.deactivateTeam(HR_ADMIN, 'team-1');
      expect(team.active).toBe(false);
    });

    it('rejects deactivation when team has active employees (422)', async () => {
      teamRepo.seed({ teamId: 'team-1', code: 'FE', name: 'Frontend', activeMemberCount: 3 });
      await expect(svc.deactivateTeam(HR_ADMIN, 'team-1')).rejects.toMatchObject({
        status: 422,
        code: 'TEAM_HAS_ACTIVE_MEMBERS',
      });
    });

    it('MANAGER cannot deactivate (403)', async () => {
      teamRepo.seed({ teamId: 'team-1', activeMemberCount: 0 });
      await expect(svc.deactivateTeam(MANAGER, 'team-1')).rejects.toMatchObject({ status: 403 });
    });

    it('returns 404 for non-existent team', async () => {
      await expect(svc.deactivateTeam(HR_ADMIN, 'ghost')).rejects.toMatchObject({ status: 404 });
    });

    it('rejects if team is already inactive (409)', async () => {
      teamRepo.seed({ teamId: 'team-1', code: 'FE', name: 'FE', active: false, activeMemberCount: 0 });
      await expect(svc.deactivateTeam(HR_ADMIN, 'team-1')).rejects.toMatchObject({ status: 409 });
    });
  });
});

// ── Manager Assignment Validation ─────────────────────────────────────────────

describe('TeamService — validateManagerAssignment', () => {
  let teamRepo: InMemoryTeamRepository;
  let employeeRepo: InMemoryEmployeeRepository;
  let pool: ReturnType<typeof buildMockPool>;
  let svc: TeamService;

  beforeEach(() => {
    teamRepo = new InMemoryTeamRepository();
    employeeRepo = new InMemoryEmployeeRepository();
    pool = buildMockPool({ active: true }, { access_role: 'MANAGER' });
    svc = new TeamService(teamRepo, employeeRepo as any, pool);

    // Seed a MANAGER employee
    employeeRepo.seed({
      employeeId: 'mgr-1',
      employmentStatus: 'ACTIVE',
      teamId: 'team-1',
      managerId: null,
    });
  });

  it('passes when manager is valid (same team, ACTIVE, MANAGER role)', async () => {
    await expect(
      svc.validateManagerAssignment('emp-1', 'mgr-1', 'team-1')
    ).resolves.toBeUndefined();
  });

  it('passes when newManagerId is null (clearing manager)', async () => {
    await expect(
      svc.validateManagerAssignment('emp-1', null, 'team-1')
    ).resolves.toBeUndefined();
  });

  it('rejects self-assignment (400 SELF_MANAGER_NOT_ALLOWED)', async () => {
    await expect(
      svc.validateManagerAssignment('mgr-1', 'mgr-1', 'team-1')
    ).rejects.toMatchObject({ status: 400, code: 'SELF_MANAGER_NOT_ALLOWED' });
  });

  it('rejects non-existent manager (404)', async () => {
    await expect(
      svc.validateManagerAssignment('emp-1', 'ghost-mgr', 'team-1')
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects inactive manager (422 MANAGER_NOT_ACTIVE)', async () => {
    employeeRepo.seed({ employeeId: 'mgr-inactive', employmentStatus: 'INACTIVE', teamId: 'team-1', managerId: null });
    await expect(
      svc.validateManagerAssignment('emp-1', 'mgr-inactive', 'team-1')
    ).rejects.toMatchObject({ status: 422, code: 'MANAGER_NOT_ACTIVE' });
  });

  it('rejects manager without MANAGER role (422 MANAGER_ROLE_REQUIRED)', async () => {
    const poolNoRole = buildMockPool({ active: true }, { access_role: 'EMPLOYEE' });
    const svcNoRole = new TeamService(teamRepo, employeeRepo as any, poolNoRole);
    await expect(
      svcNoRole.validateManagerAssignment('emp-1', 'mgr-1', 'team-1')
    ).rejects.toMatchObject({ status: 422, code: 'MANAGER_ROLE_REQUIRED' });
  });

  it('rejects manager from different team (422 MANAGER_DIFFERENT_TEAM)', async () => {
    await expect(
      svc.validateManagerAssignment('emp-1', 'mgr-1', 'team-OTHER')
    ).rejects.toMatchObject({ status: 422, code: 'MANAGER_DIFFERENT_TEAM' });
  });

  it('rejects circular chain (400 CIRCULAR_MANAGER_RELATIONSHIP)', async () => {
    // A -> B -> C -> A scenario: emp-A's manager is mgr-1, mgr-1's manager is emp-A
    employeeRepo.seed({ employeeId: 'mgr-1', employmentStatus: 'ACTIVE', teamId: 'team-1', managerId: 'emp-A' });
    await expect(
      svc.validateManagerAssignment('emp-A', 'mgr-1', 'team-1')
    ).rejects.toMatchObject({ status: 400, code: 'CIRCULAR_MANAGER_RELATIONSHIP' });
  });
});
