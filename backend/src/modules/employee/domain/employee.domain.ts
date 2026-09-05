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
  reviewCadence?: string | null;
  lastEvaluationCompletedAt?: string | null; // ISO DateTime
  nextReviewDueDate?: string | null; // ISO DateTime
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
  description?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

/** Enriched team view including member count. Used by GET /teams/:id */
export interface TeamWithContext extends Team {
  memberCount: number;
  activeMemberCount: number;
}

/** Parameters for TeamService.createTeam */
export interface CreateTeamParams {
  code: string;
  name: string;
  departmentId: string;
  description?: string | null;
}

/** Parameters for TeamService.updateTeam */
export interface UpdateTeamParams {
  name?: string;
  departmentId?: string;
  description?: string | null;
  active?: boolean;
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

export interface EvaluationOrganizationContext {
  employeeId: string;
  department: {
    id: string;
    code?: string;
    name?: string;
  };
  team: {
    id: string;
    code?: string;
    name?: string;
  };
  jobRole: {
    id: string;
    code?: string;
    name?: string;
  };
  jobLevel: {
    id: string;
    code?: string;
    name?: string;
    rank?: number;
  };
  manager: {
    id: string | null;
    fullName?: string | null;
  };
  effectiveFrom: string;
  effectiveTo: string | null;
}
