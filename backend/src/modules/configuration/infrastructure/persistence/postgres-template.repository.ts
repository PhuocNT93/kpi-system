import { Pool, PoolClient } from 'pg';
import { EvaluationTemplate, TemplateStatus } from '../../domain/configuration.types.js';
import { ITemplateRepository } from '../../domain/repositories.interface.js';
import { VersionMismatch, NotFound } from '../../../../api/app-error.js';

export class PostgresTemplateRepository implements ITemplateRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): EvaluationTemplate {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      description: row.description ? (row.description as string) : undefined,
      status: row.status as TemplateStatus,
      current_version_id: row.current_version_id ? (row.current_version_id as string) : undefined,
      version: Number(row.version),
      created_at: new Date(row.created_at as string),
      created_by: row.created_by ? (row.created_by as string) : undefined,
      updated_at: new Date(row.updated_at as string),
      updated_by: row.updated_by ? (row.updated_by as string) : undefined,
    };
  }

  async findById(id: string, client?: PoolClient): Promise<EvaluationTemplate | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM evaluation_templates WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByCode(code: string, client?: PoolClient): Promise<EvaluationTemplate | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM evaluation_templates WHERE code = $1', [code]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findAll(page = 1, size = 20, status?: TemplateStatus, search?: string, client?: PoolClient): Promise<{ items: EvaluationTemplate[]; total: number }> {
    const runner = client || this.pool;
    const offset = (page - 1) * size;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR code ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await runner.query(`SELECT COUNT(*) FROM evaluation_templates ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = [...params, size, offset];
    const dataRes = await runner.query(
      `SELECT * FROM evaluation_templates ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      queryParams
    );

    return {
      items: dataRes.rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  async create(template: Partial<EvaluationTemplate>, client?: PoolClient): Promise<EvaluationTemplate> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO evaluation_templates (code, name, description, status, current_version_id, created_by, updated_by)
       VALUES ($1, $2, $3, COALESCE($4, 'DRAFT'), $5, $6, $7)
       RETURNING *`,
      [
        template.code,
        template.name,
        template.description || null,
        template.status || 'DRAFT',
        template.current_version_id || null,
        template.created_by || null,
        template.updated_by || null,
      ]
    );
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, template: Partial<EvaluationTemplate>, expectedVersion?: number, client?: PoolClient): Promise<EvaluationTemplate> {
    const runner = client || this.pool;
    if (expectedVersion !== undefined) {
      const res = await runner.query(
        `UPDATE evaluation_templates
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             current_version_id = COALESCE($4, current_version_id),
             updated_by = $5,
             updated_at = CURRENT_TIMESTAMP,
             version = version + 1
         WHERE id = $6 AND version = $7
         RETURNING *`,
        [
          template.name || null,
          template.description || null,
          template.status || null,
          template.current_version_id || null,
          template.updated_by || null,
          id,
          expectedVersion,
        ]
      );
      if (res.rows.length === 0) {
        const check = await this.findById(id, client);
        if (!check) throw new NotFound('EvaluationTemplate');
        throw new VersionMismatch('EvaluationTemplate');
      }
      return this.mapRow(res.rows[0]);
    } else {
      const res = await runner.query(
        `UPDATE evaluation_templates
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             current_version_id = COALESCE($4, current_version_id),
             updated_by = $5,
             updated_at = CURRENT_TIMESTAMP,
             version = version + 1
         WHERE id = $6
         RETURNING *`,
        [
          template.name || null,
          template.description || null,
          template.status || null,
          template.current_version_id || null,
          template.updated_by || null,
          id,
        ]
      );
      if (res.rows.length === 0) throw new NotFound('EvaluationTemplate');
      return this.mapRow(res.rows[0]);
    }
  }
}
