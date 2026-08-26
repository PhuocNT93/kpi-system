import { JwtConfig } from '../shared/auth/index.js';
import { getGoogleAuthConfig } from './google-auth.config.js';
import { ResolvedRepositories } from './repositories.config.js';
import {
  AuthService,
  SimplePasswordHasher,
  JWTTokenService,
  GoogleIdTokenVerifier,
  GoogleIdentityVerifier,
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
  jwtConfig: JwtConfig,
  googleIdentityVerifier?: GoogleIdentityVerifier
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
  const googleAuthConfig = getGoogleAuthConfig();

  const authorizationService = new AuthorizationService(
    roleRepository,
    permissionRepository,
    userRoleRepository,
    rolePermissionRepository
  );

  const authService = userRepository
    ? new AuthService({
        userRepository,
        passwordHasher,
        tokenService,
        actorResolver: async (user) => {
          if (!userRoleRepository || !roleRepository) {
            return {
              userId: user.id,
              role: 'EMPLOYEE',
              employeeId: user.employeeId ?? undefined,
              managedTeamIds: user.employeeId ? await userRepository.findManagedTeamIds(user.employeeId) : [],
              permissions: [],
            };
          }
          const roles = await userRoleRepository.findRolesByUserId(user.id);
          let highestRole: any = 'EMPLOYEE';
          for (const ur of roles) {
            const r = await roleRepository.findById(ur.roleId);
            if (r) {
              if (r.code === 'SYSTEM_ADMIN') highestRole = 'SYSTEM_ADMIN';
              else if (r.code === 'HR_ADMIN' && highestRole !== 'SYSTEM_ADMIN') highestRole = 'HR_ADMIN';
              else if (r.code === 'MANAGER' && highestRole === 'EMPLOYEE') highestRole = 'MANAGER';
            }
          }
          const authorizationContext = await authorizationService.getAuthorizationContext(user.id);
          return {
            userId: user.id,
            role: highestRole,
            employeeId: user.employeeId ?? undefined,
            managedTeamIds: user.employeeId ? await userRepository.findManagedTeamIds(user.employeeId) : [],
            permissions: authorizationContext.permissions.map((permission) => permission.code),
          };
        },
        ensureDefaultEmployeeRole: async (userId) => {
          if (!userRoleRepository || !roleRepository) return;
          const existingRoles = await userRoleRepository.findRolesByUserId(userId);
          if (existingRoles.length === 0) {
            const employeeRole = await roleRepository.findByCode('EMPLOYEE');
            if (employeeRole?.active) {
              await userRoleRepository.assignRole(userId, employeeRole.id);
            }
          }
        },
        googleIdentityVerifier: googleIdentityVerifier ?? (googleAuthConfig ? new GoogleIdTokenVerifier(googleAuthConfig) : undefined),
      })
    : undefined;

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
