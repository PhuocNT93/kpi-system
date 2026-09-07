import { describe, it, expect, beforeEach, vi } from 'vitest';
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
} from './mocks/in-memory-test-repositories.js';

describe('Import API Routes', () => {
  const jwtConfig = { secret: 'test-secret' };
  const tokenService = new JWTTokenService(jwtConfig);

  let app: import('express').Application;
  let fakePool: import('pg').Pool;

  beforeEach(async () => {
    // Fake pool that returns a dummy template and columns
    fakePool = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes('FROM csv_template_column')) {
          return Promise.resolve({
            rows: [
              { column_name: 'employee_id' },
              { column_name: 'evaluation_cycle_code' },
              { column_name: 'kpi_code' }
            ]
          });
        }
        if (queryText.includes('FROM csv_template')) {
          return Promise.resolve({
            rows: [{
              csv_template_id: 'dummy-id',
              code: 'EVALUATION_SCORE_IMPORT',
              version_no: 1,
              status: 'ACTIVE'
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      })
    } as unknown as import('pg').Pool;

    const userRoleRepo = new InMemoryUserRoleRepository();
    const roleRepo = new InMemoryRoleRepository();
    const permRepo = new InMemoryPermissionRepository();
    const rolePermRepo = new InMemoryRolePermissionRepository();
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
    });
  });

  it('should return 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/csv-templates/current/download');
    expect(res.status).toBe(401);
  });

  it('should return 403 for EMPLOYEE role', async () => {
    const token = tokenService.generateAccessToken({
      userId: 'emp-id',
      email: 'emp@test.com',
      role: 'EMPLOYEE',
    } as any);

    const res = await request(app)
      .get('/api/csv-templates/current/download')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('should return 200 and CSV for HR_ADMIN role', async () => {
    const token = tokenService.generateAccessToken({
      userId: 'admin-id',
      email: 'admin@test.com',
      role: 'HR_ADMIN',
    } as any);

    const res = await request(app)
      .get('/api/csv-templates/current/download')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.header['content-disposition']).toContain('attachment; filename="evaluation_score_import_template_v1.csv"');
    expect(res.text).toBe('employee_id,evaluation_cycle_code,kpi_code\\n');
  });
});
