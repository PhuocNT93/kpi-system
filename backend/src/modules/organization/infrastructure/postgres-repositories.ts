import { Pool } from 'pg';
import { DepartmentRepository, JobRoleRepository, JobLevelRepository } from '../domain/repositories.js';
import { Department, JobRole, JobLevel } from '../domain/types.js';

export class PostgresDepartmentRepository implements DepartmentRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Department | null> {
    const { rows } = await this.pool.query(
      'SELECT department_id, code, name, active, created_at, updated_at FROM department WHERE department_id = $1',
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findByCode(code: string): Promise<Department | null> {
    const { rows } = await this.pool.query(
      'SELECT department_id, code, name, active, created_at, updated_at FROM department WHERE code = $1',
      [code]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findAll(skip = 0, limit = 100): Promise<[Department[], number]> {
    const result = await this.pool.query(
      'SELECT department_id, code, name, active, created_at, updated_at, count(*) OVER() as full_count FROM department ORDER BY name ASC LIMIT $1 OFFSET $2',
      [limit, skip]
    );
    const count = result.rows.length > 0 ? parseInt(result.rows[0].full_count, 10) : 0;
    return [result.rows.map(this.mapRow), count];
  }

  async create(department: Department): Promise<Department> {
    const { rows } = await this.pool.query(
      'INSERT INTO department (code, name, active) VALUES ($1, $2, $3) RETURNING department_id, code, name, active, created_at, updated_at',
      [department.code, department.name, department.active]
    );
    return this.mapRow(rows[0]);
  }

  async update(department: Department): Promise<Department> {
    const { rows } = await this.pool.query(
      'UPDATE department SET name = $1, active = $2 WHERE department_id = $3 RETURNING department_id, code, name, active, created_at, updated_at',
      [department.name, department.active, department.id]
    );
    return this.mapRow(rows[0]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRow(row: any): Department {
    return {
      id: row.department_id,
      code: row.code,
      name: row.name,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export class PostgresJobRoleRepository implements JobRoleRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<JobRole | null> {
    const { rows } = await this.pool.query(
      'SELECT role_id, code, name, description, active, created_at, updated_at FROM role WHERE role_id = $1',
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findByCode(code: string): Promise<JobRole | null> {
    const { rows } = await this.pool.query(
      'SELECT role_id, code, name, description, active, created_at, updated_at FROM role WHERE code = $1',
      [code]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findAll(skip = 0, limit = 100): Promise<[JobRole[], number]> {
    const result = await this.pool.query(
      'SELECT role_id, code, name, description, active, created_at, updated_at, count(*) OVER() as full_count FROM role ORDER BY name ASC LIMIT $1 OFFSET $2',
      [limit, skip]
    );
    const count = result.rows.length > 0 ? parseInt(result.rows[0].full_count, 10) : 0;
    return [result.rows.map(this.mapRow), count];
  }

  async create(role: JobRole): Promise<JobRole> {
    const { rows } = await this.pool.query(
      'INSERT INTO role (code, name, description, active) VALUES ($1, $2, $3, $4) RETURNING role_id, code, name, description, active, created_at, updated_at',
      [role.code, role.name, role.description, role.active]
    );
    return this.mapRow(rows[0]);
  }

  async update(role: JobRole): Promise<JobRole> {
    const { rows } = await this.pool.query(
      'UPDATE role SET name = $1, description = $2, active = $3 WHERE role_id = $4 RETURNING role_id, code, name, description, active, created_at, updated_at',
      [role.name, role.description, role.active, role.id]
    );
    return this.mapRow(rows[0]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRow(row: any): JobRole {
    return {
      id: row.role_id,
      code: row.code,
      name: row.name,
      description: row.description,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export class PostgresJobLevelRepository implements JobLevelRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<JobLevel | null> {
    const { rows } = await this.pool.query(
      'SELECT job_level_id, code, name, rank, active, created_at, updated_at FROM job_level WHERE job_level_id = $1',
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findByCode(code: string): Promise<JobLevel | null> {
    const { rows } = await this.pool.query(
      'SELECT job_level_id, code, name, rank, active, created_at, updated_at FROM job_level WHERE code = $1',
      [code]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findAll(skip = 0, limit = 100): Promise<[JobLevel[], number]> {
    const result = await this.pool.query(
      'SELECT job_level_id, code, name, rank, active, created_at, updated_at, count(*) OVER() as full_count FROM job_level ORDER BY rank ASC LIMIT $1 OFFSET $2',
      [limit, skip]
    );
    const count = result.rows.length > 0 ? parseInt(result.rows[0].full_count, 10) : 0;
    return [result.rows.map(this.mapRow), count];
  }

  async create(level: JobLevel): Promise<JobLevel> {
    const { rows } = await this.pool.query(
      'INSERT INTO job_level (code, name, rank, active) VALUES ($1, $2, $3, $4) RETURNING job_level_id, code, name, rank, active, created_at, updated_at',
      [level.code, level.name, level.rank, level.active]
    );
    return this.mapRow(rows[0]);
  }

  async update(level: JobLevel): Promise<JobLevel> {
    const { rows } = await this.pool.query(
      'UPDATE job_level SET name = $1, rank = $2, active = $3 WHERE job_level_id = $4 RETURNING job_level_id, code, name, rank, active, created_at, updated_at',
      [level.name, level.rank, level.active, level.id]
    );
    return this.mapRow(rows[0]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRow(row: any): JobLevel {
    return {
      id: row.job_level_id,
      code: row.code,
      name: row.name,
      rank: row.rank,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
