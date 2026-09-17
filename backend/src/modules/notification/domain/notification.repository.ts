import { TransactionClient } from '../../../shared/database/transaction.js';
import {
  CreateOutboxParams,
  NotificationLog,
  NotificationLogFilter,
  NotificationStatus,
  NotificationTemplate,
  NotificationType,
  UserNotificationPreference,
} from './notification.types.js';

export interface INotificationRepository {
  insertOutbox(
    params: CreateOutboxParams,
    subjectRendered: string,
    localeUsed: string,
    client?: TransactionClient
  ): Promise<NotificationLog>;

  findPendingOutbox(limit: number, client?: TransactionClient): Promise<NotificationLog[]>;

  updateLogStatus(
    id: string,
    status: NotificationStatus,
    retryCount: number,
    errorMessage?: string | null,
    sentAt?: Date | null,
    client?: TransactionClient
  ): Promise<void>;

  findUserPreferences(
    userAccountId: string,
    client?: TransactionClient
  ): Promise<UserNotificationPreference[]>;

  upsertUserPreference(
    userAccountId: string,
    notificationType: NotificationType,
    enabled: boolean,
    client?: TransactionClient
  ): Promise<void>;

  findTemplateByCode(
    code: NotificationType,
    client?: TransactionClient
  ): Promise<NotificationTemplate | null>;

  findTemplateById(
    id: string,
    client?: TransactionClient
  ): Promise<NotificationTemplate | null>;

  listTemplates(client?: TransactionClient): Promise<NotificationTemplate[]>;

  updateTemplate(
    id: string,
    active: boolean,
    client?: TransactionClient
  ): Promise<NotificationTemplate>;

  findLogs(
    filter: NotificationLogFilter,
    client?: TransactionClient
  ): Promise<{ items: NotificationLog[]; total: number }>;

  findLogById(id: string, client?: TransactionClient): Promise<NotificationLog | null>;

  deleteLogsOlderThan(
    cutoffDate: Date,
    batchSize: number,
    client?: TransactionClient
  ): Promise<number>;

  getUserEmailAndLocale(
    userAccountId: string,
    client?: TransactionClient
  ): Promise<{ email: string; locale: string; name: string } | null>;

  findEmployeesWithReviewDue(
    dueWithinDays: number,
    client?: TransactionClient
  ): Promise<Array<{ employeeId: string; fullName: string; email: string; managerId: string | null }>>;

  findHrAndAdminUsers(
    client?: TransactionClient
  ): Promise<Array<{ userId: string; email: string; name: string }>>;

  findUserNotifications(
    userAccountId: string,
    limit?: number,
    client?: TransactionClient
  ): Promise<{ items: NotificationLog[]; unreadCount: number }>;

  setNotificationRead(
    notificationLogId: string,
    userAccountId: string,
    read: boolean,
    client?: TransactionClient
  ): Promise<void>;

  markAllNotificationsRead(
    userAccountId: string,
    client?: TransactionClient
  ): Promise<number>;
}
