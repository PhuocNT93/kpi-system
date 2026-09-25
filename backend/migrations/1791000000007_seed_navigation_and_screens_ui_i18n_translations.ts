import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  interface ScreenTranslationGroup {
    entityType: string;
    entityId: string;
    items: Array<{ field: string; en: string; vi: string }>;
  }

  const groups: ScreenTranslationGroup[] = [
    // 1. NAVIGATION_UI
    {
      entityType: 'NAVIGATION_UI',
      entityId: '00000000-0000-0000-0000-000000000020',
      items: [
        { field: 'nav.overview', en: 'Overview', vi: 'Tổng quan' },
        { field: 'nav.dashboard', en: 'Dashboard', vi: 'Bảng điều khiển' },
        { field: 'nav.user_guide', en: 'User Guide', vi: 'Hướng dẫn sử dụng' },
        { field: 'nav.notification_preferences', en: 'Email Notifications', vi: 'Cài đặt thông báo' },
        { field: 'nav.performance', en: 'Performance', vi: 'Hiệu suất' },
        { field: 'nav.employee_search', en: 'Employee Search', vi: 'Tra cứu nhân viên' },
        { field: 'nav.team_evaluations', en: 'Team Reviews', vi: 'Đánh giá đội nhóm' },
        { field: 'nav.review_due', en: 'Team Review Due', vi: 'Đánh giá đến hạn' },
        { field: 'nav.my_evaluations', en: 'My Evaluation', vi: 'Đánh giá của tôi' },
        { field: 'nav.reporting', en: 'Reporting', vi: 'Báo cáo' },
        { field: 'nav.reports', en: 'Performance Reports', vi: 'Báo cáo hiệu suất' },
        { field: 'nav.configuration', en: 'Configuration', vi: 'Cấu hình' },
        { field: 'nav.individual_cycles', en: 'Individual Evaluation', vi: 'Đánh giá cá nhân' },
        { field: 'nav.organization', en: 'Organization', vi: 'Tổ chức & Phòng ban' },
        { field: 'nav.cycles', en: 'Evaluation Cycles', vi: 'Chu kỳ đánh giá' },
        { field: 'nav.review_cadences', en: 'Review Cadences', vi: 'Tần suất đánh giá' },
        { field: 'nav.calibration', en: 'Calibration', vi: 'Cân chỉnh điểm số' },
        { field: 'nav.templates', en: 'Evaluation Templates', vi: 'Mẫu đánh giá' },
        { field: 'nav.criteria', en: 'Criteria Library', vi: 'Thư viện tiêu chí' },
        { field: 'nav.kpis', en: 'KPI Library', vi: 'Quản lý chỉ số KPI' },
        { field: 'nav.i18n', en: 'Translation Settings', vi: 'Cài đặt ngôn ngữ (i18n)' },
        { field: 'nav.ingestion', en: 'Data Ingestion Hub', vi: 'Trung tâm nạp liệu KPI' },
        { field: 'nav.iam', en: 'Identity & Access', vi: 'Quản trị người dùng & Quyền' },
        { field: 'nav.audit_logs', en: 'Audit Log', vi: 'Nhật ký kiểm toán' },
        { field: 'nav.notification_templates', en: 'Email Templates', vi: 'Mẫu email thông báo' },
        { field: 'nav.notification_logs', en: 'Email Delivery Logs', vi: 'Nhật ký gửi email' },
      ],
    },

    // 2. PAGE_TITLES_UI
    {
      entityType: 'PAGE_TITLES_UI',
      entityId: '00000000-0000-0000-0000-000000000021',
      items: [
        { field: 'title.dashboard', en: 'Dashboard', vi: 'Bảng điều khiển' },
        { field: 'title.iam', en: 'IAM Management', vi: 'Quản lý người dùng & Phân quyền' },
        { field: 'title.audit_logs', en: 'Audit Logs', vi: 'Nhật ký kiểm toán' },
        { field: 'title.organization', en: 'Organization Management', vi: 'Quản lý tổ chức' },
        { field: 'title.employees', en: 'Employee Directory & Search', vi: 'Danh bạ & Tra cứu nhân viên' },
        { field: 'title.employee_search', en: 'Employee Directory & Search', vi: 'Danh bạ & Tra cứu nhân viên' },
        { field: 'title.reports', en: 'Performance Reports', vi: 'Báo cáo hiệu suất' },
        { field: 'title.ingestion', en: 'KPI Data Ingestion Hub', vi: 'Trung tâm Thu thập & Nạp liệu KPI' },
        { field: 'title.templates', en: 'Evaluation Templates', vi: 'Mẫu đánh giá' },
        { field: 'title.criteria', en: 'Criteria', vi: 'Thư viện tiêu chí' },
        { field: 'title.i18n', en: 'Translation Settings', vi: 'Cài đặt ngôn ngữ giao diện' },
        { field: 'title.kpis', en: 'KPI Management', vi: 'Quản lý chỉ số KPI' },
        { field: 'title.cycles', en: 'Evaluation Cycles', vi: 'Chu kỳ đánh giá' },
        { field: 'title.review_due', en: 'Review Due Dashboard', vi: 'Bảng theo dõi hạn đánh giá' },
        { field: 'title.review_cadences', en: 'Review Cadence Management', vi: 'Quản lý tần suất đánh giá' },
        { field: 'title.individual_cycles', en: 'Individual Evaluation', vi: 'Tạo chu kỳ đánh giá cá nhân' },
        { field: 'title.calibration', en: 'Calibration Sessions & Adjustment', vi: 'Phiên cân chỉnh & Điều chỉnh điểm' },
        { field: 'title.my_evaluations', en: 'My Evaluations', vi: 'Đánh giá của tôi' },
        { field: 'title.team_evaluations', en: 'Team Evaluations', vi: 'Đánh giá đội nhóm' },
        { field: 'title.user_guide', en: 'User Guide', vi: 'Hướng dẫn sử dụng' },
        { field: 'title.notification_preferences', en: 'Notification Preferences', vi: 'Tùy chọn nhận thông báo' },
        { field: 'title.notification_templates', en: 'Email Templates', vi: 'Mẫu email thông báo' },
        { field: 'title.notification_logs', en: 'Email Delivery Logs', vi: 'Nhật ký gửi email' },
      ],
    },

    // 3. INGESTION_HUB_UI
    {
      entityType: 'INGESTION_HUB_UI',
      entityId: '00000000-0000-0000-0000-000000000022',
      items: [
        { field: 'ingestion.hub_title', en: 'KPI Data Ingestion Hub', vi: 'Trung Tâm Thu Thập & Nhập Liệu KPI' },
        { field: 'ingestion.hub_subtitle', en: 'Daily Automated Batch AI (Jira PIM + Gemini) and Batch CSV/Excel Import', vi: 'Batch AI tự động hàng ngày (Jira PIM + Gemini) và nhập file CSV/Excel' },
        { field: 'ingestion.tab_collectors', en: '1. Automated Collection', vi: '1. Thu thập Tự động' },
        { field: 'ingestion.tab_csv', en: '2. CSV / Excel Import', vi: '2. Nhập file CSV / Excel' },
        { field: 'ingestion.desc_collectors', en: 'Jira PIM + Gemini AI batch evaluation per task — Run automatically or on-demand', vi: 'Batch job Jira PIM + Gemini AI đánh giá từng task — Chạy tự động hàng ngày hoặc thủ công' },
        { field: 'ingestion.desc_csv', en: 'Download standard templates, upload batch CSV/Excel files and view ingestion history', vi: 'Tải mẫu chuẩn, nạp file CSV/Excel hàng loạt và tra cứu lịch sử các đợt nạp file' },
        { field: 'ingestion.role_label', en: 'Role: {role}', vi: 'Quyền hạn: {role}' },
        { field: 'ingestion.team_scope', en: '(Team Scope)', vi: '(Phạm vi Đội nhóm)' },
        { field: 'ingestion.subtab_jira', en: 'Jira Collector', vi: 'Jira Collector' },
        { field: 'ingestion.subtab_blueprint', en: 'Blueprint Config', vi: 'Cấu hình Blueprint' },
        { field: 'ingestion.subtab_script', en: 'Script Collector', vi: 'Script Collector' },
        { field: 'ingestion.subtab_upload', en: 'Upload CSV/Excel', vi: 'Tải lên CSV/Excel' },
        { field: 'ingestion.subtab_history', en: 'Import History', vi: 'Lịch sử nạp file' },
      ],
    },

    // 4. EVALUATION_CYCLES_UI
    {
      entityType: 'EVALUATION_CYCLES_UI',
      entityId: '00000000-0000-0000-0000-000000000023',
      items: [
        { field: 'cycles.title', en: 'Evaluation Cycles', vi: 'Chu kỳ đánh giá' },
        { field: 'cycles.subtitle', en: 'Configure, manage, open, and review company performance evaluation cycles.', vi: 'Cấu hình, quản lý, mở và theo dõi các chu kỳ đánh giá hiệu suất trong toàn công ty.' },
        { field: 'cycles.create_individual', en: 'Create Individual Evaluation', vi: 'Tạo đánh giá cá nhân' },
        { field: 'cycles.create_cycle', en: 'Create New Cycle', vi: 'Tạo chu kỳ mới' },
        { field: 'cycles.loading', en: 'Loading evaluation cycles...', vi: 'Đang tải danh sách chu kỳ đánh giá...' },
        { field: 'cycles.status_all', en: 'All Statuses', vi: 'Tất cả trạng thái' },
        { field: 'cycles.search_placeholder', en: 'Search cycles by name or code...', vi: 'Tìm kiếm chu kỳ theo tên hoặc mã...' },
      ],
    },

    // 5. TEAM_EVALUATIONS_UI
    {
      entityType: 'TEAM_EVALUATIONS_UI',
      entityId: '00000000-0000-0000-0000-000000000024',
      items: [
        { field: 'team_reviews.title', en: 'Team Reviews', vi: 'Đánh giá đội nhóm' },
        { field: 'team_reviews.subtitle', en: 'Review and provide feedback for team members reporting to you.', vi: 'Đánh giá và phản hồi kết quả hiệu suất cho các thành viên trực thuộc quản lý của bạn.' },
        { field: 'team_reviews.loading', en: 'Loading team reviews...', vi: 'Đang tải danh sách đánh giá đội nhóm...' },
        { field: 'team_reviews.status_in_progress', en: 'Self-Review In Progress', vi: 'Đang tự đánh giá' },
        { field: 'team_reviews.status_ready_review', en: 'Ready for Manager Review', vi: 'Chờ quản lý đánh giá' },
        { field: 'team_reviews.status_approved', en: 'Approved', vi: 'Đã hoàn thành' },
        { field: 'team_reviews.action_review', en: 'Review Now', vi: 'Đánh giá ngay' },
        { field: 'team_reviews.action_view', en: 'View Details', vi: 'Xem chi tiết' },
      ],
    },

    // 6. TEMPLATES_UI
    {
      entityType: 'TEMPLATES_UI',
      entityId: '00000000-0000-0000-0000-000000000025',
      items: [
        { field: 'templates.title', en: 'Evaluation Templates', vi: 'Mẫu đánh giá' },
        { field: 'templates.subtitle', en: 'Manage, construct, and publish KPI evaluation criteria templates.', vi: 'Quản lý, xây dựng và phát hành các biểu mẫu tiêu chí đánh giá KPI.' },
        { field: 'templates.create_btn', en: 'Create New Template', vi: 'Tạo mẫu mới' },
        { field: 'templates.modal_title', en: 'Create Evaluation Template', vi: 'Tạo mẫu đánh giá' },
        { field: 'templates.code_label', en: 'Template Code', vi: 'Mã mẫu' },
        { field: 'templates.name_label', en: 'Template Name', vi: 'Tên mẫu' },
        { field: 'templates.desc_label', en: 'Description', vi: 'Mô tả' },
        { field: 'templates.code_placeholder', en: 'e.g. TPL_ENG_2026', vi: 'VD: TPL_ENG_2026' },
        { field: 'templates.name_placeholder', en: 'e.g. 2026 Software Engineer Template', vi: 'VD: Mẫu đánh giá Kỹ sư 2026' },
        { field: 'templates.desc_placeholder', en: 'Brief description of this evaluation template...', vi: 'Mô tả ngắn gọn về mẫu đánh giá này...' },
        { field: 'templates.code_req', en: 'Code is required.', vi: 'Mã mẫu là bắt buộc.' },
        { field: 'templates.name_req', en: 'Name is required.', vi: 'Tên mẫu là bắt buộc.' },
      ],
    },

    // 7. COMMON_ACTIONS_UI
    {
      entityType: 'COMMON_ACTIONS_UI',
      entityId: '00000000-0000-0000-0000-000000000026',
      items: [
        { field: 'common.logout', en: 'Log out', vi: 'Đăng xuất' },
        { field: 'common.save', en: 'Save', vi: 'Lưu' },
        { field: 'common.cancel', en: 'Cancel', vi: 'Hủy' },
        { field: 'common.edit', en: 'Edit', vi: 'Chỉnh sửa' },
        { field: 'common.delete', en: 'Delete', vi: 'Xóa' },
        { field: 'common.create', en: 'Create', vi: 'Tạo mới' },
        { field: 'common.back', en: 'Back', vi: 'Quay lại' },
        { field: 'common.filter', en: 'Filter', vi: 'Bộ lọc' },
        { field: 'common.search', en: 'Search', vi: 'Tìm kiếm' },
        { field: 'common.all', en: 'All', vi: 'Tất cả' },
      ],
    },

    // 8. AUTH_LOGIN_UI
    {
      entityType: 'AUTH_LOGIN_UI',
      entityId: '00000000-0000-0000-0000-000000000027',
      items: [
        { field: 'login.brand', en: 'CyberLogitec Vietnam', vi: 'CyberLogitec Vietnam' },
        { field: 'login.title', en: 'KPI Performance System', vi: 'Hệ thống Quản lý Đánh giá KPI' },
        { field: 'login.subtitle', en: 'Sign in to access your evaluation cycle and metrics', vi: 'Đăng nhập để truy cập chu kỳ đánh giá và bảng chỉ số của bạn' },
        { field: 'login.email_label', en: 'Email address', vi: 'Địa chỉ Email' },
        { field: 'login.email_placeholder', en: 'user@cyberlogitec.com', vi: 'user@cyberlogitec.com' },
        { field: 'login.password_label', en: 'Password', vi: 'Mật khẩu' },
        { field: 'login.password_placeholder', en: 'Enter your password', vi: 'Nhập mật khẩu của bạn' },
        { field: 'login.submit_btn', en: 'Sign in to Account', vi: 'Đăng nhập vào Hệ thống' },
        { field: 'login.submitting', en: 'Signing in...', vi: 'Đang đăng nhập...' },
        { field: 'login.or_continue', en: 'or continue with', vi: 'hoặc đăng nhập bằng' },
        { field: 'login.google_btn', en: 'Sign in with Google Workspace', vi: 'Đăng nhập bằng Google Workspace' },
        { field: 'login.email_req', en: 'Email is required', vi: 'Email là bắt buộc' },
        { field: 'login.password_req', en: 'Password is required', vi: 'Mật khẩu là bắt buộc' },
      ],
    },
  ];

  function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  for (const group of groups) {
    for (const item of group.items) {
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
    'NAVIGATION_UI',
    'PAGE_TITLES_UI',
    'INGESTION_HUB_UI',
    'EVALUATION_CYCLES_UI',
    'TEAM_EVALUATIONS_UI',
    'TEMPLATES_UI',
    'COMMON_ACTIONS_UI',
    'AUTH_LOGIN_UI',
  ];

  for (const entityType of entityTypes) {
    pgm.sql(`
      DELETE FROM "i18n_translation"
      WHERE "entity_type" = '${entityType}';
    `);
  }
}
