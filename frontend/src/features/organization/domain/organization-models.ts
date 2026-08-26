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
