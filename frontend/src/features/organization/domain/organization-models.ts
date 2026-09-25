// Frontend domain models for the Organization feature (camelCase)
// Components and hooks consume these — never wire types directly

export interface OrgTeam {
  id: string;
  code: string;
  name: string;
  description: string | null;
  departmentId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgTeamDetail extends OrgTeam {
  memberCount: number;
  activeMemberCount: number;
}

export interface OrgDepartment {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgJobRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgJobLevel {
  id: string;
  code: string;
  name: string;
  rank: number;
  isActive: boolean;
  defaultReviewCadenceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgReviewCadence {
  id: string;
  code: string;
  name: string;
  intervalMonths: number;
  isSystemDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type EffectiveCadenceSource = 'EMPLOYEE_OVERRIDE' | 'JOB_LEVEL_DEFAULT' | 'SYSTEM_DEFAULT';

/** Server-resolved review cadence for an employee. Never derived on the client. */
export interface EffectiveCadence {
  id: string;
  code: string;
  name: string;
  intervalMonths: number;
  source: EffectiveCadenceSource;
}

export interface OrgEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  departmentId: string | null;
  teamId: string | null;
  roleId: string;
  jobLevelId: string;
  managerId: string | null;
  employmentStatus: string;
  joinDate: string;
  terminationDate: string | null;
  reviewCadenceOverrideId?: string | null;
  lastEvaluationCompletedAt: string | null;
  /** Date-only string (YYYY-MM-DD) exactly as sent by the backend. */
  nextReviewDueDate: string | null;
  effectiveCadence: EffectiveCadence | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
