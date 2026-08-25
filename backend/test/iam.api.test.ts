import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { JWTTokenService } from '../src/modules/auth/services/token.service.js';
import { seedIamData } from '../src/modules/iam/index.js';
import {
  InMemoryUserRepository,
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryUserRoleRepository,
  InMemoryRolePermissionRepository,
  InMemoryAuditWriter,
} from './mocks/in-memory-test-repositories.js';

describe('IAM API & Security Integration Tests', () => {
  const jwtConfig = { secret: 'test-secret' };
  const tokenService = new JWTTokenService(jwtConfig);

  let app: any;
  let userRoleRepo: InMemoryUserRoleRepository;
  let roleRepo: InMemoryRoleRepository;
  let permRepo: InMemoryPermissionRepository;
  let rolePermRepo: InMemoryRolePermissionRepository;
  let auditWriter: InMemoryAuditWriter;
  let userRepo: InMemoryUserRepository;

  beforeEach(async () => {
    userRoleRepo = new InMemoryUserRoleRepository();
    roleRepo = new InMemoryRoleRepository();
    permRepo = new InMemoryPermissionRepository();
    rolePermRepo = new InMemoryRolePermissionRepository();
    auditWriter = new InMemoryAuditWriter();
    userRepo = new InMemoryUserRepository();

    await seedIamData(roleRepo, permRepo, userRoleRepo, rolePermRepo);

    // Assign SYSTEM_ADMIN role to user-1 for testing permissions
    const sysAdminRole = await roleRepo.findByCode('SYSTEM_ADMIN');
    if (sysAdminRole) {
      await userRoleRepo.assignRole('user-1', sysAdminRole.id);
    }

    app = createApp({
      jwtConfig,
      userRepository: userRepo,
      roleRepository: roleRepo,
      permissionRepository: permRepo,
      userRoleRepository: userRoleRepo,
      rolePermissionRepository: rolePermRepo,
      auditWriter,
    });
  });

  it('should return 401 UNAUTHENTICATED when missing token', async () => {
    const res = await request(app).get('/api/iam/roles');
    expect(res.status).toBe(401);
    expect(res.body.meta.error.code).toBe('UNAUTHENTICATED');
  });

  it('should return 403 FORBIDDEN when user lacks required permission', async () => {
    const employeeToken = tokenService.generateAccessToken({
      userId: 'user-employee-1',
      role: 'EMPLOYEE',
    });

    const res = await request(app)
      .get('/api/iam/roles')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.meta.error.code).toBe('FORBIDDEN');
    expect(res.body.message).toBe('You do not have permission to perform this action.');
  });

  it('should return 200 OK when user has required permission (SYSTEM_ADMIN)', async () => {
    const adminToken = tokenService.generateAccessToken({
      userId: 'user-1', // user-1 is seeded as SYSTEM_ADMIN in createApp
      role: 'SYSTEM_ADMIN',
    });

    const res = await request(app)
      .get('/api/iam/roles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should evaluate permissions based on current RBAC state rather than static JWT claims', async () => {
    const customUserRoleRepo = new InMemoryUserRoleRepository();
    const customRoleRepo = new InMemoryRoleRepository();
    const customPermRepo = new InMemoryPermissionRepository();
    const customRolePermRepo = new InMemoryRolePermissionRepository();

    await seedIamData(customRoleRepo, customPermRepo, customUserRoleRepo, customRolePermRepo);

    const customApp = createApp({
      jwtConfig,
      userRepository: new InMemoryUserRepository(),
      roleRepository: customRoleRepo,
      permissionRepository: customPermRepo,
      userRoleRepository: customUserRoleRepo,
      rolePermissionRepository: customRolePermRepo,
      auditWriter: new InMemoryAuditWriter(),
    });

    const userToken = tokenService.generateAccessToken({
      userId: 'dynamic-user',
      role: 'EMPLOYEE', // Static token claims indicate EMPLOYEE
    });

    // 1. Initial check without SYSTEM_ADMIN role assignment -> 403
    let res = await request(customApp)
      .get('/api/iam/roles')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);

    // 2. Assign SYSTEM_ADMIN role dynamically without altering or re-issuing JWT token
    const sysAdminRole = await customRoleRepo.findByCode('SYSTEM_ADMIN');
    expect(sysAdminRole).not.toBeNull();
    if (sysAdminRole) {
      await customUserRoleRepo.assignRole('dynamic-user', sysAdminRole.id);
    }

    // 3. Check again with same token -> now 200 OK because RBAC is dynamically resolved
    res = await request(customApp)
      .get('/api/iam/roles')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });
});
