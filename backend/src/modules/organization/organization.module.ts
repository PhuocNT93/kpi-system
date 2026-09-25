import { Pool } from 'pg';
import { PostgresDepartmentRepository, PostgresJobRoleRepository, PostgresJobLevelRepository } from './infrastructure/postgres-repositories.js';
import { OrganizationService } from './application/organization.service.js';
import { OrganizationController } from './api/organization.controller.js';
import { AuditService } from '../audit/application/audit.service.js';
import { JobLevelCadenceChangeHandler } from './domain/job-level-cadence-change-handler.js';

export interface OrganizationModule {
  departmentRepository: PostgresDepartmentRepository;
  jobRoleRepository: PostgresJobRoleRepository;
  jobLevelRepository: PostgresJobLevelRepository;
  organizationService: OrganizationService;
  organizationController: OrganizationController;
}

export function createOrganizationModule(
  pool: Pool,
  auditService?: AuditService,
  jobLevelCadenceChangeHandler?: JobLevelCadenceChangeHandler
): OrganizationModule {
  const departmentRepository = new PostgresDepartmentRepository(pool);
  const jobRoleRepository = new PostgresJobRoleRepository(pool);
  const jobLevelRepository = new PostgresJobLevelRepository(pool);

  const organizationService = new OrganizationService(
    departmentRepository,
    jobRoleRepository,
    jobLevelRepository,
    pool,
    auditService,
    jobLevelCadenceChangeHandler
  );

  const organizationController = new OrganizationController(organizationService);

  return {
    departmentRepository,
    jobRoleRepository,
    jobLevelRepository,
    organizationService,
    organizationController,
  };
}
