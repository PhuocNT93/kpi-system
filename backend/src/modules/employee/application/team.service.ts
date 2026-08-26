/**
 * TeamService — application-layer use cases for Team CRUD and Manager↔Team
 * scope validation.
 *
 * RBAC rules enforced here (BACKEND_NODE_RULES §4):
 *   CREATE / UPDATE / DEACTIVATE → HR_ADMIN or SYSTEM_ADMIN only
 *   READ (list / get)            → any authenticated role; Manager scope-filtered
 *   Manager assignment validation → same team, ACTIVE, MANAGER role, non-self, no circular chain
 *
 * Audit writes happen inside the same DB transaction as the business mutation.
 */

import { Pool, PoolClient } from 'pg';
import { Actor } from '../../../shared/auth/types.js';
import {
  Forbidden,
  NotFound,
  Conflict,
  BadRequest,
  Unprocessable,
} from '../../../api/app-error.js';
import {
  Team,
  TeamWithContext,
  CreateTeamParams,
  UpdateTeamParams,
} from '../domain/employee.domain.js';
import {
  TeamRepository,
  EmployeeRepository,
} from '../domain/employee.repository.js';

// ── Audit ────────────────────────────────────────────────────────────────────

async function writeAudit(
  client: PoolClient,
  params: {
    entityType: string;
    entityId: string;
    action: string;
    fieldName?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    reason?: string | null;
    performedBy: string | null;
  }
): Promise<void> {
  // Skip audit if no actor employee is linked (SYSTEM_ADMIN without employee row)
  if (!params.performedBy) return;

  await client.query(
    `INSERT INTO audit_log (entity_type, entity_id, action, field_name, old_value, new_value, reason, performed_by, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'API')`,
    [
      params.entityType,
      params.entityId,
      params.action,
      params.fieldName ?? null,
      params.oldValue ?? null,
      params.newValue ?? null,
      params.reason ?? null,
      params.performedBy,
    ]
  );
}

// ── Guard helpers ────────────────────────────────────────────────────────────

function requireHrOrAdmin(actor: Actor): void {
  if (actor.role !== 'HR_ADMIN' && actor.role !== 'SYSTEM_ADMIN') {
    throw new Forbidden('Only HR Admin or System Admin can perform this operation.');
  }
}

function requireManagerScope(actor: Actor, teamId: string): void {
  if (actor.role === 'MANAGER') {
    const managedIds = actor.managedTeamIds ?? [];
    if (!managedIds.includes(teamId)) {
      throw new Forbidden('You do not have access to this team.');
    }
  }
}

// ── TeamService ───────────────────────────────────────────────────────────────

export class TeamService {
  constructor(
    private teamRepo: TeamRepository,
    private employeeRepo: EmployeeRepository,
    private pool: Pool
  ) {}

  // ── List ─────────────────────────────────────────────────────────────────

  async getTeams(
    actor: Actor,
    filters: {
      departmentId?: string;
      active?: boolean;
      search?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ teams: Team[]; total: number }> {
    const limit = filters.pageSize ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    const queryParams: Parameters<TeamRepository['findMany']>[0] = {
      departmentId: filters.departmentId,
      active: filters.active,
      search: filters.search,
      limit,
      offset,
    };

    // Manager sees only their assigned team(s)
    if (actor.role === 'MANAGER') {
      const managedIds = actor.managedTeamIds ?? [];
      if (managedIds.length === 0) return { teams: [], total: 0 };
      queryParams.teamIds = managedIds;
    }

    return this.teamRepo.findMany(queryParams);
  }

  // ── Get by ID ────────────────────────────────────────────────────────────

  async getTeamById(actor: Actor, teamId: string): Promise<TeamWithContext> {
    const team = await this.teamRepo.findWithContext(teamId);
    if (!team) throw new NotFound(`Team with ID ${teamId}`);

    if (actor.role === 'MANAGER') {
      requireManagerScope(actor, teamId);
    }

    return team;
  }

  // ── Create ───────────────────────────────────────────────────────────────

  async createTeam(actor: Actor, params: CreateTeamParams): Promise<Team> {
    requireHrOrAdmin(actor);

    if (!params.code?.trim()) throw new BadRequest('Team code is required', 'TEAM_CODE_REQUIRED', 'code');
    if (!params.name?.trim()) throw new BadRequest('Team name is required', 'TEAM_NAME_REQUIRED', 'name');
    if (!params.departmentId?.trim()) throw new BadRequest('department_id is required', 'DEPARTMENT_ID_REQUIRED', 'department_id');

    // Validate department exists and is active
    await this.validateDepartment(params.departmentId);

    // Validate unique code
    const existing = await this.teamRepo.findByCode(params.code.trim());
    if (existing) {
      throw new Conflict(`Team code '${params.code}' already exists.`, 'DUPLICATE_TEAM_CODE');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const team = await this.teamRepo.create(
        {
          code: params.code.trim().toUpperCase(),
          name: params.name.trim(),
          departmentId: params.departmentId,
          description: params.description ?? null,
        },
        actor.employeeId ?? null,
        client
      );

      await writeAudit(client, {
        entityType: 'team',
        entityId: team.teamId,
        action: 'TEAM_CREATED',
        newValue: JSON.stringify({ code: team.code, name: team.name, department_id: team.departmentId }),
        performedBy: actor.employeeId ?? null,
      });

      await client.query('COMMIT');
      return team;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────

  async updateTeam(actor: Actor, teamId: string, params: UpdateTeamParams & { code?: string }): Promise<Team> {
    requireHrOrAdmin(actor);

    const existing = await this.teamRepo.findById(teamId);
    if (!existing) throw new NotFound(`Team with ID ${teamId}`);

    // Code is immutable after creation (BACKEND_NODE_RULES §3)
    if (params.code !== undefined && params.code !== existing.code) {
      throw new Unprocessable('Team code cannot be changed after creation.', 'TEAM_CODE_IMMUTABLE');
    }

    // Validate new department if provided
    if (params.departmentId && params.departmentId !== existing.departmentId) {
      await this.validateDepartment(params.departmentId);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const updated = await this.teamRepo.update(teamId, params, actor.employeeId ?? null, client);

      // Audit changed fields
      const changedFields: Array<{ field: string; old: string | null; new: string | null }> = [];
      if (params.name && params.name !== existing.name) {
        changedFields.push({ field: 'name', old: existing.name, new: updated.name });
      }
      if (params.departmentId && params.departmentId !== existing.departmentId) {
        changedFields.push({ field: 'department_id', old: existing.departmentId, new: updated.departmentId });
      }
      if (params.description !== undefined && params.description !== existing.description) {
        changedFields.push({ field: 'description', old: existing.description ?? null, new: updated.description ?? null });
      }

      for (const field of changedFields) {
        await writeAudit(client, {
          entityType: 'team',
          entityId: teamId,
          action: 'TEAM_UPDATED',
          fieldName: field.field,
          oldValue: field.old,
          newValue: field.new,
          performedBy: actor.employeeId ?? null,
        });
      }

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Deactivate ───────────────────────────────────────────────────────────

  async deactivateTeam(actor: Actor, teamId: string): Promise<Team> {
    requireHrOrAdmin(actor);

    const existing = await this.teamRepo.findById(teamId);
    if (!existing) throw new NotFound(`Team with ID ${teamId}`);
    if (!existing.active) {
      throw new Conflict(`Team with ID ${teamId} is already inactive.`, 'TEAM_ALREADY_INACTIVE');
    }

    const activeMembers = await this.teamRepo.countActiveMembers(teamId);
    if (activeMembers > 0) {
      throw new Unprocessable(
        `Cannot deactivate team: it has ${activeMembers} active employee(s). Reassign them first.`,
        'TEAM_HAS_ACTIVE_MEMBERS'
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const updated = await this.teamRepo.update(teamId, { active: false }, actor.employeeId ?? null, client);

      await writeAudit(client, {
        entityType: 'team',
        entityId: teamId,
        action: 'TEAM_DEACTIVATED',
        oldValue: 'true',
        newValue: 'false',
        performedBy: actor.employeeId ?? null,
      });

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Manager Assignment Validation ────────────────────────────────────────

  /**
   * Validates that newManagerId can be assigned as manager to the employee.
   *
   * Rules:
   *  1. newManagerId must exist and be ACTIVE
   *  2. newManagerId must have MANAGER role (user_account.access_role = 'MANAGER')
   *  3. newManagerId cannot be the same as employeeId (self-management)
   *  4. newManagerId must be in the same team as the employee
   *  5. No circular manager chain
   */
  async validateManagerAssignment(
    employeeId: string,
    newManagerId: string | null,
    employeeTeamId: string | null
  ): Promise<void> {
    if (!newManagerId) return; // Clearing manager is always allowed

    if (employeeId === newManagerId) {
      throw new BadRequest('An employee cannot be their own manager.', 'SELF_MANAGER_NOT_ALLOWED', 'manager_id');
    }

    const manager = await this.employeeRepo.findById(newManagerId);
    if (!manager) {
      throw new NotFound(`Manager employee with ID ${newManagerId}`);
    }

    if (manager.employmentStatus !== 'ACTIVE') {
      throw new Unprocessable(
        'The designated manager is not active and cannot be assigned.',
        'MANAGER_NOT_ACTIVE'
      );
    }

    // Validate manager role via user_account
    const hasManagerRole = await this.checkIsManagerRole(newManagerId);
    if (!hasManagerRole) {
      throw new Unprocessable(
        'The designated employee does not have the MANAGER access role.',
        'MANAGER_ROLE_REQUIRED'
      );
    }

    // Same-team validation
    if (employeeTeamId && manager.teamId !== employeeTeamId) {
      throw new Unprocessable(
        'The manager must belong to the same team as the employee.',
        'MANAGER_DIFFERENT_TEAM'
      );
    }

    // Circular chain check
    await this.detectCircularManagerChain(employeeId, newManagerId);
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private async validateDepartment(departmentId: string): Promise<void> {
    const res = await this.pool.query(
      `SELECT department_id, active FROM department WHERE department_id = $1`,
      [departmentId]
    );
    if (res.rows.length === 0) {
      throw new NotFound(`Department with ID ${departmentId}`);
    }
    if (!res.rows[0].active) {
      throw new Unprocessable(
        `Department with ID ${departmentId} is inactive and cannot be assigned to a team.`,
        'DEPARTMENT_INACTIVE'
      );
    }
  }

  private async checkIsManagerRole(employeeId: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT ua.access_role
       FROM user_account ua
       WHERE ua.employee_id = $1
       LIMIT 1`,
      [employeeId]
    );
    if (res.rows.length === 0) return false;
    return res.rows[0].access_role === 'MANAGER';
  }

  private async detectCircularManagerChain(employeeId: string, targetManagerId: string): Promise<void> {
    let currentId: string | null = targetManagerId;
    const visited = new Set<string>([employeeId]);

    while (currentId) {
      if (visited.has(currentId)) {
        throw new BadRequest(
          `Assigning this manager would create a circular reporting chain.`,
          'CIRCULAR_MANAGER_RELATIONSHIP',
          'manager_id'
        );
      }
      visited.add(currentId);
      const mgr = await this.employeeRepo.findById(currentId);
      if (!mgr) break;
      currentId = mgr.managerId;
    }
  }
}
