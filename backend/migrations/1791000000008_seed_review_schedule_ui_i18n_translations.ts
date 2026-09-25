import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * UI labels for the server-owned review schedule (task next-review-due-date-auto-update):
 * the employee "Review Schedule" panel (ORGANIZATION_UI) and the Review Due Dashboard (REVIEW_DUE_UI).
 * Follows the pattern of 1791000000001 / 1791000000003 (snake_case + camelCase variants, upsert).
 */
const ORGANIZATION_UI_ID = '00000000-0000-0000-0000-000000000001';
const REVIEW_DUE_UI_ID = '00000000-0000-0000-0000-000000000002';

interface UiTranslation {
  field: string;
  en: string;
  vi: string;
}

const ORGANIZATION_TRANSLATIONS: UiTranslation[] = [
  { field: 'review_schedule_title', en: 'Review Schedule', vi: 'Lịch đánh giá' },
  { field: 'effective_review_cadence', en: 'Effective Review Cadence', vi: 'Chu kỳ đánh giá hiệu lực' },
  { field: 'cadence_source', en: 'Cadence Source', vi: 'Nguồn chu kỳ' },
  { field: 'cadence_source_employee_override', en: 'Employee override', vi: 'Thiết lập riêng cho nhân viên' },
  { field: 'cadence_source_job_level_default', en: 'Job level default', vi: 'Mặc định theo cấp bậc' },
  { field: 'cadence_source_system_default', en: 'System default', vi: 'Mặc định hệ thống' },
  { field: 'last_evaluation_completed', en: 'Last Evaluation Completed', vi: 'Lần đánh giá hoàn thành gần nhất' },
  { field: 'next_review_due_date', en: 'Next Review Due Date', vi: 'Hạn đánh giá tiếp theo' },
  { field: 'review_due_now_hint', en: 'No completed evaluation yet — review is due now.', vi: 'Chưa có đánh giá hoàn thành — cần đánh giá ngay.' },
  { field: 'review_cadence_override', en: 'Review Cadence Override', vi: 'Chu kỳ đánh giá riêng' },
  { field: 'no_cadence_override', en: 'No override (use job level / system default)', vi: 'Không thiết lập riêng (dùng mặc định cấp bậc / hệ thống)' },
  { field: 'interval_months_label', en: '{months} months', vi: '{months} tháng' },
  { field: 'error_version_conflict_hint', en: 'This employee was changed by someone else. Reload the latest data and try again.', vi: 'Nhân viên này vừa được người khác cập nhật. Hãy tải lại dữ liệu mới nhất và thử lại.' },
  { field: 'error_code_label', en: 'Error code', vi: 'Mã lỗi' },
  { field: 'btn_reload_latest', en: 'Reload latest data', vi: 'Tải lại dữ liệu mới nhất' },
  { field: 'emp_col_cadence', en: 'Cadence', vi: 'Chu kỳ' },
  { field: 'emp_col_last_review', en: 'Last Review', vi: 'Đánh giá gần nhất' },
  { field: 'emp_col_next_review', en: 'Next Review', vi: 'Hạn tiếp theo' },
];

const REVIEW_DUE_TRANSLATIONS: UiTranslation[] = [
  { field: 'status_upcoming_plain', en: 'Upcoming', vi: 'Sắp đến hạn' },
  { field: 'status_no_schedule', en: 'No Schedule', vi: 'Chưa có lịch' },
  { field: 'counts_current_page_hint', en: 'On the current page', vi: 'Trên trang hiện tại' },
  { field: 'card_total_hint_filtered', en: 'Employees matching the current filters', vi: 'Nhân viên khớp bộ lọc hiện tại' },
  { field: 'pagination_label', en: 'Review due pagination', vi: 'Phân trang lịch đánh giá' },
  { field: 'btn_prev_page', en: 'Previous', vi: 'Trước' },
  { field: 'btn_next_page', en: 'Next', vi: 'Sau' },
  { field: 'page_of_total', en: 'Page {page} of {totalPages}', vi: 'Trang {page} / {totalPages}' },
];

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function fieldVariants(field: string): string[] {
  return Array.from(new Set([field, toCamelCase(field)]));
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function seed(pgm: MigrationBuilder, entityType: string, entityId: string, translations: UiTranslation[]): void {
  for (const item of translations) {
    for (const field of fieldVariants(item.field)) {
      for (const [locale, value] of [['en', item.en], ['vi', item.vi]] as const) {
        pgm.sql(`
          INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
          VALUES ('${entityType}', '${entityId}', '${field}', '${locale}', '${escapeSql(value)}')
          ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
          DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
        `);
      }
    }
  }
}

function unseed(pgm: MigrationBuilder, entityType: string, entityId: string, translations: UiTranslation[]): void {
  const fields = translations.flatMap((item) => fieldVariants(item.field)).map((field) => `'${field}'`);
  pgm.sql(`
    DELETE FROM "i18n_translation"
    WHERE "entity_type" = '${entityType}' AND "entity_id" = '${entityId}' AND "field_name" IN (${fields.join(', ')});
  `);
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  seed(pgm, 'ORGANIZATION_UI', ORGANIZATION_UI_ID, ORGANIZATION_TRANSLATIONS);
  seed(pgm, 'REVIEW_DUE_UI', REVIEW_DUE_UI_ID, REVIEW_DUE_TRANSLATIONS);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  unseed(pgm, 'REVIEW_DUE_UI', REVIEW_DUE_UI_ID, REVIEW_DUE_TRANSLATIONS);
  unseed(pgm, 'ORGANIZATION_UI', ORGANIZATION_UI_ID, ORGANIZATION_TRANSLATIONS);
}
