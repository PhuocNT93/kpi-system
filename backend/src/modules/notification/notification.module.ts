import { Pool } from 'pg';
import { RequestHandler, Router } from 'express';
import { I18nService } from '../i18n/application/i18n.service.js';
import { AuditService } from '../audit/application/audit.service.js';
import { PostgresNotificationRepository } from './infrastructure/postgres-notification.repository.js';
import { TemplateRendererService } from './application/template-renderer.service.js';
import { SmtpSenderService } from './application/smtp-sender.service.js';
import { OutboxWorkerService } from './application/outbox-worker.service.js';
import { NotificationRetentionService } from './application/notification-retention.service.js';
import { NotificationService } from './application/notification.service.js';
import { NotificationController } from './api/notification.controller.js';
import { createNotificationRouter } from './api/notification.router.js';

export interface NotificationModule {
  notificationRepo: PostgresNotificationRepository;
  templateRenderer: TemplateRendererService;
  smtpSender: SmtpSenderService;
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
  customSmtpSender?: SmtpSenderService
): NotificationModule {
  const notificationRepo = new PostgresNotificationRepository(pool);
  const templateRenderer = new TemplateRendererService(i18nService);
  const smtpSender = customSmtpSender ?? new SmtpSenderService();
  const outboxWorker = new OutboxWorkerService(
    notificationRepo,
    smtpSender,
    templateRenderer
  );
  const retentionService = new NotificationRetentionService(notificationRepo);

  const notificationService = new NotificationService(
    notificationRepo,
    templateRenderer,
    i18nService,
    auditService,
    outboxWorker,
    smtpSender
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
    smtpSender,
    outboxWorker,
    retentionService,
    notificationService,
    notificationController,
    router,
  };
}
