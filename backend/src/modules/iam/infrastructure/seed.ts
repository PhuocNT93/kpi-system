import 'dotenv/config';
import { createDatabasePool } from '../../../shared/database/database.js';
import {
  PostgresRoleRepository,
  PostgresPermissionRepository,
  PostgresUserRoleRepository,
  PostgresRolePermissionRepository,
  seedIamData,
} from '../index.js';

async function main() {
  console.log('Starting IAM seed data process...');

  const pool = createDatabasePool();

  try {
    const roleRepo = new PostgresRoleRepository(pool);
    const permRepo = new PostgresPermissionRepository(pool);
    const userRoleRepo = new PostgresUserRoleRepository(pool);
    const rolePermRepo = new PostgresRolePermissionRepository(pool);

    await seedIamData(roleRepo, permRepo, userRoleRepo, rolePermRepo);

    console.log('IAM seed data successfully populated.');
  } catch (error) {
    console.error('Error seeding IAM data:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
