import { Employee, EmployeeAssignment } from './employee.domain.js';

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
