import { AppError } from '../../../api/app-error.js';
import { EmployeeRepository, EmployeeAssignmentRepository } from '../domain/employee.repository.js';
import { EmployeeAssignment } from '../domain/employee.domain.js';

export class EmployeeContextService {
  constructor(
    private employeeRepo: EmployeeRepository,
    private assignmentRepo: EmployeeAssignmentRepository
  ) {}

  /**
   * Retrieves the historical assignment snapshot for an employee on a given date.
   * Essential contract for Evaluation Module to capture accurate snapshot context.
   */
  async getAssignmentAt(employeeId: string, effectiveDate: string): Promise<EmployeeAssignment> {
    const assignment = await this.assignmentRepo.findAssignmentAt(employeeId, effectiveDate);
    if (!assignment) {
      throw new AppError(
        404,
        'EMPLOYEE_ASSIGNMENT_NOT_FOUND',
        `No assignment record found for employee ${employeeId} on date ${effectiveDate}`
      );
    }
    return assignment;
  }

  /**
   * Returns list of employees directly reporting to managerId.
   */
  async getManagedEmployees(managerId: string) {
    return this.employeeRepo.findMany({ managerId, employmentStatus: 'ACTIVE' });
  }

  /**
   * Validates manager chain hierarchy to prevent circular reporting loops (e.g. A -> B -> C -> A)
   */
  async validateManagerHierarchy(employeeId: string, targetManagerId: string | null): Promise<void> {
    if (!targetManagerId) return;

    if (employeeId === targetManagerId) {
      throw new AppError(400, 'SELF_MANAGER_NOT_ALLOWED', 'An employee cannot be set as their own manager.');
    }

    let currentManagerId: string | null = targetManagerId;
    const visited = new Set<string>([employeeId]);

    while (currentManagerId) {
      if (visited.has(currentManagerId)) {
        throw new AppError(
          400,
          'CIRCULAR_MANAGER_RELATIONSHIP',
          `Circular manager relationship detected involving manager ${targetManagerId}`
        );
      }
      visited.add(currentManagerId);

      const mgrEmployee = await this.employeeRepo.findById(currentManagerId);
      if (!mgrEmployee) {
        throw new AppError(404, 'MANAGER_NOT_FOUND', `Manager with ID ${targetManagerId} not found.`);
      }

      currentManagerId = mgrEmployee.managerId;
    }
  }

  /**
   * Validates assignment effective dates:
   * 1. effectiveFrom < effectiveTo
   * 2. No date overlaps with existing assignment history for the same employee
   */
  async validateAssignmentDates(
    employeeId: string,
    effectiveFrom: string,
    effectiveTo: string | null
  ): Promise<void> {
    if (effectiveTo && effectiveFrom >= effectiveTo) {
      throw new AppError(400, 'INVALID_DATE_RANGE', 'effective_from must be before effective_to');
    }

    const history = await this.assignmentRepo.findAssignmentHistory(employeeId);
    for (const item of history) {
      const start = item.effectiveFrom;
      const end = item.effectiveTo;

      // Overlap check: start1 < end2 AND start2 < end1
      const overlap =
        (!effectiveTo || start < effectiveTo) &&
        (!end || effectiveFrom < end);

      if (overlap) {
        throw new AppError(
          400,
          'OVERLAPPING_ASSIGNMENT_RANGE',
          `Overlapping assignment date range detected for employee ${employeeId}`
        );
      }
    }
  }
}
