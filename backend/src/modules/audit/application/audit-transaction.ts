import { TransactionConnection, TransactionClient } from '../../../shared/database/transaction.js';
import { AuditRecordParams } from '../domain/audit.domain.js';
import { AuditService } from './audit.service.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';

export interface AuditCollector {
  record(params: Omit<AuditRecordParams, 'source'> & { source?: string }): void;
  getPendingRecords(): AuditRecordParams[];
}

export class TransactionalAuditCollector implements AuditCollector {
  private pendingRecords: AuditRecordParams[] = [];
  private defaultPerformedBy: string | null;

  constructor(defaultPerformedBy: string | null = null) {
    this.defaultPerformedBy = defaultPerformedBy;
  }

  record(params: Omit<AuditRecordParams, 'source'> & { source?: string }): void {
    this.pendingRecords.push({
      ...params,
      performedBy: params.performedBy !== undefined ? params.performedBy : this.defaultPerformedBy,
      source: params.source ?? 'APPLICATION_SERVICE',
    });
  }

  getPendingRecords(): AuditRecordParams[] {
    return [...this.pendingRecords];
  }
}

/**
 * Shared application-layer mechanism for atomic business writes + audit records.
 * Business writes and audit entries execute in the exact same database transaction.
 * 
 * - If business writes succeed, audit records are appended and committed atomically.
 * - If business writes fail or throw, the transaction rolls back, leaving no orphaned audit records.
 * - No client-side audit calls are required or allowed.
 */
export async function withAuditedTransaction<T>(
  connection: TransactionConnection,
  auditService: AuditService,
  work: (client: TransactionClient, audit: AuditCollector) => Promise<T>,
  actorUserId?: string | null
): Promise<T> {
  const client = await connection.connect();
  const actor = getActorFromContext();
  const performedBy = actorUserId !== undefined ? actorUserId : (actor?.userId ?? null);
  const collector = new TransactionalAuditCollector(performedBy);

  try {
    await client.query('BEGIN');
    
    // Execute business write operations with audit collector available
    const result = await work(client, collector);

    // Atomically write all accumulated audit entries in the SAME transaction
    for (const record of collector.getPendingRecords()) {
      await auditService.record(client, record);
    }

    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Retain original error
    }
    throw error;
  } finally {
    client.release();
  }
}
