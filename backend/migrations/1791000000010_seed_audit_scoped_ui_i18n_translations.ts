import type { MigrationBuilder } from 'node-pg-migrate';

// The frontend merges every *_UI namespace into one flat dictionary, so generic
// fields like page_title are overwritten by whichever screen loads last.
// These audit-prefixed fields cannot collide.
const AUDIT_UI_ID = 'a0000000-0000-0000-0000-000000000001';

const TRANSLATIONS = [
  { field: 'audit_page_title', en: 'System Audit Logs', vi: 'Nhật ký kiểm toán hệ thống' },
  {
    field: 'audit_page_subtitle',
    en: 'Immutable history of business operations, configurations, and score calculations (Read-Only)',
    vi: 'Lịch sử ghi vết toàn bộ thao tác nghiệp vụ, cấu hình và tính toán điểm (Chỉ đọc)',
  },
  { field: 'audit_role_system_admin', en: 'System Admin (Full Audit Access)', vi: 'Quản trị hệ thống (Toàn quyền kiểm toán)' },
  { field: 'audit_role_hr_admin', en: 'HR Admin (Scoped to Business Entities)', vi: 'Quản trị nhân sự (Phạm vi nghiệp vụ)' },
  { field: 'audit_search_btn', en: 'Search', vi: 'Tìm kiếm' },
];

const toCamelCase = (str: string): string => str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const escape = (value: string): string => value.replace(/'/g, "''");

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const item of TRANSLATIONS) {
    for (const field of new Set([item.field, toCamelCase(item.field)])) {
      for (const [locale, value] of [['en', item.en], ['vi', item.vi]] as const) {
        pgm.sql(`
          INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
          VALUES ('AUDIT_UI', '${AUDIT_UI_ID}', '${field}', '${locale}', '${escape(value)}')
          ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
          DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
        `);
      }
    }
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const fields = TRANSLATIONS.flatMap((item) => [item.field, toCamelCase(item.field)])
    .map((field) => `'${field}'`)
    .join(', ');
  pgm.sql(`
    DELETE FROM "i18n_translation"
    WHERE "entity_type" = 'AUDIT_UI' AND "entity_id" = '${AUDIT_UI_ID}' AND "field_name" IN (${fields});
  `);
}
