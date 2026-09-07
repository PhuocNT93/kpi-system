import { I18nRepository } from '../domain/i18n.repository.js';
import { SUPPORTED_LOCALES, SupportedLocale, TranslationsMap } from '../domain/i18n.types.js';
import { BadRequest } from '../../../api/app-error.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { TransactionClient } from '../../../shared/database/transaction.js';

export class I18nService {
  constructor(
    private readonly repository: I18nRepository,
    private readonly auditService?: AuditService
  ) {}

  getAvailableLocales(): readonly string[] {
    return SUPPORTED_LOCALES;
  }

  async getTranslationsMap(entityType: string, entityId: string): Promise<TranslationsMap> {
    const records = await this.repository.findTranslations(entityType, entityId);
    const map: TranslationsMap = {};

    for (const rec of records) {
      if (!map[rec.locale]) {
        map[rec.locale] = {};
      }
      const localeMap = map[rec.locale];
      if (localeMap) {
        localeMap[rec.fieldName] = rec.value;
      }
    }

    return map;
  }

  async resolveEntityTranslations(
    entityType: string,
    entityIds: string[],
    targetLocale: string
  ): Promise<Record<string, Record<string, string>>> {
    if (entityIds.length === 0) return {};

    const records = await this.repository.findTranslationsForEntities(entityType, entityIds);
    const resolved: Record<string, Record<string, string>> = {};

    // Group by entityId -> fieldName -> { [locale]: value }
    const grouped: Record<string, Record<string, Record<string, string>>> = {};
    for (const rec of records) {
      if (!grouped[rec.entityId]) grouped[rec.entityId] = {};
      const entityGroup = grouped[rec.entityId]!;
      if (!entityGroup[rec.fieldName]) entityGroup[rec.fieldName] = {};
      const fieldGroup = entityGroup[rec.fieldName]!;
      fieldGroup[rec.locale] = rec.value;
    }

    for (const id of entityIds) {
      resolved[id] = {};
      const fields = grouped[id] || {};
      for (const [fieldName, localeValues] of Object.entries(fields)) {
        // Priority 1: targetLocale -> Priority 2: 'en' -> Priority 3: any available locale
        resolved[id][fieldName] =
          localeValues[targetLocale] ??
          localeValues['en'] ??
          Object.values(localeValues)[0] ??
          '';
      }
    }

    return resolved;
  }

  async resolveField(
    entityType: string,
    entityId: string,
    fieldName: string,
    targetLocale: string,
    fallbackDefault?: string
  ): Promise<string> {
    const res = await this.resolveEntityTranslations(entityType, [entityId], targetLocale);
    const fieldValue = res[entityId]?.[fieldName];
    return fieldValue && fieldValue.trim().length > 0 ? fieldValue : (fallbackDefault ?? '');
  }

  async upsertEntityTranslations(
    entityType: string,
    entityId: string,
    translationsMap: TranslationsMap,
    userId?: string | null,
    client?: TransactionClient
  ): Promise<void> {
    // Rule 12: Baseline English ('en') translation required
    const enTranslations = translationsMap['en'];
    if (!enTranslations || Object.keys(enTranslations).length === 0) {
      throw new BadRequest(
        "English ('en') baseline translations are required for master data",
        'EN_BASELINE_REQUIRED'
      );
    }

    const recordsToInsert: Array<{ fieldName: string; locale: string; value: string }> = [];

    for (const [locale, fields] of Object.entries(translationsMap)) {
      for (const [fieldName, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null) {
          recordsToInsert.push({ fieldName, locale, value: String(value) });
        }
      }
    }

    await this.repository.upsertTranslations(entityType, entityId, recordsToInsert, userId, client);

    if (this.auditService && client) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId);
      const validUserId = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : null;
      if (isUuid) {
        await this.auditService.record(client, {
          entityType: 'I18N_TRANSLATION',
          entityId,
          action: 'UPDATE',
          fieldName: `${entityType}.translations`,
          newValue: JSON.stringify(translationsMap),
          performedBy: validUserId,
          reason: 'Translation updated',
        });
      }
    }
  }

  async updateUserPreferredLocale(userId: string, locale: string): Promise<void> {
    const normalized = locale.toLowerCase().trim();
    if (!SUPPORTED_LOCALES.includes(normalized as SupportedLocale)) {
      throw new BadRequest(
        `Unsupported locale '${locale}'. Supported locales: ${SUPPORTED_LOCALES.join(', ')}`,
        'UNSUPPORTED_LOCALE'
      );
    }

    await this.repository.updateUserLocale(userId, normalized);
  }
}
