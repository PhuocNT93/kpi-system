import 'dotenv/config';
import { createDatabasePool } from '../../../shared/database/database.js';
import { PostgresUserRepository, SimplePasswordHasher } from '../../auth/index.js';
import {
  PostgresRoleRepository,
  PostgresPermissionRepository,
  PostgresUserRoleRepository,
  PostgresRolePermissionRepository,
  seedIamData,
} from '../index.js';

async function main() {
  console.log('Starting IAM & User seed data process...');

  const pool = createDatabasePool();

  try {
    const roleRepo = new PostgresRoleRepository(pool);
    const permRepo = new PostgresPermissionRepository(pool);
    const userRoleRepo = new PostgresUserRoleRepository(pool);
    const rolePermRepo = new PostgresRolePermissionRepository(pool);
    const userRepo = new PostgresUserRepository(pool);
    const passwordHasher = new SimplePasswordHasher();

    await seedIamData(roleRepo, permRepo, userRoleRepo, rolePermRepo, userRepo, passwordHasher);

    console.log('IAM & User seed data successfully populated.');
  } catch (error) {
    console.error('Error seeding IAM data:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
