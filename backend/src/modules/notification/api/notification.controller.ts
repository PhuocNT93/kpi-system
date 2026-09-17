import { Request, Response, NextFunction } from 'express';
import { getActorOrThrow } from '../../../shared/auth/actor-context.js';
import { sendSuccess, sendCollection } from '../../../api/http-response.js';
import { NotificationService } from '../application/notification.service.js';
import {
  NotificationLogQuerySchema,
  UpdateNotificationTemplateSchema,
  UpdateUserPreferencesSchema,
  SendTestNotificationSchema,
} from './notification.dto.js';

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  getUserPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getActorOrThrow(req);
      const preferences = await this.notificationService.getUserPreferences(actor.userId);
      sendSuccess(res, 200, 'User notification preferences retrieved', { preferences });
    } catch (err) {
      next(err);
    }
  };

  updateUserPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getActorOrThrow(req);
      const parsed = UpdateUserPreferencesSchema.parse(req.body);
      await this.notificationService.updateUserPreferences(actor.userId, parsed.preferences);
      const preferences = await this.notificationService.getUserPreferences(actor.userId);
      sendSuccess(res, 200, 'User notification preferences updated', { preferences });
    } catch (err) {
      next(err);
    }
  };

  getTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = await this.notificationService.getTemplates();
      sendSuccess(res, 200, 'Notification templates retrieved', { templates });
    } catch (err) {
      next(err);
    }
  };

  updateTemplate = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const actor = getActorOrThrow(req);
      const parsed = UpdateNotificationTemplateSchema.parse(req.body);
      const updated = await this.notificationService.updateTemplate(req.params.id, parsed, actor);
      sendSuccess(res, 200, 'Notification template updated', { template: updated });
    } catch (err) {
      next(err);
    }
  };

  getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = NotificationLogQuerySchema.parse(req.query);
      const { items, total } = await this.notificationService.getLogs(parsed);

      const pageSize = parsed.limit;
      const pageNumber = Math.floor(parsed.offset / pageSize) + 1;
      const totalPages = Math.ceil(total / pageSize);

      sendCollection(res, 'Notification logs retrieved', items, {
        number: pageNumber,
        size: pageSize,
        total_items: total,
        total_pages: totalPages,
      });
    } catch (err) {
      next(err);
    }
  };

  resendNotification = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const actor = getActorOrThrow(req);
      const updated = await this.notificationService.resendNotification(req.params.id, actor);
      sendSuccess(res, 200, 'Notification re-enqueued for resend', { notification: updated });
    } catch (err) {
      next(err);
    }
  };

  getMyNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getActorOrThrow(req);
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 20;
      const { items, unreadCount } = await this.notificationService.getUserNotifications(actor.userId, limit);
      sendSuccess(res, 200, 'User notifications retrieved', { items, unreadCount });
    } catch (err) {
      next(err);
    }
  };

  toggleNotificationRead = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const actor = getActorOrThrow(req);
      const read = req.body.read !== undefined ? Boolean(req.body.read) : true;
      await this.notificationService.setNotificationRead(req.params.id, actor.userId, read);
      sendSuccess(res, 200, `Notification marked as ${read ? 'read' : 'unread'}`, { read });
    } catch (err) {
      next(err);
    }
  };

  markAllNotificationsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const actor = getActorOrThrow(req);
      const updatedCount = await this.notificationService.markAllNotificationsRead(actor.userId);
      sendSuccess(res, 200, 'All notifications marked as read', { updatedCount });
    } catch (err) {
      next(err);
    }
  };

  testSmtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getActorOrThrow(req);
      const parsed = SendTestNotificationSchema.parse(req.body);
      const result = await this.notificationService.testSmtp(
        {
          recipientEmail: parsed.recipient_email,
          notificationType: parsed.notification_type,
          locale: parsed.locale,
          context: parsed.context as Record<string, string | number> | undefined,
        },
        actor
      );

      sendSuccess(res, 200, result.message, result);
    } catch (err) {
      next(err);
    }
  };
}


