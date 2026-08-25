import { JwtConfig } from '../shared/auth/index.js';
import { ResolvedRepositories } from './repositories.config.js';
import {
  AuthService,
  SimplePasswordHasher,
  JWTTokenService,
} from '../modules/auth/index.js';
import {
  AuthorizationService,
  RoleService,
  PermissionService,
  RoleAssignmentService,
} from '../modules/iam/index.js';

export interface ResolvedServices {
  authService?: AuthService;
  authorizationService: AuthorizationService;
  roleService: RoleService;
  permissionService: PermissionService;
  roleAssignmentService: RoleAssignmentService;
}

export function resolveServices(
  repositories: ResolvedRepositories,
  jwtConfig: JwtConfig
): ResolvedServices {
  const {
    userRepository,
    roleRepository,
    permissionRepository,
    userRoleRepository,
    rolePermissionRepository,
    auditWriter,
  } = repositories;

  const passwordHasher = new SimplePasswordHasher();
  const tokenService = new JWTTokenService(jwtConfig);

  const authService = userRepository
    ? new AuthService({
        userRepository,
        passwordHasher,
        tokenService,
      })
    : undefined;

  const authorizationService = new AuthorizationService(
    roleRepository,
    permissionRepository,
    userRoleRepository,
    rolePermissionRepository
  );

  const roleService = new RoleService(roleRepository, auditWriter);
  const permissionService = new PermissionService(permissionRepository);
  const roleAssignmentService = new RoleAssignmentService(
    roleRepository,
    permissionRepository,
    userRoleRepository,
    rolePermissionRepository,
    auditWriter
  );

  return {
    authService,
    authorizationService,
    roleService,
    permissionService,
    roleAssignmentService,
  };
}
