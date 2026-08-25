import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmployeeContextService } from '../src/modules/employee/application/employee-context.service';
import { EmployeeRepository, EmployeeAssignmentRepository } from '../src/modules/employee/domain/employee.repository';
import { EmploymentStatus } from '../src/modules/employee/domain/employee.domain';

describe('EmployeeContextService Unit Tests', () => {
  let employeeRepo: EmployeeRepository;
  let assignmentRepo: EmployeeAssignmentRepository;
  let contextService: EmployeeContextService;

  beforeEach(() => {
    employeeRepo = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      findByEmail: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    assignmentRepo = {
      create: vi.fn(),
      findCurrentAssignment: vi.fn(),
      findAssignmentAt: vi.fn(),
      findAssignmentHistory: vi.fn(),
      closeActiveAssignment: vi.fn(),
    };
    contextService = new EmployeeContextService(employeeRepo, assignmentRepo);
  });

  it('TC-EMP-01: should query historical assignment snapshot via getAssignmentAt', async () => {
    const mockAssignment = {
      employeeAssignmentId: 'assign-1',
      employeeId: 'emp-1',
      departmentId: 'dept-1',
      teamId: 'team-1',
      roleId: 'role-1',
      jobLevelId: 'level-1',
      managerId: 'mgr-1',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-06-30',
    };
    (assignmentRepo.findAssignmentAt as any).mockResolvedValue(mockAssignment);

    const res = await contextService.getAssignmentAt('emp-1', '2026-03-15');
    expect(res).toEqual(mockAssignment);
    expect(assignmentRepo.findAssignmentAt).toHaveBeenCalledWith('emp-1', '2026-03-15');
  });

  it('TC-EMP-02: should throw error when self is set as manager', async () => {
    await expect(contextService.validateManagerHierarchy('emp-1', 'emp-1')).rejects.toThrow(
      'An employee cannot be set as their own manager.'
    );
  });

  it('TC-EMP-03: should throw error when circular manager relationship is detected', async () => {
    // emp-1 -> mgr-2 -> mgr-3 -> emp-1
    (employeeRepo.findById as any)
      .mockResolvedValueOnce({
        employeeId: 'mgr-2',
        managerId: 'mgr-3',
        employmentStatus: EmploymentStatus.ACTIVE,
      })
      .mockResolvedValueOnce({
        employeeId: 'mgr-3',
        managerId: 'emp-1',
        employmentStatus: EmploymentStatus.ACTIVE,
      });

    await expect(contextService.validateManagerHierarchy('emp-1', 'mgr-2')).rejects.toThrow(
      'Circular manager relationship detected'
    );
  });
});
