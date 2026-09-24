import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * UI strings of the Individual Evaluation page (entity_type INDIVIDUAL_CYCLE_UI), following the
 * AUDIT_UI seed pattern. Keys are prefixed with `ic_` because all *_UI translations are merged into
 * one client-side dictionary per locale.
 */
const INDIVIDUAL_CYCLE_UI_ID = 'c1000000-0000-0000-0000-000000000001';

const translations: { field: string; en: string; vi: string }[] = [
  // Page
  { field: 'ic_page_title', en: 'Create Individual Evaluation', vi: 'Tạo đánh giá cá nhân' },
  { field: 'ic_page_subtitle', en: 'Creates a separate evaluation cycle for each selected employee, opened immediately with the chosen published template.', vi: 'Tạo một kỳ đánh giá riêng cho từng nhân viên được chọn, mở ngay với mẫu đánh giá đã phát hành.' },
  { field: 'ic_back_cycles', en: 'Back to Evaluation Cycles', vi: 'Quay lại Kỳ đánh giá' },
  { field: 'ic_back_team', en: 'Back to Team Reviews', vi: 'Quay lại Đánh giá nhóm' },
  { field: 'ic_loading', en: 'Loading employees and templates...', vi: 'Đang tải nhân viên và mẫu đánh giá...' },

  // Sections & fields
  { field: 'ic_section_employees', en: 'Select employees', vi: 'Chọn nhân viên' },
  { field: 'ic_section_employees_hint', en: 'Each selected employee gets their own cycle. Employees who already have an active evaluation will be skipped.', vi: 'Mỗi nhân viên được chọn sẽ có kỳ đánh giá riêng. Nhân viên đang có đánh giá chưa hoàn tất sẽ được bỏ qua.' },
  { field: 'ic_section_settings', en: 'Cycle settings', vi: 'Thiết lập kỳ đánh giá' },
  { field: 'ic_section_settings_hint', en: 'Applied to every cycle created in this request.', vi: 'Áp dụng cho tất cả các kỳ được tạo trong lần này.' },
  { field: 'ic_template_label', en: 'Published Template Version *', vi: 'Phiên bản mẫu đánh giá đã phát hành *' },
  { field: 'ic_template_placeholder', en: '-- Select Published Template Version --', vi: '-- Chọn phiên bản mẫu đánh giá --' },
  { field: 'ic_name_label', en: 'Cycle Name', vi: 'Tên kỳ đánh giá' },
  { field: 'ic_name_default', en: 'Individual Review', vi: 'Individual Review' },
  { field: 'ic_name_hint', en: 'Saved as “{name} - employee code”', vi: 'Lưu thành “{name} - mã nhân viên”' },
  { field: 'ic_start_label', en: 'Start Date *', vi: 'Ngày bắt đầu *' },
  { field: 'ic_end_label', en: 'End Date *', vi: 'Ngày kết thúc *' },

  // Buttons & dialog
  { field: 'ic_btn_cancel', en: 'Cancel', vi: 'Hủy' },
  { field: 'ic_btn_review', en: 'Review and create', vi: 'Xem lại và tạo' },
  { field: 'ic_btn_creating', en: 'Creating…', vi: 'Đang tạo…' },
  { field: 'ic_btn_create', en: 'Create', vi: 'Tạo' },
  { field: 'ic_btn_done', en: 'Done', vi: 'Xong' },
  { field: 'ic_btn_create_another', en: 'Create another', vi: 'Tạo tiếp' },
  { field: 'ic_confirm_title', en: 'Create individual evaluations?', vi: 'Tạo đánh giá cá nhân?' },
  { field: 'ic_confirm_desc', en: '{count} employee(s) will each get a new evaluation cycle from {start} to {end}, opened immediately. Employees who already have an active evaluation will be skipped.', vi: '{count} nhân viên sẽ được tạo kỳ đánh giá riêng từ {start} đến {end} và mở ngay. Nhân viên đang có đánh giá chưa hoàn tất sẽ được bỏ qua.' },

  // Validation & errors
  { field: 'ic_err_employees', en: 'Select at least one employee.', vi: 'Vui lòng chọn ít nhất một nhân viên.' },
  { field: 'ic_err_template', en: 'Evaluation template is required.', vi: 'Vui lòng chọn mẫu đánh giá.' },
  { field: 'ic_err_start', en: 'Start date is required.', vi: 'Vui lòng nhập ngày bắt đầu.' },
  { field: 'ic_err_end', en: 'End date is required.', vi: 'Vui lòng nhập ngày kết thúc.' },
  { field: 'ic_err_date_order', en: 'End date must be on or after the start date.', vi: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.' },
  { field: 'ic_err_all_blocked_title', en: 'No evaluation was created', vi: 'Không có đánh giá nào được tạo' },
  { field: 'ic_err_all_blocked_msg', en: 'Every selected employee already has an active evaluation ({code}). Finish or close it before creating a new one.', vi: 'Tất cả nhân viên được chọn đều đang có đánh giá chưa hoàn tất ({code}). Hãy hoàn tất hoặc đóng đánh giá đó trước khi tạo mới.' },
  { field: 'ic_err_forbidden_title', en: 'Not allowed', vi: 'Không có quyền' },
  { field: 'ic_err_forbidden_msg', en: 'You can only create individual evaluations for employees within your permission scope.', vi: 'Bạn chỉ có thể tạo đánh giá cá nhân cho nhân viên thuộc phạm vi quyền của mình.' },
  { field: 'ic_err_generic_title', en: 'Could not create individual evaluations', vi: 'Không thể tạo đánh giá cá nhân' },
  { field: 'ic_err_unexpected', en: 'Unexpected error.', vi: 'Lỗi không xác định.' },
  { field: 'ic_request_id', en: 'Request ID', vi: 'Mã yêu cầu' },

  // Employee table
  { field: 'ic_search_placeholder', en: 'Search by name, code or email', vi: 'Tìm theo tên, mã hoặc email' },
  { field: 'ic_selected', en: 'selected', vi: 'đã chọn' },
  { field: 'ic_clear_selection', en: 'Clear selection', vi: 'Bỏ chọn tất cả' },
  { field: 'ic_select_page', en: 'Select all employees on this page', vi: 'Chọn tất cả nhân viên trên trang này' },
  { field: 'ic_col_employee', en: 'Employee', vi: 'Nhân viên' },
  { field: 'ic_col_team', en: 'Team', vi: 'Nhóm' },
  { field: 'ic_col_next_review', en: 'Next review', vi: 'Hạn đánh giá tiếp' },
  { field: 'ic_col_review_status', en: 'Review status', vi: 'Trạng thái đánh giá' },
  { field: 'ic_no_match', en: 'No matching employees.', vi: 'Không có nhân viên phù hợp.' },
  { field: 'ic_page_label', en: 'Page', vi: 'Trang' },
  { field: 'ic_of_label', en: 'of', vi: 'trên' },
  { field: 'ic_employees_label', en: 'employees', vi: 'nhân viên' },
  { field: 'ic_prev_btn', en: 'Previous', vi: 'Trang trước' },
  { field: 'ic_next_btn', en: 'Next', vi: 'Trang sau' },
  { field: 'ic_review_overdue', en: 'Overdue', vi: 'Quá hạn' },
  { field: 'ic_review_overdue_days', en: '{days}d overdue', vi: 'Quá hạn {days} ngày' },
  { field: 'ic_review_due_today', en: 'Due today', vi: 'Đến hạn hôm nay' },
  { field: 'ic_review_due_in', en: 'Due in {days}d', vi: 'Còn {days} ngày' },
  { field: 'ic_review_not_due', en: 'Not due', vi: 'Chưa đến hạn' },
  { field: 'ic_review_days_left', en: '{days}d left', vi: 'Còn {days} ngày' },
  { field: 'ic_review_no_schedule', en: 'No schedule', vi: 'Chưa có lịch' },

  // Result
  { field: 'ic_result_title', en: 'Result', vi: 'Kết quả' },
  { field: 'ic_result_created', en: 'Created {count} individual evaluation(s).', vi: 'Đã tạo {count} đánh giá cá nhân.' },
  { field: 'ic_result_criteria', en: 'criteria', vi: 'tiêu chí' },
  { field: 'ic_result_blocked', en: 'Not created — these employees already have an active evaluation:', vi: 'Không tạo — các nhân viên sau đang có đánh giá chưa hoàn tất:' },
  { field: 'ic_result_warning', en: 'Warning — created successfully, but these employees are also in an upcoming batch cycle:', vi: 'Cảnh báo — đã tạo thành công, nhưng các nhân viên sau cũng thuộc kỳ đánh giá hàng loạt sắp mở:' },
  { field: 'ic_result_warning_item', en: 'batch cycle {code} ({name}) opens on {date}', vi: 'kỳ hàng loạt {code} ({name}) mở vào {date}' },
];

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const item of translations) {
    const fieldVariants = Array.from(new Set([item.field, toCamelCase(item.field)]));
    for (const field of fieldVariants) {
      for (const [locale, value] of [['en', item.en], ['vi', item.vi]] as const) {
        pgm.sql(`
          INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
          VALUES ('INDIVIDUAL_CYCLE_UI', '${INDIVIDUAL_CYCLE_UI_ID}', '${field}', '${locale}', '${escapeSql(value)}')
          ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
          DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
        `);
      }
    }
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DELETE FROM "i18n_translation"
    WHERE "entity_type" = 'INDIVIDUAL_CYCLE_UI' AND "entity_id" = '${INDIVIDUAL_CYCLE_UI_ID}';
  `);
}
