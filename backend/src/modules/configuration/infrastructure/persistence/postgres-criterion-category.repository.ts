import { Pool } from 'pg';
import { CriterionCategoryEntity } from '../../domain/configuration.types.js';

export class PostgresCriterionCategoryRepository {
  constructor(private pool: Pool) {}

  async findAll(status?: 'ACTIVE' | 'INACTIVE'): Promise<CriterionCategoryEntity[]> {
    let query = 'SELECT code, name, description, is_system, status, created_at, updated_at FROM criterion_category';
    const params: unknown[] = [];
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    query += ' ORDER BY is_system DESC, code ASC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => ({
      code: r.code,
      name: r.name,
      description: r.description,
      is_system: Boolean(r.is_system),
      status: r.status as 'ACTIVE' | 'INACTIVE',
      created_at: r.created_at ? new Date(r.created_at) : undefined,
      updated_at: r.updated_at ? new Date(r.updated_at) : undefined,
    }));
  }

  async findByCode(code: string): Promise<CriterionCategoryEntity | null> {
    const res = await this.pool.query(
      'SELECT code, name, description, is_system, status, created_at, updated_at FROM criterion_category WHERE code = $1',
      [code.toUpperCase().trim()]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      code: r.code,
      name: r.name,
      description: r.description,
      is_system: Boolean(r.is_system),
      status: r.status as 'ACTIVE' | 'INACTIVE',
      created_at: r.created_at ? new Date(r.created_at) : undefined,
      updated_at: r.updated_at ? new Date(r.updated_at) : undefined,
    };
  }

  async create(data: { code: string; name: string; description?: string }): Promise<CriterionCategoryEntity> {
    const code = data.code.toUpperCase().trim().replace(/[\s-]+/g, '_').replace(/[^A-Z0-9_]/g, '');
    const name = data.name.trim();
    const res = await this.pool.query(
      `INSERT INTO criterion_category (code, name, description, is_system, status, created_at, updated_at)
       VALUES ($1, $2, $3, FALSE, 'ACTIVE', NOW(), NOW())
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         description = COALESCE(EXCLUDED.description, criterion_category.description),
         status = 'ACTIVE',
         updated_at = NOW()
       RETURNING code, name, description, is_system, status, created_at, updated_at`,
      [code, name, data.description || null]
    );
    const r = res.rows[0];
    return {
      code: r.code,
      name: r.name,
      description: r.description,
      is_system: Boolean(r.is_system),
      status: r.status as 'ACTIVE' | 'INACTIVE',
      created_at: r.created_at ? new Date(r.created_at) : undefined,
      updated_at: r.updated_at ? new Date(r.updated_at) : undefined,
    };
  }

  async setStatus(code: string, status: 'ACTIVE' | 'INACTIVE'): Promise<CriterionCategoryEntity | null> {
    const res = await this.pool.query(
      `UPDATE criterion_category
       SET status = $1, updated_at = NOW()
       WHERE code = $2
       RETURNING code, name, description, is_system, status, created_at, updated_at`,
      [status, code.toUpperCase().trim()]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      code: r.code,
      name: r.name,
      description: r.description,
      is_system: Boolean(r.is_system),
      status: r.status as 'ACTIVE' | 'INACTIVE',
      created_at: r.created_at ? new Date(r.created_at) : undefined,
      updated_at: r.updated_at ? new Date(r.updated_at) : undefined,
    };
  }
}
