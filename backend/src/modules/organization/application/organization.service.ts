import { DepartmentRepository, JobRoleRepository, JobLevelRepository } from '../domain/repositories.js';
import { Department, JobRole, JobLevel } from '../domain/types.js';

export class BusinessRuleViolationError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'BusinessRuleViolationError';
    this.code = code;
  }
}

export class OrganizationService {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly jobRoleRepository: JobRoleRepository,
    private readonly jobLevelRepository: JobLevelRepository
  ) {}

  // --- Department ---
  async getDepartments(skip?: number, limit?: number): Promise<[Department[], number]> {
    return this.departmentRepository.findAll(skip, limit);
  }

  async getDepartmentById(id: string): Promise<Department | null> {
    return this.departmentRepository.findById(id);
  }

  async createDepartment(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    const existing = await this.departmentRepository.findByCode(data.code);
    if (existing) {
      throw new BusinessRuleViolationError(`Department with code ${data.code} already exists`, 'DUPLICATE_CODE');
    }
    return this.departmentRepository.create({
      id: '', // DB generates UUID
      ...data
    });
  }

  async updateDepartment(id: string, data: Omit<Department, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    const existing = await this.departmentRepository.findById(id);
    if (!existing) {
      throw new BusinessRuleViolationError(`Department with ID ${id} not found`, 'NOT_FOUND');
    }
    existing.name = data.name;
    existing.active = data.active;
    return this.departmentRepository.update(existing);
  }

  // --- JobRole ---
  async getJobRoles(skip?: number, limit?: number): Promise<[JobRole[], number]> {
    return this.jobRoleRepository.findAll(skip, limit);
  }

  async getJobRoleById(id: string): Promise<JobRole | null> {
    return this.jobRoleRepository.findById(id);
  }

  async createJobRole(data: Omit<JobRole, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobRole> {
    const existing = await this.jobRoleRepository.findByCode(data.code);
    if (existing) {
      throw new BusinessRuleViolationError(`Job Role with code ${data.code} already exists`, 'DUPLICATE_CODE');
    }
    return this.jobRoleRepository.create({
      id: '', // DB generates UUID
      ...data
    });
  }

  async updateJobRole(id: string, data: Omit<JobRole, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<JobRole> {
    const existing = await this.jobRoleRepository.findById(id);
    if (!existing) {
      throw new BusinessRuleViolationError(`Job Role with ID ${id} not found`, 'NOT_FOUND');
    }
    existing.name = data.name;
    existing.description = data.description;
    existing.active = data.active;
    return this.jobRoleRepository.update(existing);
  }

  // --- JobLevel ---
  async getJobLevels(skip?: number, limit?: number): Promise<[JobLevel[], number]> {
    return this.jobLevelRepository.findAll(skip, limit);
  }

  async getJobLevelById(id: string): Promise<JobLevel | null> {
    return this.jobLevelRepository.findById(id);
  }

  async createJobLevel(data: Omit<JobLevel, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobLevel> {
    const existing = await this.jobLevelRepository.findByCode(data.code);
    if (existing) {
      throw new BusinessRuleViolationError(`Job Level with code ${data.code} already exists`, 'DUPLICATE_CODE');
    }
    return this.jobLevelRepository.create({
      id: '', // DB generates UUID
      ...data
    });
  }

  async updateJobLevel(id: string, data: Omit<JobLevel, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<JobLevel> {
    const existing = await this.jobLevelRepository.findById(id);
    if (!existing) {
      throw new BusinessRuleViolationError(`Job Level with ID ${id} not found`, 'NOT_FOUND');
    }
    existing.name = data.name;
    existing.rank = data.rank;
    existing.active = data.active;
    return this.jobLevelRepository.update(existing);
  }
}
