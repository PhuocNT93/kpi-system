export enum NotificationType {
  CYCLE_OPENED = 'CYCLE_OPENED',
  SELF_SUBMITTED = 'SELF_SUBMITTED',
  MANAGER_SUBMITTED = 'MANAGER_SUBMITTED',
  CORRECTION_REQUESTED = 'CORRECTION_REQUESTED',
  RESULT_PUBLISHED = 'RESULT_PUBLISHED',
  SCORE_ADJUSTED = 'SCORE_ADJUSTED',
  REVIEW_DUE_REMINDER = 'REVIEW_DUE_REMINDER',
  IMPORT_COMPLETED = 'IMPORT_COMPLETED',
  CYCLE_LOCKED = 'CYCLE_LOCKED',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export const ALL_NOTIFICATION_TYPES = Object.values(NotificationType);

/**
 * Rule 17: RESULT_PUBLISHED is mandatory and cannot be disabled by users.
 */
export const MANDATORY_NOTIFICATION_TYPES: readonly NotificationType[] = [
  NotificationType.RESULT_PUBLISHED,
];

export interface NotificationTemplate {
  notificationTemplateId: string;
  code: NotificationType;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationLog {
  notificationLogId: string;
  notificationType: NotificationType;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  recipientUserAccountId: string;
  recipientEmail: string;
  localeUsed: string;
  subjectRendered: string;
  status: NotificationStatus;
  retryCount: number;
  errorMessage?: string | null;
  createdAt: Date;
  sentAt?: Date | null;
  readAt?: Date | null;
}

export interface UserNotificationPreference {
  userAccountId: string;
  notificationType: NotificationType;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOutboxParams {
  notificationType: NotificationType;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  recipientUserAccountId: string;
  recipientEmail: string;
  contextPayload?: Record<string, string | number | undefined | null>;
  localeOverride?: string;
}

export interface NotificationLogFilter {
  status?: NotificationStatus;
  notificationType?: NotificationType;
  startDate?: string;
  endDate?: string;
  recipientEmail?: string;
  limit?: number;
  offset?: number;
}
