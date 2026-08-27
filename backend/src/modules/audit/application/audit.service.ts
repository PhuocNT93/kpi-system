import { TransactionClient } from '../../../shared/database/transaction.js';
import { AuditRecordParams, AuditRecordParamsSchema, AuditLogQuery, AuditLogQuerySchema, PaginatedAuditLogs } from '../domain/audit.domain.js';
import { AuditRepository } from '../domain/audit.repository.js';

export class AuditService {
  constructor(private auditRepo: AuditRepository) {}

  /**
   * Records an audit log entry.
   * MUST be executed within an existing business transaction context.
   * If this fails, it will naturally throw an error which should roll back the caller's transaction.
   * Do NOT swallow errors here.
   */
  async record(tx: TransactionClient, params: AuditRecordParams): Promise<void> {
    // Validate payload against schema (throws ZodError if invalid)
    const validParams = AuditRecordParamsSchema.parse(params);
    
    // Explicitly pass the transaction client so it operates in the exact same transaction
    await this.auditRepo.insert(validParams, tx);
  }

  async getLogs(filters: unknown): Promise<PaginatedAuditLogs> {
    const validFilters = AuditLogQuerySchema.parse(filters);
    return this.auditRepo.findMany(validFilters);
  }
}
