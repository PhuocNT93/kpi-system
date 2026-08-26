import { Pool } from 'pg';
import { EmployeeContextService } from './application/employee-context.service.js';
import { PostgresEmployeeRepository, PostgresEmployeeAssignmentRepository } from './infrastructure/postgres-employee.repository.js';
import { EmployeeController } from './api/employee.controller.js';

export function createEmployeeModule(pool: Pool) {
  const employeeRepo = new PostgresEmployeeRepository(pool);
  const assignmentRepo = new PostgresEmployeeAssignmentRepository(pool);
  const contextService = new EmployeeContextService(employeeRepo, assignmentRepo);
  const employeeController = new EmployeeController(employeeRepo, assignmentRepo, contextService, pool);

  return {
    employeeRepo,
    assignmentRepo,
    contextService,
    employeeController,
  };
}
