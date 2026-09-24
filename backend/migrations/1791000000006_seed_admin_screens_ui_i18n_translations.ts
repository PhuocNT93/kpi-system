import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Ensure field_name can accommodate up to 100 characters for dot-namespaced UI keys
  pgm.sql(`
    ALTER TABLE "i18n_translation"
    ALTER COLUMN "field_name" TYPE varchar(100);
  `);

  interface ScreenTranslationGroup {
    entityType: string;
    entityId: string;
    items: Array<{ field: string; en: string; vi: string }>;
  }

  const groups: ScreenTranslationGroup[] = [
    // 1. /admin/kpis (KPI_ADMIN_UI)
    {
      entityType: 'KPI_ADMIN_UI',
      entityId: '00000000-0000-0000-0000-000000000010',
      items: [
        { field: 'kpi.title', en: 'Key Performance Indicators (KPIs)', vi: 'Chỉ số hiệu suất cốt lõi (KPI)' },
        { field: 'kpi.subtitle', en: 'Manage organization-wide and team-level KPIs, measurement methods, and target values.', vi: 'Quản lý danh mục KPI toàn tổ chức và đội nhóm, phương pháp đo lường và chỉ tiêu.' },
        { field: 'kpis_tab', en: 'KPIs', vi: 'Danh sách KPI' },
        { field: 'relationships_tab', en: 'KPI Relationships', vi: 'Mối quan hệ KPI' },
        { field: 'create_kpi_btn', en: '+ Create KPI', vi: '+ Tạo KPI' },
        { field: 'kpi_col_code', en: 'Code', vi: 'Mã' },
        { field: 'kpi_col_name', en: 'Name', vi: 'Tên KPI' },
        { field: 'kpi_col_description', en: 'Description', vi: 'Mô tả' },
        { field: 'kpi_col_status', en: 'Status', vi: 'Trạng thái' },
        { field: 'kpi_col_actions', en: 'Actions', vi: 'Thao tác' },
        { field: 'kpi_col_weight', en: 'Weight (%)', vi: 'Trọng số (%)' },
        { field: 'no_kpis_found', en: 'No KPIs found. Create your first KPI.', vi: 'Không tìm thấy KPI nào. Hãy tạo KPI đầu tiên.' },
        { field: 'mapped_criteria_for', en: 'Mapped Criteria for', vi: 'Tiêu chí đã gắn cho' },
        { field: 'add_criterion', en: '+ Add Criterion', vi: '+ Thêm tiêu chí' },
        { field: 'no_criteria_mapped', en: 'No criteria mapped yet. Add criteria to define how this KPI is measured.', vi: 'Chưa có tiêu chí nào được gán. Hãy thêm tiêu chí để đo lường KPI này.' },
        { field: 'confirm_remove_criterion', en: 'Are you sure you want to remove this criterion from the KPI?', vi: 'Bạn có chắc chắn muốn xóa tiêu chí này khỏi KPI?' },
        { field: 'kpi_rel_title', en: 'KPI Alignment & Hierarchy', vi: 'Cấu trúc & Căn chỉnh KPI' },
        { field: 'kpi_rel_subtitle', en: 'View and configure relationships between parent organizational KPIs and child team KPIs.', vi: 'Xem và thiết lập liên kết giữa KPI tổ chức và KPI đội nhóm.' },
        { field: 'create_relationship', en: '+ New Relationship', vi: '+ Thêm mối quan hệ' },
        { field: 'col_parent_kpi', en: 'Parent KPI', vi: 'KPI cha' },
        { field: 'col_child_kpi', en: 'Child KPI', vi: 'KPI con' },
        { field: 'col_rel_type', en: 'Relationship Type', vi: 'Loại quan hệ' },
        { field: 'col_weight', en: 'Weight', vi: 'Trọng số' },
        { field: 'no_relationships_found', en: 'No KPI relationships configured yet.', vi: 'Chưa có mối quan hệ KPI nào được thiết lập.' },
      ],
    },

    // 2. /admin/criteria (CRITERIA_ADMIN_UI)
    {
      entityType: 'CRITERIA_ADMIN_UI',
      entityId: '00000000-0000-0000-0000-000000000011',
      items: [
        { field: 'criteria.title', en: 'Performance Evaluation Criteria', vi: 'Tiêu chí đánh giá hiệu suất' },
        { field: 'criteria.subtitle', en: 'Manage standard criteria library, measurement types, and scoring rubrics (LLD v1.5 §2.2)', vi: 'Quản lý thư viện tiêu chí chuẩn, phương pháp đo lường và thang điểm đánh giá (LLD v1.5 §2.2)' },
        { field: 'criteria.create_btn', en: '+ New Criterion', vi: '+ Tiêu chí mới' },
        { field: 'criteria.category_all', en: 'All Categories', vi: 'Tất cả danh mục' },
        { field: 'criteria.search_placeholder', en: 'Search criteria by code or name...', vi: 'Tìm kiếm tiêu chí theo mã hoặc tên...' },
        { field: 'criteria.col_code', en: 'Code', vi: 'Mã' },
        { field: 'criteria.col_name', en: 'Name', vi: 'Tên tiêu chí' },
        { field: 'criteria.col_category', en: 'Category', vi: 'Danh mục' },
        { field: 'criteria.col_type', en: 'Measurement Type', vi: 'Loại đo lường' },
        { field: 'criteria.col_target', en: 'Default Target', vi: 'Chỉ tiêu mặc định' },
        { field: 'criteria.col_status', en: 'Status', vi: 'Trạng thái' },
        { field: 'criteria.no_criteria', en: 'No criteria found matching your filters.', vi: 'Không tìm thấy tiêu chí nào phù hợp với bộ lọc.' },
        { field: 'criteria.confirm_deactivate', en: 'Are you sure you want to deactivate criterion', vi: 'Bạn có chắc chắn muốn tạm dừng tiêu chí' },
        { field: 'criteria.confirm_activate', en: 'Are you sure you want to activate criterion', vi: 'Bạn có chắc chắn muốn kích hoạt tiêu chí' },
      ],
    },

    // 3. /admin/calibration (CALIBRATION_ADMIN_UI)
    {
      entityType: 'CALIBRATION_ADMIN_UI',
      entityId: '00000000-0000-0000-0000-000000000012',
      items: [
        { field: 'calibration.title', en: 'Performance Calibration & Distribution', vi: 'Phiên cân bằng & Phân bổ điểm hiệu suất' },
        { field: 'calibration.subtitle', en: 'Post-evaluation calibration sessions to ensure fair and consistent scoring across departments (LLD v1.5 §4.4)', vi: 'Phiên hiệu chuẩn sau đánh giá nhằm đảm bảo tính công bằng và nhất quán giữa các bộ phận (LLD v1.5 §4.4)' },
        { field: 'calibration.unauthorized', en: 'You do not have permission to access the Calibration module. Only HR Admins and Managers are authorized.', vi: 'Bạn không có quyền truy cập mô-đun Calibration. Chỉ Quản trị viên HR và Quản lý mới có quyền.' },
        { field: 'calibration.select_cycle', en: 'Evaluation Cycle', vi: 'Kỳ đánh giá' },
        { field: 'calibration.select_session', en: 'Calibration Session', vi: 'Phiên hiệu chuẩn' },
        { field: 'calibration.new_session_btn', en: '+ New Calibration Session', vi: '+ Tạo phiên cân bằng mới' },
        { field: 'calibration.session_locked_banner', en: 'This calibration session is finalized and locked. Score adjustments are no longer permitted (Append-Only Audit Enforced).', vi: 'Phiên hiệu chuẩn này đã được hoàn tất và khóa. Không thể điều chỉnh điểm nữa (Đã ghi vết kiểm toán).' },
        { field: 'calibration.finalize_btn', en: 'Finalize Session', vi: 'Hoàn tất & Khóa phiên' },
        { field: 'calibration.reopen_btn', en: 'Reopen Session', vi: 'Mở lại phiên' },
        { field: 'calibration.search_placeholder', en: 'Search by employee name or code...', vi: 'Tìm kiếm theo tên hoặc mã nhân viên...' },
        { field: 'calibration.distribution_title', en: 'Score Distribution & Statistics', vi: 'Phân bổ điểm số & Thống kê' },
        { field: 'calibration.evaluations_title', en: 'Evaluations in Session', vi: 'Danh sách đánh giá trong phiên' },
        { field: 'calibration.col_employee', en: 'Employee', vi: 'Nhân viên' },
        { field: 'calibration.col_reviewer', en: 'Reviewer / Manager', vi: 'Người đánh giá' },
        { field: 'calibration.col_pre_score', en: 'Pre-Calibration Score', vi: 'Điểm trước hiệu chuẩn' },
        { field: 'calibration.col_post_score', en: 'Final Calibrated Score', vi: 'Điểm sau hiệu chuẩn' },
        { field: 'calibration.col_status', en: 'Status', vi: 'Trạng thái' },
        { field: 'calibration.col_actions', en: 'Actions', vi: 'Thao tác' },
        { field: 'calibration.adjust_score_btn', en: 'Adjust Score', vi: 'Chỉnh sửa điểm' },
        { field: 'calibration.no_evaluations', en: 'No evaluations found in this calibration session.', vi: 'Không có bản đánh giá nào trong phiên này.' },
        { field: 'calibration.stat_total', en: 'Total Evaluations', vi: 'Tổng số bản đánh giá' },
        { field: 'calibration.stat_average', en: 'Average Score', vi: 'Điểm trung bình' },
        { field: 'calibration.stat_median', en: 'Median Score', vi: 'Điểm trung vị' },
        { field: 'calibration.stat_std_dev', en: 'Std Deviation', vi: 'Độ lệch chuẩn' },
        { field: 'calibration.grade_distribution', en: 'Grade Distribution', vi: 'Phân bổ xếp loại' },
      ],
    },

    // 4. /admin/review-cadences (REVIEW_CADENCE_UI)
    {
      entityType: 'REVIEW_CADENCE_UI',
      entityId: '00000000-0000-0000-0000-000000000013',
      items: [
        { field: 'organization.cadences.title', en: 'Review Cadences', vi: 'Chu kỳ Đánh giá Định kỳ' },
        { field: 'organization.cadences.subtitle', en: 'Configure frequency of employee performance evaluation cycles.', vi: 'Cấu hình tần suất chu kỳ đánh giá hiệu suất cho nhân viên.' },
        { field: 'organization.cadences.col_code', en: 'Code', vi: 'Mã' },
        { field: 'organization.cadences.col_name', en: 'Name', vi: 'Tên chu kỳ' },
        { field: 'organization.cadences.col_interval', en: 'Interval (Months)', vi: 'Khoảng cách (Tháng)' },
        { field: 'organization.cadences.col_lead_time', en: 'Lead Time (Days)', vi: 'Thời gian chuẩn bị (Ngày)' },
        { field: 'organization.cadences.col_status', en: 'Status', vi: 'Trạng thái' },
      ],
    },

    // 5. /admin/notification-preferences (NOTIFICATION_PREFERENCES_UI)
    {
      entityType: 'NOTIFICATION_PREFERENCES_UI',
      entityId: '00000000-0000-0000-0000-000000000014',
      items: [
        { field: 'notifications.preferences.title', en: 'Notification Preferences', vi: 'Tùy chọn Nhận Email Thông báo' },
        { field: 'notifications.preferences.subtitle', en: 'Configure automated email notifications for performance evaluation events', vi: 'Cấu hình nhận thông báo email tự động cho từng sự kiện quy trình đánh giá' },
        { field: 'notifications.preferences.save_btn', en: 'Save Preferences', vi: 'Lưu cấu hình' },
        { field: 'notifications.preferences.save_success', en: 'Preferences saved successfully!', vi: 'Đã lưu cấu hình thông báo thành công!' },
        { field: 'notifications.preferences.save_error', en: 'Failed to save preferences.', vi: 'Lỗi khi lưu cấu hình thông báo.' },
        { field: 'notifications.preferences.load_error', en: 'Unable to load notification preferences.', vi: 'Không thể tải cấu hình thông báo.' },
        { field: 'notifications.preferences.email_notifications', en: 'Email Notifications', vi: 'Email thông báo' },
        { field: 'notifications.preferences.test_btn', en: 'Send Test Notification', vi: 'Gửi email thử nghiệm' },
        { field: 'notifications.preferences.admin_only', en: 'Admin only', vi: 'Chỉ dành cho Quản trị viên' },
      ],
    },

    // 6. /admin/employees/search (EMPLOYEE_SEARCH_UI)
    {
      entityType: 'EMPLOYEE_SEARCH_UI',
      entityId: '00000000-0000-0000-0000-000000000015',
      items: [
        { field: 'organization.employee_search.title', en: 'Employee Search', vi: 'Tra cứu Nhân viên (Employee Search)' },
        { field: 'organization.employee_search.subtitle', en: 'Search personnel info, department, job level, and review cadences (Rule 18)', vi: 'Tìm kiếm thông tin nhân sự, phòng ban, chức vụ và chu kỳ đánh giá hiệu suất định kỳ (Rule 18)' },
        { field: 'organization.employee_search.input_placeholder', en: 'Enter name, employee code, or email...', vi: 'Nhập tên, mã NV hoặc email...' },
        { field: 'organization.employee_search.col_code', en: 'Employee Code', vi: 'Mã NV' },
        { field: 'organization.employee_search.col_name', en: 'Full Name', vi: 'Họ và tên' },
        { field: 'organization.employee_search.col_email', en: 'Email', vi: 'Email' },
        { field: 'organization.employee_search.col_department', en: 'Department', vi: 'Phòng ban' },
        { field: 'organization.employee_search.col_title', en: 'Job Title', vi: 'Chức vụ' },
        { field: 'organization.employee_search.col_job_level', en: 'Job Level', vi: 'Cấp bậc' },
        { field: 'organization.employee_search.col_cadence', en: 'Review Cadence', vi: 'Chu kỳ review' },
        { field: 'organization.employee_search.col_status', en: 'Status', vi: 'Trạng thái' },
        { field: 'organization.employee_search.no_employees', en: 'No employees found.', vi: 'Không tìm thấy nhân viên nào phù hợp.' },
        { field: 'organization.employee_search.all_departments', en: 'All Departments', vi: 'Tất cả phòng ban' },
        { field: 'organization.employee_search.all_job_levels', en: 'All Job Levels', vi: 'Tất cả cấp bậc' },
      ],
    },

    // 7. /admin/reports (REPORTS_UI)
    {
      entityType: 'REPORTS_UI',
      entityId: '00000000-0000-0000-0000-000000000016',
      items: [
        { field: 'reports.title', en: 'Performance Reports Center', vi: 'Trung Tâm Báo Cáo Hiệu Suất (Performance Reports)' },
        { field: 'reports.subtitle', en: 'Track evaluation results, analyze score trends, and generate multi-dimensional reports', vi: 'Theo dõi kết quả đánh giá, phân tích xu hướng điểm số và xuất báo cáo đa chiều theo phạm vi' },
        { field: 'reports.role_scope', en: 'Account Scope', vi: 'Phạm vi tài khoản' },
        { field: 'reports.scope.my', en: '1. My Report', vi: '1. Báo cáo của tôi' },
        { field: 'reports.badge.personal', en: 'Personal', vi: 'Cá nhân' },
        { field: 'reports.desc.my', en: 'Detailed scores, competency radar, and personal evaluation history across cycles', vi: 'Chi tiết điểm số, radar năng lực và lịch sử đánh giá cá nhân qua các kỳ' },
        { field: 'reports.scope.team', en: '2. Team Report', vi: '2. Báo cáo Đội nhóm' },
        { field: 'reports.badge.team', en: 'Team & Department', vi: 'Team & Phòng ban' },
        { field: 'reports.desc.team', en: 'Rankings, average score distribution, and evaluation progress of team members', vi: 'Xếp hạng, phân phối điểm trung bình và tiến độ đánh giá của các thành viên trong nhóm' },
        { field: 'reports.scope.org', en: '3. Organization Report', vi: '3. Báo cáo Toàn công ty' },
        { field: 'reports.badge.org', en: 'Organization-wide', vi: 'Toàn tổ chức' },
        { field: 'reports.desc.org', en: 'Overall performance across departments, company-wide KPI completion rate', vi: 'Bức tranh tổng thể về hiệu suất giữa các bộ phận, tỷ lệ hoàn thành KPI toàn doanh nghiệp' },
        { field: 'reports.scope.summary', en: '4. KPI Summary Dashboard', vi: '4. Bảng tổng hợp KPI' },
        { field: 'reports.badge.summary', en: 'Analytics Dashboard', vi: 'Dashboard Thống kê' },
        { field: 'reports.desc.summary', en: 'Grade distribution matrix S, A, B, C, D and core metric trend analysis', vi: 'Ma trận thống kê phân bổ hạng S, A, B, C, D và phân tích biến động chỉ số cốt lõi' },
      ],
    },

    // 8. /admin/i18n (I18N_ADMIN_UI)
    {
      entityType: 'I18N_ADMIN_UI',
      entityId: '00000000-0000-0000-0000-000000000017',
      items: [
        { field: 'i18n.loading', en: 'Loading i18n configuration...', vi: 'Đang tải cấu hình đa ngôn ngữ...' },
        { field: 'i18n.toast.success', en: 'User preferred locale updated successfully!', vi: 'Đã cập nhật ngôn ngữ ưu tiên của người dùng thành công!' },
        { field: 'i18n.toast.error', en: 'Failed to update user preferred locale.', vi: 'Lỗi khi cập nhật ngôn ngữ ưu tiên của người dùng.' },
        { field: 'i18n.system_locales_title', en: 'System Supported Locales', vi: 'Ngôn ngữ được hệ thống hỗ trợ' },
        { field: 'i18n.system_locales_desc', en: 'Active languages supported by the backend polymorphic i18n service (LLD v1.5 §21.1).', vi: 'Các ngôn ngữ đang hoạt động được hỗ trợ bởi dịch vụ i18n backend (LLD v1.5 §21.1).' },
        { field: 'i18n.baseline', en: 'Baseline', vi: 'Cơ sở' },
        { field: 'i18n.user_preferred_title', en: 'User Preferred Language', vi: 'Ngôn ngữ ưu tiên của người dùng' },
        { field: 'i18n.user_preferred_desc', en: 'Set your personal preferred locale for resolving master data names and UI strings.', vi: 'Thiết lập ngôn ngữ ưu tiên cá nhân để hiển thị dữ liệu danh mục và giao diện.' },
        { field: 'i18n.save_preference', en: 'Save Preference', vi: 'Lưu ưu tiên' },
        { field: 'i18n.editor_title', en: 'Master Data Translation Editor', vi: 'Trình chỉnh sửa bản dịch dữ liệu danh mục' },
        { field: 'i18n.editor_desc', en: 'View, edit, and upsert multi-language translations for generic master data entities (Polymorphic table i18n_translation).', vi: 'Xem, chỉnh sửa và cập nhật bản dịch đa ngôn ngữ cho các thực thể danh mục (Bảng polymorphic i18n_translation).' },
        { field: 'i18n.global_search_tab', en: 'Global Search All Items (Search across ALL Categories)', vi: 'Tìm kiếm toàn bộ danh mục hệ thống' },
        { field: 'i18n.category_search_tab', en: 'Browse by Specific Category (Filter by Category)', vi: 'Duyệt theo danh mục cụ thể' },
        { field: 'i18n.global_search_label', en: 'Search across all master data items in the entire system:', vi: 'Tìm kiếm trên toàn bộ dữ liệu danh mục:' },
        { field: 'i18n.loading_global', en: 'Loading all master data items from backend...', vi: 'Đang tải toàn bộ danh mục từ máy chủ...' },
        { field: 'i18n.global_search_placeholder', en: "Type to search anything (e.g. 'Phòng Nhân Sự', 'Manager', 'KPI', 'Chất lượng')...", vi: "Nhập từ khóa tìm kiếm (vd: 'Phòng Nhân Sự', 'Manager', 'KPI', 'Chất lượng')..." },
        { field: 'i18n.choose_item', en: 'Choose an item', vi: 'Chọn một mục' },
        { field: 'i18n.matching_found', en: 'matching found', vi: 'kết quả phù hợp' },
        { field: 'i18n.select_entity_type', en: 'Select Entity Type', vi: 'Chọn loại thực thể' },
        { field: 'i18n.choose_item_to_translate', en: 'Choose Item to Translate', vi: 'Chọn mục cần dịch' },
        { field: 'i18n.available', en: 'available', vi: 'có sẵn' },
        { field: 'i18n.no_records', en: 'No master data records found for', vi: 'Không tìm thấy dữ liệu danh mục cho' },
        { field: 'i18n.translating', en: 'Translating', vi: 'Đang dịch' },
        { field: 'i18n.selected_item', en: 'Selected Item', vi: 'Mục được chọn' },
        { field: 'i18n.category', en: 'Category', vi: 'Danh mục' },
        { field: 'i18n.required', en: 'Required', vi: 'Bắt buộc' },
        { field: 'i18n.loading_locales', en: 'Loading supported locales...', vi: 'Đang tải các ngôn ngữ hỗ trợ...' },
        { field: 'i18n.select_prompt', en: 'Select an item from the list above to manage its translations.', vi: 'Chọn một mục từ danh sách phía trên để quản lý bản dịch.' },
        { field: 'i18n.rule12_notice', en: "Rule 12: English ('en') is mandatory baseline for all fields.", vi: "Quy tắc 12: Tiếng Anh ('en') là ngôn ngữ cơ sở bắt buộc cho tất cả các trường." },
        { field: 'i18n.auto_fill_en', en: 'Auto-fill English to empty languages', vi: 'Tự động điền tiếng Anh sang các ngôn ngữ còn trống' },
        { field: 'i18n.add_field', en: 'Add Field to Translate', vi: 'Thêm trường cần dịch' },
        { field: 'i18n.add_field_placeholder', en: 'e.g. description, short_name, summary', vi: 'vd: description, short_name, summary' },
        { field: 'i18n.add_field_btn', en: 'Add Field Row', vi: 'Thêm dòng trường' },
        { field: 'i18n.field_name', en: 'Field Name', vi: 'Tên trường' },
        { field: 'i18n.optional', en: 'Optional', vi: 'Tùy chọn' },
        { field: 'i18n.save_translations', en: 'Save Translations', vi: 'Lưu bản dịch' },
      ],
    },

    // 9. /admin/notification-templates (NOTIFICATION_TEMPLATES_UI)
    {
      entityType: 'NOTIFICATION_TEMPLATES_UI',
      entityId: '00000000-0000-0000-0000-000000000018',
      items: [
        { field: 'notifications.templates.title', en: 'Notification Templates Management', vi: 'Quản lý Mẫu Email Thông báo (Notification Templates)' },
        { field: 'notifications.templates.subtitle', en: 'Configure multi-language email content (English baseline & Vietnamese) for 9 evaluation workflow events.', vi: 'Cấu hình nội dung email đa ngôn ngữ (English baseline & Tiếng Việt) cho 9 sự kiện quy trình đánh giá nhân sự.' },
        { field: 'notifications.templates.rule16_title', en: 'Security Rule 16 (LLD §21.2)', vi: 'Quy tắc bảo mật Rule 16 (LLD §21.2)' },
        { field: 'notifications.templates.rule16_desc', en: 'Emails only notify events and secure access links. The system automatically scrubs and strictly forbids displaying scores, ratings, or feedback in email subjects/bodies.', vi: 'Email chỉ thông báo sự kiện và đường dẫn truy cập an toàn. Hệ thống tự động thanh lọc và ngăn chặn tuyệt đối việc hiển thị điểm số, xếp loại hoặc nhận xét đánh giá trong tiêu đề/nội dung email.' },
        { field: 'notifications.templates.list_heading', en: 'EVENT TEMPLATES LIST', vi: 'DANH SÁCH MẪU SỰ KIỆN' },
        { field: 'notifications.templates.search_placeholder', en: 'Search email templates...', vi: 'Tìm kiếm mẫu email...' },
        { field: 'notifications.templates.enable_sending', en: 'Enable Email Sending', vi: 'Kích hoạt gửi email' },
        { field: 'notifications.templates.variables', en: 'VALID VARIABLES', vi: 'BIẾN SỐ HỢP LỆ (VARIABLES)' },
        { field: 'notifications.templates.variables_desc', en: 'Available variables will be dynamically replaced when sending emails.', vi: 'Các biến số hợp lệ sẽ được thay thế tự động khi gửi email.' },
        { field: 'notifications.templates.preview', en: 'Live Preview', vi: 'Xem trước (Live Preview)' },
        { field: 'notifications.templates.tabs_en', en: '🇬🇧 English (Baseline)', vi: '🇬🇧 English (Bản gốc)' },
        { field: 'notifications.templates.tabs_vi', en: '🇻🇳 Tiếng Việt (vi)', vi: '🇻🇳 Tiếng Việt (vi)' },
        { field: 'notifications.templates.tabs_preview', en: '👁️ Live Preview', vi: '👁️ Xem trước (Live Preview)' },
        { field: 'notifications.templates.subject_en', en: 'Subject (English)', vi: 'Subject (Tiêu đề email - EN)' },
        { field: 'notifications.templates.body_en', en: 'Body HTML (English)', vi: 'Body HTML (Nội dung email - EN)' },
        { field: 'notifications.templates.subject_vi', en: 'Subject (Vietnamese)', vi: 'Subject (Tiêu đề email - Tiếng Việt)' },
        { field: 'notifications.templates.body_vi', en: 'Body HTML (Vietnamese)', vi: 'Body HTML (Nội dung email - Tiếng Việt)' },
        { field: 'notifications.templates.preview_recipient', en: 'Recipient Mailbox Simulation:', vi: 'Mô phỏng hộp thư người nhận:' },
        { field: 'notifications.templates.save_btn', en: 'Save Template', vi: 'Lưu mẫu cấu hình' },
        { field: 'notifications.templates.save_success', en: 'Saved email template successfully!', vi: 'Đã lưu mẫu email thành công!' },
        { field: 'notifications.templates.save_error', en: 'Error saving email template.', vi: 'Lỗi khi lưu mẫu email.' },
        { field: 'notifications.templates.load_error', en: 'Failed to load email templates.', vi: 'Không thể tải danh sách mẫu email.' },
        { field: 'notifications.templates.select_prompt', en: 'Please select an email template from the list on the left.', vi: 'Vui lòng chọn một mẫu email từ danh sách bên trái.' },
        { field: 'notifications.templates.active_badge', en: 'Active', vi: 'Hoạt động' },
        { field: 'notifications.templates.inactive_badge', en: 'Inactive', vi: 'Tạm dừng' },
        // 9 Event Types
        { field: 'notifications.types.CYCLE_OPENED', en: 'Cycle Opened', vi: 'Kỳ đánh giá đã mở' },
        { field: 'notifications.types.SELF_SUBMITTED', en: 'Self-Review Submitted', vi: 'Đã nộp tự đánh giá' },
        { field: 'notifications.types.MANAGER_SUBMITTED', en: 'Manager Review Submitted', vi: 'Quản lý đã nộp đánh giá' },
        { field: 'notifications.types.CORRECTION_REQUESTED', en: 'Correction Requested', vi: 'Yêu cầu chỉnh sửa / bổ sung' },
        { field: 'notifications.types.RESULT_PUBLISHED', en: 'Results Published', vi: 'Kết quả đánh giá đã công bố' },
        { field: 'notifications.types.SCORE_ADJUSTED', en: 'Score Adjusted', vi: 'Điểm số đã điều chỉnh' },
        { field: 'notifications.types.REVIEW_DUE_REMINDER', en: 'Review Due Reminder', vi: 'Nhắc nhở hạn chót đánh giá' },
        { field: 'notifications.types.IMPORT_COMPLETED', en: 'Import Completed', vi: 'Nhập dữ liệu hoàn tất' },
        { field: 'notifications.types.CYCLE_LOCKED', en: 'Cycle Finalized & Locked', vi: 'Kỳ đánh giá đã khóa sổ' },
        // 9 Event Descriptions
        { field: 'notifications.templates.desc.CYCLE_OPENED', en: 'Notifies employees when a new evaluation cycle is officially opened.', vi: 'Thông báo khi kỳ đánh giá mới được mở cho nhân viên.' },
        { field: 'notifications.templates.desc.SELF_SUBMITTED', en: 'Notifies managers that an employee has submitted their self-review.', vi: 'Thông báo khi nhân viên hoàn thành tự đánh giá.' },
        { field: 'notifications.templates.desc.MANAGER_SUBMITTED', en: 'Notifies employees and HR when manager completes review.', vi: 'Thông báo khi Quản lý hoàn tất đánh giá nhân viên.' },
        { field: 'notifications.templates.desc.CORRECTION_REQUESTED', en: 'Requests employee or manager to revise evaluation inputs per feedback.', vi: 'Thông báo yêu cầu điều chỉnh lại phiếu đánh giá.' },
        { field: 'notifications.templates.desc.RESULT_PUBLISHED', en: 'Alerts employees that official evaluation results are published.', vi: 'Thông báo kết quả đánh giá chính thức đã công bố (Bắt buộc).' },
        { field: 'notifications.templates.desc.SCORE_ADJUSTED', en: 'Notifies employee when calibration or appeal adjusts final scores.', vi: 'Thông báo điều chỉnh điểm số sau phúc khảo/hiệu chuẩn.' },
        { field: 'notifications.templates.desc.REVIEW_DUE_REMINDER', en: 'Automated deadline reminder for pending evaluation reviews.', vi: 'Thông báo nhắc nhở sắp đến hạn đánh giá định kỳ.' },
        { field: 'notifications.templates.desc.IMPORT_COMPLETED', en: 'Notifies administrators when KPI bulk data import has finished.', vi: 'Thông báo hoàn tất xử lý tệp nhập dữ liệu.' },
        { field: 'notifications.templates.desc.CYCLE_LOCKED', en: 'Alerts all participants that the evaluation cycle is sealed and locked.', vi: 'Thông báo kỳ đánh giá đã được khóa và lưu trữ.' },
      ],
    },

    // 10. /admin/notification-logs (NOTIFICATION_LOGS_UI)
    {
      entityType: 'NOTIFICATION_LOGS_UI',
      entityId: '00000000-0000-0000-0000-000000000019',
      items: [
        { field: 'notifications.logs.title', en: 'Notification Delivery Logs', vi: 'Nhật ký Gửi Email (Notification Delivery Logs)' },
        { field: 'notifications.logs.subtitle', en: 'Track transactional email delivery status, success rates, and allow admins to resend failed notifications (Rule 20).', vi: 'Theo dõi trạng thái gửi email giao dịch, tỷ lệ thành công và hỗ trợ quản trị viên gửi lại các email thất bại (Rule 20).' },
        { field: 'notifications.logs.status_label', en: 'STATUS', vi: 'TRẠNG THÁI' },
        { field: 'notifications.logs.event_type_label', en: 'EVENT TYPE', vi: 'LOẠI SỰ KIỆN' },
        { field: 'notifications.logs.search_email_label', en: 'SEARCH BY EMAIL', vi: 'TÌM THEO EMAIL' },
        { field: 'notifications.logs.email_placeholder', en: 'user@company.com...', vi: 'nguoidung@congty.com...' },
        { field: 'notifications.logs.col_time', en: 'Timestamp', vi: 'Thời gian' },
        { field: 'notifications.logs.col_event', en: 'Event', vi: 'Sự kiện' },
        { field: 'notifications.logs.col_recipient', en: 'Recipient', vi: 'Người nhận' },
        { field: 'notifications.logs.col_subject', en: 'Subject', vi: 'Tiêu đề' },
        { field: 'notifications.logs.col_status', en: 'Status', vi: 'Trạng thái' },
        { field: 'notifications.logs.col_retry', en: 'Retries', vi: 'Thử lại' },
        { field: 'notifications.logs.locale_used', en: 'Locale', vi: 'Ngôn ngữ' },
        { field: 'notifications.logs.view_error_details', en: 'View Error Details', vi: 'Xem lỗi chi tiết' },
        { field: 'notifications.logs.resend', en: 'Resend', vi: 'Gửi lại' },
        { field: 'notifications.logs.no_logs', en: 'No notification records found.', vi: 'Không tìm thấy bản ghi email nào.' },
        { field: 'notifications.logs.confirm_resend', en: 'Confirm resending email', vi: 'Xác nhận gửi lại email' },
        { field: 'notifications.logs.resend_enqueued', en: 'Queued email to', vi: 'Đã đưa email tới' },
        { field: 'notifications.logs.resend_success', en: 'for resending successfully!', vi: 'vào hàng đợi gửi lại thành công!' },
        { field: 'notifications.logs.resend_error', en: 'Error requesting email resend.', vi: 'Lỗi khi yêu cầu gửi lại email.' },
        { field: 'notifications.logs.load_error', en: 'Failed to load delivery logs.', vi: 'Không thể tải lịch sử gửi email.' },
        { field: 'notifications.logs.error_modal_title', en: 'Delivery Error Details', vi: 'Chi tiết Lỗi Gửi Email' },
        { field: 'notifications.status.sent', en: 'SENT', vi: 'ĐÃ GỬI (SENT)' },
        { field: 'notifications.status.pending', en: 'PENDING', vi: 'CHỜ GỬI (PENDING)' },
        { field: 'notifications.status.failed', en: 'FAILED', vi: 'THẤT BẠI (FAILED)' },
        { field: 'notifications.status.skipped', en: 'SKIPPED', vi: 'BỎ QUA (SKIPPED)' },
        { field: 'notifications.status.sent_opt', en: 'Sent (SENT)', vi: 'Đã gửi (SENT)' },
        { field: 'notifications.status.pending_opt', en: 'Pending (PENDING)', vi: 'Đang chờ (PENDING)' },
        { field: 'notifications.status.failed_opt', en: 'Failed (FAILED)', vi: 'Thất bại (FAILED)' },
        { field: 'notifications.status.skipped_opt', en: 'Skipped (SKIPPED)', vi: 'Đã bỏ qua (SKIPPED)' },
      ],
    },

    // 11. /admin/iam/users (IAM_ADMIN_UI)
    {
      entityType: 'IAM_ADMIN_UI',
      entityId: '00000000-0000-0000-0000-000000000020',
      items: [
        { field: 'iam.title', en: 'Identity & Access Management', vi: 'Quản lý Định danh & Quyền truy cập (IAM)' },
        { field: 'iam.tabs.users', en: 'Users', vi: 'Người dùng' },
        { field: 'iam.tabs.roles', en: 'Roles', vi: 'Vai trò' },
        { field: 'iam.tabs.permissions', en: 'Permissions', vi: 'Quyền hạn' },
        { field: 'iam.users.heading', en: 'Users', vi: 'Danh sách người dùng' },
        { field: 'iam.roles.heading', en: 'Roles', vi: 'Danh sách vai trò' },
        { field: 'iam.permissions.heading', en: 'Permissions', vi: 'Danh sách quyền hạn' },
        { field: 'iam.users.loading', en: 'Loading users…', vi: 'Đang tải người dùng…' },
        { field: 'iam.users.create_btn', en: 'Create User', vi: 'Tạo người dùng' },
        { field: 'iam.users.empty', en: 'No users found.', vi: 'Không tìm thấy người dùng nào.' },
        { field: 'iam.users.col_name', en: 'Name', vi: 'Họ và tên' },
        { field: 'iam.users.col_email', en: 'Email', vi: 'Email' },
        { field: 'iam.users.col_role', en: 'Role', vi: 'Vai trò' },
        { field: 'iam.users.col_status', en: 'Status', vi: 'Trạng thái' },
        { field: 'iam.users.col_actions', en: 'Actions', vi: 'Thao tác' },
        { field: 'iam.users.deactivate', en: 'Deactivate', vi: 'Vô hiệu hóa' },
        { field: 'iam.users.activate', en: 'Activate', vi: 'Kích hoạt' },
        { field: 'iam.users.deactivate_title', en: 'Deactivate User', vi: 'Vô hiệu hóa người dùng' },
        { field: 'iam.users.activate_title', en: 'Activate User', vi: 'Kích hoạt người dùng' },
        { field: 'iam.users.deactivate_confirm', en: 'Deactivate', vi: 'Vô hiệu hóa' },
        { field: 'iam.users.deactivate_notice', en: 'They will no longer be able to log in.', vi: 'Người dùng này sẽ không thể đăng nhập vào hệ thống nữa.' },
        { field: 'iam.users.activate_confirm', en: 'Activate', vi: 'Kích hoạt' },
        { field: 'iam.users.activate_notice', en: 'They will be able to log in again.', vi: 'Người dùng này sẽ có thể đăng nhập lại vào hệ thống.' },
        { field: 'iam.users.edit_user', en: 'Edit User', vi: 'Chỉnh sửa người dùng' },
        { field: 'iam.users.create_user', en: 'Create User', vi: 'Tạo người dùng' },
        { field: 'iam.users.fullname', en: 'Full Name', vi: 'Họ và tên' },
        { field: 'iam.users.email', en: 'Email', vi: 'Email' },
        { field: 'iam.users.password', en: 'Password', vi: 'Mật khẩu' },
        { field: 'iam.users.role', en: 'Role', vi: 'Vai trò' },
        { field: 'iam.users.select_role', en: 'Select a role…', vi: 'Chọn vai trò…' },
        { field: 'iam.users.duplicate_email', en: 'This email is already registered.', vi: 'Email này đã được đăng ký trong hệ thống.' },
        { field: 'iam.permissions.only_core_roles', en: 'Role-Based Access Control (4 Core Roles)', vi: 'Phân quyền chức năng theo 4 vai trò chính' },
        { field: 'iam.permissions.core_roles_desc', en: 'Permissions are configurable exclusively for EMPLOYEE, HR_ADMIN, MANAGER, and SYSTEM_ADMIN.', vi: 'Quyền hạn chỉ có thể cấu hình cho 4 vai trò: EMPLOYEE, HR_ADMIN, MANAGER và SYSTEM_ADMIN.' },
        { field: 'iam.permissions.search_placeholder', en: 'Search by code, name, description...', vi: 'Tìm theo mã, tên, mô tả quyền hạn...' },
        { field: 'iam.permissions.all_modules', en: 'All Modules', vi: 'Tất cả phân hệ' },
        { field: 'iam.permissions.view_matrix', en: 'Matrix View', vi: 'Dạng bảng ma trận' },
        { field: 'iam.permissions.view_cards', en: 'Cards View', vi: 'Dạng thẻ' },
        { field: 'iam.permissions.matrix_view', en: 'Matrix', vi: 'Bảng' },
        { field: 'iam.permissions.cards_view', en: 'Cards', vi: 'Thẻ' },
        { field: 'iam.permissions.col_permission', en: 'Permission', vi: 'Quyền hạn' },
        { field: 'iam.permissions.col_description', en: 'Description', vi: 'Mô tả chi tiết' },
        { field: 'iam.permissions.checkpoint_on', en: 'Active', vi: 'Đã bật' },
        { field: 'iam.permissions.checkpoint_off', en: 'Off', vi: 'Chưa bật' },
        { field: 'iam.permissions.checkpoint_active', en: 'Active', vi: 'Đã bật' },
        { field: 'iam.permissions.checkpoint_enabled', en: 'Enabled Checkpoint', vi: 'Điểm kiểm tra đã kích hoạt' },
        { field: 'iam.permissions.checkpoint_disabled', en: 'Disabled', vi: 'Chưa kích hoạt' },
        { field: 'iam.permissions.permissions_label', en: 'permissions', vi: 'quyền' },
        { field: 'iam.permissions.roles_label', en: 'roles', vi: 'vai trò' },
        { field: 'iam.permissions.empty', en: 'No permissions defined.', vi: 'Không có quyền hạn nào được định nghĩa.' },
        { field: 'iam.permissions.loading', en: 'Loading permissions…', vi: 'Đang tải danh sách quyền hạn…' },
        { field: 'iam.permissions.no_match', en: 'No permissions match your filter criteria.', vi: 'Không tìm thấy quyền hạn nào khớp với tiêu chí lọc.' },
      ],
    },

    // 12. Shared Common UI (COMMON_UI)
    {
      entityType: 'COMMON_UI',
      entityId: '00000000-0000-0000-0000-000000000021',
      items: [
        { field: 'common.refresh', en: 'Refresh', vi: 'Làm mới' },
        { field: 'common.refreshing', en: 'Refreshing...', vi: 'Đang làm mới...' },
        { field: 'common.saving', en: 'Saving...', vi: 'Đang lưu...' },
        { field: 'common.save_changes', en: 'Save Changes', vi: 'Lưu thay đổi' },
        { field: 'common.edit', en: 'Edit', vi: 'Chỉnh sửa' },
        { field: 'common.search', en: 'Search', vi: 'Tìm kiếm' },
        { field: 'common.close', en: 'Close', vi: 'Đóng' },
        { field: 'common.cancel', en: 'Cancel', vi: 'Hủy' },
        { field: 'common.active', en: 'Active', vi: 'Hoạt động' },
        { field: 'common.inactive', en: 'Inactive', vi: 'Tạm dừng' },
        { field: 'common.loading', en: 'Loading...', vi: 'Đang tải...' },
        { field: 'common.loading_logs', en: 'Loading logs...', vi: 'Đang tải nhật ký...' },
        { field: 'common.all_statuses', en: 'All Statuses', vi: 'Tất cả trạng thái' },
        { field: 'common.all_events', en: 'All Events', vi: 'Tất cả sự kiện' },
        { field: 'common.showing', en: 'Showing', vi: 'Hiển thị' },
        { field: 'common.total', en: 'total', vi: 'tổng số' },
        { field: 'common.records', en: 'records', vi: 'bản ghi' },
        { field: 'common.page', en: 'Page', vi: 'Trang' },
        { field: 'common.prev', en: 'Previous', vi: 'Trang trước' },
        { field: 'common.next', en: 'Next', vi: 'Trang sau' },
        { field: 'common.successfully', en: 'successfully!', vi: 'thành công!' },
        { field: 'common.actions', en: 'Actions', vi: 'Thao tác' },
        { field: 'common.to', en: 'to', vi: 'tới' },
        { field: 'edit', en: 'Edit', vi: 'Chỉnh sửa' },
        { field: 'deactivate', en: 'Deactivate', vi: 'Tạm dừng' },
        { field: 'activate', en: 'Activate', vi: 'Kích hoạt' },
      ],
    },
  ];

  function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  for (const group of groups) {
    for (const item of group.items) {
      // Support the original key as well as camelCase variant if underscored
      const camelField = toCamelCase(item.field);
      const fieldVariants = Array.from(new Set([item.field, camelField]));

      for (const f of fieldVariants) {
        // English baseline
        pgm.sql(`
          INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
          VALUES ('${group.entityType}', '${group.entityId}', '${f}', 'en', '${item.en.replace(/'/g, "''")}')
          ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
          DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
        `);

        // Vietnamese translation
        pgm.sql(`
          INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
          VALUES ('${group.entityType}', '${group.entityId}', '${f}', 'vi', '${item.vi.replace(/'/g, "''")}')
          ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
          DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
        `);
      }
    }
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const entityTypes = [
    'KPI_ADMIN_UI',
    'CRITERIA_ADMIN_UI',
    'CALIBRATION_ADMIN_UI',
    'REVIEW_CADENCE_UI',
    'NOTIFICATION_PREFERENCES_UI',
    'EMPLOYEE_SEARCH_UI',
    'REPORTS_UI',
    'I18N_ADMIN_UI',
    'NOTIFICATION_TEMPLATES_UI',
    'NOTIFICATION_LOGS_UI',
    'IAM_ADMIN_UI',
    'COMMON_UI',
  ];

  for (const entityType of entityTypes) {
    pgm.sql(`
      DELETE FROM "i18n_translation"
      WHERE "entity_type" = '${entityType}';
    `);
  }
}
