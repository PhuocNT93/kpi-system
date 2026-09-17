export type NotificationType =
  | 'CYCLE_OPENED'
  | 'SELF_SUBMITTED'
  | 'MANAGER_SUBMITTED'
  | 'CORRECTION_REQUESTED'
  | 'RESULT_PUBLISHED'
  | 'SCORE_ADJUSTED'
  | 'REVIEW_DUE_REMINDER'
  | 'IMPORT_COMPLETED'
  | 'CYCLE_LOCKED';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface UserNotificationPreference {
  notification_type: NotificationType;
  enabled: boolean;
  is_mandatory: boolean;
}

export interface NotificationTemplate {
  notificationTemplateId: string;
  notificationType: NotificationType;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[];
  description: string;
  active: boolean;
  translations?: Record<string, Record<string, string>>;
}

export interface NotificationLog {
  notificationLogId: string;
  notificationType: NotificationType;
  relatedEntityType?: string;
  relatedEntityId?: string;
  recipientUserAccountId: string;
  recipientEmail: string;
  subjectRendered: string;
  localeUsed: string;
  status: NotificationStatus;
  retryCount: number;
  errorMessage?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface UserNotificationFeed {
  items: NotificationLog[];
  unreadCount: number;
}

export interface NotificationLogFilter {
  status?: NotificationStatus;
  notificationType?: NotificationType;
  recipientEmail?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedNotificationLogs {
  items: NotificationLog[];
  total: number;
}
