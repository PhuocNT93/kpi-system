import { Pool } from 'pg';
import { EmployeeContextService } from './application/employee-context.service.js';
import { TeamService } from './application/team.service.js';
import { PostgresEmployeeRepository, PostgresEmployeeAssignmentRepository } from './infrastructure/postgres-employee.repository.js';
import { PostgresTeamRepository } from './infrastructure/postgres-team.repository.js';
import { EmployeeController } from './api/employee.controller.js';
import { AuditService } from '../audit/application/audit.service.js';

export function createEmployeeModule(pool: Pool, auditService: AuditService) {
  const employeeRepo = new PostgresEmployeeRepository(pool);
  const assignmentRepo = new PostgresEmployeeAssignmentRepository(pool);
  const teamRepo = new PostgresTeamRepository(pool);
  const contextService = new EmployeeContextService(employeeRepo, assignmentRepo);
  const teamService = new TeamService(teamRepo, employeeRepo, pool, auditService);
  const employeeController = new EmployeeController(employeeRepo, assignmentRepo, contextService, pool, teamService);

  return {
    employeeRepo,
    assignmentRepo,
    teamRepo,
    contextService,
    teamService,
    employeeController,
  };
}
