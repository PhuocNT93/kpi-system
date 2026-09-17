import { INotificationRepository } from '../domain/notification.repository.js';
import {
  MANDATORY_NOTIFICATION_TYPES,
  NotificationLog,
  NotificationStatus,
} from '../domain/notification.types.js';
import type { IEmailSender } from './email-sender.interface.js';
import { TemplateRendererService } from './template-renderer.service.js';

export interface OutboxWorkerOptions {
  batchSize?: number;
  pollIntervalMs?: number;
  throttlePerMinute?: number;
  maxRetries?: number;
}

export class OutboxWorkerService {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly throttlePerMinute: number;
  private readonly maxRetries: number;

  // Track timestamps of sent emails within the last 60 seconds for sliding window throttling
  private sentTimestamps: number[] = [];

  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly smtpSender: IEmailSender,
    private readonly templateRenderer: TemplateRendererService,
    options?: OutboxWorkerOptions
  ) {
    this.batchSize = options?.batchSize || 50;
    this.pollIntervalMs = options?.pollIntervalMs || 10000;
    this.throttlePerMinute =
      options?.throttlePerMinute ||
      Number(process.env.SMTP_THROTTLE_PER_MINUTE || 60);
    this.maxRetries = options?.maxRetries ?? 3; // Rule 18
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextPoll();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextPoll(): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      try {
        await this.processPendingBatch();
      } catch (err) {
        console.error('[OutboxWorker] Error during batch processing:', err);
      } finally {
        this.scheduleNextPoll();
      }
    }, this.pollIntervalMs);
  }

  /**
   * Cleans timestamps older than 60 seconds and checks if throttle quota allows sending.
   */
  private canSendNow(): boolean {
    const now = Date.now();
    this.sentTimestamps = this.sentTimestamps.filter((ts) => now - ts < 60000);
    return this.sentTimestamps.length < this.throttlePerMinute;
  }

  private recordSent(): void {
    this.sentTimestamps.push(Date.now());
  }

  /**
   * Processes a batch of pending outbox notifications.
   * Can be called directly by tests or background timer.
   */
  async processPendingBatch(limitOverride?: number): Promise<{
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
    throttled: number;
  }> {
    const limit = limitOverride ?? this.batchSize;
    const pendingLogs = (await this.notificationRepo.findPendingOutbox(limit)) || [];

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let throttled = 0;

    for (const log of pendingLogs) {
      // 1. Check throttling (Risk #15)
      if (!this.canSendNow()) {
        throttled++;
        break; // Stop processing further in this tick to respect rate limit
      }

      processed++;
      const result = await this.processSingleLog(log);
      if (result === 'SENT') sent++;
      else if (result === 'SKIPPED') skipped++;
      else if (result === 'FAILED') failed++;
    }

    return { processed, sent, failed, skipped, throttled };
  }

  async processSingleLog(log: NotificationLog): Promise<'SENT' | 'SKIPPED' | 'FAILED'> {
    try {
      // 1. Check template active status
      const template = await this.notificationRepo.findTemplateByCode(log.notificationType);
      if (template && !template.active) {
        await this.notificationRepo.updateLogStatus(
          log.notificationLogId,
          NotificationStatus.SKIPPED,
          log.retryCount,
          'Template is globally inactive'
        );
        return 'SKIPPED';
      }

      // 2. Check user notification preferences
      const isMandatory = MANDATORY_NOTIFICATION_TYPES.includes(log.notificationType);
      if (!isMandatory) {
        const preferences = await this.notificationRepo.findUserPreferences(
          log.recipientUserAccountId
        );
        const pref = preferences.find((p) => p.notificationType === log.notificationType);
        if (pref && !pref.enabled) {
          await this.notificationRepo.updateLogStatus(
            log.notificationLogId,
            NotificationStatus.SKIPPED,
            log.retryCount,
            'User preference disabled'
          );
          return 'SKIPPED';
        }
      }

      // 3. Render email body (re-renders from template if needed or uses stored subject)
      const userInfo = await this.notificationRepo.getUserEmailAndLocale(
        log.recipientUserAccountId
      );
      const recipientLocale = log.localeUsed || userInfo?.locale || 'en';
      const templateId = template?.notificationTemplateId || log.notificationType;

      const rendered = await this.templateRenderer.render(
        templateId,
        log.notificationType,
        recipientLocale,
        {
          employee_name: userInfo?.name || 'Employee',
          recipient_email: log.recipientEmail,
          link: process.env.PORTAL_BASE_URL || 'http://localhost:5173',
        }
      );

      // 4. Send email via SMTP
      await this.smtpSender.sendEmail({
        to: log.recipientEmail,
        subject: rendered.subject || log.subjectRendered,
        html: rendered.bodyHtml,
      });

      this.recordSent();

      // 5. Update outbox row to SENT
      await this.notificationRepo.updateLogStatus(
        log.notificationLogId,
        NotificationStatus.SENT,
        log.retryCount,
        null,
        new Date()
      );

      return 'SENT';
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const newRetryCount = log.retryCount + 1;

      // Rule 18: Retry up to 3 times before setting FAILED
      if (newRetryCount >= this.maxRetries) {
        await this.notificationRepo.updateLogStatus(
          log.notificationLogId,
          NotificationStatus.FAILED,
          newRetryCount,
          `Max retries (${this.maxRetries}) reached. Last error: ${errorMessage}`
        );
      } else {
        await this.notificationRepo.updateLogStatus(
          log.notificationLogId,
          NotificationStatus.PENDING,
          newRetryCount,
          `Retry #${newRetryCount} failed: ${errorMessage}`
        );
      }

      return 'FAILED';
    }
  }
}
