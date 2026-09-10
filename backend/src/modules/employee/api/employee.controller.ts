import { Request, Response } from 'express';
import type { Pool } from 'pg';
import { sendSuccess, sendCollection, sendCreated } from '../../../api/http-response.js';
import { parsePaginationQuery } from '../../../api/pagination.js';
import { AppError, BadRequest, NotFound, Conflict, Forbidden, Unprocessable } from '../../../api/app-error.js';
import { EmployeeRepository, EmployeeAssignmentRepository } from '../domain/employee.repository.js';
import { EmployeeContextService } from '../application/employee-context.service.js';
import { TeamService } from '../application/team.service.js';
import { EmploymentStatus, Employee, EmployeeAssignment, EvaluationOrganizationContext, Team, TeamWithContext } from '../domain/employee.domain.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';

export class EmployeeController {
  constructor(
    private employeeRepo?: EmployeeRepository,
    private assignmentRepo?: EmployeeAssignmentRepository,
    private contextService?: EmployeeContextService,
    private pool?: Pool,
    private teamService?: TeamService
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

  private calculateNextReviewDate(lastDateStr: string | null | undefined, cadence: string | null | undefined): string | null {
  if (!lastDateStr || !cadence) return null;
  const lastDate = new Date(lastDateStr);
  if (isNaN(lastDate.getTime())) return null;

  switch (cadence.toUpperCase()) {
    case 'MONTHLY':
      lastDate.setMonth(lastDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      lastDate.setMonth(lastDate.getMonth() + 3);
      break;
    case 'SEMI_ANNUAL':
      lastDate.setMonth(lastDate.getMonth() + 6);
      break;
    case 'ANNUAL':
      lastDate.setFullYear(lastDate.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return lastDate.toISOString();
}

// ── Employee ─────────────────────────────────────────────────────────────

  async getEmployees(req: Request, res: Response): Promise<void> {
    const { limit, offset, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);

    if (this.employeeRepo && this.hasDb()) {
      const result = await this.employeeRepo.findMany({
        departmentId: req.query.department_id as string,
        teamId: req.query.team_id as string,
        roleId: req.query.role_id as string,
        jobLevelId: req.query.job_level_id as string,
        employmentStatus: req.query.employment_status as string,
        search: req.query.search as string,
        limit,
        offset,
      });
      const data = result.employees.map(this.mapEmployeeToResponse);
      sendCollection(res, 'Employees retrieved successfully', data, buildPageMeta(result.total));
      return;
    }

    sendCollection(res, 'Employees retrieved successfully', [], buildPageMeta(0));
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
      review_cadence,
      last_evaluation_completed_at,
      next_review_due_date,
    } = req.body || {};

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
        reviewCadence: review_cadence || null,
        lastEvaluationCompletedAt: last_evaluation_completed_at || null,
        nextReviewDueDate: next_review_due_date || this.calculateNextReviewDate(last_evaluation_completed_at, review_cadence),
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
      sendSuccess(res, 200, 'Employee retrieved successfully', this.mapEmployeeToResponse(emp));
      return;
    }

    sendSuccess(res, 200, 'Employee retrieved successfully', { id: employeeId });
  }

  async updateEmployee(req: Request, res: Response): Promise<void> {
    const employeeId = req.params.employeeId as string;
    if (this.employeeRepo && this.hasDb()) {
      const existing = await this.employeeRepo.findById(employeeId);
      if (!existing) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }

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

      const updated = await this.employeeRepo.update({
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
        reviewCadence: req.body.review_cadence ?? existing.reviewCadence,
        lastEvaluationCompletedAt: req.body.last_evaluation_completed_at ?? existing.lastEvaluationCompletedAt,
        nextReviewDueDate: req.body.next_review_due_date ?? this.calculateNextReviewDate(req.body.last_evaluation_completed_at ?? existing.lastEvaluationCompletedAt, req.body.review_cadence ?? existing.reviewCadence) ?? existing.nextReviewDueDate,
      });

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