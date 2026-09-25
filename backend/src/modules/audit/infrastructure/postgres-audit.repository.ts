import { Pool } from 'pg';
import { TransactionClient } from '../../../shared/database/transaction.js';
import { AuditRecordParams, AuditLogQuery, PaginatedAuditLogs } from '../domain/audit.domain.js';
import { AuditRepository } from '../domain/audit.repository.js';

export class PostgresAuditRepository implements AuditRepository {
  constructor(private pool: Pool) {}

  async insert(params: AuditRecordParams, client: TransactionClient): Promise<void> {
    await client.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, field_name, old_value, new_value, reason, performed_by, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.entityType,
        params.entityId,
        params.action,
        params.fieldName ?? null,
        params.oldValue ?? null,
        params.newValue ?? null,
        params.reason ?? null,
        params.performedBy,
        params.source ?? 'API'
      ]
    );
  }

  async insertMany(params: AuditRecordParams[], client: TransactionClient): Promise<void> {
    if (params.length === 0) return;
    const values: unknown[] = [];
    const tuples = params.map((entry, index) => {
      const offset = index * 9;
      values.push(
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.fieldName ?? null,
        entry.oldValue ?? null,
        entry.newValue ?? null,
        entry.reason ?? null,
        entry.performedBy ?? null,
        entry.source ?? 'API'
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
    });
    await client.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, field_name, old_value, new_value, reason, performed_by, source)
       VALUES ${tuples.join(', ')}`,
      values
    );
  }

  async deleteOlderThan(cutoffDate: Date, batchSize: number, client: TransactionClient): Promise<number> {
    const result = await client.query(
      `DELETE FROM audit_log
       WHERE audit_log_id IN (
         SELECT audit_log_id
         FROM audit_log
         WHERE performed_at < $1
         LIMIT $2
       )`,
      [cutoffDate, batchSize]
    );
    
    return result.rowCount ?? 0;
  }

  async findMany(filters: AuditLogQuery): Promise<PaginatedAuditLogs> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.entityType) {
      conditions.push(`a.entity_type = $${paramIndex++}`);
      values.push(filters.entityType);
    } else if (filters.allowedEntityTypes && filters.allowedEntityTypes.length > 0) {
      conditions.push(`a.entity_type = ANY($${paramIndex++})`);
      values.push(filters.allowedEntityTypes);
    }
    if (filters.entityId) {
      conditions.push(`a.entity_id = $${paramIndex++}`);
      values.push(filters.entityId);
    }
    if (filters.action) {
      conditions.push(`a.action = $${paramIndex++}`);
      values.push(filters.action);
    }
    if (filters.performedBy) {
      conditions.push(`a.performed_by = $${paramIndex++}`);
      values.push(filters.performedBy);
    }
    if (filters.fromDate) {
      conditions.push(`a.performed_at >= $${paramIndex++}`);
      values.push(filters.fromDate);
    }
    if (filters.toDate) {
      conditions.push(`a.performed_at <= $${paramIndex++}`);
      values.push(filters.toDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const limit = filters.limit;
    const offset = (filters.page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_log a
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        a.audit_log_id AS "auditLogId",
        a.entity_type AS "entityType",
        a.entity_id AS "entityId",
        a.action,
        a.field_name AS "fieldName",
        a.old_value AS "oldValue",
        a.new_value AS "newValue",
        a.reason,
        a.performed_by AS "performedBy",
        u.name AS "performedByName",
        a.performed_at AS "performedAt",
        a.source
      FROM audit_log a
      LEFT JOIN app_user u ON a.performed_by = u.id
      ${whereClause}
      ORDER BY a.performed_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const countValues = [...values];
    values.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      this.pool.query(countQuery, countValues),
      this.pool.query(dataQuery, values)
    ]);

    return {
      total: parseInt(countResult.rows[0].total, 10),
      logs: dataResult.rows,
    };
  }
}
