import { Pool } from 'pg';
import { RequestHandler, Router } from 'express';
import { I18nService } from '../i18n/application/i18n.service.js';
import { AuditService } from '../audit/application/audit.service.js';
import { PostgresNotificationRepository } from './infrastructure/postgres-notification.repository.js';
import { TemplateRendererService } from './application/template-renderer.service.js';
import { OutboxWorkerService } from './application/outbox-worker.service.js';
import { NotificationRetentionService } from './application/notification-retention.service.js';
import { NotificationService } from './application/notification.service.js';
import { NotificationController } from './api/notification.controller.js';
import { createNotificationRouter } from './api/notification.router.js';
import { createEmailSender } from './application/email-sender.factory.js';
import type { IEmailSender } from './application/email-sender.interface.js';

export interface NotificationModule {
  notificationRepo: PostgresNotificationRepository;
  templateRenderer: TemplateRendererService;
  emailSender: IEmailSender;
  outboxWorker: OutboxWorkerService;
  retentionService: NotificationRetentionService;
  notificationService: NotificationService;
  notificationController: NotificationController;
  router: Router;
}

export function createNotificationModule(
  pool: Pool,
  i18nService?: I18nService,
  auditService?: AuditService,
  jwtMiddleware?: RequestHandler,
  customSmtpSender?: IEmailSender
): NotificationModule {
  const notificationRepo = new PostgresNotificationRepository(pool);
  const templateRenderer = new TemplateRendererService(i18nService);
  // customSmtpSender is accepted for test injection; otherwise use factory to pick smtp/gmail
  const emailSender: IEmailSender = customSmtpSender ?? createEmailSender();
  const outboxWorker = new OutboxWorkerService(
    notificationRepo,
    emailSender,
    templateRenderer
  );
  const retentionService = new NotificationRetentionService(notificationRepo);

  const notificationService = new NotificationService(
    notificationRepo,
    templateRenderer,
    i18nService,
    auditService,
    outboxWorker,
    emailSender
  );

  const notificationController = new NotificationController(notificationService);

  const defaultJwtMiddleware: RequestHandler = (_req, _res, next) => next();
  const router = createNotificationRouter(
    notificationController,
    jwtMiddleware ?? defaultJwtMiddleware
  );

  return {
    notificationRepo,
    templateRenderer,
    emailSender,
    outboxWorker,
    retentionService,
    notificationService,
    notificationController,
    router,
  };
}
