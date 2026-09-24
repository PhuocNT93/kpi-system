import {
  RoleRepository,
  PermissionRepository,
  UserRoleRepository,
  RolePermissionRepository,
} from '../domain/repositories.js';
import { AuthorizationScope, Permission, Role } from '../domain/types.js';
import { UserRepository } from '../../auth/domain/user.model.js';
import { PasswordHasher, SimplePasswordHasher } from '../../auth/services/password-hasher.service.js';

export async function seedIamData(
  roleRepo: RoleRepository,
  permRepo: PermissionRepository,
  userRoleRepo: UserRoleRepository,
  rolePermRepo: RolePermissionRepository,
  userRepo?: UserRepository,
  passwordHasher?: PasswordHasher
): Promise<void> {
  const permissionsData: { code: string; resource: string; action: string; description: string }[] = [
    // 1. Dashboard & User Guide
    { code: 'dashboard:read', resource: 'dashboard', action: 'read', description: 'View performance dashboard' },
    { code: 'user_guide:read', resource: 'user_guide', action: 'read', description: 'View system user guide' },

    // 2. Notification Preferences
    { code: 'notification_preference:read', resource: 'notification_preference', action: 'read', description: 'View email notification preferences' },
    { code: 'notification_preference:update', resource: 'notification_preference', action: 'update', description: 'Update email notification preferences' },

    // 3. Evaluation & Performance
    { code: 'evaluation:read', resource: 'evaluation', action: 'read', description: 'Read evaluation' },
    { code: 'evaluation:create', resource: 'evaluation', action: 'create', description: 'Create evaluation' },
    { code: 'evaluation:update', resource: 'evaluation', action: 'update', description: 'Update evaluation' },
    { code: 'evaluation:submit', resource: 'evaluation', action: 'submit', description: 'Submit evaluation' },
    { code: 'evaluation:approve', resource: 'evaluation', action: 'approve', description: 'Approve evaluation' },
    { code: 'evaluation:manual_override', resource: 'evaluation', action: 'manual_override', description: 'Manual override KPI score (HR/Admin only)' },
    { code: 'KPI_MANUAL_OVERRIDE', resource: 'evaluation', action: 'kpi_manual_override', description: 'Manual override KPI score' },
    { code: 'evaluation:publish', resource: 'evaluation', action: 'publish', description: 'Publish evaluation results' },
    { code: 'evaluation:lock', resource: 'evaluation', action: 'lock', description: 'Lock evaluation' },
    { code: 'evaluation:adjust_score', resource: 'evaluation', action: 'adjust_score', description: 'Adjust evaluation score' },

    // 4. Employee (Directory & Search)
    { code: 'employee:read', resource: 'employee', action: 'read', description: 'Read employee information' },
    { code: 'employee:create', resource: 'employee', action: 'create', description: 'Create employee record' },
    { code: 'employee:update', resource: 'employee', action: 'update', description: 'Update employee record' },
    { code: 'employee:delete', resource: 'employee', action: 'delete', description: 'Delete employee record' },

    // 5. Review Due
    { code: 'review_due:read', resource: 'review_due', action: 'read', description: 'View review due schedules & reminders' },
    { code: 'review_due:schedule', resource: 'review_due', action: 'schedule', description: 'Trigger review due checks & notifications' },
    { code: 'review_due:update', resource: 'review_due', action: 'update', description: 'Update review due configuration' },

    // 6. Review Cadences
    { code: 'review_cadence:read', resource: 'review_cadence', action: 'read', description: 'View review cadences' },
    { code: 'review_cadence:create', resource: 'review_cadence', action: 'create', description: 'Create review cadence' },
    { code: 'review_cadence:update', resource: 'review_cadence', action: 'update', description: 'Update review cadence' },
    { code: 'review_cadence:delete', resource: 'review_cadence', action: 'delete', description: 'Delete review cadence' },

    // 7. Organization Structure (Departments, Teams, Roles, Levels)
    { code: 'organization:read', resource: 'organization', action: 'read', description: 'View organization structure' },
    { code: 'organization:create', resource: 'organization', action: 'create', description: 'Create organization entities' },
    { code: 'organization:update', resource: 'organization', action: 'update', description: 'Update organization entities' },
    { code: 'organization:delete', resource: 'organization', action: 'delete', description: 'Delete organization entities' },

    // 8. Evaluation Cycle
    { code: 'cycle:read', resource: 'cycle', action: 'read', description: 'Read evaluation cycles' },
    { code: 'cycle:create', resource: 'cycle', action: 'create', description: 'Create evaluation cycle' },
    { code: 'cycle:update', resource: 'cycle', action: 'update', description: 'Update evaluation cycle' },
    { code: 'cycle:open', resource: 'cycle', action: 'open', description: 'Open evaluation cycle' },
    { code: 'cycle:lock', resource: 'cycle', action: 'lock', description: 'Lock evaluation cycle' },
    { code: 'cycle:delete', resource: 'cycle', action: 'delete', description: 'Delete evaluation cycle' },

    // 9. Calibration
    { code: 'calibration:read', resource: 'calibration', action: 'read', description: 'Read calibration' },
    { code: 'calibration:adjust', resource: 'calibration', action: 'adjust', description: 'Adjust calibration scores' },
    { code: 'calibration:finalize', resource: 'calibration', action: 'finalize', description: 'Finalize calibration' },

    // 10. Criterion
    { code: 'criterion:read', resource: 'criterion', action: 'read', description: 'Read criteria' },
    { code: 'criterion:create', resource: 'criterion', action: 'create', description: 'Create criterion' },
    { code: 'criterion:update', resource: 'criterion', action: 'update', description: 'Update criterion' },
    { code: 'criterion:publish', resource: 'criterion', action: 'publish', description: 'Publish criterion' },
    { code: 'criterion:delete', resource: 'criterion', action: 'delete', description: 'Delete criterion' },

    // 11. KPI Library
    { code: 'kpi:read', resource: 'kpi', action: 'read', description: 'View KPI library' },
    { code: 'kpi:create', resource: 'kpi', action: 'create', description: 'Create KPI definition' },
    { code: 'kpi:update', resource: 'kpi', action: 'update', description: 'Update KPI definition' },
    { code: 'kpi:delete', resource: 'kpi', action: 'delete', description: 'Delete KPI definition' },

    // 12. Template Builder
    { code: 'template:read', resource: 'template', action: 'read', description: 'Read templates' },
    { code: 'template:create', resource: 'template', action: 'create', description: 'Create template' },
    { code: 'template:update', resource: 'template', action: 'update', description: 'Update template' },
    { code: 'template:publish', resource: 'template', action: 'publish', description: 'Publish template' },
    { code: 'template:delete', resource: 'template', action: 'delete', description: 'Delete template' },

    // 13. Data Ingestion & Collector
    { code: 'import:create', resource: 'import', action: 'create', description: 'Create data import' },
    { code: 'import:read', resource: 'import', action: 'read', description: 'Read data imports' },
    { code: 'import:confirm', resource: 'import', action: 'confirm', description: 'Confirm data import' },
    { code: 'collector:read', resource: 'collector', action: 'read', description: 'View data collectors and status' },
    { code: 'collector:run', resource: 'collector', action: 'run', description: 'Trigger collector synchronization' },
    { code: 'collector:update', resource: 'collector', action: 'update', description: 'Update collector configuration' },

    // 14. I18n Translation Management
    { code: 'i18n:read', resource: 'i18n', action: 'read', description: 'View i18n translation texts' },
    { code: 'i18n:update', resource: 'i18n', action: 'update', description: 'Update i18n translations' },

    // 15. Email Notification Templates
    { code: 'notification_template:read', resource: 'notification_template', action: 'read', description: 'View email notification templates' },
    { code: 'notification_template:update', resource: 'notification_template', action: 'update', description: 'Update email notification templates' },

    // 16. Email Notification Delivery Logs
    { code: 'notification_log:read', resource: 'notification_log', action: 'read', description: 'View email notification delivery logs' },
    { code: 'notification_log:resend', resource: 'notification_log', action: 'resend', description: 'Resend email notification' },

    // 17. Reports
    { code: 'report:self', resource: 'report', action: 'self', description: 'Self report' },
    { code: 'report:team', resource: 'report', action: 'team', description: 'Team report' },
    { code: 'report:organization', resource: 'report', action: 'organization', description: 'Organization report' },

    // 18. Audit Log
    { code: 'audit:read', resource: 'audit', action: 'read', description: 'Read audit logs' },

    // 19. Configuration
    { code: 'CONFIGURATION_READ', resource: 'configuration', action: 'read', description: 'View configuration entities' },
    { code: 'CONFIGURATION_CREATE', resource: 'configuration', action: 'create', description: 'Create configuration entities' },
    { code: 'CONFIGURATION_UPDATE', resource: 'configuration', action: 'update', description: 'Update configuration entities' },
    { code: 'CONFIGURATION_VALIDATE', resource: 'configuration', action: 'validate', description: 'Validate configuration entities' },
    { code: 'CONFIGURATION_PUBLISH', resource: 'configuration', action: 'publish', description: 'Publish configuration entities' },
    { code: 'CONFIGURATION_RETIRE', resource: 'configuration', action: 'retire', description: 'Retire configuration entities' },
    { code: 'CONFIGURATION_OVERRIDE', resource: 'configuration', action: 'override', description: 'Manage configuration overrides' },
    { code: 'CONFIGURATION_AUDIT_READ', resource: 'configuration', action: 'audit_read', description: 'View configuration audit logs' },

    // 20. IAM (User, Role, Permission)
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
        id: crypto.randomUUID(),
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

  // Exactly the 4 core system roles
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
        id: crypto.randomUUID(),
        code: r.code,
        name: r.name,
        description: r.description,
        active: true,
        systemRole: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (!role.systemRole) {
      role = await roleRepo.update({
        ...role,
        systemRole: true,
        active: true,
      });
    }
    roleMap.set(r.code, role);
  }

  // Define role permissions and scopes for the 4 core roles based on all menu modules
  const rolePermAssignments: { roleCode: string; permCode: string; scope: AuthorizationScope }[] = [
    // ── EMPLOYEE ──────────────────────────────────────────────────────────
    { roleCode: 'EMPLOYEE', permCode: 'dashboard:read', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'user_guide:read', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'notification_preference:read', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'notification_preference:update', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'employee:read', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'evaluation:read', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'evaluation:update', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'evaluation:submit', scope: 'SELF' },
    { roleCode: 'EMPLOYEE', permCode: 'report:self', scope: 'SELF' },

    // ── MANAGER ───────────────────────────────────────────────────────────
    { roleCode: 'MANAGER', permCode: 'dashboard:read', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'user_guide:read', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'notification_preference:read', scope: 'SELF' },
    { roleCode: 'MANAGER', permCode: 'notification_preference:update', scope: 'SELF' },
    { roleCode: 'MANAGER', permCode: 'employee:read', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'evaluation:read', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'evaluation:create', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'evaluation:update', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'evaluation:submit', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'evaluation:approve', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'evaluation:adjust_score', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'review_due:read', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'report:self', scope: 'SELF' },
    { roleCode: 'MANAGER', permCode: 'report:team', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'import:read', scope: 'TEAM' },
    { roleCode: 'MANAGER', permCode: 'collector:read', scope: 'TEAM' },

    // ── HR_ADMIN ──────────────────────────────────────────────────────────
    { roleCode: 'HR_ADMIN', permCode: 'dashboard:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'user_guide:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'notification_preference:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'notification_preference:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'employee:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'employee:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'employee:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'employee:delete', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'organization:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'organization:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'organization:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'organization:delete', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'criterion:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'criterion:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'criterion:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'criterion:publish', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'criterion:delete', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'template:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'template:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'template:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'template:publish', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'template:delete', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:open', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:lock', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'cycle:delete', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'review_cadence:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'review_cadence:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'review_cadence:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'review_cadence:delete', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'review_due:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'review_due:schedule', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'review_due:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:submit', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:approve', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:manual_override', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'KPI_MANUAL_OVERRIDE', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:publish', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:lock', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'evaluation:adjust_score', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'calibration:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'calibration:adjust', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'calibration:finalize', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'kpi:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'kpi:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'kpi:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'kpi:delete', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'import:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'import:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'import:confirm', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'collector:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'collector:run', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'collector:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'i18n:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'i18n:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'notification_template:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'notification_template:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'notification_log:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'notification_log:resend', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'report:self', scope: 'SELF' },
    { roleCode: 'HR_ADMIN', permCode: 'report:team', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'report:organization', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'audit:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'CONFIGURATION_READ', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'CONFIGURATION_CREATE', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'CONFIGURATION_UPDATE', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'CONFIGURATION_VALIDATE', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'CONFIGURATION_PUBLISH', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'CONFIGURATION_RETIRE', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'CONFIGURATION_OVERRIDE', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'CONFIGURATION_AUDIT_READ', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'user:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'user:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'user:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'user:assign_role', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'role:read', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'role:create', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'role:update', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'role:assign_permission', scope: 'ORGANIZATION' },
    { roleCode: 'HR_ADMIN', permCode: 'permission:read', scope: 'ORGANIZATION' },

    // ── SYSTEM_ADMIN (gets all permissions with SYSTEM scope) ──────────────
    ...permissionsData.map((p) => ({
      roleCode: 'SYSTEM_ADMIN',
      permCode: p.code,
      scope: 'SYSTEM' as AuthorizationScope,
    })),
  ];

  for (const assign of rolePermAssignments) {
    const role = roleMap.get(assign.roleCode);
    const perm = permMap.get(assign.permCode);
    if (role && perm) {
      await rolePermRepo.assignPermission(role.id, perm.id, assign.scope);
    }
  }

  // Seed 4 user login accounts corresponding to the 4 system roles
  if (userRepo) {
    const hasher = passwordHasher || new SimplePasswordHasher();
    const seedUsersData: { email: string; name: string; password: string; roleCode: string }[] = [
      { email: 'employee@kpi.com', name: 'Employee User', password: 'Password123!', roleCode: 'EMPLOYEE' },
      { email: 'manager@kpi.com', name: 'Manager User', password: 'Password123!', roleCode: 'MANAGER' },
      { email: 'hradmin@kpi.com', name: 'HR Admin User', password: 'Password123!', roleCode: 'HR_ADMIN' },
      { email: 'ky.luong@cyberlogitec.com', name: 'Lương Công Kỳ', password: 'Password123!', roleCode: 'SYSTEM_ADMIN' },
    ];

    for (const u of seedUsersData) {
      let user = await userRepo.findByEmail(u.email);
      if (!user) {
        const passwordHash = await hasher.hash(u.password);
        user = await userRepo.create({
          email: u.email,
          name: u.name,
          passwordHash,
        });
      }
      const role = roleMap.get(u.roleCode);
      if (role && user) {
        await userRoleRepo.assignRole(user.id, role.id);
      }
    }
  }
}
