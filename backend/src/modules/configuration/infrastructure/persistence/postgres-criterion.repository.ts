import { Pool, PoolClient } from 'pg';
import { Criterion, CriterionCategory, CriterionStatus, CriterionWithCurrentVersion } from '../../domain/configuration.types.js';
import { ICriterionRepository, CriteriaFilter } from '../../domain/repositories.interface.js';
import { VersionMismatch, NotFound } from '../../../../api/app-error.js';

export class PostgresCriterionRepository implements ICriterionRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): Criterion {
    return {
      id: row.id as string,
      code: row.code as string,
      category: row.category as CriterionCategory,
      name: row.name as string,
      description: row.description ? (row.description as string) : undefined,
      status: row.status as CriterionStatus,
      version: Number(row.version),
      created_at: new Date(row.created_at as string),
      created_by: row.created_by ? (row.created_by as string) : undefined,
      updated_at: new Date(row.updated_at as string),
      updated_by: row.updated_by ? (row.updated_by as string) : undefined,
    };
  }

  async findById(id: string, client?: PoolClient): Promise<Criterion | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM criteria WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByCode(code: string, client?: PoolClient): Promise<Criterion | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM criteria WHERE code = $1', [code]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findAll(filter: CriteriaFilter, client?: PoolClient): Promise<{ items: Criterion[]; total: number }> {
    const runner = client || this.pool;
    const page = filter.page || 1;
    const size = filter.size || 20;
    const offset = (page - 1) * size;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filter.status);
    }
    if (filter.category) {
      conditions.push(`category = $${idx++}`);
      params.push(filter.category);
    }
    if (filter.search) {
      conditions.push(`(name ILIKE $${idx} OR code ILIKE $${idx})`);
      params.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await runner.query(`SELECT COUNT(*) FROM criteria ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = [...params, size, offset];
    const dataRes = await runner.query(
      `SELECT * FROM criteria ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      queryParams
    );

    return {
      items: dataRes.rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  async findAllWithCurrentVersion(
    filter: CriteriaFilter,
    client?: PoolClient
  ): Promise<{ items: CriterionWithCurrentVersion[]; total: number }> {
    const runner = client || this.pool;
    const page = filter.page || 1;
    const size = filter.size || 20;
    const offset = (page - 1) * size;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filter.status) {
      conditions.push(`c.status = $${idx++}`);
      params.push(filter.status);
    }
    if (filter.category) {
      conditions.push(`c.category = $${idx++}`);
      params.push(filter.category);
    }
    if (filter.search) {
      conditions.push(`(c.name ILIKE $${idx} OR c.code ILIKE $${idx})`);
      params.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total (distinct criteria)
    const countRes = await runner.query(
      `SELECT COUNT(DISTINCT c.id) FROM criteria c ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Single JOIN query – replaces N+1 pattern
    const queryParams = [...params, size, offset];
    const dataRes = await runner.query(
      `SELECT DISTINCT ON (c.id)
         c.id, c.code, c.category, c.name, c.description, c.status, c.version,
         c.created_at, c.created_by, c.updated_at, c.updated_by,
         cv.id            AS cv_id,
         cv.version_no    AS cv_version_no,
         cv.default_weight AS cv_default_weight,
         cv.measurement_unit AS cv_measurement_unit,
         cv.measurement_source_label AS cv_measurement_source_label,
         cv.status        AS cv_status,
         cv.scoring_rule_id AS cv_scoring_rule_id,
         sr.id            AS sr_id,
         sr.code          AS sr_code,
         sr.name          AS sr_name,
         sr.rule_type     AS sr_rule_type,
         sr.config        AS sr_config,
         sr.status        AS sr_status
       FROM criteria c
       LEFT JOIN criterion_versions cv ON cv.criterion_id = c.id
       LEFT JOIN scoring_rules sr ON sr.id = cv.scoring_rule_id
       ${whereClause}
       ORDER BY c.id, cv.version_no DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      queryParams
    );

    const items = dataRes.rows.map((r) => ({
      ...this.mapRow(r),
      current_version: r.cv_id
        ? {
            id: r.cv_id,
            criterion_id: r.id,
            version_no: r.cv_version_no,
            default_weight: r.cv_default_weight,
            measurement_unit: r.cv_measurement_unit,
            measurement_source_label: r.cv_measurement_source_label,
            status: r.cv_status,
            scoring_rule_id: r.cv_scoring_rule_id,
            scoring_rule: r.sr_id
              ? {
                  id: r.sr_id,
                  code: r.sr_code,
                  name: r.sr_name,
                  rule_type: r.sr_rule_type,
                  config: r.sr_config,
                  status: r.sr_status,
                }
              : null,
          }
        : undefined,
    }));

    return { items, total };
  }


  async create(criterion: Partial<Criterion>, client?: PoolClient): Promise<Criterion> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO criteria (code, category, name, description, status, created_by, updated_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'ACTIVE'), $6, $7)
       RETURNING *`,
      [
        criterion.code,
        criterion.category,
        criterion.name,
        criterion.description || null,
        criterion.status || 'ACTIVE',
        criterion.created_by || null,
        criterion.updated_by || null,
      ]
    );
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, criterion: Partial<Criterion>, expectedVersion?: number, client?: PoolClient): Promise<Criterion> {
    const runner = client || this.pool;
    if (expectedVersion !== undefined) {
      const res = await runner.query(
        `UPDATE criteria
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             updated_by = $4,
             updated_at = CURRENT_TIMESTAMP,
             version = version + 1
         WHERE id = $5 AND version = $6
         RETURNING *`,
        [
          criterion.name || null,
          criterion.description || null,
          criterion.status || null,
          criterion.updated_by || null,
          id,
          expectedVersion,
        ]
      );
      if (res.rows.length === 0) {
        const check = await this.findById(id, client);
        if (!check) throw new NotFound('Criterion');
        throw new VersionMismatch('Criterion');
      }
      return this.mapRow(res.rows[0]);
    } else {
      const res = await runner.query(
        `UPDATE criteria
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             updated_by = $4,
             updated_at = CURRENT_TIMESTAMP,
             version = version + 1
         WHERE id = $5
         RETURNING *`,
        [
          criterion.name || null,
          criterion.description || null,
          criterion.status || null,
          criterion.updated_by || null,
          id,
        ]
      );
      if (res.rows.length === 0) throw new NotFound('Criterion');
      return this.mapRow(res.rows[0]);
    }
  }
}
