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

describe('Employee API Routes (MVP Scaffolding)', () => {
  const jwtConfig = { secret: 'test-secret' };
  const tokenService = new JWTTokenService(jwtConfig);

  let app: any;

  beforeEach(async () => {
    // create a fake pool object for testing
    const fakePool = {} as any;
    const userRoleRepo = new InMemoryUserRoleRepository();
    const roleRepo = new InMemoryRoleRepository();
    const permRepo = new InMemoryPermissionRepository();
    const rolePermRepo = new InMemoryRolePermissionRepository();
    const auditWriter = new InMemoryAuditWriter();
    const userRepo = new InMemoryUserRepository();

    await seedIamData(roleRepo, permRepo, userRoleRepo, rolePermRepo);

    app = createApp({
      jwtConfig,
      dbPool: fakePool,
      userRepository: userRepo,
      roleRepository: roleRepo,
      permissionRepository: permRepo,
      userRoleRepository: userRoleRepo,
      rolePermissionRepository: rolePermRepo,
      auditWriter,
    });
  });

  const getToken = () => {
    return tokenService.generateAccessToken({
      userId: 'user-1',
      role: 'SYSTEM_ADMIN', // dummy payload
    });
  };

  const headers = () => ({
    Authorization: `Bearer ${getToken()}`
  });

  describe('Employee Entity Endpoints', () => {
    it('GET /api/employees should return 200 array on success', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set(headers());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(expect.any(Array));
    });

    it('POST /api/employees should return 201', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set(headers())
        .send({ dummy: 'data' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/employees/:id/deactivate should return 200', async () => {
      const res = await request(app)
        .post('/api/employees/123/deactivate')
        .set(headers());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Department Entity Endpoints', () => {
    it('GET /api/departments should return 200 array', async () => {
      const res = await request(app).get('/api/departments').set(headers());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Team Entity Endpoints', () => {
    it('GET /api/teams/123 should return 200 single object', async () => {
      const res = await request(app).get('/api/teams/123').set(headers());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('123');
    });
  });

  describe('Role Entity Endpoints', () => {
    it('GET /api/roles should return 200 array', async () => {
      const res = await request(app).get('/api/roles').set(headers());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Job Level Entity Endpoints', () => {
    it('GET /api/job-levels should return 200 array', async () => {
      const res = await request(app).get('/api/job-levels').set(headers());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Employee Import Endpoints', () => {
    it('POST /api/employee-imports should return 202', async () => {
      const res = await request(app).post('/api/employee-imports').set(headers());
      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UPLOADED');
    });
  });

  describe('404 Fallback', () => {
    it('GET /api/employees/foo/bar returns 404', async () => {
      const res = await request(app).get('/api/employees/foo/bar').set(headers());
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});