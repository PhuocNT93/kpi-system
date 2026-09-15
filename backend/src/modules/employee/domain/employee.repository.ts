import { Employee, EmployeeAssignment, Team, TeamWithContext, CreateTeamParams, UpdateTeamParams } from './employee.domain.js';
import { QueryExecutor } from '../../../shared/database/query-executor.js';


export interface EmployeeSearchParams {
  employeeId?: string;
  name?: string;
  email?: string;
  department?: string;
  team?: string;
  role?: string;
  jobLevel?: string;
  manager?: string;
  evaluationCycle?: string;
  evaluationStatus?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface EmployeeSearchResultItem {
  employee_id: string;
  employee_code: string;
  full_name: string;
  email: string;
  department: {
    id: string | null;
    name: string | null;
    code: string | null;
  };
  team: {
    id: string | null;
    name: string | null;
    code: string | null;
  };
  role: {
    id: string;
    name: string;
    code: string;
  };
  job_level: {
    id: string;
    name: string;
    code: string;
    rank?: number;
  };
  manager: {
    id: string | null;
    name: string | null;
    code: string | null;
  } | null;
  employment_status: string;
  evaluation_status?: string | null;
  evaluation_id?: string | null;
  join_date: string;
}

export interface EmployeeRepository {
  findById(employeeId: string): Promise<Employee | null>;
  findByCode(employeeCode: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findMany(params: {
    departmentId?: string;
    teamId?: string;
    roleId?: string;
    jobLevelId?: string;
    managerId?: string;
    employmentStatus?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ employees: Employee[]; total: number }>;
  search(params: EmployeeSearchParams, actor: import('../../../shared/auth/types.js').Actor): Promise<{ employees: EmployeeSearchResultItem[]; total: number }>;
  create(employee: Omit<Employee, 'employeeId' | 'version'>, client?: QueryExecutor): Promise<Employee>;
  update(employee: Employee, client?: QueryExecutor): Promise<Employee>;
}

export interface EmployeeAssignmentRepository {
  create(assignment: Omit<EmployeeAssignment, 'employeeAssignmentId'>, client?: QueryExecutor): Promise<EmployeeAssignment>;
  findCurrentAssignment(employeeId: string, client?: QueryExecutor): Promise<EmployeeAssignment | null>;
  findAssignmentAt(employeeId: string, effectiveDate: string, client?: QueryExecutor): Promise<EmployeeAssignment | null>;
  findAssignmentHistory(employeeId: string): Promise<EmployeeAssignment[]>;
  closeActiveAssignment(employeeId: string, closeDate: string, client?: QueryExecutor): Promise<void>;
}

export interface TeamRepository {
  findById(teamId: string): Promise<Team | null>;
  findByCode(code: string): Promise<Team | null>;
  findMany(params: {
    departmentId?: string;
    active?: boolean;
    search?: string;
    teamIds?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ teams: Team[]; total: number }>;
  findWithContext(teamId: string): Promise<TeamWithContext | null>;
  create(params: CreateTeamParams, actorEmployeeId: string | null, client?: QueryExecutor): Promise<Team>;
  update(teamId: string, params: UpdateTeamParams, actorEmployeeId: string | null, client?: QueryExecutor): Promise<Team>;
  countActiveMembers(teamId: string): Promise<number>;
}

