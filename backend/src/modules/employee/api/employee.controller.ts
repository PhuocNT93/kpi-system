import { Request, Response } from 'express';
import type { Pool } from 'pg';
import { sendSuccess, sendCollection, sendCreated } from '../../../api/http-response.js';
import { parsePaginationQuery } from '../../../api/pagination.js';
import { AppError, BadRequest, NotFound, Conflict, Forbidden, Unprocessable, Unauthenticated } from '../../../api/app-error.js';
import { EmployeeRepository, EmployeeAssignmentRepository } from '../domain/employee.repository.js';
import { EmployeeContextService } from '../application/employee-context.service.js';
import { TeamService } from '../application/team.service.js';
import { EmploymentStatus, Employee, EmployeeAssignment, EvaluationOrganizationContext, Team, TeamWithContext } from '../domain/employee.domain.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { SimplePasswordHasher } from '../../auth/services/password-hasher.service.js';

import { EvaluationService } from '../../evaluation/application/services/evaluation.service.js';
import { EmployeeCadenceService, toEffectiveCadenceResponse } from '../application/employee-cadence.service.js';
import { EffectiveCadence } from '../domain/review-schedule.js';

/** Optional FK fields: '' means "none" (null). */
const NULLABLE_UUID_FIELDS = ['manager_id', 'team_id', 'department_id'] as const;
/** Required FK fields: '' means "not provided" (keep the current value). */
const REQUIRED_UUID_FIELDS = ['role_id', 'job_level_id'] as const;

function normalizeEmptyUuidFields(body: Record<string, unknown> | undefined): void {
  if (!body) return;
  for (const key of NULLABLE_UUID_FIELDS) {
    if (body[key] === '') body[key] = null;
  }
  for (const key of REQUIRED_UUID_FIELDS) {
    if (body[key] === '') delete body[key];
  }
}

export class EmployeeController {
  constructor(
    private employeeRepo?: EmployeeRepository,
    private assignmentRepo?: EmployeeAssignmentRepository,
    private contextService?: EmployeeContextService,
    private pool?: Pool,
    private teamService?: TeamService,
    private evaluationService?: EvaluationService,
    private employeeCadenceService?: EmployeeCadenceService
  ) {}

  private hasDb(): boolean {
    return !!(this.pool && typeof this.pool.query === 'function');
  }

  private async assertEntityActive(table: string, idColumn: string, id: string | null, label: string): Promise<void> {
    if (!id || !this.hasDb()) return;
    const res = await this.pool!.query(`SELECT active FROM ${table} WHERE ${idColumn} = $1`, [id]);
    if (res.rows.length === 0) {
      throw new NotFound(`${label} with ID ${id}`);
    }
    if (!res.rows[0].active) {
      throw new Unprocessable(`${label} is inactive and cannot be assigned.`, `${label.toUpperCase().replace(/ /g, '_')}_INACTIVE`);
    }
  }

// ── Employee ─────────────────────────────────────────────────────────────

  async getEmployees(req: Request, res: Response): Promise<void> {
    const { limit, offset, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);

    if (this.employeeRepo && this.hasDb()) {
      console.log('Fetching employees with limit:', limit, 'and offset:', offset);
      const result = await this.employeeRepo.findMany({ limit, offset });
      const cadences = this.employeeCadenceService
        ? await this.employeeCadenceService.resolveEffectiveCadences(result.employees.map((emp) => emp.employeeId))
        : new Map<string, EffectiveCadence | null>();
      const data = result.employees.map((emp) => ({
        ...this.mapEmployeeToResponse(emp),
        effective_cadence: toEffectiveCadenceResponse(cadences.get(emp.employeeId)),
      }));
      sendCollection(res, 'Employees retrieved successfully', data, buildPageMeta(result.total));
      return;
    }

    sendCollection(res, 'Employees retrieved successfully', [], buildPageMeta(0));
  }

  async searchEmployees(req: Request, res: Response): Promise<void> {
    // Explicit validation: size > 100 must return 400 (supports both page_size and size aliases)
    const rawSize = Number(req.query['page_size'] ?? req.query['size']);
    if (!isNaN(rawSize) && Number.isInteger(rawSize) && rawSize > 100) {
      throw new BadRequest('page_size must be between 1 and 100', 'VALIDATION_ERROR', 'size');
    }

    const { limit, offset, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    const validatedQuery = req.query as Record<string, string | undefined>;
    const actor = getActorFromContext(req);

    if (!actor) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (this.employeeRepo && this.hasDb()) {
      try {
        const result = await this.employeeRepo.search(
          {
            employeeId: validatedQuery.employee_id,
            name: validatedQuery.name,
            email: validatedQuery.email,
            department: validatedQuery.department,
            team: validatedQuery.team,
            role: validatedQuery.role,
            jobLevel: validatedQuery.job_level,
            manager: validatedQuery.manager,
            evaluationCycle: validatedQuery.evaluation_cycle,
            evaluationStatus: validatedQuery.evaluation_status,
            q: validatedQuery.q,
            limit,
            offset,
          },
          actor
        );

        sendCollection(res, 'Employees retrieved successfully.', result.employees, buildPageMeta(result.total));
        return;
      } catch (error: unknown) {
        console.log('[DEBUG searchEmployees error]', (error as Error)?.message, (error as Error)?.stack, error);
        throw error;
      }
    }

    sendCollection(res, 'Employees retrieved successfully.', [], buildPageMeta(0));
  }

  async getEmployeeKpiSummary(req: Request, res: Response): Promise<void> {
    const actor = getActorFromContext(req);
    if (!actor) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const employeeId: string = (req.params['id'] ?? req.params['employeeId']) as string;
    // Extract string from Express query param (handles string | string[] | ParsedQs | undefined)
    function toQueryString(v: unknown): string | undefined {
      if (typeof v === 'string') return v;
      if (Array.isArray(v) && typeof v[0] === 'string') return v[0] as string;
      return undefined;
    }
    const evaluationCycleId = toQueryString(req.query['evaluation_cycle_id']) ?? toQueryString(req.query['evaluationCycleId']);

    if (!evaluationCycleId) {
      throw new BadRequest('evaluation_cycle_id is required', 'VALIDATION_ERROR', 'evaluation_cycle_id');
    }

    // Validate UUID format
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(evaluationCycleId)) {
      throw new BadRequest('evaluation_cycle_id must be a valid UUID', 'VALIDATION_ERROR', 'evaluation_cycle_id');
    }

    if (!this.evaluationService) {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'KPI Summary service is not available.');
    }

    const cycleIdStr: string = evaluationCycleId;
    const summary = await this.evaluationService.getEmployeeKpiSummary(employeeId, cycleIdStr, actor);
    sendSuccess(res, 200, 'Employee KPI summary retrieved successfully.', summary);
  }

  async createEmployee(req: Request, res: Response): Promise<void> {
    const {
      employee_code,
      full_name,
      email,
      department_id,
      team_id,
      role_id,
      job_level_id,
      manager_id,
      employment_status,
      join_date,
      review_cadence_override_id,
    } = req.body || {};
    // review_cadence / review_cadence_months / last_evaluation_completed_at / next_review_due_date are
    // server-owned (ReviewScheduleService) and deliberately ignored here.

    const empCode = employee_code || req.body?.code || `EMP-${Date.now()}`;
    const fullName = full_name || req.body?.name || 'New Employee';
    const empEmail = email || `emp-${Date.now()}@example.com`;
    
    if (!role_id) throw new BadRequest('Role ID is required');
    if (!job_level_id) throw new BadRequest('Job Level ID is required');
    if (!department_id) throw new BadRequest('Department ID is required');

    const joinDate = join_date || new Date().toISOString().slice(0, 10);

    if (this.employeeRepo && this.hasDb()) {
      const status = employment_status || EmploymentStatus.ACTIVE;
      if (status === EmploymentStatus.ACTIVE) {
        await this.assertEntityActive('department', 'department_id', department_id, 'Department');
        await this.assertEntityActive('team', 'team_id', team_id, 'Team');
        await this.assertEntityActive('role', 'role_id', role_id, 'Job Role');
        await this.assertEntityActive('job_level', 'job_level_id', job_level_id, 'Job Level');
      }
      // A new employee has no completed evaluation, so the override needs no schedule recalculation.
      await this.assertEntityActive('review_cadence', 'review_cadence_id', review_cadence_override_id || null, 'Review Cadence');

      if (department_id && team_id) {
        const teamRes = await this.pool!.query('SELECT department_id FROM team WHERE team_id = $1', [team_id]);
        if (teamRes.rows.length > 0 && teamRes.rows[0].department_id !== department_id) {
          throw new Unprocessable('Team does not belong to the selected Department', 'TEAM_DEPARTMENT_MISMATCH');
        }
      }

      const existingCode = await this.employeeRepo.findByCode(empCode);
      if (existingCode && employee_code) {
        throw new Conflict(`Employee with code ${empCode} already exists`, 'DUPLICATE_EMPLOYEE_CODE');
      }

      const created = await this.employeeRepo.create({
        employeeCode: empCode,
        fullName: fullName,
        email: empEmail,
        departmentId: department_id || null,
        teamId: team_id || null,
        roleId: role_id,
        jobLevelId: job_level_id,
        managerId: manager_id || null,
        employmentStatus: employment_status || EmploymentStatus.ACTIVE,
        joinDate: joinDate,
        reviewCadenceOverrideId: review_cadence_override_id || null,
      });

      if (this.assignmentRepo && department_id && team_id) {
        await this.assignmentRepo.create({
          employeeId: created.employeeId,
          departmentId: department_id,
          teamId: team_id,
          roleId: role_id,
          jobLevelId: job_level_id,
          managerId: manager_id || null,
          effectiveFrom: joinDate,
          effectiveTo: null,
          changeReason: 'INITIAL_HIRING',
        });
      }

      // Automatically create or link default app_user account
      if (this.hasDb() && this.pool) {
        try {
          const normalizedEmail = empEmail.toLowerCase().trim();
          const userRes = await this.pool.query(
            'SELECT id, employee_id FROM app_user WHERE LOWER(email) = $1',
            [normalizedEmail]
          );

          let userId: string;
          if (userRes.rows.length > 0) {
            userId = userRes.rows[0].id;
            if (!userRes.rows[0].employee_id) {
              await this.pool.query(
                'UPDATE app_user SET employee_id = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                [created.employeeId, fullName, userId]
              );
            }
          } else {
            const hasher = new SimplePasswordHasher();
            const defaultPassword = 'Welcome@123';
            const passwordHash = await hasher.hash(defaultPassword);
            const insertUserRes = await this.pool.query(
              `INSERT INTO app_user (id, email, name, password_hash, employee_id, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING id`,
              [normalizedEmail, fullName, passwordHash, created.employeeId]
            );
            userId = insertUserRes.rows[0].id;
          }

          // Assign default EMPLOYEE system role if not already assigned
          const roleRes = await this.pool.query(
            "SELECT role_id FROM role WHERE code = 'EMPLOYEE' LIMIT 1"
          );
          if (roleRes.rows.length > 0 && userId) {
            const roleId = roleRes.rows[0].role_id;
            await this.pool.query(
              `INSERT INTO user_role (user_id, role_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [userId, roleId]
            );
          }
        } catch (accountErr) {
          console.error('Failed to auto-create default app_user for employee:', accountErr);
        }
      }

      sendSuccess(res, 201, 'Employee created successfully', this.mapEmployeeToResponse(created));
      return;
    }

    sendSuccess(res, 201, 'Employee created successfully', { id: 'mock-id', ...req.body });
  }

  async getEmployeeById(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    if (this.employeeRepo && this.hasDb()) {
      const emp = await this.employeeRepo.findById(employeeId);
      if (!emp) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }
      const responseData: Record<string, unknown> = this.mapEmployeeToResponse(emp);
      if (this.employeeCadenceService) {
        const cadences = await this.employeeCadenceService.resolveEffectiveCadences([employeeId]);
        responseData['effective_cadence'] = toEffectiveCadenceResponse(cadences.get(employeeId));
      }
      sendSuccess(res, 200, 'Employee retrieved successfully', responseData);
      return;
    }

    sendSuccess(res, 200, 'Employee retrieved successfully', { id: employeeId });
  }

  async updateReviewCadenceOverride(req: Request, res: Response): Promise<void> {
    const actor = getActorFromContext(req);
    if (!actor) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const employeeId = req.params.employeeId as string;
    const { review_cadence_override_id, reviewCadenceOverrideId, reason } = req.body || {};
    const overrideId = review_cadence_override_id !== undefined ? review_cadence_override_id : reviewCadenceOverrideId;

    if (!this.employeeCadenceService) {
      throw new AppError(500, 'SERVICE_UNAVAILABLE', 'Employee cadence service is not configured');
    }

    const result = await this.employeeCadenceService.updateCadenceOverride(actor, employeeId, {
      review_cadence_override_id: overrideId ?? null,
      reason,
    });

    sendSuccess(res, 200, 'Employee review cadence override updated successfully.', result);
  }

  async getEmployeeReviewCadence(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    if (!this.employeeCadenceService) {
      throw new AppError(500, 'SERVICE_UNAVAILABLE', 'Employee cadence service is not configured');
    }
    const result = await this.employeeCadenceService.getEmployeeCadenceInfo(employeeId);
    sendSuccess(res, 200, 'Employee review cadence fetched successfully.', result);
  }

  async updateEmployee(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    if (this.employeeRepo && this.hasDb()) {
      const existing = await this.employeeRepo.findById(employeeId);
      if (!existing) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }

      // Forms send '' for "no selection"; an empty string is not a valid uuid for these FK columns.
      normalizeEmptyUuidFields(req.body);

      const newManagerId = req.body.manager_id !== undefined ? req.body.manager_id : existing.managerId;
      const newTeamId = req.body.team_id ?? existing.teamId;

      // Validate manager assignment when manager_id is being changed
      if (this.teamService && req.body.manager_id !== undefined && req.body.manager_id !== existing.managerId) {
        await this.teamService.validateManagerAssignment(employeeId, newManagerId, newTeamId);
      }

      const nextStatus = req.body.employment_status ?? existing.employmentStatus;
      const targetDeptId = req.body.department_id !== undefined ? req.body.department_id : existing.departmentId;
      const targetTeamId = newTeamId;
      const targetRoleId = req.body.role_id !== undefined ? req.body.role_id : existing.roleId;
      const targetJobLevelId = req.body.job_level_id !== undefined ? req.body.job_level_id : existing.jobLevelId;

      if (targetDeptId && targetTeamId) {
        const teamRes = await this.pool!.query('SELECT department_id FROM team WHERE team_id = $1', [targetTeamId]);
        if (teamRes.rows.length > 0 && teamRes.rows[0].department_id !== targetDeptId) {
          throw new Unprocessable('Team does not belong to the selected Department', 'TEAM_DEPARTMENT_MISMATCH');
        }
      }

      if (nextStatus === EmploymentStatus.ACTIVE) {
        if (existing.employmentStatus !== EmploymentStatus.ACTIVE || (req.body.department_id && req.body.department_id !== existing.departmentId)) {
          await this.assertEntityActive('department', 'department_id', targetDeptId, 'Department');
        }
        if (existing.employmentStatus !== EmploymentStatus.ACTIVE || (req.body.team_id && req.body.team_id !== existing.teamId)) {
          await this.assertEntityActive('team', 'team_id', targetTeamId, 'Team');
        }
        if (existing.employmentStatus !== EmploymentStatus.ACTIVE || (req.body.role_id && req.body.role_id !== existing.roleId)) {
          await this.assertEntityActive('role', 'role_id', targetRoleId, 'Job Role');
        }
        if (existing.employmentStatus !== EmploymentStatus.ACTIVE || (req.body.job_level_id && req.body.job_level_id !== existing.jobLevelId)) {
          await this.assertEntityActive('job_level', 'job_level_id', targetJobLevelId, 'Job Level');
        }
      }

      // Review schedule fields (review_cadence, review_cadence_months, last_evaluation_completed_at,
      // next_review_due_date) are server-owned and ignored; a job level change recalculates the schedule.
      const nextEmployee: Employee = {
        ...existing,
        fullName: req.body.full_name ?? existing.fullName,
        email: req.body.email ?? existing.email,
        departmentId: req.body.department_id ?? existing.departmentId,
        teamId: newTeamId,
        roleId: req.body.role_id ?? existing.roleId,
        jobLevelId: req.body.job_level_id ?? existing.jobLevelId,
        managerId: newManagerId,
        employmentStatus: req.body.employment_status ?? existing.employmentStatus,
        terminationDate: req.body.termination_date ?? existing.terminationDate,
      };
      const actor = getActorFromContext(req);
      if (!actor) {
        throw new Unauthenticated('Authentication required');
      }
      const updated = this.employeeCadenceService
        ? await this.employeeCadenceService.updateEmployeeWithSchedule(actor, existing, nextEmployee)
        : await this.employeeRepo.update(nextEmployee);

      // Sync app_user name and email if changed
      if (this.hasDb() && this.pool && (req.body.full_name || req.body.email)) {
        try {
          await this.pool.query(
            `UPDATE app_user
             SET name = COALESCE($1, name),
                 email = COALESCE(LOWER($2), email),
                 updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $3`,
            [req.body.full_name?.trim() || null, req.body.email?.toLowerCase().trim() || null, employeeId]
          );
        } catch (syncErr) {
          console.error('Failed to sync app_user for updated employee:', syncErr);
        }
      }

      sendSuccess(res, 200, 'Employee updated successfully', this.mapEmployeeToResponse(updated));
      return;
    }

    sendSuccess(res, 200, 'Employee updated successfully', { id: employeeId, ...req.body });
  }

  async deactivateEmployee(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    if (this.employeeRepo && this.hasDb()) {
      const existing = await this.employeeRepo.findById(employeeId);
      if (!existing) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }
      const updated = await this.employeeRepo.update({
        ...existing,
        employmentStatus: EmploymentStatus.INACTIVE,
      });
      sendSuccess(res, 200, 'Employee deactivated successfully', this.mapEmployeeToResponse(updated));
      return;
    }
    sendSuccess(res, 200, 'Employee deactivated successfully', { id: employeeId, status: 'INACTIVE' });
  }

  async reactivateEmployee(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    if (this.employeeRepo && this.hasDb()) {
      const existing = await this.employeeRepo.findById(employeeId);
      if (!existing) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }
      if (existing.departmentId) {
        await this.assertEntityActive('department', 'department_id', existing.departmentId, 'Department');
      }
      if (existing.teamId) {
        await this.assertEntityActive('team', 'team_id', existing.teamId, 'Team');
      }
      if (existing.roleId) {
        await this.assertEntityActive('role', 'role_id', existing.roleId, 'Job Role');
      }
      if (existing.jobLevelId) {
        await this.assertEntityActive('job_level', 'job_level_id', existing.jobLevelId, 'Job Level');
      }
      const updated = await this.employeeRepo.update({
        ...existing,
        employmentStatus: EmploymentStatus.ACTIVE,
      });
      sendSuccess(res, 200, 'Employee reactivated successfully', this.mapEmployeeToResponse(updated));
      return;
    }
    sendSuccess(res, 200, 'Employee reactivated successfully', { id: employeeId, status: 'ACTIVE' });
  }

  async terminateEmployee(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    const termDate = req.body.termination_date || new Date().toISOString().slice(0, 10);
    if (this.employeeRepo && this.hasDb()) {
      const existing = await this.employeeRepo.findById(employeeId);
      if (!existing) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }
      const updated = await this.employeeRepo.update({
        ...existing,
        employmentStatus: EmploymentStatus.TERMINATED,
        terminationDate: termDate,
      });
      if (this.assignmentRepo) {
        await this.assignmentRepo.closeActiveAssignment(employeeId, termDate);
      }
      sendSuccess(res, 200, 'Employee terminated successfully', this.mapEmployeeToResponse(updated));
      return;
    }
    sendSuccess(res, 200, 'Employee terminated successfully', { id: employeeId, status: 'TERMINATED' });
  }

  async bulkUpdateEmployeeStatus(req: Request, res: Response): Promise<void> {
    const { employeeIds, status } = req.body || {};
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      throw new BadRequest('employeeIds array is required and must not be empty');
    }
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      throw new BadRequest('status must be either ACTIVE or INACTIVE');
    }

    if (this.hasDb()) {
      if (status === 'ACTIVE') {
        const checkQuery = `
          SELECT e.employee_id, e.full_name, e.employee_code,
                 d.active as dept_active, d.name as dept_name,
                 t.active as team_active, t.name as team_name,
                 r.active as role_active, r.name as role_name,
                 jl.active as level_active, jl.name as level_name
          FROM employee e
          LEFT JOIN department d ON e.department_id = d.department_id
          LEFT JOIN team t ON e.team_id = t.team_id
          LEFT JOIN role r ON e.role_id = r.role_id
          LEFT JOIN job_level jl ON e.job_level_id = jl.job_level_id
          WHERE e.employee_id = ANY($1::uuid[])
        `;
        const checkRes = await this.pool!.query(checkQuery, [employeeIds]);
        for (const row of checkRes.rows) {
          if (row.dept_active === false) {
            throw new Unprocessable(
              `Cannot activate employee "${row.full_name}" (${row.employee_code}): Department "${row.dept_name}" is inactive.`,
              'DEPARTMENT_INACTIVE'
            );
          }
          if (row.team_active === false) {
            throw new Unprocessable(
              `Cannot activate employee "${row.full_name}" (${row.employee_code}): Team "${row.team_name}" is inactive.`,
              'TEAM_INACTIVE'
            );
          }
          if (row.role_active === false) {
            throw new Unprocessable(
              `Cannot activate employee "${row.full_name}" (${row.employee_code}): Role "${row.role_name}" is inactive.`,
              'JOB_ROLE_INACTIVE'
            );
          }
          if (row.level_active === false) {
            throw new Unprocessable(
              `Cannot activate employee "${row.full_name}" (${row.employee_code}): Job Level "${row.level_name}" is inactive.`,
              'JOB_LEVEL_INACTIVE'
            );
          }
        }
      }

      const updateRes = await this.pool!.query(
        `UPDATE employee
         SET employment_status = $1, updated_at = NOW()
         WHERE employee_id = ANY($2::uuid[])`,
        [status, employeeIds]
      );

      sendSuccess(res, 200, `Successfully updated ${updateRes.rowCount} employee(s) to ${status}`, {
        updatedCount: updateRes.rowCount,
        status,
      });
      return;
    }

    sendSuccess(res, 200, `Successfully updated ${employeeIds.length} employee(s)`, {
      updatedCount: employeeIds.length,
      status,
    });
  }

  async getEmployeeAssignments(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    const { buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    if (this.employeeRepo && this.hasDb()) {
      const emp = await this.employeeRepo.findById(employeeId);
      if (!emp) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }
    }
    if (this.assignmentRepo && this.hasDb()) {
      const history = await this.assignmentRepo.findAssignmentHistory(employeeId);
      const data = history.map(this.mapAssignmentToResponse);
      sendCollection(res, 'Assignments retrieved successfully', data, buildPageMeta(history.length));
      return;
    }
    sendCollection(res, 'Assignments retrieved successfully', [], { number: 1, size: 20, total_items: 0, total_pages: 0 });
  }

  async getCurrentAssignment(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    if (this.employeeRepo && this.hasDb()) {
      const emp = await this.employeeRepo.findById(employeeId);
      if (!emp) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }
    }
    if (this.assignmentRepo && this.hasDb()) {
      const current = await this.assignmentRepo.findCurrentAssignment(employeeId);
      if (!current) {
        throw new NotFound(`Active assignment for employee ${employeeId}`);
      }
      sendSuccess(res, 200, 'Current assignment retrieved successfully', this.mapAssignmentToResponse(current));
      return;
    }
    sendSuccess(res, 200, 'Current assignment retrieved successfully', { employee_id: employeeId });
  }

  async createAssignment(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    const {
      department_id,
      team_id,
      role_id,
      job_level_id,
      manager_id,
      effective_from,
      effective_to,
      change_reason,
      change_note,
    } = req.body || {};

    if (this.employeeRepo && this.hasDb()) {
      const emp = await this.employeeRepo.findById(employeeId);
      if (!emp) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }
    }

    if (this.assignmentRepo && this.hasDb()) {
      if (this.contextService) {
        await this.contextService.validateAssignmentDates(employeeId, effective_from, effective_to || null);
        await this.contextService.validateManagerHierarchy(employeeId, manager_id || null);
      }

      await this.assignmentRepo.closeActiveAssignment(employeeId, effective_from);
      const created = await this.assignmentRepo.create({
        employeeId,
        departmentId: department_id,
        teamId: team_id,
        roleId: role_id,
        jobLevelId: job_level_id,
        managerId: manager_id || null,
        effectiveFrom: effective_from,
        effectiveTo: effective_to || null,
        changeReason: change_reason || 'TEAM_TRANSFER',
        changeNote: change_note || null,
      });

      sendSuccess(res, 201, 'Assignment created successfully', this.mapAssignmentToResponse(created));
      return;
    }

    sendSuccess(res, 201, 'Assignment created successfully', { id: 'mock-assign-id', employee_id: employeeId });
  }

  async getEmployeeContext(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    const atDate = (req.query.at as string) || new Date().toISOString().slice(0, 10);

    if (this.employeeRepo && this.hasDb()) {
      const emp = await this.employeeRepo.findById(employeeId);
      if (!emp) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }
    }

    if (this.contextService && this.hasDb()) {
      const assignment = await this.contextService.getAssignmentAt(employeeId, atDate);
      const deptRes = await this.pool!.query(`SELECT code, name FROM department WHERE department_id = $1`, [assignment.departmentId]);
      const teamRes = await this.pool!.query(`SELECT code, name FROM team WHERE team_id = $1`, [assignment.teamId]);
      const roleRes = await this.pool!.query(`SELECT code, name FROM role WHERE role_id = $1`, [assignment.roleId]);
      const levelRes = await this.pool!.query(`SELECT code, name, rank FROM job_level WHERE job_level_id = $1`, [assignment.jobLevelId]);
      let mgrName: string | null = null;
      if (assignment.managerId) {
        const mgrRes = await this.pool!.query(`SELECT full_name FROM employee WHERE employee_id = $1`, [assignment.managerId]);
        if (mgrRes.rows.length > 0) mgrName = mgrRes.rows[0].full_name;
      }

      const context: EvaluationOrganizationContext = {
        employeeId,
        department: {
          id: assignment.departmentId,
          code: deptRes.rows[0]?.code,
          name: deptRes.rows[0]?.name,
        },
        team: {
          id: assignment.teamId,
          code: teamRes.rows[0]?.code,
          name: teamRes.rows[0]?.name,
        },
        jobRole: {
          id: assignment.roleId,
          code: roleRes.rows[0]?.code,
          name: roleRes.rows[0]?.name,
        },
        jobLevel: {
          id: assignment.jobLevelId,
          code: levelRes.rows[0]?.code,
          name: levelRes.rows[0]?.name,
          rank: levelRes.rows[0]?.rank,
        },
        manager: {
          id: assignment.managerId,
          fullName: mgrName,
        },
        effectiveFrom: assignment.effectiveFrom ?? '',
        effectiveTo: assignment.effectiveTo ?? null,
      };

      sendSuccess(res, 200, 'Employee context retrieved successfully', context);
      return;
    }

    sendSuccess(res, 200, 'Employee context retrieved successfully', { employee_id: employeeId, at: atDate });
  }

  async getDirectReports(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    const { buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    if (this.employeeRepo) {
      const emp = await this.employeeRepo.findById(employeeId);
      if (!emp) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }
    }
    if (this.contextService) {
      const reports = await this.contextService.getManagedEmployees(employeeId);
      const data = reports.employees.map(this.mapEmployeeToResponse);
      sendCollection(res, 'Direct reports retrieved successfully', data, buildPageMeta(reports.total));
      return;
    }
    sendCollection(res, 'Direct reports retrieved successfully', [], { number: 1, size: 20, total_items: 0, total_pages: 0 });
  }

  async getManagerChain(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    const { buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    if (this.employeeRepo) {
      const startEmp = await this.employeeRepo.findById(employeeId);
      if (!startEmp) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }

      const chain: ReturnType<typeof this.mapEmployeeToResponse>[] = [];
      let currentId: string | null = startEmp.managerId;
      const visited = new Set<string>([employeeId]);

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const mgr = await this.employeeRepo.findById(currentId);
        if (!mgr) break;
        chain.push(this.mapEmployeeToResponse(mgr));
        currentId = mgr.managerId;
      }

      sendCollection(res, 'Manager chain retrieved successfully', chain, buildPageMeta(chain.length));
      return;
    }
    sendCollection(res, 'Manager chain retrieved successfully', [], { number: 1, size: 20, total_items: 0, total_pages: 0 });
  }

  async lookupEmployees(req: Request, res: Response): Promise<void> {
    const { buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    const q = (req.query.q as string) || (req.query.search as string) || '';
    if (this.employeeRepo) {
      const result = await this.employeeRepo.findMany({ search: q, limit: 10 });
      const data = result.employees.map(this.mapEmployeeToResponse);
      sendCollection(res, 'Employee lookup retrieved successfully', data, buildPageMeta(result.total));
      return;
    }
    sendCollection(res, 'Employee lookup retrieved successfully', [], { number: 1, size: 20, total_items: 0, total_pages: 0 });
  }

  // ── Department ───────────────────────────────────────────────────────────

  async getDepartments(req: Request, res: Response): Promise<void> {
    const { limit, offset, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    if (this.hasDb()) {
      const countRes = await this.pool!.query(`SELECT COUNT(*) as total FROM department`);
      const total = parseInt(countRes.rows[0].total, 10);
      const dataRes = await this.pool!.query(
        `SELECT department_id, code, name, active, created_at, updated_at FROM department ORDER BY name ASC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      const items = dataRes.rows.map(row => ({
        id: row.department_id,
        code: row.code,
        name: row.name,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
      sendCollection(res, 'Departments retrieved successfully', items, buildPageMeta(total));
      return;
    }
    sendCollection(res, 'Departments retrieved successfully', [], buildPageMeta(0));
  }

  async createDepartment(req: Request, res: Response): Promise<void> {
    const { code, name } = req.body || {};
    if (!code || !name) throw new BadRequest('Department code and name are required');
    if (this.hasDb()) {
      const resDb = await this.pool!.query(
        `INSERT INTO department (code, name) VALUES ($1, $2) RETURNING department_id, code, name, active, created_at, updated_at`,
        [code, name]
      );
      const row = resDb.rows[0];
      sendSuccess(res, 201, 'Department created successfully', {
        id: row.department_id,
        code: row.code,
        name: row.name,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async getDepartmentById(req: Request, res: Response): Promise<void> {
    const { departmentId } = req.params;
    if (!departmentId) throw new BadRequest('Department ID is required');
    if (this.hasDb()) {
      const resDb = await this.pool!.query(
        `SELECT department_id, code, name, active, created_at, updated_at FROM department WHERE department_id = $1`,
        [departmentId]
      );
      if (resDb.rows.length === 0) throw new NotFound(`Department with ID ${departmentId}`);
      const row = resDb.rows[0];
      sendSuccess(res, 200, 'Department retrieved successfully', {
        id: row.department_id,
        code: row.code,
        name: row.name,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async updateDepartment(req: Request, res: Response): Promise<void> {
    const { departmentId } = req.params;
    if (!departmentId) throw new BadRequest('Department ID is required');
    const { code, name, active } = req.body || {};
    if (this.hasDb()) {
      const resDb = await this.pool!.query(
        `UPDATE department SET code = COALESCE($1, code), name = COALESCE($2, name), active = COALESCE($3, active)
         WHERE department_id = $4 RETURNING department_id, code, name, active, created_at, updated_at`,
        [code, name, active, departmentId]
      );
      if (resDb.rows.length === 0) throw new NotFound(`Department with ID ${departmentId}`);
      const row = resDb.rows[0];
      sendSuccess(res, 200, 'Department updated successfully', {
        id: row.department_id,
        code: row.code,
        name: row.name,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async deactivateDepartment(req: Request, res: Response): Promise<void> {
    const { departmentId } = req.params;
    if (!departmentId) throw new BadRequest('Department ID is required');
    if (this.hasDb()) {
      const empCount = await this.pool!.query(
        'SELECT COUNT(*) FROM employee WHERE department_id = $1 AND employment_status = $2',
        [departmentId, 'ACTIVE']
      );
      const teamCount = await this.pool!.query(
        'SELECT COUNT(*) FROM team WHERE department_id = $1 AND active = true',
        [departmentId]
      );
      if (parseInt(empCount.rows[0].count) > 0 || parseInt(teamCount.rows[0].count) > 0) {
        throw new Unprocessable('Cannot deactivate department while it has active employees or teams', 'DEPARTMENT_HAS_ACTIVE_MEMBERS');
      }

      const resDb = await this.pool!.query(
        `UPDATE department SET active = false WHERE department_id = $1 RETURNING department_id, active`,
        [departmentId]
      );
      if (resDb.rows.length === 0) throw new NotFound(`Department with ID ${departmentId}`);
      const row = resDb.rows[0];
      sendSuccess(res, 200, 'Department deactivated successfully', { id: row.department_id, active: row.active });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async getDepartmentTeams(req: Request, res: Response): Promise<void> {
    const { departmentId } = req.params;
    const { buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    if (this.hasDb()) {
      const resDb = await this.pool!.query(
        `SELECT team_id, code, name, department_id, active, created_at, updated_at FROM team WHERE department_id = $1 ORDER BY name ASC`,
        [departmentId]
      );
      const items = resDb.rows.map(row => ({
        id: row.team_id,
        code: row.code,
        name: row.name,
        department_id: row.department_id,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
      sendCollection(res, 'Department teams retrieved successfully', items, buildPageMeta(items.length));
      return;
    }
    sendCollection(res, 'Department teams retrieved successfully', [], { number: 1, size: 20, total_items: 0, total_pages: 0 });
  }

  // ── Team ─────────────────────────────────────────────────────────────────

  async getTeams(req: Request, res: Response): Promise<void> {
    const actor = getActorFromContext(req);
    if (!actor) throw new Forbidden();
    const { limit, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);

    if (this.teamService && this.hasDb()) {
      const page = parseInt((req.query.page as string) ?? '1', 10) || 1;
      const pageSize = limit;
      const result = await this.teamService.getTeams(actor, {
        departmentId: req.query.department_id as string | undefined,
        active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
        search: req.query.search as string | undefined,
        page,
        pageSize,
      });
      const data = result.teams.map(this.mapTeamToResponse);
      sendCollection(res, 'Teams retrieved successfully', data, buildPageMeta(result.total));
      return;
    }
    sendCollection(res, 'Teams retrieved successfully', [], buildPageMeta(0));
  }

  async createTeam(req: Request, res: Response): Promise<void> {
    const actor = getActorFromContext(req);
    if (!actor) throw new Forbidden();
    const { code, name, department_id, description } = req.body || {};

    if (this.teamService && this.hasDb()) {
      const team = await this.teamService.createTeam(actor, { code, name, departmentId: department_id, description });
      sendCreated(res, 'Team created successfully', this.mapTeamToResponse(team), `/api/teams/${team.teamId}`);
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async getTeamById(req: Request, res: Response): Promise<void> {
    const actor = getActorFromContext(req);
    if (!actor) throw new Forbidden();
    const teamId = req.params.teamId as string;
    if (!teamId) throw new BadRequest('Team ID is required');

    if (this.teamService && this.hasDb()) {
      const team = await this.teamService.getTeamById(actor, teamId);
      sendSuccess(res, 200, 'Team retrieved successfully', this.mapTeamDetailToResponse(team));
      return;
    }
    sendSuccess(res, 200, 'Team retrieved successfully', { id: teamId, name: 'Sample Team', code: 'TEAM_A', active: true });
  }

  async updateTeam(req: Request, res: Response): Promise<void> {
    const actor = getActorFromContext(req);
    if (!actor) throw new Forbidden();
    const teamId = req.params.teamId as string;
    if (!teamId) throw new BadRequest('Team ID is required');
    const { code, name, department_id, description, active } = req.body || {};

    if (this.teamService && this.hasDb()) {
      const team = await this.teamService.updateTeam(actor, teamId, {
        code, // TeamService will reject if code changes
        name,
        departmentId: department_id,
        description,
        active,
      });
      sendSuccess(res, 200, 'Team updated successfully', this.mapTeamToResponse(team));
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async deactivateTeam(req: Request, res: Response): Promise<void> {
    const actor = getActorFromContext(req);
    if (!actor) throw new Forbidden();
    const teamId = req.params.teamId as string;
    if (!teamId) throw new BadRequest('Team ID is required');

    if (this.teamService && this.hasDb()) {
      const team = await this.teamService.deactivateTeam(actor, teamId);
      sendSuccess(res, 200, 'Team deactivated successfully', { id: team.teamId, active: team.active });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async bulkUpdateTeamStatus(req: Request, res: Response): Promise<void> {
    const actor = getActorFromContext(req);
    if (!actor) throw new Forbidden();
    if (actor.role !== 'HR_ADMIN' && actor.role !== 'SYSTEM_ADMIN') {
      throw new Forbidden('Only HR Admin or System Admin can perform bulk team updates.');
    }

    const { teamIds, active } = req.body || {};
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      throw new BadRequest('teamIds array is required and must not be empty');
    }
    if (typeof active !== 'boolean') {
      throw new BadRequest('active boolean is required');
    }

    if (this.hasDb()) {
      if (!active) {
        const countQuery = `
          SELECT t.team_id, t.name, COUNT(e.employee_id) as active_count
          FROM team t
          LEFT JOIN employee e ON e.team_id = t.team_id AND e.employment_status = 'ACTIVE'
          WHERE t.team_id = ANY($1::uuid[])
          GROUP BY t.team_id, t.name
          HAVING COUNT(e.employee_id) > 0
        `;
        const countRes = await this.pool!.query(countQuery, [teamIds]);
        if (countRes.rows.length > 0) {
          const names = countRes.rows.map(r => `"${r.name}" (${r.active_count} employee(s))`).join(', ');
          throw new Unprocessable(
            `Cannot deactivate team(s): ${names} still have active employees. Reassign or deactivate employees first.`,
            'TEAM_HAS_ACTIVE_MEMBERS'
          );
        }
      } else {
        const deptQuery = `
          SELECT t.name as team_name, d.name as dept_name, d.active as dept_active
          FROM team t
          JOIN department d ON t.department_id = d.department_id
          WHERE t.team_id = ANY($1::uuid[]) AND d.active = false
        `;
        const deptRes = await this.pool!.query(deptQuery, [teamIds]);
        if (deptRes.rows.length > 0) {
          const names = deptRes.rows.map(r => `"${r.team_name}" (Department "${r.dept_name}" is inactive)`).join(', ');
          throw new Unprocessable(
            `Cannot activate team(s): ${names}. Activate their departments first.`,
            'DEPARTMENT_INACTIVE'
          );
        }
      }

      const updateRes = await this.pool!.query(
        `UPDATE team SET active = $1, updated_at = NOW() WHERE team_id = ANY($2::uuid[])`,
        [active, teamIds]
      );

      sendSuccess(res, 200, `Successfully updated ${updateRes.rowCount} team(s) to ${active ? 'ACTIVE' : 'INACTIVE'}`, {
        updatedCount: updateRes.rowCount,
        active,
      });
      return;
    }

    sendSuccess(res, 200, `Successfully updated ${teamIds.length} team(s)`, {
      updatedCount: teamIds.length,
      active,
    });
  }

  // ── Role ─────────────────────────────────────────────────────────────────

  async getRoles(req: Request, res: Response): Promise<void> {
    const { limit, offset, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    if (this.hasDb()) {
      const countRes = await this.pool!.query(`SELECT COUNT(*) as total FROM role`);
      const total = parseInt(countRes.rows[0].total, 10);
      const dataRes = await this.pool!.query(
        `SELECT role_id, code, name, description, active, created_at, updated_at FROM role ORDER BY name ASC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      const items = dataRes.rows.map(row => ({
        id: row.role_id,
        code: row.code,
        name: row.name,
        description: row.description,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
      sendCollection(res, 'Roles retrieved successfully', items, buildPageMeta(total));
      return;
    }
    sendCollection(res, 'Roles retrieved successfully', [], buildPageMeta(0));
  }

  async createRole(req: Request, res: Response): Promise<void> {
    const { code, name, description } = req.body || {};
    if (!code || !name) throw new BadRequest('Role code and name are required');
    if (this.hasDb()) {
      const resDb = await this.pool!.query(
        `INSERT INTO role (code, name, description) VALUES ($1, $2, $3) RETURNING role_id, code, name, description, active, created_at, updated_at`,
        [code, name, description || null]
      );
      const row = resDb.rows[0];
      sendSuccess(res, 201, 'Role created successfully', {
        id: row.role_id,
        code: row.code,
        name: row.name,
        description: row.description,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async getRoleById(req: Request, res: Response): Promise<void> {
    const { roleId } = req.params;
    if (!roleId) throw new BadRequest('Role ID is required');
    if (this.hasDb()) {
      const resDb = await this.pool!.query(
        `SELECT role_id, code, name, description, active, created_at, updated_at FROM role WHERE role_id = $1`,
        [roleId]
      );
      if (resDb.rows.length === 0) throw new NotFound(`Role with ID ${roleId}`);
      const row = resDb.rows[0];
      sendSuccess(res, 200, 'Role retrieved successfully', {
        id: row.role_id,
        code: row.code,
        name: row.name,
        description: row.description,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async updateRole(req: Request, res: Response): Promise<void> {
    const { roleId } = req.params;
    if (!roleId) throw new BadRequest('Role ID is required');
    const { code, name, description, active } = req.body || {};
    if (this.hasDb()) {
      const resDb = await this.pool!.query(
        `UPDATE role SET code = COALESCE($1, code), name = COALESCE($2, name), description = COALESCE($3, description), active = COALESCE($4, active)
         WHERE role_id = $5 RETURNING role_id, code, name, description, active, created_at, updated_at`,
        [code, name, description, active, roleId]
      );
      if (resDb.rows.length === 0) throw new NotFound(`Role with ID ${roleId}`);
      const row = resDb.rows[0];
      sendSuccess(res, 200, 'Role updated successfully', {
        id: row.role_id,
        code: row.code,
        name: row.name,
        description: row.description,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async deactivateRole(req: Request, res: Response): Promise<void> {
    const { roleId } = req.params;
    if (!roleId) throw new BadRequest('Role ID is required');
    if (this.hasDb()) {
      const empCount = await this.pool!.query(
        'SELECT COUNT(*) FROM employee WHERE role_id = $1 AND employment_status = $2',
        [roleId, 'ACTIVE']
      );
      if (parseInt(empCount.rows[0].count) > 0) {
        throw new Unprocessable('Cannot deactivate role while it has active employees', 'ROLE_HAS_ACTIVE_EMPLOYEES');
      }

      const resDb = await this.pool!.query(
        `UPDATE role SET active = false WHERE role_id = $1 RETURNING role_id, active`,
        [roleId]
      );
      if (resDb.rows.length === 0) throw new NotFound(`Role with ID ${roleId}`);
      const row = resDb.rows[0];
      sendSuccess(res, 200, 'Role deactivated successfully', { id: row.role_id, active: row.active });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  // ── Job Level ────────────────────────────────────────────────────────────

  async getJobLevels(req: Request, res: Response): Promise<void> {
    const { limit, offset, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    if (this.hasDb()) {
      const countRes = await this.pool!.query(`SELECT COUNT(*) as total FROM job_level`);
      const total = parseInt(countRes.rows[0].total, 10);
      const dataRes = await this.pool!.query(
        `SELECT job_level_id, code, name, rank, active, created_at, updated_at FROM job_level ORDER BY rank ASC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      const items = dataRes.rows.map(row => ({
        id: row.job_level_id,
        code: row.code,
        name: row.name,
        rank: row.rank,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
      sendCollection(res, 'Job levels retrieved successfully', items, buildPageMeta(total));
      return;
    }
    sendCollection(res, 'Job levels retrieved successfully', [], buildPageMeta(0));
  }

  async createJobLevel(req: Request, res: Response): Promise<void> {
    const { code, name, rank } = req.body || {};
    if (!code || !name || rank === undefined) throw new BadRequest('Job level code, name, and rank are required');
    if (this.hasDb()) {
      const resDb = await this.pool!.query(
        `INSERT INTO job_level (code, name, rank) VALUES ($1, $2, $3) RETURNING job_level_id, code, name, rank, active, created_at, updated_at`,
        [code, name, rank]
      );
      const row = resDb.rows[0];
      sendSuccess(res, 201, 'Job level created successfully', {
        id: row.job_level_id,
        code: row.code,
        name: row.name,
        rank: row.rank,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async getJobLevelById(req: Request, res: Response): Promise<void> {
    const { jobLevelId } = req.params;
    if (!jobLevelId) throw new BadRequest('Job level ID is required');
    if (this.hasDb()) {
      const resDb = await this.pool!.query(
        `SELECT job_level_id, code, name, rank, active, created_at, updated_at FROM job_level WHERE job_level_id = $1`,
        [jobLevelId]
      );
      if (resDb.rows.length === 0) throw new NotFound(`Job level with ID ${jobLevelId}`);
      const row = resDb.rows[0];
      sendSuccess(res, 200, 'Job level retrieved successfully', {
        id: row.job_level_id,
        code: row.code,
        name: row.name,
        rank: row.rank,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async updateJobLevel(req: Request, res: Response): Promise<void> {
    const { jobLevelId } = req.params;
    if (!jobLevelId) throw new BadRequest('Job level ID is required');
    const { code, name, rank, active } = req.body || {};
    if (this.hasDb()) {
      const resDb = await this.pool!.query(
        `UPDATE job_level SET code = COALESCE($1, code), name = COALESCE($2, name), rank = COALESCE($3, rank), active = COALESCE($4, active)
         WHERE job_level_id = $5 RETURNING job_level_id, code, name, rank, active, created_at, updated_at`,
        [code, name, rank, active, jobLevelId]
      );
      if (resDb.rows.length === 0) throw new NotFound(`Job level with ID ${jobLevelId}`);
      const row = resDb.rows[0];
      sendSuccess(res, 200, 'Job level updated successfully', {
        id: row.job_level_id,
        code: row.code,
        name: row.name,
        rank: row.rank,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  async deactivateJobLevel(req: Request, res: Response): Promise<void> {
    const { jobLevelId } = req.params;
    if (!jobLevelId) throw new BadRequest('Job level ID is required');
    if (this.hasDb()) {
      const empCount = await this.pool!.query(
        'SELECT COUNT(*) FROM employee WHERE job_level_id = $1 AND employment_status = $2',
        [jobLevelId, 'ACTIVE']
      );
      if (parseInt(empCount.rows[0].count) > 0) {
        throw new Unprocessable('Cannot deactivate job level while it has active employees', 'LEVEL_HAS_ACTIVE_EMPLOYEES');
      }

      const resDb = await this.pool!.query(
        `UPDATE job_level SET active = false WHERE job_level_id = $1 RETURNING job_level_id, active`,
        [jobLevelId]
      );
      if (resDb.rows.length === 0) throw new NotFound(`Job level with ID ${jobLevelId}`);
      const row = resDb.rows[0];
      sendSuccess(res, 200, 'Job level deactivated successfully', { id: row.job_level_id, active: row.active });
      return;
    }
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable');
  }

  // ── Employee Import ──────────────────────────────────────────────────────

  async downloadImportTemplate(req: Request, res: Response): Promise<void> {
    sendSuccess(res, 200, 'Template download link retrieved successfully', { url: '/api/v1/employee-imports/template.csv' });
  }

  async createImportJob(req: Request, res: Response): Promise<void> {
    sendSuccess(res, 202, 'Import job created successfully', { status: 'UPLOADED' });
  }

  async getImportJobs(req: Request, res: Response): Promise<void> {
    const { buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    sendCollection(res, 'Import jobs retrieved successfully', [], buildPageMeta(0));
  }

  async getImportJobById(req: Request, res: Response): Promise<void> {
    const { importJobId } = req.params;
    sendSuccess(res, 200, 'Import job retrieved successfully', { id: importJobId, status: 'PROCESSED' });
  }

  async previewImportJob(req: Request, res: Response): Promise<void> {
    const { importJobId } = req.params;
    sendSuccess(res, 200, 'Import job preview retrieved successfully', { id: importJobId, rows: [] });
  }

  async confirmImportJob(req: Request, res: Response): Promise<void> {
    const { importJobId } = req.params;
    sendSuccess(res, 200, 'Import job confirmed', { id: importJobId, status: 'COMPLETED' });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private mapEmployeeToResponse = (emp: Employee) => {
    return {
      id: emp.employeeId,
      employee_code: emp.employeeCode,
      full_name: emp.fullName,
      email: emp.email,
      department_id: emp.departmentId,
      team_id: emp.teamId,
      role_id: emp.roleId,
      job_level_id: emp.jobLevelId,
      manager_id: emp.managerId,
      employment_status: emp.employmentStatus,
      join_date: emp.joinDate,
      termination_date: emp.terminationDate,
      review_cadence: emp.reviewCadence,
      review_cadence_months: emp.reviewCadenceMonths ?? null,
      review_cadence_override_id: emp.reviewCadenceOverrideId ?? null,
      last_evaluation_completed_at: emp.lastEvaluationCompletedAt,
      next_review_due_date: emp.nextReviewDueDate,
      version: emp.version,
      created_at: emp.createdAt,
      updated_at: emp.updatedAt,
    };
  };

  private mapAssignmentToResponse = (assign: EmployeeAssignment) => {
    return {
      id: assign.employeeAssignmentId,
      employee_id: assign.employeeId,
      department_id: assign.departmentId,
      team_id: assign.teamId,
      role_id: assign.roleId,
      job_level_id: assign.jobLevelId,
      manager_id: assign.managerId,
      effective_from: assign.effectiveFrom,
      effective_to: assign.effectiveTo,
      change_reason: assign.changeReason,
      change_note: assign.changeNote,
      created_at: assign.createdAt,
    };
  };

  private mapTeamToResponse = (team: Team) => {
    return {
      id: team.teamId,
      code: team.code,
      name: team.name,
      description: team.description ?? null,
      department_id: team.departmentId,
      active: team.active,
      created_at: team.createdAt ?? null,
      updated_at: team.updatedAt ?? null,
    };
  };

  private mapTeamDetailToResponse = (team: TeamWithContext) => {
    return {
      ...this.mapTeamToResponse(team),
      member_count: team.memberCount,
      active_member_count: team.activeMemberCount,
    };
  };
}
