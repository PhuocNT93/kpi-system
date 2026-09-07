import { z } from 'zod';

export const SUPPORTED_LOCALES = ['en', 'vi', 'ja'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const EntityTypeSchema = z.enum([
  'CRITERION',
  'CRITERION_LEVEL',
  'DEPARTMENT',
  'TEAM',
  'ROLE',
  'JOB_LEVEL',
  'REVIEW_CADENCE',
  'EVALUATION_TEMPLATE',
]);

export type EntityType = z.infer<typeof EntityTypeSchema> | string;

export interface TranslationRecord {
  translationId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  locale: string;
  value: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

// Map format: { [locale]: { [fieldName]: value } }
// Example: { en: { name: "On-time", description: "..." }, vi: { name: "Đúng hạn", description: "..." } }
export type TranslationsMap = Record<string, Record<string, string>>;

export const UpsertTranslationsSchema = z.record(
  z.string(),
  z.record(z.string(), z.string())
);
