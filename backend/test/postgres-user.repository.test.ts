import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { PostgresUserRepository } from '../src/modules/auth/infrastructure/postgres-user.repository.js';
import { createDatabasePool } from '../src/shared/database/database.js';
import { Conflict, NotFound } from '../src/api/app-error.js';

const isDbAvailable = Boolean(process.env.DATABASE_URL);

describe.runIf(isDbAvailable)('PostgresUserRepository Integration Tests', () => {
  let pool: Pool;
  let repo: PostgresUserRepository;

  beforeAll(() => {
    pool = createDatabasePool();
    repo = new PostgresUserRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM app_user');
  });

  it('should create and retrieve user by id and email', async () => {
    const user = await repo.create({
      email: 'Test.User@Example.com',
      name: 'Test User',
      passwordHash: 'hashed_password_123',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test.user@example.com');
    expect(user.name).toBe('Test User');
    expect(user.passwordHash).toBe('hashed_password_123');

    const byId = await repo.findById(user.id);
    expect(byId).not.toBeNull();
    expect(byId?.id).toBe(user.id);

    const byEmail = await repo.findByEmail('TEST.USER@EXAMPLE.COM');
    expect(byEmail).not.toBeNull();
    expect(byEmail?.id).toBe(user.id);
  });

  it('should throw Conflict when creating duplicate email', async () => {
    await repo.create({
      email: 'duplicate@example.com',
      name: 'User 1',
      passwordHash: 'hash1',
    });

    await expect(
      repo.create({
        email: 'DUPLICATE@example.com',
        name: 'User 2',
        passwordHash: 'hash2',
      })
    ).rejects.toThrow(Conflict);
  });

  it('should update user password successfully', async () => {
    const user = await repo.create({
      email: 'updatepass@example.com',
      name: 'Update Pass User',
      passwordHash: 'old_hash',
    });

    const updated = await repo.updatePassword(user.id, 'new_hash');
    expect(updated.passwordHash).toBe('new_hash');

    const retrieved = await repo.findById(user.id);
    expect(retrieved?.passwordHash).toBe('new_hash');
  });

  it('should throw NotFound when updating password for non-existing user', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(repo.updatePassword(fakeId, 'new_hash')).rejects.toThrow(NotFound);
  });
});
