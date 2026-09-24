import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  const reviewDueUiId = '00000000-0000-0000-0000-000000000002';

  const translations = [
    // Page Header
    { field: 'page_title', en: 'Review Due Dashboard', vi: 'Bảng theo dõi Lịch Đánh giá' },
    {
      field: 'page_subtitle',
      en: 'Monitor employee evaluation deadlines according to Review Cadence. Anti-ranking guaranteed: no score sorting or ranking.',
      vi: 'Theo dõi nhân viên đến hạn hoặc quá hạn đánh giá theo chu kỳ Review Cadence. Không xếp thứ hạng hoặc so sánh điểm số nhân viên.',
    },

    // Action Buttons & Floating Bar
    { field: 'btn_create_evaluation', en: 'Create Evaluation', vi: 'Tạo Evaluation' },
    { field: 'btn_create_bulk_evaluations', en: 'Create Evaluations for {count} Employees', vi: 'Tạo Evaluation cho {count} Nhân viên' },
    { field: 'selected_count', en: 'Selected {count} employee(s)', vi: 'Đã chọn {count} nhân viên' },
    { field: 'btn_deselect_all', en: 'Deselect All', vi: 'Bỏ chọn tất cả' },
    { field: 'btn_clear_filters', en: 'Clear Filters', vi: 'Xóa bộ lọc' },
    { field: 'select_all', en: 'Select All Employees', vi: 'Chọn tất cả nhân viên' },

    // Summary Metric Cards
    { field: 'card_overdue_title', en: 'Overdue Reviews', vi: 'Quá hạn Đánh giá' },
    { field: 'card_overdue_hint', en: 'Requires immediate cycle opening', vi: 'Cần mở đợt review ngay' },
    { field: 'card_due_title', en: 'Due Today', vi: 'Đến hạn Hôm nay' },
    { field: 'card_due_hint', en: 'Exact scheduled milestone date', vi: 'Đúng ngày mốc định kỳ' },
    { field: 'card_upcoming_title', en: 'Upcoming Reviews (<= 30 days)', vi: 'Sắp đến hạn (<= 30 ngày)' },
    { field: 'card_upcoming_hint', en: 'Within lead time forecast', vi: 'Trong thời gian dự báo (lead time)' },
    { field: 'card_total_title', en: 'Total to Monitor', vi: 'Tổng cần Theo dõi' },
    { field: 'card_total_hint', en: 'Overdue + Due + Upcoming', vi: 'Tổng quá hạn + đến hạn + sắp đến' },

    // Status Tabs
    { field: 'tab_all', en: 'All Needing Review', vi: 'Tất cả Cần Review' },
    { field: 'tab_overdue', en: 'Overdue', vi: 'Quá hạn' },
    { field: 'tab_due', en: 'Due Today', vi: 'Đến hạn' },
    { field: 'tab_upcoming', en: 'Upcoming', vi: 'Sắp đến hạn' },

    // Filter Controls
    { field: 'search_placeholder', en: 'Search by employee name or code...', vi: 'Tìm theo tên hoặc mã nhân viên...' },
    { field: 'all_teams', en: '-- All Teams / Departments --', vi: '-- Tất cả Team / Đội nhóm --' },
    { field: 'all_cadences', en: '-- All Review Cadences --', vi: '-- Tất cả Chu kỳ (Cadence) --' },

    // Table Columns
    { field: 'col_employee', en: 'Employee', vi: 'Nhân Viên' },
    { field: 'col_team_level', en: 'Team & Job Level', vi: 'Đội Nhóm & Cấp Bậc' },
    { field: 'col_cadence', en: 'Effective Cadence', vi: 'Chu Kỳ Hiệu Lực' },
    { field: 'col_last_completed', en: 'Last Completed', vi: 'Hoàn Thành Gần Nhất' },
    { field: 'col_next_due', en: 'Next Due Date', vi: 'Hạn Đánh Giá Kế Tiếp' },
    { field: 'col_status', en: 'Due Status', vi: 'Trạng Thái Hạn' },
    { field: 'col_actions', en: 'Actions', vi: 'Hành Động' },

    // Status & Cadence Badges
    { field: 'status_overdue', en: 'Overdue ({days} days)', vi: 'Quá hạn ({days} ngày)' },
    { field: 'status_due', en: 'Due Today', vi: 'Đến hạn hôm nay' },
    { field: 'status_upcoming', en: 'Upcoming ({days} days)', vi: 'Sắp đến ({days} ngày)' },
    { field: 'status_not_due', en: 'Not Due', vi: 'Chưa đến hạn' },
    { field: 'source_override', en: 'Employee Override', vi: 'Gán Riêng (Override)' },
    { field: 'source_job_level', en: 'By Job Level', vi: 'Theo Cấp Bậc (Job Level)' },
    { field: 'source_system', en: 'System Default', vi: 'Mặc định Hệ thống' },
    { field: 'no_prior_cycle', en: 'No prior cycle', vi: 'Chưa có đợt trước' },
    { field: 'months', en: 'months', vi: 'tháng' },

    // Loading & Empty States
    { field: 'loading_reviews', en: 'Loading review due list...', vi: 'Đang tải danh sách review due...' },
    { field: 'empty_reviews', en: 'No employees match the current review due filters.', vi: 'Không có nhân viên nào trong danh sách review due với bộ lọc hiện tại.' },

    // Individual Evaluation Modal
    { field: 'modal_title', en: 'Initiate Individual Review Cycle', vi: 'Khởi tạo Đánh giá Cá nhân (Review Due)' },
    {
      field: 'modal_subtitle',
      en: 'Create an individual evaluation cycle and open review for due employees.',
      vi: 'Tạo chu kỳ đánh giá cá nhân và mở đợt đánh giá cho nhân viên đến hạn review.',
    },
    { field: 'modal_selected_employees', en: 'Target Employees ({count})', vi: 'Nhân viên được chọn ({count})' },
    { field: 'modal_template_label', en: 'Evaluation Template', vi: 'Mẫu Đánh Giá (Evaluation Template)' },
    { field: 'modal_template_default', en: 'Default (Latest Published Template)', vi: 'Mặc định (Mẫu Published mới nhất)' },
    { field: 'modal_start_date', en: 'Evaluation Start Date', vi: 'Ngày bắt đầu đánh giá' },
    { field: 'modal_end_date', en: 'Evaluation Due Date', vi: 'Hạn hoàn thành đánh giá' },
    { field: 'modal_btn_cancel', en: 'Cancel', vi: 'Hủy' },
    { field: 'modal_btn_submit', en: 'Create Evaluations ({count})', vi: 'Khởi tạo Đánh giá ({count})' },
    { field: 'modal_creating', en: 'Creating evaluations...', vi: 'Đang khởi tạo...' },
    { field: 'modal_success_title', en: 'Initiation Completed', vi: 'Khởi tạo hoàn tất' },
    { field: 'modal_created_count', en: 'Successfully created: {count} employee cycle(s)', vi: 'Khởi tạo thành công: {count} nhân viên' },
    { field: 'modal_skipped_count', en: 'Skipped / Warnings: {count} employee(s)', vi: 'Bỏ qua / Cảnh báo: {count} nhân viên' },
    { field: 'modal_btn_close', en: 'Close', vi: 'Đóng' },
    { field: 'warning_batch_cycle', en: 'Warning: An organizational batch cycle is scheduled nearby.', vi: 'Cảnh báo: Có đợt đánh giá chung toàn công ty sắp diễn ra.' },
    { field: 'error_already_open', en: 'Employee already has an active ongoing evaluation cycle.', vi: 'Nhân viên đang có đợt đánh giá chưa hoàn thành.' },
  ];

  function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  for (const item of translations) {
    const camelField = toCamelCase(item.field);
    const fieldVariants = Array.from(new Set([item.field, camelField]));

    for (const f of fieldVariants) {
      // English baseline
      pgm.sql(`
        INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
        VALUES ('REVIEW_DUE_UI', '${reviewDueUiId}', '${f}', 'en', '${item.en.replace(/'/g, "''")}')
        ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
        DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
      `);

      // Vietnamese translation
      pgm.sql(`
        INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
        VALUES ('REVIEW_DUE_UI', '${reviewDueUiId}', '${f}', 'vi', '${item.vi.replace(/'/g, "''")}')
        ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
        DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
      `);
    }
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const reviewDueUiId = '00000000-0000-0000-0000-000000000002';
  pgm.sql(`
    DELETE FROM "i18n_translation"
    WHERE "entity_type" = 'REVIEW_DUE_UI' AND "entity_id" = '${reviewDueUiId}';
  `);
}
