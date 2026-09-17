import { INotificationRepository } from '../domain/notification.repository.js';
import { randomUUID } from 'crypto';

export class NotificationRetentionService {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  /**
   * Rule 19: Purges notification_log records older than 1 year (365 days).
   * Deletes in batches to avoid locking the outbox table.
   *
   * @param retentionDays Number of days to keep logs (default 365)
   * @param batchSize Batch size per deletion chunk (default 500)
   */
  async purgeExpiredLogs(
    retentionDays: number = 365,
    batchSize: number = 500
  ): Promise<{ totalDeleted: number; durationMs: number }> {
    const startTime = Date.now();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const jobId = randomUUID();
    let totalDeleted = 0;

    console.log(
      `[NotificationRetention] Starting purge job=${jobId} cutoff=${cutoffDate.toISOString()} batchSize=${batchSize}`
    );

    while (true) {
      const deletedCount = await this.notificationRepo.deleteLogsOlderThan(cutoffDate, batchSize);
      totalDeleted += deletedCount;

      if (deletedCount < batchSize) {
        break;
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[NotificationRetention] Completed purge job=${jobId}. Total deleted=${totalDeleted}, duration=${durationMs}ms`
    );

    return { totalDeleted, durationMs };
  }
}
