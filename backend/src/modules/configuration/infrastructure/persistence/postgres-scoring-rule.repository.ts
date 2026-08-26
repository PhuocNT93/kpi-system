import { Pool, PoolClient } from 'pg';
import { ScoringRule, ScoringRuleType, VersionStatus, ScoringRuleConfig } from '../../domain/configuration.types.js';
import { IScoringRuleRepository, ScoringRuleFilter } from '../../domain/repositories.interface.js';
import { VersionMismatch, NotFound } from '../../../../api/app-error.js';

export class PostgresScoringRuleRepository implements IScoringRuleRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): ScoringRule {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      rule_type: row.rule_type as ScoringRuleType,
      config: (typeof row.config === 'string' ? JSON.parse(row.config) : row.config) as ScoringRuleConfig,
      status: row.status as VersionStatus,
      version: Number(row.version),
      created_at: new Date(row.created_at as string),
      created_by: row.created_by ? (row.created_by as string) : undefined,
      updated_at: new Date(row.updated_at as string),
      updated_by: row.updated_by ? (row.updated_by as string) : undefined,
    };
  }

  async findById(id: string, client?: PoolClient): Promise<ScoringRule | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM scoring_rules WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByCode(code: string, client?: PoolClient): Promise<ScoringRule | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM scoring_rules WHERE code = $1', [code]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findAll(filter: ScoringRuleFilter, client?: PoolClient): Promise<{ items: ScoringRule[]; total: number }> {
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
    if (filter.rule_type) {
      conditions.push(`rule_type = $${idx++}`);
      params.push(filter.rule_type);
    }
    if (filter.code) {
      conditions.push(`code = $${idx++}`);
      params.push(filter.code);
    }
    if (filter.search) {
      conditions.push(`(name ILIKE $${idx} OR code ILIKE $${idx})`);
      params.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await runner.query(`SELECT COUNT(*) FROM scoring_rules ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = [...params, size, offset];
    const dataRes = await runner.query(
      `SELECT * FROM scoring_rules ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      queryParams
    );

    return {
      items: dataRes.rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  async create(rule: Partial<ScoringRule>, client?: PoolClient): Promise<ScoringRule> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO scoring_rules (code, name, rule_type, config, status, created_by, updated_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'DRAFT'), $6, $7)
       RETURNING *`,
      [
        rule.code,
        rule.name,
        rule.rule_type,
        JSON.stringify(rule.config || {}),
        rule.status || 'DRAFT',
        rule.created_by || null,
        rule.updated_by || null,
      ]
    );
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, rule: Partial<ScoringRule>, expectedVersion?: number, client?: PoolClient): Promise<ScoringRule> {
    const runner = client || this.pool;
    const configJson = rule.config ? JSON.stringify(rule.config) : null;
    if (expectedVersion !== undefined) {
      const res = await runner.query(
        `UPDATE scoring_rules
         SET name = COALESCE($1, name),
             rule_type = COALESCE($2, rule_type),
             config = COALESCE($3::jsonb, config),
             status = COALESCE($4, status),
             updated_by = $5,
             updated_at = CURRENT_TIMESTAMP,
             version = version + 1
         WHERE id = $6 AND version = $7
         RETURNING *`,
        [
          rule.name || null,
          rule.rule_type || null,
          configJson,
          rule.status || null,
          rule.updated_by || null,
          id,
          expectedVersion,
        ]
      );
      if (res.rows.length === 0) {
        const check = await this.findById(id, client);
        if (!check) throw new NotFound('ScoringRule');
        throw new VersionMismatch('ScoringRule');
      }
      return this.mapRow(res.rows[0]);
    } else {
      const res = await runner.query(
        `UPDATE scoring_rules
         SET name = COALESCE($1, name),
             rule_type = COALESCE($2, rule_type),
             config = COALESCE($3::jsonb, config),
             status = COALESCE($4, status),
             updated_by = $5,
             updated_at = CURRENT_TIMESTAMP,
             version = version + 1
         WHERE id = $6
         RETURNING *`,
        [
          rule.name || null,
          rule.rule_type || null,
          configJson,
          rule.status || null,
          rule.updated_by || null,
          id,
        ]
      );
      if (res.rows.length === 0) throw new NotFound('ScoringRule');
      return this.mapRow(res.rows[0]);
    }
  }
}
