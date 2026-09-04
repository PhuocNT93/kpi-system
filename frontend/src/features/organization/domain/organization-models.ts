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
  createdAt: Date;
  updatedAt: Date;
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
  reviewCadence: string | null;
  lastEvaluationCompletedAt: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
