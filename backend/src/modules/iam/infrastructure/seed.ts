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
import { seedOrganizationModule } from '../../organization/infrastructure/seed/organization.seed.js';
import { seedConfigurationModule } from '../../configuration/infrastructure/seed/configuration.seed.js';
import { seedEvaluationCycleModule } from '../../evaluation-cycle/infrastructure/seed/evaluation-cycle.seed.js';
import { seedTeamReviewsModule } from '../../evaluation/infrastructure/seed/team-reviews.seed.js';

async function main() {
  console.log('Starting seed data process...');

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

    await seedOrganizationModule(pool);
    console.log('Organization (Roles & Teams) seed data successfully populated.');

    await seedConfigurationModule(pool);
    console.log('Configuration (Criteria & Templates) seed data successfully populated.');

    await seedEvaluationCycleModule(pool);
    console.log('Evaluation Cycle seed data successfully populated.');

    await seedTeamReviewsModule(pool);
    console.log('Team Reviews seed data successfully populated.');
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
