import { Pool } from 'pg';
import { AuditRepository } from '../domain/audit.repository.js';
import { randomUUID } from 'crypto';

export class AuditRetentionService {
  constructor(
    private pool: Pool,
    private auditRepo: AuditRepository
  ) {}

  /**
   * Deletes expired audit logs older than the specified cutoff date.
   * Connects to the database and temporarily assumes the `kpi_maintenance` 
   * role to bypass the append-only trigger. 
   * Deletes in batches to avoid locking issues and large transactions.
   * 
   * @param cutoffDate The boundary date (e.g., now - 2 years)
   * @param batchSize Number of rows to delete per transaction
   */
  async deleteExpiredLogs(cutoffDate: Date, batchSize: number = 1000): Promise<{ totalDeleted: number; durationMs: number }> {
    const startTime = Date.now();
    let totalDeleted = 0;
    const jobId = randomUUID();

    console.log(`[AuditRetentionService] Starting retention cleanup job=${jobId} cutoff=${cutoffDate.toISOString()} batchSize=${batchSize}`);

    while (true) {
      const client = await this.pool.connect();
      let deletedInBatch = 0;
      
      try {
        await client.query('BEGIN');
        
        // Temporarily set the local role for this transaction to allow deletion
        await client.query('SET LOCAL ROLE kpi_maintenance');

        deletedInBatch = await this.auditRepo.deleteOlderThan(cutoffDate, batchSize, client);
        
        await client.query('COMMIT');
        
        totalDeleted += deletedInBatch;
        
        if (deletedInBatch > 0) {
          console.log(`[AuditRetentionService] job=${jobId} deleted batch of ${deletedInBatch} rows. Total so far: ${totalDeleted}`);
        }
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[AuditRetentionService] job=${jobId} failed during batch deletion`, err);
        throw err;
      } finally {
        client.release();
      }

      // If we deleted less than the batch size, we've processed all matching records
      if (deletedInBatch < batchSize) {
        break;
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[AuditRetentionService] Completed retention cleanup job=${jobId}. Total deleted=${totalDeleted}, duration=${durationMs}ms`);
    
    return { totalDeleted, durationMs };
  }
}
