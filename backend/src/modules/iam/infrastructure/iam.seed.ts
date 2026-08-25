import {
  RoleRepository,
  PermissionRepository,
  UserRoleRepository,
  RolePermissionRepository,
} from '../domain/repositories.js';
import { AuthorizationScope, Permission, Role } from '../domain/types.js';

export async function seedIamData(
  roleRepo: RoleRepository,
  permRepo: PermissionRepository,
  userRoleRepo: UserRoleRepository,
  rolePermRepo: RolePermissionRepository
): Promise<void> {
  const permissionsData: { code: string; resource: string; action: string; description: string }[] = [
    // evaluation
    { code: 'evaluation:read', resource: 'evaluation', action: 'read', description: 'Read evaluation' },
    { code: 'evaluation:create', resource: 'evaluation', action: 'create', description: 'Create evaluation' },
    { code: 'evaluation:update', resource: 'evaluation', action: 'update', description: 'Update evaluation' },
    { code: 'evaluation:submit', resource: 'evaluation', action: 'submit', description: 'Submit evaluation' },
    { code: 'evaluation:approve', resource: 'evaluation', action: 'approve', description: 'Approve evaluation' },
    { code: 'evaluation:adjust_score', resource: 'evaluation', action: 'adjust_score', description: 'Adjust evaluation score' },

    // employee
    { code: 'employee:read', resource: 'employee', action: 'read', description: 'Read employee' },
    { code: 'employee:create', resource: 'employee', action: 'create', description: 'Create employee' },
    { code: 'employee:update', resource: 'employee', action: 'update', description: 'Update employee' },

    // criterion
    { code: 'criterion:read', resource: 'criterion', action: 'read', description: 'Read criterion' },
    { code: 'criterion:create', resource: 'criterion', action: 'create', description: 'Create criterion' },
    { code: 'criterion:update', resource: 'criterion', action: 'update', description: 'Update criterion' },
    { code: 'criterion:publish', resource: 'criterion', action: 'publish', description: 'Publish criterion' },

    // template
    { code: 'template:read', resource: 'template', action: 'read', description: 'Read template' },
    { code: 'template:create', resource: 'template', action: 'create', description: 'Create template' },
    { code: 'template:update', resource: 'template', action: 'update', description: 'Update template' },
    { code: 'template:publish', resource: 'template', action: 'publish', description: 'Publish template' },

    // cycle
    { code: 'cycle:read', resource: 'cycle', action: 'read', description: 'Read cycle' },
    { code: 'cycle:create', resource: 'cycle', action: 'create', description: 'Create cycle' },
    { code: 'cycle:update', resource: 'cycle', action: 'update', description: 'Update cycle' },
    { code: 'cycle:open', resource: 'cycle', action: 'open', description: 'Open cycle' },
    { code: 'cycle:lock', resource: 'cycle', action: 'lock', description: 'Lock cycle' },

    // import
    { code: 'import:create', resource: 'import', action: 'create', description: 'Create import' },
    { code: 'import:read', resource: 'import', action: 'read', description: 'Read import' },
    { code: 'import:confirm', resource: 'import', action: 'confirm', description: 'Confirm import' },

    // calibration
    { code: 'calibration:read', resource: 'calibration', action: 'read', description: 'Read calibration' },
    { code: 'calibration:adjust', resource: 'calibration', action: 'adjust', description: 'Adjust calibration' },
    { code: 'calibration:finalize', resource: 'calibration', action: 'finalize', description: 'Finalize calibration' },

    // report
    { code: 'report:self', resource: 'report', action: 'self', description: 'Self report' },
    { code: 'report:team', resource: 'report', action: 'team', description: 'Team report' },
    { code: 'report:organization', resource: 'report', action: 'organization', description: 'Organization report' },

    // audit
    { code: 'audit:read', resource: 'audit', action: 'read', description: 'Read audit logs' },

    // user & iam
    { code: 'user:read', resource: 'user', action: 'read', description: 'Read users' },
    { code: 'user:create', resource: 'user', action: 'create', description: 'Create user' },
    { code: 'user:update', resource: 'user', action: 'update', description: 'Update user' },
    { code: 'user:assign_role', resource: 'user', action: 'assign_role', description: 'Assign user role' },

    { code: 'role:read', resource: 'role', action: 'read', description: 'Read roles' },
    { code: 'role:create', resource: 'role', action: 'create', description: 'Create role' },
    { code: 'role:update', resource: 'role', action: 'update', description: 'Update role' },
    { code: 'role:assign_permission', resource: 'role', action: 'assign_permission', description: 'Assign role permission' },

    { code: 'permission:read', resource: 'permission', action: 'read', description: 'Read permissions' },
  ];

  const permMap = new Map<string, Permission>();

  for (const p of permissionsData) {
    let perm = await permRepo.findByCode(p.code);
    if (!perm) {
      perm = await permRepo.create({
        id: `perm-${p.code.replace(':', '-')}`,
        code: p.code,
        resource: p.resource,
        action: p.action,
        description: p.description,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    permMap.set(p.code, perm);
  }

  const rolesData: { code: string; name: string; description: string }[] = [
    { code: 'EMPLOYEE', name: 'Employee', description: 'Standard employee role' },
    { code: 'MANAGER', name: 'Manager', description: 'Team manager role' },
    { code: 'HR_ADMIN', name: 'HR Administrator', description: 'HR Admin role' },
    { code: 'SYSTEM_ADMIN', name: 'System Administrator', description: 'System Admin role' },
  ];

  const roleMap = new Map<string, Role>();

  for (const r of rolesData) {
    let role = await roleRepo.findByCode(r.code);
    if (!role) {
      role = await roleRepo.create({
        id: `role-${r.code.toLowerCase()}`,
        code: r.code,
        name: r.name,
        description: r.description,
        active: true,
        systemRole: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    roleMap.set(r.code, role);
  }

  // Define role permissions and scopes
  const rolePermAssignments: { roleCode: string; permCode: string; scope: AuthorizationScope }[] = [
    // EMPLOYEE
    { roleCode: 'EMPLOYEE', permCode: 'evaluation:read', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'evaluation:update', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'evaluation:submit', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'report:self', scope: 'SELF' },

    // MANAGER
    { roleCode: 'MANAGER', permCode: 'evaluation:read', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'evaluation:update', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'evaluation:submit', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'evaluation:approve', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'evaluation:adjust_score', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'report:team', scope: 'TEAM' },

    // HR_ADMIN
    { roleCode: 'HR_ADMIN', permCode: 'employee:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'employee:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'employee:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'role:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'role:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'role:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'role:assign_permission', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'permission:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'criterion:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'criterion:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'criterion:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'criterion:publish', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'template:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'template:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'template:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'template:publish', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:open', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:lock', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:submit', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:approve', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:adjust_score', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'import:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'import:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'import:confirm', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'calibration:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'calibration:adjust', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'calibration:finalize', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'report:organization', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'audit:read', scope: 'ORGANIZATION' },

    // SYSTEM_ADMIN
    { roleCode: 'SYSTEM_ADMIN', permCode: 'user:read', scope: 'SYSTEM' },
    { roleCode: 'SYSTEM_ADMIN', permCode: 'user:create', scope: 'SYSTEM' },
    { roleCode: 'SYSTEM_ADMIN', permCode: 'user:update', scope: 'SYSTEM' },
    { roleCode: 'SYSTEM_ADMIN', permCode: 'user:assign_role', scope: 'SYSTEM' },
    { roleCode: 'SYSTEM_ADMIN', permCode: 'role:read', scope: 'SYSTEM' },
    { roleCode: 'SYSTEM_ADMIN', permCode: 'role:create', scope: 'SYSTEM' },
    { roleCode: 'SYSTEM_ADMIN', permCode: 'role:update', scope: 'SYSTEM' },
    { roleCode: 'SYSTEM_ADMIN', permCode: 'role:assign_permission', scope: 'SYSTEM' },
    { roleCode: 'SYSTEM_ADMIN', permCode: 'permission:read', scope: 'SYSTEM' },
    { roleCode: 'SYSTEM_ADMIN', permCode: 'audit:read', scope: 'SYSTEM' },
  ];

  for (const assign of rolePermAssignments) {
    const role = roleMap.get(assign.roleCode);
    const perm = permMap.get(assign.permCode);
    if (role && perm) {
      await rolePermRepo.assignPermission(role.id, perm.id, assign.scope);
    }
  }

  // Default initial seed user roles for demo/dev if needed
  const adminRole = roleMap.get('SYSTEM_ADMIN');
  if (adminRole) {
    await userRoleRepo.assignRole('user-1', adminRole.id);
  }
}
