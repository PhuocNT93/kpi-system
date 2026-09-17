import { TransactionClient } from '../../../shared/database/transaction.js';
import { NotFound, Unprocessable } from '../../../api/app-error.js';
import { Actor } from '../../../shared/auth/types.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { I18nService } from '../../i18n/application/i18n.service.js';
import { INotificationRepository } from '../domain/notification.repository.js';
import {
  ALL_NOTIFICATION_TYPES,
  CreateOutboxParams,
  MANDATORY_NOTIFICATION_TYPES,
  NotificationLog,
  NotificationLogFilter,
  NotificationStatus,
  NotificationTemplate,
  NotificationType,
} from '../domain/notification.types.js';
import {
  UpdateNotificationTemplateInput,
  UpdatePreferenceItem,
} from '../api/notification.dto.js';
import { TemplateRendererService } from './template-renderer.service.js';
import { OutboxWorkerService } from './outbox-worker.service.js';
import { SmtpSenderService } from './smtp-sender.service.js';

export class NotificationService {
  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly templateRenderer: TemplateRendererService,
    private readonly i18nService?: I18nService,
    private readonly auditService?: AuditService,
    private readonly outboxWorker?: OutboxWorkerService,
    private readonly smtpSender?: SmtpSenderService
  ) {}

  /**
   * Rule 15: Writes outbox row within caller's business transaction.
   * Rollback of business transaction automatically rolls back outbox record.
   */
  async enqueueNotification(
    params: CreateOutboxParams,
    client?: TransactionClient
  ): Promise<NotificationLog> {
    const userInfo = await this.notificationRepo.getUserEmailAndLocale(
      params.recipientUserAccountId,
      client
    );

    const email = params.recipientEmail || userInfo?.email;
    if (!email) {
      throw new Error(`Cannot enqueue notification: no email found for user ${params.recipientUserAccountId}`);
    }

    // Check user preference for non-mandatory notifications
    const isMandatory = MANDATORY_NOTIFICATION_TYPES.includes(params.notificationType);
    if (!isMandatory) {
      const preferences = await this.notificationRepo.findUserPreferences(
        params.recipientUserAccountId,
        client
      );
      const pref = preferences.find((p) => p.notificationType === params.notificationType);
      if (pref && !pref.enabled) {
        return undefined as unknown as NotificationLog;
      }
    }

    const locale = params.localeOverride || userInfo?.locale || 'en';
    const template = await this.notificationRepo.findTemplateByCode(params.notificationType, client);
    const templateId = template?.notificationTemplateId || params.notificationType;

    // Pre-render subject to store in outbox log for quick auditability
    const rendered = await this.templateRenderer.render(
      templateId,
      params.notificationType,
      locale,
      {
        ...params.contextPayload,
        employee_name: userInfo?.name || 'Employee',
        recipient_email: email,
      }
    );

    const outboxLog = await this.notificationRepo.insertOutbox(
      {
        ...params,
        recipientEmail: email,
      },
      rendered.subject,
      rendered.localeUsed,
      client
    );

    return outboxLog;
  }

  async getUserPreferences(userId: string): Promise<
    Array<{
      notification_type: NotificationType;
      enabled: boolean;
      is_mandatory: boolean;
    }>
  > {
    const saved = await this.notificationRepo.findUserPreferences(userId);
    const prefMap = new Map(saved.map((s) => [s.notificationType, s.enabled]));

    return ALL_NOTIFICATION_TYPES.map((type) => {
      const isMandatory = MANDATORY_NOTIFICATION_TYPES.includes(type);
      const isEnabled = isMandatory ? true : (prefMap.get(type) ?? true);

      return {
        notification_type: type,
        enabled: isEnabled,
        is_mandatory: isMandatory,
      };
    });
  }

  /**
   * Rule 17: User cannot disable RESULT_PUBLISHED (422 MANDATORY_NOTIFICATION_TYPE).
   */
  async updateUserPreferences(
    userId: string,
    preferences: UpdatePreferenceItem[]
  ): Promise<void> {
    for (const item of preferences) {
      if (
        MANDATORY_NOTIFICATION_TYPES.includes(item.notification_type) &&
        item.enabled === false
      ) {
        throw new Unprocessable(
          `Notification type '${item.notification_type}' is mandatory and cannot be disabled.`,
          'MANDATORY_NOTIFICATION_TYPE'
        );
      }
    }

    for (const item of preferences) {
      await this.notificationRepo.upsertUserPreference(
        userId,
        item.notification_type,
        item.enabled
      );
    }
  }

  async getTemplates(): Promise<
    Array<
      NotificationTemplate & {
        translations?: Record<string, Record<string, string>>;
      }
    >
  > {
    const templates = await this.notificationRepo.listTemplates();
    const result: Array<NotificationTemplate & { translations?: Record<string, Record<string, string>> }> = [];

    for (const tmpl of templates) {
      let translations: Record<string, Record<string, string>> | undefined = undefined;
      if (this.i18nService) {
        translations = await this.i18nService.getTranslationsMap(
          'NOTIFICATION_TEMPLATE',
          tmpl.notificationTemplateId
        );
      }
      result.push({
        ...tmpl,
        translations,
      });
    }

    return result;
  }

  async updateTemplate(
    templateId: string,
    input: UpdateNotificationTemplateInput,
    actor: Actor,
    client?: TransactionClient
  ): Promise<NotificationTemplate> {
    const existing = await this.notificationRepo.findTemplateById(templateId, client);
    if (!existing) {
      throw new NotFound(`NotificationTemplate ${templateId}`);
    }

    let updated = existing;
    if (input.active !== undefined) {
      updated = await this.notificationRepo.updateTemplate(templateId, input.active, client);
    }

    // Save translations if provided
    if (input.translations && this.i18nService) {
      await this.i18nService.upsertEntityTranslations(
        'NOTIFICATION_TEMPLATE',
        templateId,
        input.translations,
        actor.userId,
        client
      );
    }

    // Audit log (changes to notification_template are audited, notification_log is not)
    if (this.auditService && client) {
      await this.auditService.record(client, {
        entityType: 'NOTIFICATION_TEMPLATE',
        entityId: templateId,
        action: 'UPDATE',
        oldValue: JSON.stringify({ active: existing.active }),
        newValue: JSON.stringify({ active: updated.active, translations: input.translations }),
        performedBy: actor.userId,
        source: 'API',
      });
    }

    return updated;
  }

  async getLogs(filter: NotificationLogFilter): Promise<{ items: NotificationLog[]; total: number }> {
    return this.notificationRepo.findLogs(filter);
  }

  async resendNotification(notificationLogId: string, _actor: Actor): Promise<NotificationLog> {
    const log = await this.notificationRepo.findLogById(notificationLogId);
    if (!log) {
      throw new NotFound(`NotificationLog ${notificationLogId}`);
    }

    // Reset status to PENDING and retry_count to 0
    await this.notificationRepo.updateLogStatus(
      notificationLogId,
      NotificationStatus.PENDING,
      0,
      null,
      null
    );

    const updatedLog = await this.notificationRepo.findLogById(notificationLogId);

    // Prompt outbox worker to process
    if (this.outboxWorker) {
      setImmediate(() => {
        this.outboxWorker?.processPendingBatch().catch((err) => {
          console.error('[NotificationService] Error executing manual resend:', err);
        });
      });
    }

    return updatedLog!;
  }

  /**
   * Triggers review due reminders for employees approaching their review due date.
   * Sent to HR Admins and Managers (NEVER to the employee being evaluated).
   */
  async checkAndSendReviewDueReminders(
    dueWithinDays: number = 7,
    client?: TransactionClient
  ): Promise<number> {
    const dueEmployees = await this.notificationRepo.findEmployeesWithReviewDue(
      dueWithinDays,
      client
    );

    if (dueEmployees.length === 0) return 0;

    const hrUsers = await this.notificationRepo.findHrAndAdminUsers(client);
    let count = 0;

    for (const hr of hrUsers) {
      await this.enqueueNotification(
        {
          notificationType: NotificationType.REVIEW_DUE_REMINDER,
          recipientUserAccountId: hr.userId,
          recipientEmail: hr.email,
          contextPayload: {
            count: dueEmployees.length,
          },
        },
        client
      );
      count++;
    }

    return count;
  }

  async getUserNotifications(
    userId: string,
    limit: number = 20
  ): Promise<{ items: NotificationLog[]; unreadCount: number }> {
    return this.notificationRepo.findUserNotifications(userId, limit);
  }

  async setNotificationRead(
    notificationLogId: string,
    userId: string,
    read: boolean
  ): Promise<void> {
    return this.notificationRepo.setNotificationRead(notificationLogId, userId, read);
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    return this.notificationRepo.markAllNotificationsRead(userId);
  }

  async testSmtp(
    input: {
      recipientEmail: string;
      notificationType?: NotificationType;
      locale?: string;
      context?: Record<string, string | number>;
    },
    actor: Actor
  ): Promise<{
    success: boolean;
    message: string;
    recipientEmail: string;
    notificationType: NotificationType;
    subject: string;
    messageId?: string;
    error?: string;
    logId?: string;
  }> {
    const type = input.notificationType || NotificationType.CYCLE_OPENED;
    const locale = input.locale || 'vi';

    // 1. Render template
    const template = await this.notificationRepo.findTemplateByCode(type);
    const templateId = template?.notificationTemplateId || '';
    const rendered = await this.templateRenderer.render(
      templateId,
      type,
      locale,
      input.context ?? {
        employee_name: 'Test Administrator',
        cycle_name: 'Test Google SMTP Cycle 2026',
        deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
        link: process.env.PORTAL_BASE_URL || 'http://localhost:5173',
        count: '3',
        filename: 'test_kpi_import.csv',
        success_count: '120',
        error_count: '0',
        reason: 'Verifying Google Workspace SMTP Relay Connection',
      }
    );

    const subject = `[TEST SMTP] ${rendered.subject}`;

    // 2. Insert into outbox log
    const log = await this.notificationRepo.insertOutbox(
      {
        notificationType: type,
        recipientUserAccountId: actor.userId,
        recipientEmail: input.recipientEmail,
        localeOverride: locale,
        contextPayload: { isTest: 'true' },
      },
      subject,
      locale
    );

    // 3. Deliver via SMTP
    if (!this.smtpSender) {
      return {
        success: false,
        message: 'SMTP sender is not configured on this server',
        recipientEmail: input.recipientEmail,
        notificationType: type,
        subject,
        error: 'SMTP_NOT_CONFIGURED',
      };
    }

    try {
      const info = await this.smtpSender.sendEmail({
        to: input.recipientEmail,
        subject,
        html: rendered.bodyHtml,
      });

      await this.notificationRepo.updateLogStatus(
        log.notificationLogId,
        NotificationStatus.SENT,
        0,
        null,
        new Date()
      );

      return {
        success: true,
        message: 'Test email successfully sent via Google SMTP',
        recipientEmail: input.recipientEmail,
        notificationType: type,
        subject,
        messageId: info.messageId,
        logId: log.notificationLogId,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      await this.notificationRepo.updateLogStatus(
        log.notificationLogId,
        NotificationStatus.FAILED,
        1,
        errorMsg,
        null
      );

      return {
        success: false,
        message: 'Failed to send test email via Google SMTP: ' + errorMsg,
        recipientEmail: input.recipientEmail,
        notificationType: type,
        subject,
        error: errorMsg,
        logId: log.notificationLogId,
      };
    }
  }
}


