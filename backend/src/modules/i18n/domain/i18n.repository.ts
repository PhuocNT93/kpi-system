import { TransactionClient } from '../../../shared/database/transaction.js';
import { TranslationRecord } from './i18n.types.js';

export interface I18nRepository {
  findTranslations(entityType: string, entityId: string): Promise<TranslationRecord[]>;
  findTranslationsForEntities(entityType: string, entityIds: string[]): Promise<TranslationRecord[]>;
  upsertTranslations(
    entityType: string,
    entityId: string,
    records: Array<{ fieldName: string; locale: string; value: string }>,
    userId?: string | null,
    client?: TransactionClient
  ): Promise<void>;
  deleteTranslationsForEntity(entityType: string, entityId: string): Promise<void>;
  updateUserLocale(userId: string, locale: string): Promise<void>;
}
