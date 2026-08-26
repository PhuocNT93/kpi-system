import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { OrganizationService, BusinessRuleViolationError } from '../src/modules/organization/application/organization.service.js';

describe('OrganizationService', () => {
  let departmentRepo: Record<string, Mock>;
  let jobRoleRepo: Record<string, Mock>;
  let jobLevelRepo: Record<string, Mock>;
  let service: OrganizationService;

  beforeEach(() => {
    departmentRepo = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    jobRoleRepo = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    jobLevelRepo = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    service = new OrganizationService(departmentRepo, jobRoleRepo, jobLevelRepo);
  });

  describe('Department', () => {
    it('should get all departments', async () => {
      departmentRepo.findAll.mockResolvedValue([[{ id: '1', name: 'HR' }], 1]);
      const res = await service.getDepartments(0, 10);
      expect(res[0][0].name).toBe('HR');
      expect(res[1]).toBe(1);
    });

    it('should throw error when creating department with duplicate code', async () => {
      departmentRepo.findByCode.mockResolvedValue({ id: '1', code: 'HR' });
      await expect(service.createDepartment({ code: 'HR', name: 'HR Dept', active: true }))
        .rejects
        .toThrow(BusinessRuleViolationError);
    });

    it('should create department successfully', async () => {
      departmentRepo.findByCode.mockResolvedValue(null);
      departmentRepo.create.mockImplementation(async (d: unknown) => ({ ...(d as Record<string, unknown>), id: 'new-id' }));
      const res = await service.createDepartment({ code: 'HR', name: 'HR Dept', active: true });
      expect(res.id).toBe('new-id');
      expect(res.code).toBe('HR');
    });
  });

  describe('JobRole', () => {
    it('should throw error when creating role with duplicate code', async () => {
      jobRoleRepo.findByCode.mockResolvedValue({ id: '1', code: 'DEV' });
      await expect(service.createJobRole({ code: 'DEV', name: 'Developer', active: true }))
        .rejects
        .toThrow(BusinessRuleViolationError);
    });
  });

  describe('JobLevel', () => {
    it('should throw error when creating level with duplicate code', async () => {
      jobLevelRepo.findByCode.mockResolvedValue({ id: '1', code: 'L1' });
      await expect(service.createJobLevel({ code: 'L1', name: 'Level 1', rank: 1, active: true }))
        .rejects
        .toThrow(BusinessRuleViolationError);
    });
  });
});
