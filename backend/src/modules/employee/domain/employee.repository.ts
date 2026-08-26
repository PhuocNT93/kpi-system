import { Employee, EmployeeAssignment, Team, TeamWithContext, CreateTeamParams, UpdateTeamParams } from './employee.domain.js';


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
  create(employee: Omit<Employee, 'employeeId' | 'version'>, client?: any): Promise<Employee>;
  update(employee: Employee, client?: any): Promise<Employee>;
}

export interface EmployeeAssignmentRepository {
  create(assignment: Omit<EmployeeAssignment, 'employeeAssignmentId'>, client?: any): Promise<EmployeeAssignment>;
  findCurrentAssignment(employeeId: string, client?: any): Promise<EmployeeAssignment | null>;
  findAssignmentAt(employeeId: string, effectiveDate: string, client?: any): Promise<EmployeeAssignment | null>;
  findAssignmentHistory(employeeId: string): Promise<EmployeeAssignment[]>;
  closeActiveAssignment(employeeId: string, closeDate: string, client?: any): Promise<void>;
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
  create(params: CreateTeamParams, actorEmployeeId: string | null, client?: any): Promise<Team>;
  update(teamId: string, params: UpdateTeamParams, actorEmployeeId: string | null, client?: any): Promise<Team>;
  countActiveMembers(teamId: string): Promise<number>;
}

