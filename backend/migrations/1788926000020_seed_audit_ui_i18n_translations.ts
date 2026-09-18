import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  const auditUiId = 'a0000000-0000-0000-0000-000000000001';

  const translations = [
    // Page Header
    { field: 'page_title', en: 'System Audit Logs', vi: 'Nhật ký kiểm toán hệ thống' },
    { field: 'page_subtitle', en: 'Immutable history of business operations, configurations, and score calculations (Read-Only)', vi: 'Lịch sử ghi vết toàn bộ thao tác nghiệp vụ, cấu hình và tính toán điểm (Chỉ đọc)' },
    { field: 'role_system_admin', en: 'System Admin (Full Audit Access)', vi: 'Quản trị hệ thống (Toàn quyền kiểm toán)' },
    { field: 'role_hr_admin', en: 'HR Admin (Scoped to Business Entities)', vi: 'Quản trị nhân sự (Phạm vi nghiệp vụ)' },

    // Unauthorized state
    { field: 'unauthorized_title', en: 'Access Denied (403 Forbidden)', vi: 'Không có quyền truy cập (403 Forbidden)' },
    { field: 'unauthorized_desc', en: 'You do not have permission to view system audit logs. Only System Admin and HR Admin are authorized to access this resource.', vi: 'Bạn không có quyền xem nhật ký kiểm toán hệ thống. Chỉ System Admin và HR Admin mới được phép truy cập tài nguyên này.' },

    // Empty state & Errors
    { field: 'load_error', en: 'Unable to load audit logs', vi: 'Không thể tải nhật ký kiểm toán' },
    { field: 'empty_title', en: 'No audit logs found', vi: 'Không tìm thấy bản ghi kiểm toán nào' },
    { field: 'empty_desc', en: 'No matching records found with current filter conditions.', vi: 'Chưa có bản ghi nào phù hợp với điều kiện tìm kiếm hiện tại.' },

    // Filter Bar
    { field: 'filter_title', en: 'Audit Filters', vi: 'Bộ lọc kiểm toán' },
    { field: 'filter_subtitle', en: 'Filter records by action, entity type, or target ID', vi: 'Lọc theo hành động, loại thực thể hoặc mã định danh' },
    { field: 'action_label', en: 'Action', vi: 'Hành động' },
    { field: 'all_actions', en: 'All Actions', vi: 'Tất cả hành động' },
    { field: 'entity_type_label', en: 'Entity Type', vi: 'Loại thực thể' },
    { field: 'all_entity_types', en: 'All Entity Types', vi: 'Tất cả loại thực thể' },
    { field: 'entity_id_label', en: 'Entity ID', vi: 'ID thực thể' },
    { field: 'entity_id_placeholder', en: 'Filter by Entity UUID...', vi: 'Tìm theo UUID thực thể...' },
    { field: 'reset_filters', en: 'Reset', vi: 'Đặt lại' },

    // Table Columns & Controls
    { field: 'col_time', en: 'Timestamp', vi: 'Thời gian' },
    { field: 'col_actor', en: 'Actor', vi: 'Người thực hiện' },
    { field: 'col_action', en: 'Action', vi: 'Hành động' },
    { field: 'col_entity_type', en: 'Entity Type', vi: 'Loại thực thể' },
    { field: 'col_entity_id', en: 'Entity ID', vi: 'ID thực thể' },
    { field: 'col_reason', en: 'Reason / Note', vi: 'Lý do / Ghi chú' },
    { field: 'col_actions', en: 'Actions', vi: 'Thao tác' },
    { field: 'btn_detail', en: 'Details', vi: 'Chi tiết' },
    { field: 'no_reason', en: 'No note provided', vi: 'Không có ghi chú' },
    { field: 'system_actor', en: 'System Service', vi: 'Hệ thống tự động' },

    // Pagination
    { field: 'page_label', en: 'Page', vi: 'Trang' },
    { field: 'of_label', en: 'of', vi: 'trên' },
    { field: 'records_label', en: 'records', vi: 'bản ghi' },
    { field: 'prev_btn', en: 'Previous', vi: 'Trang trước' },
    { field: 'next_btn', en: 'Next', vi: 'Trang sau' },

    // Detail Modal
    { field: 'modal_title', en: 'Audit Log Details', vi: 'Chi tiết bản ghi kiểm toán' },
    { field: 'modal_badge', en: 'Read-Only / Append-Only', vi: 'Bất biến / Chỉ đọc' },
    { field: 'section_meta', en: 'Execution Metadata', vi: 'Thông tin thực thi' },
    { field: 'field_audit_id', en: 'Audit Log ID', vi: 'Mã bản ghi kiểm toán' },
    { field: 'field_time', en: 'Timestamp', vi: 'Thời điểm thực hiện' },
    { field: 'field_actor', en: 'Actor Name / ID', vi: 'Người thực hiện' },
    { field: 'field_source', en: 'Source', vi: 'Nguồn gọi' },
    { field: 'section_entity', en: 'Target Entity & Operation', vi: 'Thực thể tác động' },
    { field: 'section_diff', en: 'State Change Comparison (Before vs After)', vi: 'So sánh thay đổi trạng thái (Trước & Sau)' },
    { field: 'state_before', en: 'Before (Previous State)', vi: 'Giá trị trước (Old Value)' },
    { field: 'state_after', en: 'After (New State)', vi: 'Giá trị mới (New Value)' },
    { field: 'reason_title', en: 'Reason for Change', vi: 'Lý do thay đổi' },
    { field: 'btn_close', en: 'Close', vi: 'Đóng' },
    { field: 'no_data', en: 'None', vi: 'Không có' },
  ];

  function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  for (const item of translations) {
    const camelField = toCamelCase(item.field);
    const fieldVariants = Array.from(new Set([item.field, camelField]));

    for (const f of fieldVariants) {
      // English baseline (Rule 12 - default)
      pgm.sql(`
        INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
        VALUES ('AUDIT_UI', '${auditUiId}', '${f}', 'en', '${item.en.replace(/'/g, "''")}')
        ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
        DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
      `);

      // Vietnamese translation
      pgm.sql(`
        INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
        VALUES ('AUDIT_UI', '${auditUiId}', '${f}', 'vi', '${item.vi.replace(/'/g, "''")}')
        ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
        DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
      `);
    }
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const auditUiId = 'a0000000-0000-0000-0000-000000000001';
  pgm.sql(`
    DELETE FROM "i18n_translation"
    WHERE "entity_type" = 'AUDIT_UI' AND "entity_id" = '${auditUiId}';
  `);
}
