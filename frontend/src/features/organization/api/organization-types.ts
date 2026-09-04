// Wire types (snake_case) matching the backend API contract for the Organization feature

export interface WireTeam {
  id: string;
  code: string;
  name: string;
  description: string | null;
  department_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WireTeamDetail extends WireTeam {
  member_count: number;
  active_member_count: number;
}

export interface WireDepartment {
  id: string;
  code: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamRequest {
  code: string;
  name: string;
  department_id: string;
  description?: string | null;
}

export interface UpdateTeamRequest {
  name?: string;
  department_id?: string;
  description?: string | null;
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  active?: boolean;
}

export interface WireJobRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateJobRoleRequest {
  code: string;
  name: string;
  description?: string | null;
}

export interface UpdateJobRoleRequest {
  name?: string;
  description?: string | null;
  active?: boolean;
}

export interface WireJobLevel {
  id: string;
  code: string;
  name: string;
  rank: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateJobLevelRequest {
  code: string;
  name: string;
  rank: number;
}

export interface UpdateJobLevelRequest {
  name?: string;
  rank?: number;
  active?: boolean;
}

export interface WireEmployee {
  id: string;
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
  review_cadence: string | null;
  last_evaluation_completed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeRequest {
  employee_code?: string;
  full_name: string;
  email?: string;
  department_id?: string;
  team_id?: string;
  role_id?: string;
  job_level_id?: string;
  manager_id?: string;
  employment_status?: string;
  join_date?: string;
  review_cadence?: string | null;
  last_evaluation_completed_at?: string | null;
}

export interface UpdateEmployeeRequest {
  full_name?: string;
  email?: string;
  department_id?: string;
  team_id?: string;
  role_id?: string;
  job_level_id?: string;
  manager_id?: string;
  employment_status?: string;
  termination_date?: string;
  review_cadence?: string | null;
  last_evaluation_completed_at?: string | null;
}
