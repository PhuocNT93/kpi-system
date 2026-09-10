import { DepartmentRepository, JobRoleRepository, JobLevelRepository } from '../domain/repositories.js';
import { Department, JobRole, JobLevel } from '../domain/types.js';
import type { Pool } from 'pg';

import { Unprocessable, NotFound, Conflict } from '../../../api/app-error.js';

export class BusinessRuleViolationError extends Unprocessable {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'BusinessRuleViolationError';
  }
}

export class OrganizationService {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly jobRoleRepository: JobRoleRepository,
    private readonly jobLevelRepository: JobLevelRepository,
    private readonly pool: Pool
  ) {}

  // --- Department ---
  async getDepartments(filters?: { active?: boolean }, skip?: number, limit?: number): Promise<[Department[], number]> {
    return this.departmentRepository.findAll(filters, skip, limit);
  }

  async getDepartmentById(id: string): Promise<Department | null> {
    return this.departmentRepository.findById(id);
  }

  async createDepartment(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    const existing = await this.departmentRepository.findByCode(data.code);
    if (existing) {
      throw new Conflict(`Department with code ${data.code} already exists`, 'DUPLICATE_CODE');
    }
    return this.departmentRepository.create({
      id: '', // DB generates UUID
      ...data
    });
  }

  async updateDepartment(id: string, data: Omit<Department, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    const existing = await this.departmentRepository.findById(id);
    if (!existing) {
      throw new NotFound(`Department with ID ${id}`);
    }

    if (existing.active && !data.active) {
      const empCount = await this.pool.query('SELECT COUNT(*) FROM employee WHERE department_id = $1 AND employment_status = $2', [id, 'ACTIVE']);
      const teamCount = await this.pool.query('SELECT COUNT(*) FROM team WHERE department_id = $1 AND active = true', [id]);
      if (parseInt(empCount.rows[0].count) > 0 || parseInt(teamCount.rows[0].count) > 0) {
        throw new BusinessRuleViolationError('Cannot deactivate department while it has active employees or teams', 'DEPARTMENT_HAS_ACTIVE_MEMBERS');
      }
    }

    existing.name = data.name;
    existing.active = data.active;
    return this.departmentRepository.update(existing);
  }

  async bulkUpdateDepartments(departmentIds: string[], active: boolean): Promise<number> {
    if (!active) {
      const empCount = await this.pool.query(
        `SELECT d.name, COUNT(e.employee_id) as emp_count
         FROM department d
         JOIN employee e ON e.department_id = d.department_id AND e.employment_status = 'ACTIVE'
         WHERE d.department_id = ANY($1::uuid[])
         GROUP BY d.name`,
        [departmentIds]
      );
      const teamCount = await this.pool.query(
        `SELECT d.name, COUNT(t.team_id) as team_count
         FROM department d
         JOIN team t ON t.department_id = d.department_id AND t.active = true
         WHERE d.department_id = ANY($1::uuid[])
         GROUP BY d.name`,
        [departmentIds]
      );
      if (empCount.rows.length > 0 || teamCount.rows.length > 0) {
        const busyDepts = Array.from(new Set([
          ...empCount.rows.map(r => `"${r.name}" (${r.emp_count} active employee(s))`),
          ...teamCount.rows.map(r => `"${r.name}" (${r.team_count} active team(s))`),
        ])).join(', ');
        throw new BusinessRuleViolationError(
          `Cannot deactivate department(s): ${busyDepts}. They still contain active members.`,
          'DEPARTMENT_HAS_ACTIVE_MEMBERS'
        );
      }
    }

    const res = await this.pool.query(
      `UPDATE department SET active = $1, updated_at = NOW() WHERE department_id = ANY($2::uuid[])`,
      [active, departmentIds]
    );
    return res.rowCount || 0;
  }

  // --- JobRole ---
  async getJobRoles(filters?: { active?: boolean }, skip?: number, limit?: number): Promise<[JobRole[], number]> {
    return this.jobRoleRepository.findAll(filters, skip, limit);
  }

  async getJobRoleById(id: string): Promise<JobRole | null> {
    return this.jobRoleRepository.findById(id);
  }

  async createJobRole(data: Omit<JobRole, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobRole> {
    const existing = await this.jobRoleRepository.findByCode(data.code);
    if (existing) {
      throw new Conflict(`Job Role with code ${data.code} already exists`, 'DUPLICATE_CODE');
    }
    return this.jobRoleRepository.create({
      id: '', // DB generates UUID
      ...data
    });
  }

  async updateJobRole(id: string, data: Omit<JobRole, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<JobRole> {
    const existing = await this.jobRoleRepository.findById(id);
    if (!existing) {
      throw new NotFound(`Job Role with ID ${id}`);
    }

    if (existing.active && !data.active) {
      const empCount = await this.pool.query('SELECT COUNT(*) FROM employee WHERE role_id = $1 AND employment_status = $2', [id, 'ACTIVE']);
      if (parseInt(empCount.rows[0].count) > 0) {
        throw new BusinessRuleViolationError('Cannot deactivate role while it has active employees', 'ROLE_HAS_ACTIVE_EMPLOYEES');
      }
    }

    existing.name = data.name;
    existing.description = data.description;
    existing.active = data.active;
    return this.jobRoleRepository.update(existing);
  }

  async bulkUpdateJobRoles(roleIds: string[], active: boolean): Promise<number> {
    if (!active) {
      const empCount = await this.pool.query(
        `SELECT r.name, COUNT(e.employee_id) as emp_count
         FROM role r
         JOIN employee e ON e.role_id = r.role_id AND e.employment_status = 'ACTIVE'
         WHERE r.role_id = ANY($1::uuid[])
         GROUP BY r.name`,
        [roleIds]
      );
      if (empCount.rows.length > 0) {
        const busyRoles = empCount.rows.map(r => `"${r.name}" (${r.emp_count} active employee(s))`).join(', ');
        throw new BusinessRuleViolationError(
          `Cannot deactivate role(s): ${busyRoles}. They still contain active employees.`,
          'ROLE_HAS_ACTIVE_EMPLOYEES'
        );
      }
    }

    const res = await this.pool.query(
      `UPDATE role SET active = $1, updated_at = NOW() WHERE role_id = ANY($2::uuid[])`,
      [active, roleIds]
    );
    return res.rowCount || 0;
  }

  // --- JobLevel ---
  async getJobLevels(filters?: { active?: boolean }, skip?: number, limit?: number): Promise<[JobLevel[], number]> {
    return this.jobLevelRepository.findAll(filters, skip, limit);
  }

  async getJobLevelById(id: string): Promise<JobLevel | null> {
    return this.jobLevelRepository.findById(id);
  }

  async createJobLevel(data: Omit<JobLevel, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobLevel> {
    const existing = await this.jobLevelRepository.findByCode(data.code);
    if (existing) {
      throw new Conflict(`Job Level with code ${data.code} already exists`, 'DUPLICATE_CODE');
    }
    return this.jobLevelRepository.create({
      id: '', // DB generates UUID
      ...data
    });
  }

  async updateJobLevel(id: string, data: Omit<JobLevel, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<JobLevel> {
    const existing = await this.jobLevelRepository.findById(id);
    if (!existing) {
      throw new NotFound(`Job Level with ID ${id}`);
    }

    if (existing.active && !data.active) {
      const empCount = await this.pool.query('SELECT COUNT(*) FROM employee WHERE job_level_id = $1 AND employment_status = $2', [id, 'ACTIVE']);
      if (parseInt(empCount.rows[0].count) > 0) {
        throw new BusinessRuleViolationError('Cannot deactivate job level while it has active employees', 'LEVEL_HAS_ACTIVE_EMPLOYEES');
      }
    }

    existing.name = data.name;
    existing.rank = data.rank;
    existing.active = data.active;
    return this.jobLevelRepository.update(existing);
  }

  async bulkUpdateJobLevels(levelIds: string[], active: boolean): Promise<number> {
    if (!active) {
      const empCount = await this.pool.query(
        `SELECT l.name, COUNT(e.employee_id) as emp_count
         FROM job_level l
         JOIN employee e ON e.job_level_id = l.job_level_id AND e.employment_status = 'ACTIVE'
         WHERE l.job_level_id = ANY($1::uuid[])
         GROUP BY l.name`,
        [levelIds]
      );
      if (empCount.rows.length > 0) {
        const busyLevels = empCount.rows.map(r => `"${r.name}" (${r.emp_count} active employee(s))`).join(', ');
        throw new BusinessRuleViolationError(
          `Cannot deactivate level(s): ${busyLevels}. They still contain active employees.`,
          'LEVEL_HAS_ACTIVE_EMPLOYEES'
        );
      }
    }

    const res = await this.pool.query(
      `UPDATE job_level SET active = $1, updated_at = NOW() WHERE job_level_id = ANY($2::uuid[])`,
      [active, levelIds]
    );
    return res.rowCount || 0;
  }
}
