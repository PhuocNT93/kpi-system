import { Pool } from 'pg';
import { EmployeeContextService } from './application/employee-context.service.js';
import { TeamService } from './application/team.service.js';
import { PostgresEmployeeRepository, PostgresEmployeeAssignmentRepository } from './infrastructure/postgres-employee.repository.js';
import { PostgresTeamRepository } from './infrastructure/postgres-team.repository.js';
import { EmployeeController } from './api/employee.controller.js';
import { AuditService } from '../audit/application/audit.service.js';
import { EvaluationService } from '../evaluation/application/services/evaluation.service.js';
import { EmployeeCadenceService } from './application/employee-cadence.service.js';
import { ReviewScheduleService } from './application/review-schedule.service.js';
import { PostgresEmployeeScheduleRepository } from './infrastructure/postgres-employee-schedule.repository.js';

/** Creates the single owner of the employee review schedule; app.ts shares one instance across modules. */
export function createReviewScheduleService(auditService: AuditService): ReviewScheduleService {
  return new ReviewScheduleService(new PostgresEmployeeScheduleRepository(), auditService);
}

export function createEmployeeModule(
  pool: Pool,
  auditService: AuditService,
  _evaluationService?: EvaluationService,
  reviewScheduleService?: ReviewScheduleService
) {
  const employeeRepo = new PostgresEmployeeRepository(pool);
  const assignmentRepo = new PostgresEmployeeAssignmentRepository(pool);
  const teamRepo = new PostgresTeamRepository(pool);
  const contextService = new EmployeeContextService(employeeRepo, assignmentRepo);
  const teamService = new TeamService(teamRepo, employeeRepo, pool, auditService);
  const scheduleService = reviewScheduleService ?? createReviewScheduleService(auditService);
  const cadenceService = new EmployeeCadenceService(pool, auditService, scheduleService, employeeRepo);
  const employeeController = new EmployeeController(
    employeeRepo,
    assignmentRepo,
    contextService,
    pool,
    teamService,
    _evaluationService,
    cadenceService
  );

  return {
    employeeRepo,
    assignmentRepo,
    teamRepo,
    contextService,
    teamService,
    cadenceService,
    reviewScheduleService: scheduleService,
    employeeController,
  };
}
