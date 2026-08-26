import { Department, JobRole, JobLevel } from './types.js';

export interface DepartmentRepository {
  findById(id: string): Promise<Department | null>;
  findByCode(code: string): Promise<Department | null>;
  findAll(skip?: number, limit?: number): Promise<[Department[], number]>;
  create(department: Department): Promise<Department>;
  update(department: Department): Promise<Department>;
}

export interface JobRoleRepository {
  findById(id: string): Promise<JobRole | null>;
  findByCode(code: string): Promise<JobRole | null>;
  findAll(skip?: number, limit?: number): Promise<[JobRole[], number]>;
  create(role: JobRole): Promise<JobRole>;
  update(role: JobRole): Promise<JobRole>;
}

export interface JobLevelRepository {
  findById(id: string): Promise<JobLevel | null>;
  findByCode(code: string): Promise<JobLevel | null>;
  findAll(skip?: number, limit?: number): Promise<[JobLevel[], number]>;
  create(level: JobLevel): Promise<JobLevel>;
  update(level: JobLevel): Promise<JobLevel>;
}
