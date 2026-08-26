import { Pool, PoolClient } from 'pg';
import { ConfigurationAuditLog, AuditAction } from '../../domain/configuration.types.js';
import { IConfigurationAuditRepository, AuditLogFilter } from '../../domain/repositories.interface.js';

export class PostgresConfigurationAuditRepository implements IConfigurationAuditRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: Record<string, unknown>): ConfigurationAuditLog {
    return {
      id: row.id as string,
      entity_type: row.entity_type as string,
      entity_id: row.entity_id as string,
      action: row.action as AuditAction,
      performed_by: row.performed_by as string,
      timestamp: new Date(row.timestamp as string),
      changes: (typeof row.changes === 'string' ? JSON.parse(row.changes) : row.changes) as Record<string, unknown>,
      reason: row.reason ? (row.reason as string) : undefined,
    };
  }

  async create(log: Partial<ConfigurationAuditLog>, client?: PoolClient): Promise<ConfigurationAuditLog> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO configuration_audit_logs (entity_type, entity_id, action, performed_by, changes, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        log.entity_type,
        log.entity_id,
        log.action,
        log.performed_by || 'SYSTEM',
        JSON.stringify(log.changes || {}),
        log.reason || null,
      ]
    );
    return this.mapRow(res.rows[0]);
  }

  async findAll(filter: AuditLogFilter, client?: PoolClient): Promise<{ items: ConfigurationAuditLog[]; total: number }> {
    const runner = client || this.pool;
    const page = filter.page || 1;
    const size = filter.size || 20;
    const offset = (page - 1) * size;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filter.entity_type) {
      conditions.push(`entity_type = $${idx++}`);
      params.push(filter.entity_type);
    }
    if (filter.entity_id) {
      conditions.push(`entity_id = $${idx++}`);
      params.push(filter.entity_id);
    }
    if (filter.action) {
      conditions.push(`action = $${idx++}`);
      params.push(filter.action);
    }
    if (filter.actor_id) {
      conditions.push(`performed_by = $${idx++}`);
      params.push(filter.actor_id);
    }
    if (filter.from_date) {
      conditions.push(`timestamp >= $${idx++}`);
      params.push(filter.from_date);
    }
    if (filter.to_date) {
      conditions.push(`timestamp <= $${idx++}`);
      params.push(filter.to_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await runner.query(`SELECT COUNT(*) FROM configuration_audit_logs ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = [...params, size, offset];
    const dataRes = await runner.query(
      `SELECT * FROM configuration_audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${idx++} OFFSET $${idx++}`,
      queryParams
    );

    return {
      items: dataRes.rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  async findById(id: string, client?: PoolClient): Promise<ConfigurationAuditLog | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM configuration_audit_logs WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }
}
