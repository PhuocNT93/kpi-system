import { TransactionClient } from '../../../shared/database/transaction.js';
import { AuditRecordParams } from '../domain/audit.domain.js';
import { AuditRepository } from '../domain/audit.repository.js';

export class PostgresAuditRepository implements AuditRepository {
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
    
    // The query returns the number of rows affected as part of the result, but since client.query 
    // signature in our system might return unknown, we'll cast it if we know we are using pg PoolClient
    // Since we are using standard pg, it should be an object with rowCount.
    return (result as any).rowCount ?? 0;
  }
}
