import { Department, JobRole, JobLevel } from './types.js';
import { QueryExecutor } from '../../../shared/database/query-executor.js';

export interface DepartmentRepository {
  findById(id: string): Promise<Department | null>;
  findByCode(code: string): Promise<Department | null>;
  findAll(filters?: { active?: boolean }, skip?: number, limit?: number): Promise<[Department[], number]>;
  create(department: Department): Promise<Department>;
  update(department: Department): Promise<Department>;
}

export interface JobRoleRepository {
  findById(id: string): Promise<JobRole | null>;
  findByCode(code: string): Promise<JobRole | null>;
  findAll(filters?: { active?: boolean }, skip?: number, limit?: number): Promise<[JobRole[], number]>;
  create(role: JobRole): Promise<JobRole>;
  update(role: JobRole): Promise<JobRole>;
}

export interface JobLevelRepository {
  findById(id: string): Promise<JobLevel | null>;
  findByCode(code: string): Promise<JobLevel | null>;
  findAll(filters?: { active?: boolean }, skip?: number, limit?: number): Promise<[JobLevel[], number]>;
  create(level: JobLevel): Promise<JobLevel>;
  /** `client` lets the write join the caller's transaction. */
  update(level: JobLevel, client?: QueryExecutor): Promise<JobLevel>;
}
