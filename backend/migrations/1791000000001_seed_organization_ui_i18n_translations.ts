import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  const orgUiId = '00000000-0000-0000-0000-000000000001';

  const translations = [
    // Page Header & Tabs
    { field: 'page_title', en: 'Organization Management', vi: 'Quản lý Cơ cấu Tổ chức' },
    { field: 'page_subtitle', en: 'Manage your organization structure and job architecture.', vi: 'Quản lý cơ cấu phòng ban và cấu trúc vị trí công việc.' },
    { field: 'tab_org_structure', en: 'Org Structure', vi: 'Cơ cấu Tổ chức' },
    { field: 'tab_job_architecture', en: 'Job Architecture', vi: 'Cấu trúc Vị trí' },

    // Job Roles
    { field: 'job_roles', en: 'Job Roles', vi: 'Chức danh / Vai trò' },
    { field: 'job_roles_desc', en: 'Manage roles and functional areas across the organization.', vi: 'Quản lý chức danh và lĩnh vực chuyên môn trong tổ chức.' },
    { field: 'btn_create_role', en: '+ Create Role', vi: '+ Tạo Chức danh' },
    { field: 'create_role_title', en: 'Create Job Role', vi: 'Tạo Chức danh mới' },
    { field: 'edit_role_title', en: 'Edit Job Role', vi: 'Chỉnh sửa Chức danh' },
    { field: 'role_code', en: 'Role Code', vi: 'Mã chức danh' },
    { field: 'role_name', en: 'Role Name', vi: 'Tên chức danh' },
    { field: 'role_desc', en: 'Description', vi: 'Mô tả' },
    { field: 'empty_roles', en: 'No job roles found.', vi: 'Không tìm thấy chức danh nào.' },

    // Job Levels
    { field: 'job_levels', en: 'Job Levels', vi: 'Cấp bậc Công việc' },
    { field: 'job_levels_desc', en: 'Manage seniority levels and ranking scales.', vi: 'Quản lý thang bậc thâm niên và xếp hạng.' },
    { field: 'btn_create_level', en: '+ Create Level', vi: '+ Tạo Cấp bậc' },
    { field: 'create_level_title', en: 'Create Job Level', vi: 'Tạo Cấp bậc mới' },
    { field: 'edit_level_title', en: 'Edit Job Level', vi: 'Chỉnh sửa Cấp bậc' },
    { field: 'level_code', en: 'Job Level Code', vi: 'Mã cấp bậc' },
    { field: 'level_name', en: 'Job Level Name', vi: 'Tên cấp bậc' },
    { field: 'level_rank', en: 'Rank (lower is more senior)', vi: 'Thứ bậc (số nhỏ hơn là cấp cao hơn)' },
    { field: 'default_review_cadence', en: 'Default Review Cadence', vi: 'Chu kỳ đánh giá mặc định' },
    { field: 'cadence_inherit_default', en: '— None (inherit system default) —', vi: '— Không chọn (kế thừa mặc định hệ thống) —' },
    { field: 'cadence_hint', en: 'Employees at this job level will use this review cadence unless overridden individually.', vi: 'Nhân viên ở cấp bậc này sẽ áp dụng chu kỳ này trừ khi có chỉ định riêng.' },
    { field: 'empty_levels', en: 'No job levels found.', vi: 'Không tìm thấy cấp bậc nào.' },

    // Review Cadences
    { field: 'review_cadences', en: 'Review Cadences', vi: 'Chu kỳ Đánh giá' },
    { field: 'review_cadences_desc', en: 'Configure evaluation intervals and cycles for job levels and individual overrides.', vi: 'Thiết lập chu kỳ và khoảng thời gian đánh giá cho từng cấp bậc hoặc nhân viên.' },
    { field: 'btn_create_cadence', en: '+ Create Cadence', vi: '+ Tạo Chu kỳ' },
    { field: 'create_cadence_title', en: 'Create Review Cadence', vi: 'Tạo Chu kỳ Đánh giá mới' },
    { field: 'edit_cadence_title', en: 'Edit Review Cadence', vi: 'Chỉnh sửa Chu kỳ Đánh giá' },
    { field: 'cadence_code', en: 'Cadence Code', vi: 'Mã chu kỳ' },
    { field: 'cadence_name', en: 'Cadence Name', vi: 'Tên chu kỳ' },
    { field: 'cadence_interval', en: 'Interval in Months', vi: 'Khoảng thời gian (tháng)' },
    { field: 'system_default', en: 'System Default Cadence', vi: 'Chu kỳ mặc định hệ thống' },
    { field: 'system_default_hint', en: 'Applied as the organization-wide fallback when no job level default or employee override is specified.', vi: 'Áp dụng làm chu kỳ mặc định khi cấp bậc hoặc nhân viên chưa cấu hình riêng.' },
    { field: 'months', en: 'months', vi: 'tháng' },
    { field: 'month', en: 'month', vi: 'tháng' },
    { field: 'empty_cadences', en: 'No review cadences found.', vi: 'Không tìm thấy chu kỳ đánh giá nào.' },

    // Table Columns & Controls
    { field: 'col_code', en: 'Code', vi: 'Mã' },
    { field: 'col_name', en: 'Name', vi: 'Tên' },
    { field: 'col_rank', en: 'Rank', vi: 'Thứ bậc' },
    { field: 'col_interval', en: 'Interval', vi: 'Khoảng thời gian' },
    { field: 'col_system_default', en: 'System Default', vi: 'Mặc định hệ thống' },
    { field: 'col_status', en: 'Status', vi: 'Trạng thái' },
    { field: 'col_actions', en: 'Actions', vi: 'Thao tác' },
    { field: 'status_active', en: 'Active', vi: 'Đang hoạt động' },
    { field: 'status_inactive', en: 'Inactive', vi: 'Ngừng hoạt động' },
    { field: 'btn_edit', en: 'Edit', vi: 'Sửa' },
    { field: 'btn_delete', en: 'Delete', vi: 'Xóa' },
    { field: 'btn_cancel', en: 'Cancel', vi: 'Hủy' },
    { field: 'btn_save', en: 'Save Changes', vi: 'Lưu thay đổi' },
    { field: 'btn_saving', en: 'Saving…', vi: 'Đang lưu…' },
    { field: 'delete_confirm_title', en: 'Delete Review Cadence', vi: 'Xóa Chu kỳ Đánh giá' },
    { field: 'delete_confirm_desc', en: 'Are you sure you want to delete this cadence?', vi: 'Bạn có chắc chắn muốn xóa chu kỳ này?' },
    { field: 'system_default_badge', en: 'Default', vi: 'Mặc định' },

    // Org Structure Tree
    { field: 'org_tree', en: 'Organization Tree', vi: 'Cây Sơ đồ Tổ chức' },
    { field: 'all_departments', en: 'All Departments', vi: 'Tất cả Phòng ban' },
    { field: 'employees', en: 'Employees', vi: 'Nhân viên' },
  ];

  function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  for (const item of translations) {
    const camelField = toCamelCase(item.field);
    const fieldVariants = Array.from(new Set([item.field, camelField]));

    for (const f of fieldVariants) {
      pgm.sql(`
        INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
        VALUES ('ORGANIZATION_UI', '${orgUiId}', '${f}', 'en', '${item.en.replace(/'/g, "''")}')
        ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
        DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
      `);

      pgm.sql(`
        INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
        VALUES ('ORGANIZATION_UI', '${orgUiId}', '${f}', 'vi', '${item.vi.replace(/'/g, "''")}')
        ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
        DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
      `);
    }
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const orgUiId = '00000000-0000-0000-0000-000000000001';
  pgm.sql(`
    DELETE FROM "i18n_translation"
    WHERE "entity_type" = 'ORGANIZATION_UI' AND "entity_id" = '${orgUiId}';
  `);
}
