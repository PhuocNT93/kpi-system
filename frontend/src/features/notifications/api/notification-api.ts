import { getApi, getEnvelopeApi, patchApi, putApi, postApi } from '../../../shared/api/api-client';
import type {
  UserNotificationPreference,
  NotificationTemplate,
  NotificationLog,
  NotificationLogFilter,
  PaginatedNotificationLogs,
} from '../types/notification-types';

export const notificationApi = {
  getUserPreferences: async (): Promise<UserNotificationPreference[]> => {
    const res = await getApi<{ preferences?: UserNotificationPreference[] } | UserNotificationPreference[]>(
      '/api/users/me/notification-preferences'
    );
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.preferences)) return res.preferences;
    return [];
  },

  updateUserPreferences: async (
    preferences: Array<{ notification_type: string; enabled: boolean }>
  ): Promise<void> => {
    return patchApi<void>('/api/users/me/notification-preferences', { preferences });
  },

  getTemplates: async (): Promise<NotificationTemplate[]> => {
    const res = await getApi<{ templates?: NotificationTemplate[] } | NotificationTemplate[]>(
      '/api/admin/notifications/templates'
    );
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.templates)) return res.templates;
    return [];
  },

  updateTemplate: async (
    templateId: string,
    data: {
      active?: boolean;
      translations?: Record<string, Record<string, string>>;
    }
  ): Promise<NotificationTemplate> => {
    const res = await putApi<{ template?: NotificationTemplate } | NotificationTemplate>(
      `/api/admin/notifications/templates/${encodeURIComponent(templateId)}`,
      data
    );
    if (res && 'template' in res && res.template) return res.template;
    return res as NotificationTemplate;
  },

  getLogs: async (filter: NotificationLogFilter = {}): Promise<PaginatedNotificationLogs> => {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.notificationType) params.set('notification_type', filter.notificationType);
    if (filter.recipientEmail) params.set('recipient_email', filter.recipientEmail);
    if (filter.startDate) params.set('start_date', filter.startDate);
    if (filter.endDate) params.set('end_date', filter.endDate);
    if (filter.page) params.set('page', String(filter.page));
    if (filter.pageSize) params.set('page_size', String(filter.pageSize));

    const queryString = params.toString();
    const path = queryString ? `/api/admin/notifications/logs?${queryString}` : '/api/admin/notifications/logs';
    try {
      const envelope = await getEnvelopeApi<NotificationLog[] | { items: NotificationLog[]; total: number }>(path);
      const data = envelope.data;
      if (Array.isArray(data)) {
        return {
          items: data,
          total: envelope.meta?.page?.total_items ?? data.length,
        };
      }
      if (data && 'items' in data && Array.isArray(data.items)) {
        return {
          items: data.items,
          total: data.total ?? data.items.length,
        };
      }
      return { items: [], total: 0 };
    } catch {
      // Fallback to getApi
      const res = await getApi<NotificationLog[] | { items: NotificationLog[]; total: number }>(path);
      if (Array.isArray(res)) {
        return { items: res, total: res.length };
      }
      if (res && 'items' in res && Array.isArray(res.items)) {
        return { items: res.items, total: res.total ?? res.items.length };
      }
      return { items: [], total: 0 };
    }
  },

  resendNotification: async (logId: string): Promise<NotificationLog> => {
    return postApi<NotificationLog>(
      `/api/admin/notifications/logs/${encodeURIComponent(logId)}/resend`,
      {}
    );
  },

  getMyNotifications: async (limit: number = 20): Promise<{ items: NotificationLog[]; unreadCount: number }> => {
    const res = await getApi<{ items?: NotificationLog[]; unreadCount?: number }>(
      `/api/users/me/notifications?limit=${limit}`
    );
    if (res && Array.isArray(res.items)) {
      return {
        items: res.items,
        unreadCount: res.unreadCount ?? 0,
      };
    }
    return { items: [], unreadCount: 0 };
  },

  toggleNotificationRead: async (logId: string, read: boolean = true): Promise<void> => {
    return patchApi<void>(
      `/api/users/me/notifications/${encodeURIComponent(logId)}/read`,
      { read }
    );
  },

  markAllNotificationsRead: async (): Promise<void> => {
    return postApi<void>('/api/users/me/notifications/mark-all-read', {});
  },

  testSmtp: async (data: {
    recipient_email: string;
    notification_type?: string;
    locale?: 'en' | 'vi';
  }): Promise<{
    success: boolean;
    message: string;
    recipientEmail?: string;
    notificationType?: string;
    subject?: string;
    messageId?: string;
    error?: string;
    logId?: string;
  }> => {
    return postApi<{
      success: boolean;
      message: string;
      recipientEmail?: string;
      notificationType?: string;
      subject?: string;
      messageId?: string;
      error?: string;
      logId?: string;
    }>('/api/admin/notifications/test-smtp', data);
  },
};


