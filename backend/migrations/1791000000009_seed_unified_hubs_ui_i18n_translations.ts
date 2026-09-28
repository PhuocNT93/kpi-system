import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * UI translations for the unified multi-tab hubs:
 * 1. NAVIGATION_UI & PAGE_TITLES_UI updates for streamlined sidebar
 * 2. NOTIFICATIONS_HUB_UI (Unified Notifications Page)
 * 3. EVALUATIONS_HUB_UI (Unified Evaluations Page)
 * 4. EVALUATION_CYCLES_HUB_UI (Unified Evaluation Cycles Page)
 * 5. STUDIO_HUB_UI (KPI & Templates Studio Page)
 * 6. SYSTEM_ADMIN_HUB_UI (System & Security Hub Page)
 * 7. REPORTS_HUB_UI (Performance Reports Hub Page)
 */

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
        { field: 'nav.notifications', en: 'Notifications & Email', vi: 'Thông báo & Email' },
        { field: 'nav.performance', en: 'Performance', vi: 'Hiệu suất' },
        { field: 'nav.evaluations_hub', en: 'Evaluations Hub', vi: 'Trung tâm Đánh giá' },
        { field: 'nav.reporting', en: 'Reporting', vi: 'Báo cáo' },
        { field: 'nav.reports', en: 'Performance Reports', vi: 'Báo cáo hiệu suất' },
        { field: 'nav.configuration', en: 'Configuration', vi: 'Cấu hình' },
        { field: 'nav.cycles_hub', en: 'Evaluation Cycles Hub', vi: 'Quản lý Chu kỳ Đánh giá' },
        { field: 'nav.studio_hub', en: 'KPI & Templates Studio', vi: 'Tiêu chí & Biểu mẫu' },
        { field: 'nav.ingestion', en: 'Data Ingestion Hub', vi: 'Trung tâm Nạp liệu' },
        { field: 'nav.system_admin_hub', en: 'System & Security Hub', vi: 'Quản trị Hệ thống' },
      ],
    },

    // 2. PAGE_TITLES_UI
    {
      entityType: 'PAGE_TITLES_UI',
      entityId: '00000000-0000-0000-0000-000000000021',
      items: [
        { field: 'title.dashboard', en: 'Dashboard', vi: 'Bảng điều khiển' },
        { field: 'title.user_guide', en: 'User Guide', vi: 'Hướng dẫn sử dụng' },
        { field: 'title.notifications', en: 'Notifications & Email Hub', vi: 'Trung tâm Thông báo & Email' },
        { field: 'title.evaluations', en: 'Evaluations Hub', vi: 'Trung tâm Đánh giá Hiệu suất' },
        { field: 'title.cycles', en: 'Evaluation Cycles Hub', vi: 'Quản lý Chu kỳ & Tiến độ Đánh giá' },
        { field: 'title.templates', en: 'KPI & Templates Studio', vi: 'Trung tâm Tiêu chí & Biểu mẫu' },
        { field: 'title.reports', en: 'Performance Reports Hub', vi: 'Trung tâm Báo cáo Hiệu suất' },
        { field: 'title.system_admin', en: 'System & Security Hub', vi: 'Quản trị Hệ thống & Bảo mật' },
      ],
    },

    // 3. NOTIFICATIONS_HUB_UI
    {
      entityType: 'NOTIFICATIONS_HUB_UI',
      entityId: '00000000-0000-0000-0000-000000000030',
      items: [
        { field: 'notifications.hub_title', en: 'Notifications & Email Hub', vi: 'Trung Tâm Thông Báo & Email (Notifications Hub)' },
        { field: 'notifications.hub_subtitle', en: 'Configure personal preferences, manage bilingual email templates, and track delivery status by role.', vi: 'Cấu hình tùy chọn nhận tin cá nhân, quản lý thông báo và theo dõi lịch sử gửi theo phân quyền' },
        { field: 'notifications.role_label', en: 'Role', vi: 'Vai trò' },
        { field: 'notifications.tab.preferences', en: 'Preferences', vi: 'Tùy chọn thông báo' },
        { field: 'notifications.badge.personal', en: 'Personal', vi: 'Cá nhân' },
        { field: 'notifications.desc.preferences', en: 'Customize email notification events: evaluation results, submission deadlines, score adjustments...', vi: 'Tùy chỉnh các loại sự kiện nhận qua Email: kết quả đánh giá, nhắc nhở hạn nộp, điều chỉnh điểm...' },
        { field: 'notifications.tab.templates', en: 'Email Templates', vi: 'Mẫu Email' },
        { field: 'notifications.badge.admin', en: 'Admin', vi: 'Quản trị' },
        { field: 'notifications.desc.templates', en: 'Manage, draft, and customize bilingual email templates for each stage of the KPI cycle', vi: 'Quản lý, soạn thảo và tùy biến mẫu thông báo email song ngữ theo từng trạng thái chu kỳ KPI' },
        { field: 'notifications.tab.logs', en: 'Delivery Logs', vi: 'Nhật ký gửi' },
        { field: 'notifications.badge.system', en: 'System', vi: 'Hệ thống' },
        { field: 'notifications.desc.logs', en: 'Monitor notification delivery logs, inspect failed emails, and trigger resends', vi: 'Theo dõi lịch sử phát thông báo, kiểm tra email gửi thất bại và thực hiện gửi lại' },

        // Notification Preferences Tab details
        { field: 'notifications.preferences.title', en: 'Email Notification Preferences', vi: 'Tùy chọn nhận thông báo qua Email' },
        { field: 'notifications.preferences.desc', en: 'Manage the types of notification events you want to receive via corporate email. Configurations are applied immediately to your account.', vi: 'Quản lý các loại thông báo sự kiện bạn muốn nhận qua email cơ quan. Cấu hình sẽ được áp dụng ngay lập tức cho tài khoản của bạn.' },
        { field: 'notifications.preferences.col_type', en: 'NOTIFICATION EVENT TYPE', vi: 'LOẠI THÔNG BÁO SỰ KIỆN' },
        { field: 'notifications.preferences.col_status', en: 'STATUS', vi: 'TRẠNG THÁI' },
        { field: 'notifications.preferences.rule17_mandatory', en: 'Mandatory (Rule 17)', vi: 'Bắt buộc (Rule 17)' },
        { field: 'notifications.preferences.rule17_tooltip', en: 'Mandatory Rule 17: Official evaluation result notification cannot be disabled', vi: 'Quy tắc bắt buộc Rule 17: Thông báo kết quả đánh giá chính thức không thể bị tắt' },
        { field: 'notifications.preferences.save_btn', en: 'Save Changes', vi: 'Lưu thay đổi' },
        { field: 'notifications.preferences.saving', en: 'Saving...', vi: 'Đang lưu...' },
        { field: 'notifications.preferences.save_success', en: 'Notification preferences saved successfully!', vi: 'Đã lưu tùy chọn thông báo thành công!' },
        { field: 'notifications.preferences.save_error', en: 'Failed to update notification preferences.', vi: 'Lỗi khi cập nhật cài đặt thông báo.' },
        { field: 'notifications.preferences.load_error', en: 'Unable to load notification preferences.', vi: 'Không thể tải cài đặt thông báo.' },
        { field: 'notifications.preferences.loading', en: 'Loading notification preferences...', vi: 'Đang tải tùy chọn thông báo...' },
        { field: 'notifications.preferences.test_btn', en: 'Test Email Notification', vi: 'Thử Nghiệm Gửi Email' },

        // Test Notification Modal
        { field: 'notifications.test.modal_title', en: 'SMTP Notification Delivery Test', vi: 'Thử Nghiệm Gửi Thông Báo SMTP' },
        { field: 'notifications.test.recipient_label', en: 'Recipient Email', vi: 'Email người nhận' },
        { field: 'notifications.test.recipient_hint', en: 'Enter any valid email address to test real-time Google Workspace SMTP Relay delivery.', vi: 'Nhập địa chỉ email bất kỳ bạn muốn nhận email kiểm tra để thử nghiệm Google Workspace SMTP Relay.' },
        { field: 'notifications.test.type_label', en: 'Notification Event / Template', vi: 'Loại thông báo / Biểu mẫu thử nghiệm' },
        { field: 'notifications.test.close_btn', en: 'Close', vi: 'Đóng' },
        { field: 'notifications.test.send_btn', en: 'Send Test Email Now', vi: 'Gửi Test Email Ngay' },
        { field: 'notifications.test.sending_btn', en: 'Connecting & sending...', vi: 'Đang kết nối & gửi...' },

        // 9 Notification Event Types
        { field: 'notifications.type.result_published.title', en: 'Official Evaluation Result Published', vi: 'Kết quả đánh giá chính thức' },
        { field: 'notifications.type.result_published.desc', en: 'Receive an email when official KPI scores and grade ratings are published.', vi: 'Nhận email khi điểm số và xếp loại KPI chính thức được công bố.' },
        { field: 'notifications.type.cycle_opened.title', en: 'Evaluation Cycle Opened', vi: 'Mở kỳ đánh giá KPI mới' },
        { field: 'notifications.type.cycle_opened.desc', en: 'Receive an email notification when a new evaluation cycle starts with submission deadlines.', vi: 'Nhận email thông báo khi công ty bắt đầu một chu kỳ đánh giá mới kèm hạn nộp.' },
        { field: 'notifications.type.self_submitted.title', en: 'Self-Assessment Submitted', vi: 'Xác nhận nộp tự đánh giá' },
        { field: 'notifications.type.self_submitted.desc', en: 'Receive a confirmation email when you submit your self-assessment form.', vi: 'Nhận email xác nhận khi bạn đã hoàn thành và nộp bảng tự đánh giá.' },
        { field: 'notifications.type.manager_submitted.title', en: 'Manager Review Completed', vi: 'Quản lý hoàn thành đánh giá' },
        { field: 'notifications.type.manager_submitted.desc', en: 'Receive a notification when your direct manager completes your performance evaluation.', vi: 'Nhận thông báo khi quản lý trực tiếp đã hoàn thành đánh giá nhân viên.' },
        { field: 'notifications.type.correction_requested.title', en: 'Evaluation Revision Requested', vi: 'Yêu cầu điều chỉnh đánh giá' },
        { field: 'notifications.type.correction_requested.desc', en: 'Receive a notification with reasons when an evaluation form is rejected or requires adjustments.', vi: 'Nhận thông báo kèm lý do khi bảng đánh giá bị từ chối hoặc cần điều chỉnh.' },
        { field: 'notifications.type.score_adjusted.title', en: 'Score Adjusted in Calibration', vi: 'Hiệu chuẩn điểm KPI' },
        { field: 'notifications.type.score_adjusted.desc', en: 'Receive an email notification when KPI scores are adjusted by the calibration committee.', vi: 'Nhận email thông báo khi điểm KPI được hội đồng hiệu chuẩn điều chỉnh.' },
        { field: 'notifications.type.review_due_reminder.title', en: 'Review Due Date Reminder', vi: 'Nhắc nhở hạn chót đánh giá' },
        { field: 'notifications.type.review_due_reminder.desc', en: 'Receive a reminder email when the evaluation submission deadline is approaching.', vi: 'Nhận email nhắc nhở khi sắp đến hạn chót hoàn thành đánh giá KPI.' },
        { field: 'notifications.type.import_completed.title', en: 'Data Import Completed', vi: 'Nhập dữ liệu hoàn tất' },
        { field: 'notifications.type.import_completed.desc', en: 'Receive a notification when KPI or employee bulk data import completes.', vi: 'Nhận thông báo khi tác vụ import danh sách KPI/nhân viên hoàn tất.' },
        { field: 'notifications.type.cycle_locked.title', en: 'Evaluation Cycle Locked', vi: 'Khóa kỳ đánh giá' },
        { field: 'notifications.type.cycle_locked.desc', en: 'Receive a notification when the evaluation cycle officially closes and locks all data.', vi: 'Nhận thông báo khi kỳ đánh giá đã chính thức đóng và khóa toàn bộ dữ liệu.' },
      ],
    },

    // 4. EVALUATIONS_HUB_UI
    {
      entityType: 'EVALUATIONS_HUB_UI',
      entityId: '00000000-0000-0000-0000-000000000031',
      items: [
        { field: 'evaluations.hub_title', en: 'Evaluations Hub', vi: 'Trung Tâm Đánh Giá Hiệu Suất' },
        { field: 'evaluations.hub_subtitle', en: 'Complete self-assessments, conduct manager team reviews, and search employee directory records.', vi: 'Thực hiện tự đánh giá cá nhân, chấm điểm nhân viên đội nhóm và tra cứu hồ sơ đánh giá' },
        { field: 'evaluations.tab.my', en: 'My Evaluations', vi: 'Đánh giá của tôi' },
        { field: 'evaluations.badge.my', en: 'Personal', vi: 'Cá nhân' },
        { field: 'evaluations.desc.my', en: 'Complete individual self-assessment per cycle, track approval status and feedback.', vi: 'Thực hiện bảng tự đánh giá KPI cá nhân theo chu kỳ, theo dõi trạng thái duyệt và phản hồi' },
        { field: 'evaluations.tab.team', en: 'Team Reviews', vi: 'Đánh giá đội nhóm' },
        { field: 'evaluations.badge.team', en: 'Manager', vi: 'Quản lý' },
        { field: 'evaluations.desc.team', en: 'Review submitted self-assessments from direct reports and provide manager ratings.', vi: 'Duyệt bảng tự đánh giá của các thành viên trong đội nhóm và tiến hành chấm điểm quản lý trực tiếp' },
        { field: 'evaluations.tab.search', en: 'Employee Directory', vi: 'Tra cứu nhân sự' },
        { field: 'evaluations.badge.search', en: 'Directory', vi: 'Tra cứu' },
        { field: 'evaluations.desc.search', en: 'Look up employee profiles, job titles, department assignments, and historical evaluation summaries.', vi: 'Tra cứu danh bạ nhân sự, vị trí công tác, phòng ban trực thuộc và lịch sử hồ sơ đánh giá' },
      ],
    },

    // 5. EVALUATION_CYCLES_HUB_UI
    {
      entityType: 'EVALUATION_CYCLES_HUB_UI',
      entityId: '00000000-0000-0000-0000-000000000032',
      items: [
        { field: 'cycles.hub_title', en: 'Evaluation Cycles Hub', vi: 'Quản Lý Chu Kỳ & Tiến Độ' },
        { field: 'cycles.hub_subtitle', en: 'Operate company-wide cycles, individual probation reviews, deadline tracking, and calibration sessions.', vi: 'Tổng hợp điều hành chu kỳ công ty, đánh giá thử việc, cảnh báo tiến độ và phiên họp hiệu chuẩn' },
        { field: 'cycles.tab.cycles', en: 'Company Cycles', vi: 'Chu kỳ công ty' },
        { field: 'cycles.badge.company', en: 'Company-wide', vi: 'Toàn công ty' },
        { field: 'cycles.desc.cycles', en: 'Manage list, lifecycle, and status of organization-wide recurring evaluation cycles (Draft, Open, Lock).', vi: 'Quản lý danh sách, trạng thái và vòng đời các kỳ đánh giá hiệu suất định kỳ của doanh nghiệp' },
        { field: 'cycles.tab.individual', en: 'Individual / Probation', vi: 'Đánh giá cá nhân' },
        { field: 'cycles.badge.individual', en: 'Individual & Probation', vi: 'Cá nhân & Thử việc' },
        { field: 'cycles.desc.individual', en: 'Create dedicated individual evaluation cycles for probation completion, promotions, or ad-hoc reviews.', vi: 'Khởi tạo chu kỳ đánh giá riêng cho nhân sự hết hạn thử việc, bổ nhiệm hoặc yêu cầu đột xuất' },
        { field: 'cycles.tab.review_due', en: 'Review Due', vi: 'Hạn chót & Tiến độ' },
        { field: 'cycles.badge.review_due', en: 'Progress', vi: 'Tiến độ' },
        { field: 'cycles.desc.review_due', en: 'Monitor completion rate, upcoming deadlines, and overdue evaluation submissions across teams.', vi: 'Theo dõi tiến độ hoàn thành, danh sách nhân viên và quản lý sắp tới hạn hoặc trễ hạn nộp đánh giá' },
        { field: 'cycles.tab.cadences', en: 'Review Cadences', vi: 'Tần suất định kỳ' },
        { field: 'cycles.badge.cadences', en: 'Cadence Config', vi: 'Cấu hình' },
        { field: 'cycles.desc.cadences', en: 'Configure automated cycle cadence rules by department (Monthly, Quarterly, Semi-Annual, Annual).', vi: 'Thiết lập quy luật chu kỳ đánh giá tự động theo phòng ban (Hàng tháng, Quý, Nửa năm, Năm)' },
        { field: 'cycles.tab.calibration', en: 'Calibration', vi: 'Hiệu chuẩn điểm' },
        { field: 'cycles.badge.calibration', en: 'HR Calibration', vi: 'Hiệu chuẩn' },
        { field: 'cycles.desc.calibration', en: 'Calibration committee sessions to balance score distributions according to Bell Curve benchmarks.', vi: 'Hội đồng hiệu chuẩn rà soát phân phối điểm số, xếp loại và cân bằng theo đường cong chuẩn (Bell Curve)' },
      ],
    },

    // 6. STUDIO_HUB_UI
    {
      entityType: 'STUDIO_HUB_UI',
      entityId: '00000000-0000-0000-0000-000000000033',
      items: [
        { field: 'studio.hub_title', en: 'KPI & Templates Studio', vi: 'Trung Tâm Tiêu Chí & Biểu Mẫu' },
        { field: 'studio.hub_subtitle', en: 'Define KPI metric libraries, standardize behavioral criteria rules, and design visual evaluation templates.', vi: 'Định nghĩa thư viện chỉ số KPI, chuẩn hóa bộ quy tắc tiêu chí và thiết kế biểu mẫu đánh giá trực quan' },
        { field: 'studio.tab.templates', en: 'Evaluation Templates', vi: 'Mẫu biểu đánh giá' },
        { field: 'studio.badge.templates', en: 'Templates', vi: 'Mẫu biểu' },
        { field: 'studio.desc.templates', en: 'Visual template builder combining quantitative KPIs and qualitative behavioral criteria by job level.', vi: 'Trình thiết kế biểu mẫu đánh giá kết hợp chỉ số định lượng KPI và tiêu chí hành vi theo chức vụ' },
        { field: 'studio.tab.kpis', en: 'KPI Library', vi: 'Thư viện KPI' },
        { field: 'studio.badge.kpis', en: 'KPIs', vi: 'Chỉ số' },
        { field: 'studio.desc.kpis', en: 'Manage performance indicator catalogue, scoring formulas, unit definitions, and default weights.', vi: 'Quản lý danh mục chỉ số đo lường hiệu suất, công thức tính điểm, đơn vị tính và trọng số mẫu' },
        { field: 'studio.tab.criteria', en: 'Criteria & Rules', vi: 'Tiêu chuẩn & Quy tắc' },
        { field: 'studio.badge.criteria', en: 'Criteria Rules', vi: 'Quy tắc' },
        { field: 'studio.desc.criteria', en: 'Configure core competency rubrics, behavioral anchors, rating scales, and score conversion matrices.', vi: 'Xây dựng bộ tiêu chí năng lực, hành vi chuẩn mực, khung thang điểm và ma trận tính điểm' },
      ],
    },

    // 7. SYSTEM_ADMIN_HUB_UI
    {
      entityType: 'SYSTEM_ADMIN_HUB_UI',
      entityId: '00000000-0000-0000-0000-000000000034',
      items: [
        { field: 'sysadmin.hub_title', en: 'System & Security Hub', vi: 'Quản Trị Hệ Thống & Bảo Mật' },
        { field: 'sysadmin.hub_subtitle', en: 'Manage organizational hierarchy, IAM user accounts and RBAC roles, audit logs, and multilingual i18n dictionaries.', vi: 'Quản lý cơ cấu phòng ban, phân quyền tài khoản người dùng, nhật ký kiểm toán và cấu hình đa ngôn ngữ' },
        { field: 'sysadmin.tab.organization', en: 'Organization', vi: 'Cơ cấu tổ chức' },
        { field: 'sysadmin.badge.org', en: 'Organization', vi: 'Tổ chức' },
        { field: 'sysadmin.desc.organization', en: 'Organizational department tree hierarchy, reporting lines, and job title catalogues.', vi: 'Sơ đồ cây phòng ban, phân cấp quản lý và danh mục chức danh chức vụ nhân sự' },
        { field: 'sysadmin.tab.iam', en: 'IAM & Roles', vi: 'Tài khoản & Phân quyền' },
        { field: 'sysadmin.badge.iam', en: 'Security', vi: 'Bảo mật' },
        { field: 'sysadmin.desc.iam', en: 'Manage user login accounts, RBAC system roles, and fine-grained permission assignments.', vi: 'Quản lý tài khoản đăng nhập, nhóm vai trò và ma trận quyền hạn hệ thống (RBAC)' },
        { field: 'sysadmin.tab.audit', en: 'Audit Logs', vi: 'Nhật ký kiểm toán' },
        { field: 'sysadmin.badge.audit', en: 'Monitoring', vi: 'Giám sát' },
        { field: 'sysadmin.desc.audit', en: 'Trace end-to-end user audit logs, score calibrations, administrative changes, and security events.', vi: 'Truy vết toàn bộ lịch sử thao tác, can thiệp số liệu đánh giá và sự kiện bảo mật' },
        { field: 'sysadmin.tab.i18n', en: 'Translations', vi: 'Đa ngôn ngữ' },
        { field: 'sysadmin.badge.i18n', en: 'Localization', vi: 'Bản địa hóa' },
        { field: 'sysadmin.desc.i18n', en: 'Manage English and Vietnamese bilingual dictionary terms for the entire user interface.', vi: 'Quản trị từ điển nhãn giao diện song ngữ Tiếng Việt và Tiếng Anh trên toàn hệ thống' },
      ],
    },

    // 8. REPORTS_HUB_UI
    {
      entityType: 'REPORTS_HUB_UI',
      entityId: '00000000-0000-0000-0000-000000000035',
      items: [
        { field: 'reports.title', en: 'Performance Reports Hub', vi: 'Trung Tâm Báo Cáo Hiệu Suất' },
        { field: 'reports.subtitle', en: 'Track evaluation results, analyze score trends, and export multi-dimensional reports by scope.', vi: 'Theo dõi kết quả đánh giá, phân tích xu hướng điểm số và xuất báo cáo đa chiều theo phạm vi' },
        { field: 'reports.role_scope', en: 'Account Scope', vi: 'Phạm vi tài khoản' },
        { field: 'reports.scope.my', en: 'My Reports', vi: 'Báo cáo của tôi' },
        { field: 'reports.badge.personal', en: 'Personal', vi: 'Cá nhân' },
        { field: 'reports.desc.my', en: 'Detailed scores, competency radar chart, and historical evaluations across cycles.', vi: 'Chi tiết điểm số, radar năng lực và lịch sử đánh giá cá nhân qua các kỳ' },
        { field: 'reports.scope.team', en: 'Team Reports', vi: 'Báo cáo đội nhóm' },
        { field: 'reports.badge.team', en: 'Team & Dept', vi: 'Đội nhóm' },
        { field: 'reports.desc.team', en: 'Rankings, average score distribution, and evaluation progress for direct reports.', vi: 'Xếp hạng, phân phối điểm trung bình và tiến độ đánh giá của các thành viên trong nhóm' },
        { field: 'reports.scope.org', en: 'Organization Reports', vi: 'Báo cáo toàn công ty' },
        { field: 'reports.badge.org', en: 'Organization-wide', vi: 'Toàn tổ chức' },
        { field: 'reports.desc.org', en: 'Overall company performance across departments, KPI achievement rates across the enterprise.', vi: 'Bức tranh tổng thể về hiệu suất giữa các bộ phận, tỷ lệ hoàn thành KPI toàn doanh nghiệp' },
        { field: 'reports.scope.summary', en: 'KPI Summary Dashboard', vi: 'Bảng tổng hợp KPI' },
        { field: 'reports.badge.summary', en: 'Statistics Dashboard', vi: 'Tổng hợp' },
        { field: 'reports.desc.summary', en: 'Grade distribution matrix (S, A, B, C, D) and core performance metric fluctuation analysis.', vi: 'Ma trận thống kê phân bổ hạng S, A, B, C, D và phân tích biến động chỉ số cốt lõi' },
      ],
    },

    // 9. COMMON_UI
    {
      entityType: 'COMMON_UI',
      entityId: '00000000-0000-0000-0000-000000000021',
      items: [
        { field: 'common.role', en: 'Role', vi: 'Vai trò' },
        { field: 'common.close', en: 'Close', vi: 'Đóng' },
        { field: 'common.save', en: 'Save', vi: 'Lưu' },
        { field: 'common.cancel', en: 'Cancel', vi: 'Hủy' },
      ],
    },
  ];

  function toCamelCase(str: string): string {
    return str.replace(/[._]([a-z])/g, (_, letter) => letter.toUpperCase());
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
    'NOTIFICATIONS_HUB_UI',
    'EVALUATIONS_HUB_UI',
    'EVALUATION_CYCLES_HUB_UI',
    'STUDIO_HUB_UI',
    'SYSTEM_ADMIN_HUB_UI',
    'REPORTS_HUB_UI',
  ];

  for (const entityType of entityTypes) {
    pgm.sql(`
      DELETE FROM "i18n_translation"
      WHERE "entity_type" = '${entityType}';
    `);
  }

  pgm.sql(`
    DELETE FROM "i18n_translation"
    WHERE "entity_type" = 'COMMON_UI' AND "field_name" IN ('common.role', 'commonRole');
  `);
}
