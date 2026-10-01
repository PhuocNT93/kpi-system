import { TransactionConnection, TransactionClient } from '../../../shared/database/transaction.js';
import { AuditRecordParams } from '../domain/audit.domain.js';
import { AuditService } from './audit.service.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';

export interface AuditCollector {
  record(params: Omit<AuditRecordParams, 'source'> & { source?: string }): void;
  getPendingRecords(): AuditRecordParams[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_SYSTEM_USER_ID = 'd3a986c4-1a7a-4a06-8710-7abb2513c831';

export class TransactionalAuditCollector implements AuditCollector {
  private pendingRecords: AuditRecordParams[] = [];
  private defaultPerformedBy: string;

  constructor(defaultPerformedBy: string = DEFAULT_SYSTEM_USER_ID) {
    this.defaultPerformedBy = defaultPerformedBy;
  }

  record(params: Omit<AuditRecordParams, 'source'> & { source?: string }): void {
    const performedBy = (params.performedBy && UUID_REGEX.test(params.performedBy))
      ? params.performedBy
      : this.defaultPerformedBy;
    this.pendingRecords.push({
      ...params,
      performedBy,
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
  let performedBy: string | null = (actorUserId && UUID_REGEX.test(actorUserId))
    ? actorUserId
    : (actor?.userId && UUID_REGEX.test(actor?.userId))
      ? actor?.userId
      : null;

  if (!performedBy) {
    try {
      const fallback = await client.query('SELECT id FROM app_user ORDER BY created_at ASC LIMIT 1');
      const fallbackRow = fallback.rows[0] as { id?: string } | undefined;
      performedBy = (fallbackRow && typeof fallbackRow.id === 'string') ? fallbackRow.id : DEFAULT_SYSTEM_USER_ID;
    } catch {
      performedBy = DEFAULT_SYSTEM_USER_ID;
    }
  }

  const collector = new TransactionalAuditCollector(performedBy || DEFAULT_SYSTEM_USER_ID);

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
