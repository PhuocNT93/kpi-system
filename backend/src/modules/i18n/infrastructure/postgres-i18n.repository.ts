import { Pool } from 'pg';
import { TransactionClient } from '../../../shared/database/transaction.js';
import { I18nRepository } from '../domain/i18n.repository.js';
import { TranslationRecord } from '../domain/i18n.types.js';

export class PostgresI18nRepository implements I18nRepository {
  constructor(private pool: Pool) {}

  async findTranslations(entityType: string, entityId: string): Promise<TranslationRecord[]> {
    const res = await this.pool.query(
      `SELECT translation_id, entity_type, entity_id, field_name, locale, value, created_at, updated_at, created_by, updated_by
       FROM i18n_translation
       WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, entityId]
    );

    return res.rows.map((row) => ({
      translationId: row.translation_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      fieldName: row.field_name,
      locale: row.locale,
      value: row.value,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    }));
  }

  async findTranslationsForEntities(entityType: string, entityIds: string[]): Promise<TranslationRecord[]> {
    if (entityIds.length === 0) return [];

    const res = await this.pool.query(
      `SELECT translation_id, entity_type, entity_id, field_name, locale, value, created_at, updated_at, created_by, updated_by
       FROM i18n_translation
       WHERE entity_type = $1 AND entity_id = ANY($2::uuid[])`,
      [entityType, entityIds]
    );

    return res.rows.map((row) => ({
      translationId: row.translation_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      fieldName: row.field_name,
      locale: row.locale,
      value: row.value,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    }));
  }

  async upsertTranslations(
    entityType: string,
    entityId: string,
    records: Array<{ fieldName: string; locale: string; value: string }>,
    userId?: string | null,
    client?: TransactionClient
  ): Promise<void> {
    if (records.length === 0) return;

    const dbClient = client ?? (await this.pool.connect());
    const isLocalTx = !client;
    try {
      if (isLocalTx) {
        await dbClient.query('BEGIN');
      }

      for (const rec of records) {
        await dbClient.query(
          `INSERT INTO i18n_translation (entity_type, entity_id, field_name, locale, value, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $6)
           ON CONFLICT (entity_type, entity_id, field_name, locale)
           DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP, updated_by = EXCLUDED.updated_by`,
          [entityType, entityId, rec.fieldName, rec.locale, rec.value, userId ?? null]
        );
      }

      if (isLocalTx) {
        await dbClient.query('COMMIT');
      }
    } catch (err) {
      if (isLocalTx) {
        await dbClient.query('ROLLBACK');
      }
      throw err;
    } finally {
      if (isLocalTx) {
        dbClient.release();
      }
    }
  }

  async deleteTranslationsForEntity(entityType: string, entityId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM i18n_translation WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, entityId]
    );
  }

  async updateUserLocale(userId: string, locale: string): Promise<void> {
    await this.pool.query(
      `UPDATE app_user SET locale = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 OR employee_id = $2`,
      [locale, userId]
    );
  }
}
