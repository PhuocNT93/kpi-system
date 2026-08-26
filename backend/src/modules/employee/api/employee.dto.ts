import { BaseResourceResponse, DateRangeFilter } from '../../../api/dto-types.js';

export interface EmployeeResponse extends BaseResourceResponse {
  employee_code: string;
  full_name: string;
  email: string;
  department_id?: string;
  team_id?: string;
  role_id: string;
  job_level_id: string;
  manager_id?: string;
  employment_status: string;
  join_date: string;
  termination_date?: string;
  version: number;
}

export interface DepartmentResponse extends BaseResourceResponse {
  code: string;
  name: string;
  active: boolean;
}

export interface TeamResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  department_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamDetailResponse extends TeamResponse {
  member_count: number;
  active_member_count: number;
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
  active?: boolean;
}

export interface RoleResponse extends BaseResourceResponse {
  code: string;
  name: string;
  description: string;
  active: boolean;
}

export interface JobLevelResponse extends BaseResourceResponse {
  code: string;
  name: string;
  rank: number;
  active: boolean;
}

export interface EmployeeImportJobResponse extends BaseResourceResponse {
  csv_template_id: string;
  evaluation_cycle_id: string;
  file_name: string;
  status: string;
  total_rows: number;
  success_rows: number;
  error_rows: number;
}
