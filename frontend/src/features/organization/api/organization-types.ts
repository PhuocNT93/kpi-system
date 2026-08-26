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
