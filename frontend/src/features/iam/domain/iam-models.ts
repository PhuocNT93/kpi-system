// Frontend domain models (camelCase) for IAM feature
// Components and hooks consume these — never wire types directly

export interface IamUser {
  id: string;
  email: string;
  name: string;
  roleCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IamRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissionCodes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IamPermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
}
