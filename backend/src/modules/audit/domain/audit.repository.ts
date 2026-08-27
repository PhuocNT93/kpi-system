import { TransactionClient } from '../../../shared/database/transaction.js';
import { AuditRecordParams, AuditLogQuery, PaginatedAuditLogs } from './audit.domain.js';

export interface AuditRepository {
  /**
   * Insert a new audit log record.
   * MUST use the provided transaction client to ensure it commits/rolls back 
   * with the associated business action.
   */
  insert(params: AuditRecordParams, client: TransactionClient): Promise<void>;
  
  /**
   * Delete audit logs older than the specified cutoff date.
   * This operation should typically be executed under a privileged role
   * (e.g. kpi_maintenance) as normal roles are restricted from deleting audit logs.
   * Returns the number of rows deleted.
   */
  deleteOlderThan(cutoffDate: Date, batchSize: number, client: TransactionClient): Promise<number>;
  
  /**
   * Retrieve paginated audit logs based on filters.
   */
  findMany(filters: AuditLogQuery): Promise<PaginatedAuditLogs>;
}
