// IAM wire models (snake_case — matches backend API contract)

export interface WireIamUser {
  id: string;
  email: string;
  name: string;
  role_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WireIamRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permission_codes: string[];
  created_at: string;
  updated_at: string;
}

export interface WireIamPermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

// Request bodies
export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role_code: string;
}

export interface UpdateUserRequest {
  name?: string;
  role_code?: string;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

export interface AssignPermissionRequest {
  permission_code: string;
}
