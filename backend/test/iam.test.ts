import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryUserRoleRepository,
  InMemoryRolePermissionRepository,
  InMemoryAuditWriter,
  seedIamData,
  AuthorizationService,
  RoleService,
  PermissionService,
  RoleAssignmentService,
} from '../src/modules/iam/index.js';

describe('IAM & RBAC Unit Tests', () => {
  let roleRepo: InMemoryRoleRepository;
  let permRepo: InMemoryPermissionRepository;
  let userRoleRepo: InMemoryUserRoleRepository;
  let rolePermRepo: InMemoryRolePermissionRepository;
  let auditWriter: InMemoryAuditWriter;

  let authzService: AuthorizationService;
  let roleService: RoleService;
  let permService: PermissionService;
  let roleAssignService: RoleAssignmentService;

  beforeEach(async () => {
    roleRepo = new InMemoryRoleRepository();
    permRepo = new InMemoryPermissionRepository();
    userRoleRepo = new InMemoryUserRoleRepository();
    rolePermRepo = new InMemoryRolePermissionRepository();
    auditWriter = new InMemoryAuditWriter();

    await seedIamData(roleRepo, permRepo, userRoleRepo, rolePermRepo);

    authzService = new AuthorizationService(roleRepo, permRepo, userRoleRepo, rolePermRepo);
    roleService = new RoleService(roleRepo, auditWriter);
    permService = new PermissionService(permRepo);
    roleAssignService = new RoleAssignmentService(
      roleRepo,
      permRepo,
      userRoleRepo,
      rolePermRepo,
      auditWriter
    );
  });

  describe('Repositories & Services', () => {
    it('should create and retrieve roles', async () => {
      const created = await roleService.createRole({
        code: 'CALIBRATION_REVIEWER',
        name: 'Calibration Reviewer',
      });
      expect(created.code).toBe('CALIBRATION_REVIEWER');

      const found = await roleService.getRoleById(created.id);
      expect(found.name).toBe('Calibration Reviewer');
    });

    it('should assign and remove user roles', async () => {
      const userId = 'user-test-1';
      await roleAssignService.assignRole(userId, 'EMPLOYEE');
      let roles = await roleAssignService.getUserRoles(userId);
      expect(roles).toHaveLength(1);
      expect(roles[0].code).toBe('EMPLOYEE');

      await roleAssignService.removeRole(userId, 'EMPLOYEE');
      roles = await roleAssignService.getUserRoles(userId);
      expect(roles).toHaveLength(0);
    });

    it('should assign and remove permissions from roles', async () => {
      const role = await roleRepo.findByCode('EMPLOYEE');
      expect(role).not.toBeNull();
      if (!role) return;

      await roleAssignService.assignPermissionToRole(role.id, 'audit:read', 'SYSTEM');
      let perms = await roleAssignService.getRolePermissions(role.id);
      expect(perms.some((p) => p.code === 'audit:read')).toBe(true);

      await roleAssignService.removePermissionFromRole(role.id, 'audit:read');
      perms = await roleAssignService.getRolePermissions(role.id);
      expect(perms.some((p) => p.code === 'audit:read')).toBe(false);
    });
  });

  describe('RBAC Authorization Matrix', () => {
    it('EMPLOYEE role permissions check', async () => {
      const userId = 'emp-1';
      await roleAssignService.assignRole(userId, 'EMPLOYEE');

      expect(await authzService.hasPermission(userId, 'evaluation:read', 'SELF')).toBe(true);
      expect(await authzService.hasPermission(userId, 'evaluation:update', 'SELF')).toBe(true);
      expect(await authzService.hasPermission(userId, 'evaluation:approve', 'TEAM')).toBe(false);
      expect(await authzService.hasPermission(userId, 'cycle:lock', 'ORGANIZATION')).toBe(false);
    });

    it('MANAGER role permissions check', async () => {
      const userId = 'mgr-1';
      await roleAssignService.assignRole(userId, 'MANAGER');

      expect(await authzService.hasPermission(userId, 'evaluation:read', 'TEAM')).toBe(true);
      expect(await authzService.hasPermission(userId, 'evaluation:adjust_score', 'TEAM')).toBe(true);
      expect(await authzService.hasPermission(userId, 'cycle:lock', 'ORGANIZATION')).toBe(false);
    });

    it('HR_ADMIN role permissions check', async () => {
      const userId = 'hr-1';
      await roleAssignService.assignRole(userId, 'HR_ADMIN');

      expect(await authzService.hasPermission(userId, 'evaluation:approve', 'ORGANIZATION')).toBe(true);
      expect(await authzService.hasPermission(userId, 'cycle:lock', 'ORGANIZATION')).toBe(true);
      expect(await authzService.hasPermission(userId, 'calibration:finalize', 'ORGANIZATION')).toBe(true);
    });

    it('SYSTEM_ADMIN role permissions check', async () => {
      const userId = 'sysadmin-1';
      await roleAssignService.assignRole(userId, 'SYSTEM_ADMIN');

      expect(await authzService.hasPermission(userId, 'user:assign_role', 'SYSTEM')).toBe(true);
      expect(await authzService.hasPermission(userId, 'evaluation:adjust_score', 'TEAM')).toBe(false);
    });

    it('Union of multiple roles (EMPLOYEE + MANAGER)', async () => {
      const userId = 'multi-role-user';
      await roleAssignService.assignRole(userId, 'EMPLOYEE');
      await roleAssignService.assignRole(userId, 'MANAGER');

      expect(await authzService.hasPermission(userId, 'report:self', 'SELF')).toBe(true);
      expect(await authzService.hasPermission(userId, 'evaluation:approve', 'TEAM')).toBe(true);
    });

    it('Inactive user / role / permission behavior', async () => {
      const userId = 'inactive-user';
      const role = await roleService.createRole({ code: 'INACTIVE_ROLE', name: 'Inactive' });
      await roleAssignService.assignPermissionToRole(role.id, 'evaluation:read', 'SELF');
      await roleAssignService.assignRole(userId, 'INACTIVE_ROLE');

      expect(await authzService.hasPermission(userId, 'evaluation:read')).toBe(true);

      // Deactivate role
      await roleService.updateRole(role.id, { active: false });
      expect(await authzService.hasPermission(userId, 'evaluation:read')).toBe(false);
    });
  });
});
