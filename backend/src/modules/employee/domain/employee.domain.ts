export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

export enum AssignmentChangeReason {
  INITIAL_HIRING = 'INITIAL_HIRING',
  TEAM_TRANSFER = 'TEAM_TRANSFER',
  PROMOTION = 'PROMOTION',
  MANAGER_CHANGE = 'MANAGER_CHANGE',
  DEPARTMENT_REORG = 'DEPARTMENT_REORG',
  STATUS_CHANGE = 'STATUS_CHANGE',
  CORRECTION = 'CORRECTION',
}

export interface Employee {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  departmentId: string | null;
  teamId: string | null;
  roleId: string;
  jobLevelId: string;
  managerId: string | null;
  employmentStatus: EmploymentStatus;
  joinDate: string; // YYYY-MM-DD
  terminationDate?: string | null; // YYYY-MM-DD
  version: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface EmployeeAssignment {
  employeeAssignmentId: string;
  employeeId: string;
  departmentId: string;
  teamId: string;
  roleId: string;
  jobLevelId: string;
  managerId: string | null;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null; // YYYY-MM-DD
  changeReason?: string | null;
  changeNote?: string | null;
  createdAt?: string;
  createdBy?: string | null;
}

export interface Department {
  departmentId: string;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
}

export interface Team {
  teamId: string;
  departmentId: string;
  code: string;
  name: string;
  active: boolean;
}

export interface OrganizationRole {
  roleId: string;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
}

export interface JobLevel {
  jobLevelId: string;
  code: string;
  name: string;
  rank: number;
  active: boolean;
}
