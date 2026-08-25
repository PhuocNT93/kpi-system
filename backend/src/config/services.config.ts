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
        roleResolver: async (userId: string) => {
          if (!userRoleRepository || !roleRepository) return 'EMPLOYEE';
          const roles = await userRoleRepository.findRolesByUserId(userId);
          let highestRole: any = 'EMPLOYEE';
          for (const ur of roles) {
            const r = await roleRepository.findById(ur.roleId);
            if (r) {
              if (r.code === 'SYSTEM_ADMIN') highestRole = 'SYSTEM_ADMIN';
              else if (r.code === 'HR_ADMIN' && highestRole !== 'SYSTEM_ADMIN') highestRole = 'HR_ADMIN';
              else if (r.code === 'MANAGER' && highestRole === 'EMPLOYEE') highestRole = 'MANAGER';
            }
          }
          return highestRole;
        },
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
