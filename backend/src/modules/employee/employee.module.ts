import { Pool } from 'pg';
import { EmployeeContextService } from './application/employee-context.service.js';
import { PostgresEmployeeRepository, PostgresEmployeeAssignmentRepository } from './infrastructure/postgres-employee.repository.js';

export function createEmployeeModule(pool: Pool) {
  const employeeRepo = new PostgresEmployeeRepository(pool);
  const assignmentRepo = new PostgresEmployeeAssignmentRepository(pool);
  const contextService = new EmployeeContextService(employeeRepo, assignmentRepo);

  return {
    employeeRepo,
    assignmentRepo,
    contextService,
  };
}
