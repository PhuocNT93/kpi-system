import { z } from 'zod';
import { NotificationStatus, NotificationType } from '../domain/notification.types.js';

export const UpdatePreferenceItemSchema = z.object({
  notification_type: z.nativeEnum(NotificationType),
  enabled: z.boolean(),
});

export const UpdateUserPreferencesSchema = z.object({
  preferences: z.array(UpdatePreferenceItemSchema),
});

export type UpdatePreferenceItem = z.infer<typeof UpdatePreferenceItemSchema>;
export type UpdateUserPreferencesInput = z.infer<typeof UpdateUserPreferencesSchema>;

export const UpdateNotificationTemplateSchema = z.object({
  active: z.boolean().optional(),
  translations: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});

export type UpdateNotificationTemplateInput = z.infer<typeof UpdateNotificationTemplateSchema>;

export const NotificationLogQuerySchema = z.object({
  status: z.nativeEnum(NotificationStatus).optional(),
  notification_type: z.nativeEnum(NotificationType).optional(),
  recipient_email: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type NotificationLogQueryInput = z.infer<typeof NotificationLogQuerySchema>;

export const SendTestNotificationSchema = z.object({
  notification_type: z.nativeEnum(NotificationType).default(NotificationType.CYCLE_OPENED),
  recipient_email: z.string().email(),
  locale: z.enum(['en', 'vi']).default('vi'),
  context: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export type SendTestNotificationInput = z.infer<typeof SendTestNotificationSchema>;
