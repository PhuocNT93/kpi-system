import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import {
  PostgresRoleRepository,
  PostgresPermissionRepository,
  PostgresUserRoleRepository,
  PostgresRolePermissionRepository,
  PostgresAuditWriter,
} from '../src/modules/iam/infrastructure/postgres-repositories.js';
import { seedIamData } from '../src/modules/iam/infrastructure/iam.seed.js';
import { createDatabasePool } from '../src/shared/database/database.js';

const isDbAvailable = Boolean(process.env.DATABASE_URL);

describe.runIf(isDbAvailable)('Postgres IAM Repositories Integration Tests', () => {
  let pool: Pool;
  let roleRepo: PostgresRoleRepository;
  let permRepo: PostgresPermissionRepository;
  let userRoleRepo: PostgresUserRoleRepository;
  let rolePermRepo: PostgresRolePermissionRepository;
  let auditWriter: PostgresAuditWriter;

  beforeAll(() => {
    pool = createDatabasePool();
    roleRepo = new PostgresRoleRepository(pool);
    permRepo = new PostgresPermissionRepository(pool);
    userRoleRepo = new PostgresUserRoleRepository(pool);
    rolePermRepo = new PostgresRolePermissionRepository(pool);
    auditWriter = new PostgresAuditWriter(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM audit_event');
    await pool.query('DELETE FROM role_permission');
    await pool.query('DELETE FROM user_role');
    await pool.query('DELETE FROM permission');
    await pool.query('DELETE FROM role');
  });

  it('should seed IAM data into postgres database correctly', async () => {
    await seedIamData(roleRepo, permRepo, userRoleRepo, rolePermRepo);

    const roles = await roleRepo.findAll();
    expect(roles.length).toBeGreaterThanOrEqual(4);

    const permissions = await permRepo.findAll();
    expect(permissions.length).toBeGreaterThan(10);
  });

  it('should assign and remove roles for a user in database', async () => {
    const role = await roleRepo.create({
      id: '00000000-0000-0000-0000-000000000001',
      code: 'TEST_ROLE',
      name: 'Test Role',
      active: true,
      systemRole: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userId = 'user-123';
    await userRoleRepo.assignRole(userId, role.id);

    let userRoles = await userRoleRepo.findRolesByUserId(userId);
    expect(userRoles).toHaveLength(1);
    expect(userRoles[0].roleId).toBe(role.id);

    await userRoleRepo.removeRole(userId, role.id);
    userRoles = await userRoleRepo.findRolesByUserId(userId);
    expect(userRoles).toHaveLength(0);
  });

  it('should record audit event in postgres database', async () => {
    const eventId = '00000000-0000-0000-0000-000000000099';
    await auditWriter.record({
      id: eventId,
      type: 'ROLE_CREATED',
      actorId: 'admin-1',
      targetId: 'role-1',
      details: { name: 'Test Role' },
      timestamp: new Date(),
    });

    const res = await pool.query('SELECT * FROM audit_event WHERE id = $1', [eventId]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].type).toBe('ROLE_CREATED');
  });
});
