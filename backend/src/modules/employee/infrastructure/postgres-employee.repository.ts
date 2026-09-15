import { Pool } from 'pg';
import { Employee, EmployeeAssignment, EmploymentStatus } from '../domain/employee.domain.js';
import { EmployeeRepository, EmployeeAssignmentRepository, EmployeeSearchParams, EmployeeSearchResultItem } from '../domain/employee.repository.js';
import { QueryExecutor } from '../../../shared/database/query-executor.js';

interface EmployeeRow extends Record<string, unknown> {
  employee_id: string;
  employee_code: string;
  full_name: string;
  email: string;
  department_id: string | null;
  team_id: string | null;
  role_id: string;
  job_level_id: string;
  manager_id: string | null;
  employment_status: string;
  join_date: string;
  termination_date: string | null;
  version: string | number;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  review_cadence?: string | null;
  last_evaluation_completed_at?: string | null;
  next_review_due_date?: string | null;
}

interface EmployeeAssignmentRow extends Record<string, unknown> {
  employee_assignment_id: string;
  employee_id: string;
  department_id: string;
  team_id: string;
  role_id: string;
  job_level_id: string;
  manager_id: string | null;
  effective_from: string;
  effective_to: string | null;
  change_reason?: string | null;
  change_note?: string | null;
  created_at?: string;
  created_by?: string | null;
}

export class PostgresEmployeeRepository implements EmployeeRepository {
  constructor(private pool: Pool) { }

  private hasQuery(executor?: QueryExecutor): boolean {
    const p = executor || this.pool;
    return !!(p && typeof p.query === 'function');
  }

  async findById(employeeId: string): Promise<Employee | null> {
    if (!this.hasQuery()) return null;
    const res = await this.pool.query(
      `SELECT employee_id, employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date, termination_date, version, review_cadence, last_evaluation_completed_at, next_review_due_date, created_at, updated_at, created_by, updated_by
       FROM employee WHERE employee_id = $1`,
      [employeeId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToEmployee(res.rows[0]);
  }

  async findByCode(employeeCode: string): Promise<Employee | null> {
    if (!this.hasQuery()) return null;
    const res = await this.pool.query(
      `SELECT employee_id, employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date, termination_date, version, review_cadence, last_evaluation_completed_at, next_review_due_date, created_at, updated_at, created_by, updated_by
       FROM employee WHERE employee_code = $1`,
      [employeeCode]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToEmployee(res.rows[0]);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    if (!this.hasQuery()) return null;
    const res = await this.pool.query(
      `SELECT employee_id, employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date, termination_date, version, review_cadence, last_evaluation_completed_at, next_review_due_date, created_at, updated_at, created_by, updated_by
       FROM employee WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToEmployee(res.rows[0]);
  }

  async findMany(params: {
    departmentId?: string;
    teamId?: string;
    roleId?: string;
    jobLevelId?: string;
    managerId?: string;
    employmentStatus?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ employees: Employee[]; total: number }> {
    if (!this.hasQuery()) return { employees: [], total: 0 };
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.departmentId) {
      conditions.push(`department_id = $${idx++}`);
      values.push(params.departmentId);
    }
    if (params.teamId) {
      conditions.push(`team_id = $${idx++}`);
      values.push(params.teamId);
    }
    if (params.roleId) {
      conditions.push(`role_id = $${idx++}`);
      values.push(params.roleId);
    }
    if (params.jobLevelId) {
      conditions.push(`job_level_id = $${idx++}`);
      values.push(params.jobLevelId);
    }
    if (params.managerId) {
      conditions.push(`manager_id = $${idx++}`);
      values.push(params.managerId);
    }
    if (params.employmentStatus) {
      conditions.push(`employment_status = $${idx++}`);
      values.push(params.employmentStatus);
    }
    if (params.search) {
      conditions.push(`(full_name ILIKE $${idx} OR employee_code ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.pool.query(`SELECT COUNT(*) as total FROM employee ${whereClause}`, values);
    const total = parseInt(countRes.rows[0].total, 10);

    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    const dataRes = await this.pool.query(
      `SELECT employee_id, employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date, termination_date, version, review_cadence, last_evaluation_completed_at, next_review_due_date, created_at, updated_at, created_by, updated_by
       FROM employee ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return {
      employees: dataRes.rows.map(this.mapRowToEmployee),
      total,
    };
  }

  async create(employee: Omit<Employee, 'employeeId' | 'version'>, client?: QueryExecutor): Promise<Employee> {
    const executor = client || this.pool;
    if (!this.hasQuery(executor)) {
      return {
        ...employee,
        employeeId: 'mock-id',
        version: 1,
      };
    }
    const res = await executor.query<EmployeeRow>(
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date, review_cadence, last_evaluation_completed_at, next_review_due_date, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING employee_id, employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date, termination_date, version, review_cadence, last_evaluation_completed_at, next_review_due_date, created_at, updated_at, created_by, updated_by`,
      [
        employee.employeeCode,
        employee.fullName,
        employee.email,
        employee.departmentId,
        employee.teamId,
        employee.roleId,
        employee.jobLevelId,
        employee.managerId,
        employee.employmentStatus,
        employee.joinDate,
        employee.reviewCadence ?? null,
        employee.lastEvaluationCompletedAt ?? null,
        employee.nextReviewDueDate ?? null,
        employee.createdBy,
        employee.updatedBy,
      ]
    );
    const [insertedRow] = res.rows;
    if (!insertedRow) {
      throw new Error('EMPLOYEE_INSERT_RETURNED_NO_ROW');
    }
    return this.mapRowToEmployee(insertedRow);
  }

  async update(employee: Employee, client?: QueryExecutor): Promise<Employee> {
    const executor = client || this.pool;
    if (!this.hasQuery(executor)) {
      return {
        ...employee,
        version: employee.version + 1,
      };
    }
    const res = await executor.query<EmployeeRow>(
      `UPDATE employee
       SET full_name = $1, email = $2, department_id = $3, team_id = $4, role_id = $5, job_level_id = $6, manager_id = $7, employment_status = $8, termination_date = $9, review_cadence = $10, last_evaluation_completed_at = $11, updated_by = $12, version = version + 1
       WHERE employee_id = $13 AND version = $14
       RETURNING employee_id, employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date, termination_date, version, review_cadence, last_evaluation_completed_at, next_review_due_date, created_at, updated_at, created_by, updated_by`,
      [
        employee.fullName,
        employee.email,
        employee.departmentId,
        employee.teamId,
        employee.roleId,
        employee.jobLevelId,
        employee.managerId,
        employee.employmentStatus,
        employee.terminationDate,
        employee.reviewCadence ?? null,
        employee.lastEvaluationCompletedAt ?? null,
        employee.updatedBy,
        employee.employeeId,
        employee.version,
      ]
    );

    const [updatedRow] = res.rows;
    if (!updatedRow) {
      throw new Error('RESOURCE_VERSION_CONFLICT');
    }
    return this.mapRowToEmployee(updatedRow);
  }

  private mapRowToEmployee(row: EmployeeRow): Employee {
    return {
      employeeId: row.employee_id,
      employeeCode: row.employee_code,
      fullName: row.full_name,
      email: row.email,
      departmentId: row.department_id,
      teamId: row.team_id,
      roleId: row.role_id,
      jobLevelId: row.job_level_id,
      managerId: row.manager_id,
      employmentStatus: row.employment_status as EmploymentStatus,
      joinDate: row.join_date,
      terminationDate: row.termination_date,
      version: typeof row.version === 'string' ? parseInt(row.version, 10) : Number(row.version),
      reviewCadence: row.review_cadence,
      nextReviewDueDate: row.next_review_due_date,
      lastEvaluationCompletedAt: row.last_evaluation_completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }

  async search(params: EmployeeSearchParams, actor: import('../../../shared/auth/types.js').Actor): Promise<{ employees: EmployeeSearchResultItem[]; total: number }> {
    const conditions: string[] = ['1=1'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: any[] = [];
    let idx = 1;

    // RBAC
    if (actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN') {
      // no restriction
    } else if (actor.role === 'MANAGER') {
      conditions.push(`(e.manager_id = $${idx} OR e.team_id IN (SELECT team_id FROM team WHERE manager_id = $${idx}))`);
      values.push(actor.employeeId);
      idx++;
    } else {
      conditions.push(`e.employee_id = $${idx}`);
      values.push(actor.employeeId);
      idx++;
    }

    if (params.q) {
      conditions.push(`(immutable_unaccent(e.full_name) % immutable_unaccent($${idx}) OR immutable_unaccent(e.full_name) ILIKE immutable_unaccent('%' || $${idx} || '%') OR e.employee_code ILIKE '%' || $${idx} || '%' OR e.email ILIKE '%' || $${idx} || '%')`);
      values.push(params.q);
      idx++;
    }

    if (params.department) {
      conditions.push(`e.department_id = $${idx}`);
      values.push(params.department);
      idx++;
    }
    if (params.team) {
      conditions.push(`e.team_id = $${idx}`);
      values.push(params.team);
      idx++;
    }
    if (params.role) {
      conditions.push(`e.role_id = $${idx}`);
      values.push(params.role);
      idx++;
    }
    if (params.jobLevel) {
      conditions.push(`e.job_level_id = $${idx}`);
      values.push(params.jobLevel);
      idx++;
    }
    if (params.manager) {
      conditions.push(`e.manager_id = $${idx}`);
      values.push(params.manager);
      idx++;
    }

    let lateralEvalJoin = '';
    if (params.evaluationCycle || params.evaluationStatus) {
      lateralEvalJoin = `
        LEFT JOIN LATERAL (
          SELECT ev.evaluation_id, ev.status AS evaluation_status, ev.final_score AS last_evaluation_score
          FROM evaluation ev
          WHERE ev.employee_id = e.employee_id
            ${params.evaluationCycle ? `AND ev.evaluation_cycle_id = $${idx++}` : ''}
            ${params.evaluationStatus ? `AND ev.status = $${idx++}` : ''}
          ORDER BY ev.created_at DESC
          LIMIT 1
        ) ev ON true
      `;
      if (params.evaluationCycle) values.push(params.evaluationCycle);
      if (params.evaluationStatus) values.push(params.evaluationStatus);
      
      conditions.push(`ev.evaluation_id IS NOT NULL`);
    } else {
      lateralEvalJoin = `
        LEFT JOIN LATERAL (
          SELECT ev.evaluation_id, ev.status AS evaluation_status, ev.final_score AS last_evaluation_score
          FROM evaluation ev
          WHERE ev.employee_id = e.employee_id
          ORDER BY ev.created_at DESC
          LIMIT 1
        ) ev ON true
      `;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(DISTINCT e.employee_id)
      FROM employee e
      ${lateralEvalJoin}
      ${whereClause}
    `;

    let countRes;
    try {
      countRes = await this.pool.query(countSql, values);
    } catch (e: unknown) {
      console.error('[countSql]', e);
      throw e;
    }
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = params.limit || 20;
    const offset = params.offset || 0;

    const dataSql = `
      SELECT DISTINCT ON (e.created_at, e.employee_code, e.employee_id)
        e.employee_id, e.employee_code, e.full_name, e.email, e.employment_status, e.join_date, e.created_at,
        e.department_id, d.name AS department_name, d.code AS department_code,
        e.team_id, t.name AS team_name, t.code AS team_code,
        e.role_id, r.name AS role_name, r.code AS role_code,
        e.job_level_id, jl.name AS job_level_name, jl.code AS job_level_code, jl.rank AS job_level_rank,
        e.manager_id, m.full_name AS manager_name, m.employee_code AS manager_code,
        ev.evaluation_status, ev.evaluation_id, ev.last_evaluation_score
      FROM employee e
      LEFT JOIN department d ON e.department_id = d.department_id
      LEFT JOIN team t ON e.team_id = t.team_id
      LEFT JOIN role r ON e.role_id = r.role_id
      LEFT JOIN job_level jl ON e.job_level_id = jl.job_level_id
      LEFT JOIN employee m ON e.manager_id = m.employee_id
      ${lateralEvalJoin}
      ${whereClause}
      ORDER BY e.created_at DESC, e.employee_code ASC, e.employee_id ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    let dataRes;
    try {
      dataRes = await this.pool.query(dataSql, [...values, limit, offset]);
    } catch (e: unknown) {
      console.error('[dataSql]', e);
      throw e;
    }

    const employees: EmployeeSearchResultItem[] = dataRes.rows.map((row: Record<string, unknown>) => ({
      employee_id: row.employee_id as string,
      employee_code: row.employee_code as string,
      full_name: row.full_name as string,
      email: row.email as string,
      department: {
        id: (row.department_id as string) || null,
        name: (row.department_name as string) || null,
        code: (row.department_code as string) || null,
      },
      team: {
        id: (row.team_id as string) || null,
        name: (row.team_name as string) || null,
        code: (row.team_code as string) || null,
      },
      role: {
        id: row.role_id as string,
        name: row.role_name as string,
        code: row.role_code as string,
      },
      job_level: {
        id: row.job_level_id as string,
        name: row.job_level_name as string,
        code: row.job_level_code as string,
        rank: row.job_level_rank !== null && row.job_level_rank !== undefined ? parseInt(row.job_level_rank as string, 10) : undefined,
      },
      manager: row.manager_id
        ? {
            id: row.manager_id as string,
            name: row.manager_name as string,
            code: row.manager_code as string,
          }
        : null,
      employment_status: row.employment_status as string,
      evaluation_status: (row.evaluation_status as string) || null,
      evaluation_id: (row.evaluation_id as string) || null,
      join_date: ((row.join_date as Date | string) instanceof Date ? ((row.join_date as Date).toISOString().split('T')[0]) : (row.join_date as string)) as string,
    }));

    return { employees, total };
  }
}

export class PostgresEmployeeAssignmentRepository implements EmployeeAssignmentRepository {
  constructor(private pool: Pool) { }

  private hasQuery(executor?: QueryExecutor): boolean {
    const p = executor || this.pool;
    return !!(p && typeof p.query === 'function');
  }

  async create(assignment: Omit<EmployeeAssignment, 'employeeAssignmentId'>, client?: QueryExecutor): Promise<EmployeeAssignment> {
    const executor = client || this.pool;
    if (!this.hasQuery(executor)) {
      return {
        ...assignment,
        employeeAssignmentId: 'mock-assign-id',
      };
    }
    const res = await executor.query<EmployeeAssignmentRow>(
      `INSERT INTO employee_assignment (employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from, effective_to, change_reason, change_note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING employee_assignment_id, employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from, effective_to, change_reason, change_note, created_at, created_by`,
      [
        assignment.employeeId,
        assignment.departmentId,
        assignment.teamId,
        assignment.roleId,
        assignment.jobLevelId,
        assignment.managerId,
        assignment.effectiveFrom,
        assignment.effectiveTo,
        assignment.changeReason,
        assignment.changeNote,
        assignment.createdBy,
      ]
    );
    const [insertedRow] = res.rows;
    if (!insertedRow) {
      throw new Error('EMPLOYEE_ASSIGNMENT_INSERT_RETURNED_NO_ROW');
    }
    return this.mapRowToAssignment(insertedRow);
  }

  async findCurrentAssignment(employeeId: string, client?: QueryExecutor): Promise<EmployeeAssignment | null> {
    const executor = client || this.pool;
    if (!this.hasQuery(executor)) return null;
    const res = await executor.query<EmployeeAssignmentRow>(
      `SELECT employee_assignment_id, employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from, effective_to, change_reason, change_note, created_at, created_by
       FROM employee_assignment
       WHERE employee_id = $1 AND effective_to IS NULL
       ORDER BY effective_from DESC LIMIT 1`,
      [employeeId]
    );
    const [row] = res.rows;
    if (!row) return null;
    return this.mapRowToAssignment(row);
  }

  async findAssignmentAt(employeeId: string, effectiveDate: string, client?: QueryExecutor): Promise<EmployeeAssignment | null> {
    const executor = client || this.pool;
    if (!this.hasQuery(executor)) return null;
    const res = await executor.query<EmployeeAssignmentRow>(
      `SELECT employee_assignment_id, employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from, effective_to, change_reason, change_note, created_at, created_by
       FROM employee_assignment
       WHERE employee_id = $1
         AND effective_from <= $2
         AND (effective_to IS NULL OR effective_to > $2)
       ORDER BY effective_from DESC LIMIT 1`,
      [employeeId, effectiveDate]
    );
    const [row] = res.rows;
    if (!row) return null;
    return this.mapRowToAssignment(row);
  }

  async findAssignmentHistory(employeeId: string): Promise<EmployeeAssignment[]> {
    if (!this.hasQuery()) return [];
    const res = await this.pool.query<EmployeeAssignmentRow>(
      `SELECT employee_assignment_id, employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from, effective_to, change_reason, change_note, created_at, created_by
       FROM employee_assignment
       WHERE employee_id = $1
       ORDER BY effective_from DESC`,
      [employeeId]
    );
    return res.rows.map(this.mapRowToAssignment);
  }

  async closeActiveAssignment(employeeId: string, closeDate: string, client?: QueryExecutor): Promise<void> {
    const executor = client || this.pool;
    if (!this.hasQuery(executor)) return;
    await executor.query(
      `UPDATE employee_assignment
       SET effective_to = $1
       WHERE employee_id = $2 AND effective_to IS NULL`,
      [closeDate, employeeId]
    );
  }

  private mapRowToAssignment(row: EmployeeAssignmentRow): EmployeeAssignment {
    return {
      employeeAssignmentId: row.employee_assignment_id,
      employeeId: row.employee_id,
      departmentId: row.department_id,
      teamId: row.team_id,
      roleId: row.role_id,
      jobLevelId: row.job_level_id,
      managerId: row.manager_id,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      changeReason: row.change_reason,
      changeNote: row.change_note,
      createdAt: row.created_at,
      createdBy: row.created_by,
    };
  }
}
