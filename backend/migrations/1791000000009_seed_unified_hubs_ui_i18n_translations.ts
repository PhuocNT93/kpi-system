import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * UI translations for the unified multi-tab hubs:
 * 1. NAVIGATION_UI & PAGE_TITLES_UI updates for streamlined sidebar
 * 2. NOTIFICATIONS_HUB_UI (Unified Notifications Page)
 * 3. EVALUATIONS_HUB_UI (Unified Evaluations Page)
 * 4. EVALUATION_CYCLES_HUB_UI (Unified Evaluation Cycles Page)
 * 5. STUDIO_HUB_UI (KPI & Templates Studio Page)
 * 6. SYSTEM_ADMIN_HUB_UI (System & Security Hub Page)
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
        { field: 'nav.notifications', en: 'Notifications & Email', vi: 'Thông báo & Email' },
        { field: 'nav.evaluations_hub', en: 'Evaluations Hub', vi: 'Trung tâm Đánh giá' },
        { field: 'nav.cycles_hub', en: 'Evaluation Cycles Hub', vi: 'Quản lý Chu kỳ Đánh giá' },
        { field: 'nav.studio_hub', en: 'KPI & Templates Studio', vi: 'Tiêu chí & Biểu mẫu' },
        { field: 'nav.system_admin_hub', en: 'System & Security Hub', vi: 'Quản trị Hệ thống' },
      ],
    },

    // 2. PAGE_TITLES_UI
    {
      entityType: 'PAGE_TITLES_UI',
      entityId: '00000000-0000-0000-0000-000000000021',
      items: [
        { field: 'title.notifications', en: 'Notifications & Email Hub', vi: 'Trung tâm Thông báo & Email' },
        { field: 'title.evaluations', en: 'Evaluations Hub', vi: 'Trung tâm Đánh giá Hiệu suất' },
        { field: 'title.cycles', en: 'Evaluation Cycles Hub', vi: 'Quản lý Chu kỳ & Tiến độ Đánh giá' },
        { field: 'title.templates', en: 'KPI & Templates Studio', vi: 'Trung tâm Tiêu chí & Biểu mẫu' },
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
  ];

  for (const entityType of entityTypes) {
    pgm.sql(`
      DELETE FROM "i18n_translation"
      WHERE "entity_type" = '${entityType}';
    `);
  }
}
