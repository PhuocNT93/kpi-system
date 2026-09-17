/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import request from 'supertest';
import { NotificationType, NotificationStatus } from '../src/modules/notification/domain/notification.types.js';
import { INotificationRepository } from '../src/modules/notification/domain/notification.repository.js';
import { TemplateRendererService } from '../src/modules/notification/application/template-renderer.service.js';
import { SmtpSenderService } from '../src/modules/notification/application/smtp-sender.service.js';
import { OutboxWorkerService } from '../src/modules/notification/application/outbox-worker.service.js';
import { NotificationService } from '../src/modules/notification/application/notification.service.js';
import { NotificationRetentionService } from '../src/modules/notification/application/notification-retention.service.js';
import { Unprocessable } from '../src/api/app-error.js';
import { createApp } from '../src/app.js';
import { JWTTokenService } from '../src/modules/auth/services/token.service.js';

const tokenService = new JWTTokenService({ secret: 'test-secret-key-must-be-long-enough-for-hs256' });

describe('Notification Module (SMTP & Multi-Language)', () => {
  let mockRepo: Record<keyof INotificationRepository, Mock>;
  let mockI18nService: any;
  let mockAuditService: any;
  let mockSmtpSender: any;
  let templateRenderer: TemplateRendererService;
  let outboxWorker: OutboxWorkerService;
  let notificationService: NotificationService;
  let retentionService: NotificationRetentionService;

  beforeEach(() => {
    mockRepo = {
      insertOutbox: vi.fn(),
      findPendingOutbox: vi.fn(),
      updateLogStatus: vi.fn(),
      findUserPreferences: vi.fn().mockResolvedValue([]),
      upsertUserPreference: vi.fn(),
      findTemplateByCode: vi.fn().mockResolvedValue({
        notificationTemplateId: 'tpl-1',
        notificationType: NotificationType.CYCLE_OPENED,
        active: true,
      }),
      findTemplateById: vi.fn().mockResolvedValue({
        notificationTemplateId: 'tpl-1',
        notificationType: NotificationType.CYCLE_OPENED,
        active: true,
      }),
      listTemplates: vi.fn().mockResolvedValue([]),
      updateTemplate: vi.fn().mockResolvedValue({
        notificationTemplateId: 'tpl-1',
        notificationType: NotificationType.CYCLE_OPENED,
        active: true,
      }),
      findLogs: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findLogById: vi.fn(),
      deleteLogsOlderThan: vi.fn().mockResolvedValue(0),
      getUserEmailAndLocale: vi.fn().mockResolvedValue({
        email: 'user@example.com',
        locale: 'en',
        name: 'Nguyen Van A',
      }),
      findEmployeesWithReviewDue: vi.fn().mockResolvedValue([]),
      findHrAndAdminUsers: vi.fn().mockResolvedValue([]),
      findUserNotifications: vi.fn().mockResolvedValue({ items: [], unreadCount: 0 }),
      setNotificationRead: vi.fn().mockResolvedValue(undefined),
      markAllNotificationsRead: vi.fn().mockResolvedValue(0),
    };

    mockI18nService = {
      resolveEntityTranslations: vi.fn().mockResolvedValue({}),
      getTranslationsMap: vi.fn().mockResolvedValue({}),
      upsertEntityTranslations: vi.fn().mockResolvedValue(undefined),
      getAvailableLocales: vi.fn().mockReturnValue(['en', 'vi', 'ja']),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockSmtpSender = {
      sendEmail: vi.fn().mockResolvedValue(true),
      verifyConnection: vi.fn().mockResolvedValue(true),
    };

    templateRenderer = new TemplateRendererService(mockI18nService);
    outboxWorker = new OutboxWorkerService(
      mockRepo as unknown as INotificationRepository,
      mockSmtpSender as unknown as SmtpSenderService,
      templateRenderer,
      { throttlePerMinute: 30 }
    );
    notificationService = new NotificationService(
      mockRepo as unknown as INotificationRepository,
      templateRenderer,
      mockI18nService,
      mockAuditService,
      outboxWorker,
      mockSmtpSender as unknown as SmtpSenderService
    );
    retentionService = new NotificationRetentionService(
      mockRepo as unknown as INotificationRepository
    );
  });

  describe('1. Template Rendering & Rule 16 Content Sanitization', () => {
    it('TC08: interpolates standard tokens and strictly removes sensitive performance data (Rule 16)', async () => {
      const payload = {
        cycle_name: 'Q3 2026',
        recipient_name: 'Nguyen Van A',
        employee_name: 'Nguyen Van A',
        score: '95.5',
        rating: 'EXCEED',
        comment: 'Confidential performance evaluation comment',
        rationale: 'Hidden manager rationale',
      };

      const rendered = await templateRenderer.render(
        'tpl-result',
        NotificationType.RESULT_PUBLISHED,
        'en',
        payload
      );

      // Rule 16 invariant: score, rating, comment, rationale must NOT appear in output!
      expect(rendered.subject).toContain('performance evaluation results');
      expect(rendered.bodyHtml).toContain('Nguyen Van A');
      expect(rendered.bodyHtml).not.toContain('95.5');
      expect(rendered.bodyHtml).not.toContain('EXCEED');
      expect(rendered.bodyHtml).not.toContain('Confidential');
      expect(rendered.bodyHtml).not.toContain('Hidden');
    });

    it('TC11: renders Vietnamese translation when locale is vi', async () => {
      mockI18nService.resolveEntityTranslations.mockResolvedValue({
        'tpl-cycle': {
          subject: 'Kỳ đánh giá đã mở: {{cycle_name}}',
          body_html: '<p>Kỳ đánh giá {{cycle_name}} đã chính thức mở. Hạn chót: {{deadline}}</p>',
        },
      });

      const rendered = await templateRenderer.render(
        'tpl-cycle',
        NotificationType.CYCLE_OPENED,
        'vi',
        { cycle_name: 'Năm 2026', deadline: '2026-10-01' }
      );

      expect(rendered.subject).toBe('Kỳ đánh giá đã mở: Năm 2026');
      expect(rendered.bodyHtml).toContain('Kỳ đánh giá Năm 2026 đã chính thức mở. Hạn chót: 2026-10-01');
      expect(rendered.localeUsed).toBe('vi');
    });

    it('TC12: falls back to English baseline when translation is missing', async () => {
      mockI18nService.resolveEntityTranslations.mockResolvedValue({});

      const rendered = await templateRenderer.render(
        'tpl-cycle',
        NotificationType.CYCLE_OPENED,
        'fr',
        { cycle_name: 'H1 2026' }
      );

      expect(rendered.subject).toContain('H1 2026');
      expect(rendered.localeUsed).toBe('en');
    });
  });

  describe('2. Outbox Atomicity & Worker Retry Logic', () => {
    it('TC01 & TC04: creates outbox row in PENDING status within transaction; survives SMTP offline', async () => {
      const mockTxClient = {} as any;
      mockRepo.findUserPreferences.mockResolvedValue([
        { notificationType: NotificationType.CYCLE_OPENED, enabled: true },
      ]);
      mockRepo.insertOutbox.mockResolvedValue({
        notificationLogId: 'log-1',
        notificationType: NotificationType.CYCLE_OPENED,
        status: NotificationStatus.PENDING,
      });

      const log = await notificationService.enqueueNotification(
        {
          notificationType: NotificationType.CYCLE_OPENED,
          recipientUserAccountId: 'user-1',
          recipientEmail: 'user1@example.com',
          contextPayload: { cycle_name: 'H1 2026' },
        },
        mockTxClient
      );

      expect(mockRepo.insertOutbox).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationType: NotificationType.CYCLE_OPENED,
          recipientEmail: 'user1@example.com',
        }),
        expect.any(String),
        expect.any(String),
        mockTxClient
      );
      expect(log?.status).toBe(NotificationStatus.PENDING);
    });

    it('TC03: Worker successfully dispatches pending notification and updates status to SENT', async () => {
      const pendingLog = {
        notificationLogId: 'log-1',
        notificationType: NotificationType.CYCLE_OPENED,
        recipientEmail: 'user1@example.com',
        recipientUserAccountId: 'user-1',
        status: NotificationStatus.PENDING,
        retryCount: 0,
        contextPayload: { cycle_name: 'H1 2026' },
        createdAt: new Date(),
      };

      mockRepo.findPendingOutbox.mockResolvedValue([pendingLog]);

      const result = await outboxWorker.processPendingBatch();

      expect(result.sent).toBe(1);
      expect(mockSmtpSender.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@example.com',
        })
      );
      expect(mockRepo.updateLogStatus).toHaveBeenCalledWith(
        'log-1',
        NotificationStatus.SENT,
        0,
        null,
        expect.any(Date)
      );
    });

    it('TC05: increments retry_count and records error on SMTP failure (Rule 18)', async () => {
      const pendingLog = {
        notificationLogId: 'log-1',
        notificationType: NotificationType.CYCLE_OPENED,
        recipientEmail: 'user1@example.com',
        recipientUserAccountId: 'user-1',
        status: NotificationStatus.PENDING,
        retryCount: 0,
        contextPayload: { cycle_name: 'H1 2026' },
        createdAt: new Date(),
      };

      mockRepo.findPendingOutbox.mockResolvedValue([pendingLog]);
      mockSmtpSender.sendEmail.mockRejectedValue(new Error('SMTP connection timeout'));

      const result = await outboxWorker.processPendingBatch();

      expect(result.failed).toBe(1);
      expect(mockRepo.updateLogStatus).toHaveBeenCalledWith(
        'log-1',
        NotificationStatus.PENDING,
        1,
        'Retry #1 failed: SMTP connection timeout'
      );
    });

    it('TC06: marks terminal failure after max retries (Rule 18)', async () => {
      const pendingLog = {
        notificationLogId: 'log-1',
        notificationType: NotificationType.CYCLE_OPENED,
        recipientEmail: 'user1@example.com',
        recipientUserAccountId: 'user-1',
        status: NotificationStatus.FAILED,
        retryCount: 2, // Will increment to 3
        contextPayload: { cycle_name: 'H1 2026' },
        createdAt: new Date(),
      };

      mockRepo.findPendingOutbox.mockResolvedValue([pendingLog]);
      mockSmtpSender.sendEmail.mockRejectedValue(new Error('Persistent 550 Mailbox Unavailable'));

      const result = await outboxWorker.processPendingBatch();

      expect(result.failed).toBe(1);
      expect(mockRepo.updateLogStatus).toHaveBeenCalledWith(
        'log-1',
        NotificationStatus.FAILED,
        3,
        'Max retries (3) reached. Last error: Persistent 550 Mailbox Unavailable'
      );
    });

    it('TC07: sliding window rate throttle prevents sending more than configured limit per minute', async () => {
      const logs = Array.from({ length: 35 }).map((_, i) => ({
        notificationLogId: `log-${i}`,
        notificationType: NotificationType.CYCLE_OPENED,
        recipientEmail: `user${i}@example.com`,
        recipientUserAccountId: `user-${i}`,
        status: NotificationStatus.PENDING,
        retryCount: 0,
        contextPayload: {},
        createdAt: new Date(),
      }));

      mockRepo.findPendingOutbox.mockResolvedValue(logs);

      const result = await outboxWorker.processPendingBatch();

      // Exactly 30 emails sent; throttled is 1
      expect(result.sent).toBe(30);
      expect(result.throttled).toBe(1);
      expect(mockSmtpSender.sendEmail).toHaveBeenCalledTimes(30);
    });
  });

  describe('3. User Preferences & Rule 17 Mandatory Notifications', () => {
    it('TC09: skips notification if user preference is disabled for non-mandatory type', async () => {
      mockRepo.findUserPreferences.mockResolvedValue([
        { notificationType: NotificationType.REVIEW_DUE_REMINDER, enabled: false },
      ]);

      const result = await notificationService.enqueueNotification({
        notificationType: NotificationType.REVIEW_DUE_REMINDER,
        recipientUserAccountId: 'user-1',
        recipientEmail: 'user1@example.com',
      });

      expect(result).toBeUndefined();
      expect(mockRepo.insertOutbox).not.toHaveBeenCalled();
    });

    it('TC10: rejects disabling RESULT_PUBLISHED with HTTP 422 MANDATORY_NOTIFICATION_TYPE (Rule 17)', async () => {
      await expect(
        notificationService.updateUserPreferences('user-1', [
          { notification_type: NotificationType.CYCLE_OPENED, enabled: true },
          { notification_type: NotificationType.RESULT_PUBLISHED, enabled: false },
        ])
      ).rejects.toThrow(Unprocessable);

      expect(mockRepo.upsertUserPreference).not.toHaveBeenCalled();
    });

    it('allows updating non-mandatory preferences when RESULT_PUBLISHED remains enabled', async () => {
      await notificationService.updateUserPreferences('user-1', [
        { notification_type: NotificationType.REVIEW_DUE_REMINDER, enabled: false },
        { notification_type: NotificationType.CYCLE_OPENED, enabled: true },
      ]);

      expect(mockRepo.upsertUserPreference).toHaveBeenCalledTimes(2);
    });
  });

  describe('4. Rule 19 Retention Purge & Rule 20 Manual Resend', () => {
    it('TC15: deletes logs older than 365 days in batches (Rule 19)', async () => {
      mockRepo.deleteLogsOlderThan
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(120);

      const result = await retentionService.purgeExpiredLogs(365, 500);

      expect(result.totalDeleted).toBe(620);
      expect(mockRepo.deleteLogsOlderThan).toHaveBeenCalledTimes(2);
    });

    it('TC13: Admin manual resend resets status to PENDING and triggers dispatch (Rule 20)', async () => {
      mockRepo.findLogById.mockResolvedValue({
        notificationLogId: 'log-failed-1',
        status: NotificationStatus.FAILED,
        retryCount: 3,
        notificationType: NotificationType.CYCLE_OPENED,
        recipientEmail: 'user@example.com',
        contextPayload: {},
      });

      await notificationService.resendNotification('log-failed-1', {
        userId: 'admin-1',
        role: 'SYSTEM_ADMIN',
      });

      expect(mockRepo.updateLogStatus).toHaveBeenCalledWith(
        'log-failed-1',
        NotificationStatus.PENDING,
        0,
        null,
        null
      );
    });

    it('TC16: Admin template update updates baseline, saves i18n, and writes audit log', async () => {
      mockRepo.findTemplateById.mockResolvedValue({
        notificationTemplateId: 'tpl-1',
        notificationType: NotificationType.CYCLE_OPENED,
        active: true,
      });

      await notificationService.updateTemplate(
        'tpl-1',
        {
          active: false,
          translations: {
            vi: {
              subject: 'Tiêu đề tiếng Việt mới',
              body_html: '<p>Nội dung tiếng Việt mới</p>',
            },
          },
        },
        { userId: 'admin-1', role: 'SYSTEM_ADMIN' },
        {} as any
      );

      expect(mockRepo.updateTemplate).toHaveBeenCalledWith(
        'tpl-1',
        false,
        expect.anything()
      );

      expect(mockI18nService.upsertEntityTranslations).toHaveBeenCalledWith(
        'NOTIFICATION_TEMPLATE',
        'tpl-1',
        expect.objectContaining({
          vi: {
            subject: 'Tiêu đề tiếng Việt mới',
            body_html: '<p>Nội dung tiếng Việt mới</p>',
          },
        }),
        'admin-1',
        expect.anything()
      );

      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'UPDATE',
          entityType: 'NOTIFICATION_TEMPLATE',
          entityId: 'tpl-1',
        })
      );
    });
  });

  describe('5. HTTP Endpoints & RBAC Integration Tests', () => {
    let app: any;

    beforeEach(() => {
      const mockPool = {
        query: vi.fn().mockImplementation((queryText: string) => {
          if (queryText.includes('INSERT INTO notification_log')) {
            return Promise.resolve({
              rows: [
                {
                  notification_log_id: 'test-log-1',
                  notification_type: 'CYCLE_OPENED',
                  recipient_user_account_id: 'admin-1',
                  recipient_email: 'test@example.com',
                  locale_used: 'vi',
                  subject_rendered: 'Test Subject',
                  status: 'PENDING',
                  retry_count: 0,
                  created_at: new Date(),
                },
              ],
            });
          }
          return Promise.resolve({ rows: [] });
        }),
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      } as unknown as any;

      app = createApp({
        dbPool: mockPool,
        jwtConfig: { secret: 'test-secret-key-must-be-long-enough-for-hs256' },
        customSmtpSender: mockSmtpSender,
      });
    });

    it('TC14: Non-admin (EMPLOYEE) is forbidden from viewing admin notification templates (403)', async () => {
      const employeeToken = tokenService.generateAccessToken({
        userId: 'emp-1',
        role: 'EMPLOYEE',
      });

      const res = await request(app)
        .get('/api/admin/notifications/templates')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it('TC10 via HTTP: PUT /api/notifications/preferences returns 422 if RESULT_PUBLISHED is disabled', async () => {
      const employeeToken = tokenService.generateAccessToken({
        userId: 'emp-1',
        role: 'EMPLOYEE',
      });

      const res = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          preferences: [
            { notification_type: 'RESULT_PUBLISHED', enabled: false },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.meta?.error?.code || res.body.error?.code).toBe('MANDATORY_NOTIFICATION_TYPE');
    });

    it('TC17: GET /api/users/me/notifications returns user notification feed with unread count', async () => {
      const employeeToken = tokenService.generateAccessToken({
        userId: 'emp-1',
        role: 'EMPLOYEE',
      });

      const res = await request(app)
        .get('/api/users/me/notifications')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(typeof res.body.data.unreadCount).toBe('number');
    });

    it('TC18: PATCH /api/users/me/notifications/:id/read sets read status', async () => {
      const employeeToken = tokenService.generateAccessToken({
        userId: 'emp-1',
        role: 'EMPLOYEE',
      });

      const res = await request(app)
        .patch('/api/users/me/notifications/log-1/read')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ read: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('TC19: POST /api/users/me/notifications/mark-all-read marks all user notifications as read', async () => {
      const employeeToken = tokenService.generateAccessToken({
        userId: 'emp-1',
        role: 'EMPLOYEE',
      });

      const res = await request(app)
        .post('/api/users/me/notifications/mark-all-read')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('TC20: POST /api/admin/notifications/test-smtp allows HR_ADMIN / SYSTEM_ADMIN and blocks EMPLOYEE', async () => {
      const employeeToken = tokenService.generateAccessToken({
        userId: 'emp-1',
        role: 'EMPLOYEE',
      });
      const adminToken = tokenService.generateAccessToken({
        userId: 'admin-1',
        role: 'HR_ADMIN',
      });

      // Employee forbidden
      const forbiddenRes = await request(app)
        .post('/api/admin/notifications/test-smtp')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          recipient_email: 'test@example.com',
          notification_type: 'CYCLE_OPENED',
        });
      expect(forbiddenRes.status).toBe(403);

      // HR_ADMIN allowed
      const adminRes = await request(app)
        .post('/api/admin/notifications/test-smtp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipient_email: 'hr@example.com',
          notification_type: 'CYCLE_OPENED',
        });
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data).toBeDefined();
    });
  });
});

