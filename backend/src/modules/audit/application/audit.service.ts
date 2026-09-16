import { TransactionClient } from '../../../shared/database/transaction.js';
import {
  AuditRecordParams,
  AuditRecordParamsSchema,
  AuditLogQuerySchema,
  AuditLogQuery,
  PaginatedAuditLogs,
  BUSINESS_AUDIT_ENTITY_TYPES,
} from '../domain/audit.domain.js';
import { AuditRepository } from '../domain/audit.repository.js';
import { Actor } from '../../../shared/auth/types.js';

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

  async getLogs(query: Record<string, unknown>, actor?: Actor): Promise<PaginatedAuditLogs> {
    try {
      const validated = AuditLogQuerySchema.parse(query);
      const filters: AuditLogQuery = { ...validated };

      if (actor) {
        if (actor.role === 'HR_ADMIN') {
          // HR Admin is strictly limited to business-scope audit logs
          if (filters.entityType) {
            if (!BUSINESS_AUDIT_ENTITY_TYPES.includes(filters.entityType as (typeof BUSINESS_AUDIT_ENTITY_TYPES)[number])) {
              const { Forbidden } = await import('../../../api/app-error.js');
              throw new Forbidden('HR_ADMIN can only view business-scope audit logs');
            }
          } else {
            filters.allowedEntityTypes = [...BUSINESS_AUDIT_ENTITY_TYPES];
          }
        } else if (actor.role === 'SYSTEM_ADMIN') {
          // System Admin sees full audit without restriction
        } else {
          const { Forbidden } = await import('../../../api/app-error.js');
          throw new Forbidden('Insufficient permissions to view audit logs');
        }
      }

      return await this.auditRepo.findMany(filters);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        const { BadRequest } = await import('../../../api/app-error.js');
        throw new BadRequest('Invalid query parameters for audit logs');
      }
      throw error;
    }
  }
}
