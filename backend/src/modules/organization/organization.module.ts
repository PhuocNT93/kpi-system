import { Pool } from 'pg';
import { PostgresDepartmentRepository, PostgresJobRoleRepository, PostgresJobLevelRepository } from './infrastructure/postgres-repositories.js';
import { PostgresFormulaRepository } from './infrastructure/postgres-formula.repository.js';
import { OrganizationService } from './application/organization.service.js';
import { TeamFormulaService } from './application/formula.service.js';
import { OrganizationController } from './api/organization.controller.js';
import { AuditService } from '../audit/application/audit.service.js';
import { JobLevelCadenceChangeHandler } from './domain/job-level-cadence-change-handler.js';
import { TeamFormulaController } from './api/formula.controller.js';

export interface OrganizationModule {
  departmentRepository: PostgresDepartmentRepository;
  jobRoleRepository: PostgresJobRoleRepository;
  jobLevelRepository: PostgresJobLevelRepository;
  formulaRepository: PostgresFormulaRepository;
  organizationService: OrganizationService;
  teamFormulaService: TeamFormulaService;
  organizationController: OrganizationController;
  teamFormulaController: TeamFormulaController;
}

export function createOrganizationModule(
  pool: Pool,
  auditService?: AuditService,
  jobLevelCadenceChangeHandler?: JobLevelCadenceChangeHandler
): OrganizationModule {
  const departmentRepository = new PostgresDepartmentRepository(pool);
  const jobRoleRepository = new PostgresJobRoleRepository(pool);
  const jobLevelRepository = new PostgresJobLevelRepository(pool);
  const formulaRepository = new PostgresFormulaRepository(pool);

  const organizationService = new OrganizationService(
    departmentRepository,
    jobRoleRepository,
    jobLevelRepository,
    pool,
    auditService,
    jobLevelCadenceChangeHandler
  );

  const teamFormulaService = new TeamFormulaService(formulaRepository);

  const organizationController = new OrganizationController(organizationService);
  const teamFormulaController = new TeamFormulaController(teamFormulaService);

  return {
    departmentRepository,
    jobRoleRepository,
    jobLevelRepository,
    formulaRepository,
    organizationService,
    teamFormulaService,
    organizationController,
    teamFormulaController,
  };
}

