import { Pool } from 'pg';
import { TransactionClient } from '../../../shared/database/transaction.js';
import {
  CreateOutboxParams,
  NotificationLog,
  NotificationLogFilter,
  NotificationStatus,
  NotificationTemplate,
  NotificationType,
  UserNotificationPreference,
} from '../domain/notification.types.js';
import { INotificationRepository } from '../domain/notification.repository.js';

interface NotificationLogRow {
  notification_log_id: string;
  notification_type: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  recipient_user_account_id: string;
  recipient_email: string;
  locale_used: string;
  subject_rendered: string;
  status: string;
  retry_count: number;
  error_message: string | null;
  created_at: Date | string;
  sent_at: Date | string | null;
  read_at?: Date | string | null;
}

interface NotificationTemplateRow {
  notification_template_id: string;
  code: string;
  active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface UserPreferenceRow {
  user_account_id: string;
  notification_type: string;
  enabled: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PostgresNotificationRepository implements INotificationRepository {
  constructor(private readonly pool: Pool) {}

  private async resolveUserAccountId(
    userAccountId: string,
    executor: Pool | TransactionClient
  ): Promise<string | null> {
    if (!userAccountId) return null;
    if (UUID_REGEX.test(userAccountId)) {
      return userAccountId;
    }
    try {
      const res = await executor.query(
        `SELECT id FROM app_user WHERE employee_id::text = $1 OR email = $1 LIMIT 1`,
        [userAccountId]
      );
      if (res.rows.length > 0) {
        return res.rows[0].id;
      }
    } catch {
      // fallback
    }
    return null;
  }

  private mapLogRow(row: NotificationLogRow): NotificationLog {
    return {
      notificationLogId: row.notification_log_id,
      notificationType: row.notification_type as NotificationType,
      relatedEntityType: row.related_entity_type,
      relatedEntityId: row.related_entity_id,
      recipientUserAccountId: row.recipient_user_account_id,
      recipientEmail: row.recipient_email,
      localeUsed: row.locale_used,
      subjectRendered: row.subject_rendered,
      status: row.status as NotificationStatus,
      retryCount: row.retry_count,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
      readAt: row.read_at ? new Date(row.read_at) : null,
    };
  }

  private mapTemplateRow(row: NotificationTemplateRow): NotificationTemplate {
    return {
      notificationTemplateId: row.notification_template_id,
      code: row.code as NotificationType,
      active: row.active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async insertOutbox(
    params: CreateOutboxParams,
    subjectRendered: string,
    localeUsed: string,
    client?: TransactionClient
  ): Promise<NotificationLog> {
    const executor = client ?? this.pool;
    const recipientAccountId =
      (await this.resolveUserAccountId(params.recipientUserAccountId, executor)) ??
      params.recipientUserAccountId;

    const query = `
      INSERT INTO notification_log (
        notification_type,
        related_entity_type,
        related_entity_id,
        recipient_user_account_id,
        recipient_email,
        locale_used,
        subject_rendered,
        status,
        retry_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', 0)
      RETURNING *
    `;

    const values = [
      params.notificationType,
      params.relatedEntityType ?? null,
      params.relatedEntityId ?? null,
      recipientAccountId,
      params.recipientEmail,
      localeUsed,
      subjectRendered,
    ];

    const result = await executor.query(query, values);
    return this.mapLogRow(result.rows[0] as unknown as NotificationLogRow);
  }

  async findPendingOutbox(limit: number, client?: TransactionClient): Promise<NotificationLog[]> {
    const executor = client ?? this.pool;
    const query = `
      SELECT *
      FROM notification_log
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `;

    const result = await executor.query(query, [limit]);
    return result.rows.map((r) => this.mapLogRow(r as unknown as NotificationLogRow));
  }

  async updateLogStatus(
    id: string,
    status: NotificationStatus,
    retryCount: number,
    errorMessage?: string | null,
    sentAt?: Date | null,
    client?: TransactionClient
  ): Promise<void> {
    const executor = client ?? this.pool;
    const query = `
      UPDATE notification_log
      SET status = $1,
          retry_count = $2,
          error_message = $3,
          sent_at = $4
      WHERE notification_log_id = $5
    `;

    await executor.query(query, [
      status,
      retryCount,
      errorMessage ?? null,
      sentAt ?? null,
      id,
    ]);
  }

  async findUserPreferences(
    userAccountId: string,
    client?: TransactionClient
  ): Promise<UserNotificationPreference[]> {
    const executor = client ?? this.pool;
    const resolvedId = await this.resolveUserAccountId(userAccountId, executor);
    if (!resolvedId) return [];

    const query = `
      SELECT user_account_id, notification_type, enabled, created_at, updated_at
      FROM user_notification_preference
      WHERE user_account_id = $1
    `;

    const result = await executor.query(query, [resolvedId]);
    return result.rows.map((r) => {
      const row = r as unknown as UserPreferenceRow;
      return {
        userAccountId: row.user_account_id,
        notificationType: row.notification_type as NotificationType,
        enabled: row.enabled,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    });
  }

  async upsertUserPreference(
    userAccountId: string,
    notificationType: NotificationType,
    enabled: boolean,
    client?: TransactionClient
  ): Promise<void> {
    const executor = client ?? this.pool;
    const resolvedId = await this.resolveUserAccountId(userAccountId, executor);
    if (!resolvedId) return;

    const query = `
      INSERT INTO user_notification_preference (
        user_account_id,
        notification_type,
        enabled,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_account_id, notification_type)
      DO UPDATE SET
        enabled = EXCLUDED.enabled,
        updated_at = CURRENT_TIMESTAMP
    `;

    await executor.query(query, [resolvedId, notificationType, enabled]);
  }

  async findTemplateByCode(
    code: NotificationType,
    client?: TransactionClient
  ): Promise<NotificationTemplate | null> {
    const executor = client ?? this.pool;
    const query = `
      SELECT *
      FROM notification_template
      WHERE code = $1
      LIMIT 1
    `;

    const result = await executor.query(query, [code]);
    if (result.rows.length === 0) return null;
    return this.mapTemplateRow(result.rows[0] as unknown as NotificationTemplateRow);
  }

  async findTemplateById(
    id: string,
    client?: TransactionClient
  ): Promise<NotificationTemplate | null> {
    const executor = client ?? this.pool;
    const query = `
      SELECT *
      FROM notification_template
      WHERE notification_template_id = $1
      LIMIT 1
    `;

    const result = await executor.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapTemplateRow(result.rows[0] as unknown as NotificationTemplateRow);
  }

  async listTemplates(client?: TransactionClient): Promise<NotificationTemplate[]> {
    const executor = client ?? this.pool;
    const query = `
      SELECT *
      FROM notification_template
      ORDER BY code ASC
    `;

    const result = await executor.query(query);
    return result.rows.map((r) => this.mapTemplateRow(r as unknown as NotificationTemplateRow));
  }

  async updateTemplate(
    id: string,
    active: boolean,
    client?: TransactionClient
  ): Promise<NotificationTemplate> {
    const executor = client ?? this.pool;
    const query = `
      UPDATE notification_template
      SET active = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE notification_template_id = $2
      RETURNING *
    `;

    const result = await executor.query(query, [active, id]);
    if (result.rows.length === 0) {
      throw new Error(`Template not found: ${id}`);
    }
    return this.mapTemplateRow(result.rows[0] as unknown as NotificationTemplateRow);
  }

  async findLogs(
    filter: NotificationLogFilter,
    client?: TransactionClient
  ): Promise<{ items: NotificationLog[]; total: number }> {
    const executor = client ?? this.pool;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filter.status);
    }

    if (filter.notificationType) {
      conditions.push(`notification_type = $${idx++}`);
      values.push(filter.notificationType);
    }

    if (filter.recipientEmail) {
      conditions.push(`recipient_email ILIKE $${idx++}`);
      values.push(`%${filter.recipientEmail}%`);
    }

    if (filter.startDate) {
      conditions.push(`created_at >= $${idx++}`);
      values.push(filter.startDate);
    }

    if (filter.endDate) {
      conditions.push(`created_at <= $${idx++}`);
      values.push(filter.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS total FROM notification_log ${whereClause}`;
    const countRes = await executor.query(countQuery, values);
    const total = Number(countRes.rows[0]?.total ?? 0);

    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;

    const dataQuery = `
      SELECT *
      FROM notification_log
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const dataRes = await executor.query(dataQuery, [...values, limit, offset]);
    const items = dataRes.rows.map((r) => this.mapLogRow(r as unknown as NotificationLogRow));

    return { items, total };
  }

  async findLogById(id: string, client?: TransactionClient): Promise<NotificationLog | null> {
    const executor = client ?? this.pool;
    const query = `
      SELECT *
      FROM notification_log
      WHERE notification_log_id = $1
      LIMIT 1
    `;

    const result = await executor.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapLogRow(result.rows[0] as unknown as NotificationLogRow);
  }

  async deleteLogsOlderThan(
    cutoffDate: Date,
    batchSize: number,
    client?: TransactionClient
  ): Promise<number> {
    const executor = client ?? this.pool;
    const query = `
      WITH deleted AS (
        DELETE FROM notification_log
        WHERE notification_log_id IN (
          SELECT notification_log_id
          FROM notification_log
          WHERE created_at < $1
          ORDER BY created_at ASC
          LIMIT $2
        )
        RETURNING notification_log_id
      )
      SELECT COUNT(*)::int AS count FROM deleted
    `;

    const result = await executor.query(query, [cutoffDate, batchSize]);
    return Number(result.rows[0]?.count ?? 0);
  }

  async getUserEmailAndLocale(
    userAccountId: string,
    client?: TransactionClient
  ): Promise<{ email: string; locale: string; name: string } | null> {
    const executor = client ?? this.pool;
    const resolvedId = await this.resolveUserAccountId(userAccountId, executor);
    if (!resolvedId) return null;

    const query = `
      SELECT email, locale, name
      FROM app_user
      WHERE id = $1
      LIMIT 1
    `;

    const result = await executor.query(query, [resolvedId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0] as { email: string; locale: string | null; name: string };
    return {
      email: row.email,
      locale: row.locale || 'en',
      name: row.name,
    };
  }

  async findEmployeesWithReviewDue(
    dueWithinDays: number,
    client?: TransactionClient
  ): Promise<Array<{ employeeId: string; fullName: string; email: string; managerId: string | null }>> {
    const executor = client ?? this.pool;
    const query = `
      SELECT employee_id, full_name, email, manager_id
      FROM employee
      WHERE employment_status = 'ACTIVE'
        AND next_review_due_date IS NOT NULL
        AND next_review_due_date <= CURRENT_DATE + ($1 || ' days')::interval
    `;
    const res = await executor.query(query, [dueWithinDays]);
    return res.rows.map((r) => {
      const row = r as { employee_id: string; full_name: string; email: string; manager_id: string | null };
      return {
        employeeId: row.employee_id,
        fullName: row.full_name,
        email: row.email,
        managerId: row.manager_id,
      };
    });
  }

  async findHrAndAdminUsers(
    client?: TransactionClient
  ): Promise<Array<{ userId: string; email: string; name: string }>> {
    const executor = client ?? this.pool;
    const query = `
      SELECT DISTINCT u.id, u.email, u.name
      FROM app_user u
      JOIN user_role ur ON ur.user_id = u.id::text
      JOIN role r ON r.role_id = ur.role_id
      WHERE r.code IN ('HR_ADMIN', 'SYSTEM_ADMIN')
    `;
    const res = await executor.query(query);
    return res.rows.map((r) => {
      const row = r as { id: string; email: string; name: string };
      return {
        userId: row.id,
        email: row.email,
        name: row.name,
      };
    });
  }

  async findUserNotifications(
    userAccountId: string,
    limit: number = 20,
    client?: TransactionClient
  ): Promise<{ items: NotificationLog[]; unreadCount: number }> {
    const executor = client ?? this.pool;
    const resolvedId = await this.resolveUserAccountId(userAccountId, executor);
    if (!resolvedId) {
      return { items: [], unreadCount: 0 };
    }

    try {
      const unreadRes = await executor.query(
        `SELECT COUNT(*)::int AS unread FROM notification_log WHERE recipient_user_account_id = $1 AND read_at IS NULL`,
        [resolvedId]
      );
      const unreadCount = Number(unreadRes.rows[0]?.unread ?? 0);

      const itemsRes = await executor.query(
        `SELECT * FROM notification_log WHERE recipient_user_account_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [resolvedId, limit]
      );
      const items = itemsRes.rows.map((r) => this.mapLogRow(r as unknown as NotificationLogRow));

      return { items, unreadCount };
    } catch (err) {
      console.error('[PostgresNotificationRepository] findUserNotifications query error:', err);
      return { items: [], unreadCount: 0 };
    }
  }

  async setNotificationRead(
    notificationLogId: string,
    userAccountId: string,
    read: boolean,
    client?: TransactionClient
  ): Promise<void> {
    const executor = client ?? this.pool;
    const resolvedId = await this.resolveUserAccountId(userAccountId, executor);
    if (!resolvedId) return;

    const readAtValue = read ? new Date() : null;
    await executor.query(
      `UPDATE notification_log
       SET read_at = $1
       WHERE notification_log_id = $2 AND recipient_user_account_id = $3`,
      [readAtValue, notificationLogId, resolvedId]
    );
  }

  async markAllNotificationsRead(
    userAccountId: string,
    client?: TransactionClient
  ): Promise<number> {
    const executor = client ?? this.pool;
    const resolvedId = await this.resolveUserAccountId(userAccountId, executor);
    if (!resolvedId) return 0;

    const res = await executor.query(
      `UPDATE notification_log
       SET read_at = CURRENT_TIMESTAMP
       WHERE recipient_user_account_id = $1 AND read_at IS NULL`,
      [resolvedId]
    );
    return res.rowCount ?? 0;
  }
}

