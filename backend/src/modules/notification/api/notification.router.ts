import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { NotificationController } from './notification.controller.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { sendFailure } from '../../../api/http-response.js';

export function createNotificationRouter(
  controller: NotificationController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      sendFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      sendFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }
    if (actor.role !== 'SYSTEM_ADMIN' && actor.role !== 'HR_ADMIN') {
      sendFailure(res, 403, 'Admin privileges required', 'FORBIDDEN');
      return;
    }
    next();
  };

  // User preference self-service
  router.get('/users/me/notification-preferences', jwtMiddleware, requireAuth, controller.getUserPreferences);
  router.patch('/users/me/notification-preferences', jwtMiddleware, requireAuth, controller.updateUserPreferences);
  router.get('/notifications/preferences', jwtMiddleware, requireAuth, controller.getUserPreferences);
  router.put('/notifications/preferences', jwtMiddleware, requireAuth, controller.updateUserPreferences);
  router.patch('/notifications/preferences', jwtMiddleware, requireAuth, controller.updateUserPreferences);

  // User notifications feed & read status (Authenticated user)
  router.get('/users/me/notifications', jwtMiddleware, requireAuth, controller.getMyNotifications);
  router.get('/notifications/me', jwtMiddleware, requireAuth, controller.getMyNotifications);
  router.patch('/users/me/notifications/:id/read', jwtMiddleware, requireAuth, controller.toggleNotificationRead);
  router.patch('/notifications/me/:id/read', jwtMiddleware, requireAuth, controller.toggleNotificationRead);
  router.post('/users/me/notifications/mark-all-read', jwtMiddleware, requireAuth, controller.markAllNotificationsRead);
  router.post('/notifications/me/mark-all-read', jwtMiddleware, requireAuth, controller.markAllNotificationsRead);

  // Template management (HR/Admin)
  router.get('/notification-templates', jwtMiddleware, requireAdmin, controller.getTemplates);
  router.put('/notification-templates/:id', jwtMiddleware, requireAdmin, controller.updateTemplate);
  router.get('/admin/notifications/templates', jwtMiddleware, requireAdmin, controller.getTemplates);
  router.put('/admin/notifications/templates/:id', jwtMiddleware, requireAdmin, controller.updateTemplate);

  // Operational log history & resend (HR/Admin, System Admin)
  router.get('/admin/notifications', jwtMiddleware, requireAdmin, controller.getLogs);
  router.get('/admin/notifications/logs', jwtMiddleware, requireAdmin, controller.getLogs);
  router.post('/admin/notifications/:id/resend', jwtMiddleware, requireAdmin, controller.resendNotification);
  router.post('/admin/notifications/logs/:id/resend', jwtMiddleware, requireAdmin, controller.resendNotification);

  // Admin / HR SMTP live test
  router.post('/admin/notifications/test-smtp', jwtMiddleware, requireAdmin, controller.testSmtp);
  router.post('/admin/notifications/send-test', jwtMiddleware, requireAdmin, controller.testSmtp);

  return router;
}
