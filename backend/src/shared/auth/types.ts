export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SYSTEM_ADMIN';

export interface Actor {
  userId: string;
  role: UserRole;
  employeeId?: string;
  managedTeamIds?: string[];
  permissions?: string[];
}

export interface JwtActorPayload {
  sub: string;
  role: UserRole;
  employeeId?: string;
  managedTeamIds?: string[];
  permissions?: string[];
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

export interface JwtRefreshTokenPayload {
  sub: string;
  role?: UserRole;
  type: 'refresh';
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

export interface JwtConfig {
  secret: string;
  refreshTokenSecret?: string;
  expiresIn?: string | number;
  refreshTokenExpiresIn?: string | number;
  issuer?: string;
  audience?: string;
  algorithms?: ('HS256' | 'HS384' | 'HS512')[];
}

export type Action =
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SUBMIT'
  | 'APPROVE'
  | 'LOCK'
  | 'CALIBRATE';

export interface Resource {
  type: string;
  id?: string;
  ownerEmployeeId?: string;
  teamId?: string;
}

export interface IAuthorizer {
  authorize(actor: Actor, action: Action, resource?: Resource): boolean | Promise<boolean>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}
