import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  const dashboardUiId = 'd0000000-0000-0000-0000-000000000001';

  const translations = [
    // Header & Role
    { field: 'dashboard', en: 'Dashboard', vi: 'Bảng điều khiển' },
    { field: 'page_title', en: 'Performance & Statistics Overview', vi: 'Tổng quan Hiệu suất & Thống kê' },
    { field: 'page_subtitle', en: 'Role-Based Dashboard & Summary Statistics', vi: 'Thống kê tổng hợp theo vai trò' },
    { field: 'role_employee', en: 'Employee Dashboard', vi: 'Bảng điều khiển Nhân viên' },
    { field: 'role_manager', en: 'Manager Dashboard', vi: 'Bảng điều khiển Quản lý' },
    { field: 'role_hr_admin', en: 'HR Admin Dashboard', vi: 'Bảng điều khiển Quản trị Nhân sự' },
    { field: 'role_system_admin', en: 'System Admin Dashboard', vi: 'Bảng điều khiển Quản trị Hệ thống' },
    { field: 'last_updated', en: 'Updated', vi: 'Cập nhật' },
    { field: 'refresh', en: 'Refresh', vi: 'Làm mới' },
    { field: 'refreshing', en: 'Refreshing...', vi: 'Đang làm mới...' },

    // Summary Cards
    { field: 'total_employees', en: 'Total Employees', vi: 'Tổng số nhân viên' },
    { field: 'active_employees', en: 'active employees', vi: 'nhân viên đang làm việc' },
    { field: 'total_evaluations', en: 'Total Evaluations', vi: 'Tổng số đánh giá' },
    { field: 'completed_evaluations', en: 'completed', vi: 'đã hoàn thành' },
    { field: 'published_evaluations', en: 'published', vi: 'đã công bố' },
    { field: 'completion_rate', en: 'Completion Rate', vi: 'Tỷ lệ hoàn thành' },
    { field: 'org_cycle_progress', en: 'Organization cycle progress', vi: 'Tiến độ chu kỳ toàn tổ chức' },
    { field: 'team_cycle_progress', en: 'Team cycle progress', vi: 'Tiến độ chu kỳ nhóm' },
    { field: 'organization_average', en: 'Organization Average', vi: 'Điểm TB toàn tổ chức' },
    { field: 'team_average', en: 'Team Average', vi: 'Điểm trung bình nhóm' },
    { field: 'overall_mean_score', en: 'Overall mean evaluation score', vi: 'Điểm đánh giá bình quân chung' },
    { field: 'overdue_reviews', en: 'Overdue Reviews', vi: 'Đánh giá quá hạn' },
    { field: 'team_members', en: 'Team Members', vi: 'Thành viên nhóm' },
    { field: 'members_across_teams', en: 'members across teams', vi: 'thành viên thuộc các nhóm' },
    { field: 'employees_across_departments', en: 'Employees across departments', vi: 'Nhân viên các phòng ban' },
    { field: 'in_progress', en: 'In Progress', vi: 'Đang thực hiện' },
    { field: 'pending_review', en: 'Pending Review', vi: 'Chờ đánh giá' },
    { field: 'self_assessment', en: 'Self Assessment', vi: 'Tự đánh giá' },
    { field: 'manager_assessment', en: 'Manager Assessment', vi: 'Quản lý đánh giá' },
    { field: 'last_cycle_score', en: 'Last Cycle Score', vi: 'Điểm chu kỳ trước' },
    { field: 'review_schedule', en: 'Review Schedule', vi: 'Lịch đánh giá' },
    { field: 'due_date', en: 'Due Date', vi: 'Hạn chót' },

    // Charts
    { field: 'score_distribution', en: 'Score Distribution', vi: 'Phân phối điểm đánh giá' },
    { field: 'team_score_distribution', en: 'Team Score Distribution', vi: 'Phân phối điểm của nhóm' },
    { field: 'org_score_distribution', en: 'Organization Score Distribution', vi: 'Phân phối điểm toàn tổ chức' },
    { field: 'distribution_anonymous_note', en: 'Distribution of evaluation scores across all teams (strictly anonymous aggregate)', vi: 'Phân phối điểm đánh giá trên toàn bộ các nhóm (tổng hợp ẩn danh)' },
    { field: 'team_distribution_anonymous_note', en: 'Distribution of team member scores across score ranges (strictly anonymous aggregate)', vi: 'Phân phối điểm các thành viên trong nhóm theo thang điểm (tổng hợp ẩn danh)' },
    { field: 'workflow_distribution', en: 'Workflow Distribution', vi: 'Phân bổ trạng thái quy trình' },
    { field: 'org_workflow_distribution', en: 'Organization Workflow Distribution', vi: 'Phân bổ quy trình toàn tổ chức' },
    { field: 'team_workflow_distribution', en: 'Team Workflow Distribution', vi: 'Phân bổ quy trình nhóm' },
    { field: 'score_trend', en: 'Score Progression Trend', vi: 'Xu hướng điểm qua các chu kỳ' },
    { field: 'score_breakdown', en: 'Competency Breakdown & Key Strengths', vi: 'Chi tiết năng lực & Thế mạnh nổi bật' },
    { field: 'top_strengths', en: 'Top Strengths', vi: 'Thế mạnh hàng đầu' },
    { field: 'growth_areas', en: 'Areas for Development', vi: 'Điểm cần cải thiện' },
    { field: 'historical_evaluations', en: 'Historical evaluation score progression', vi: 'Tiến trình điểm đánh giá qua các chu kỳ trước' },
    { field: 'highest_scoring_criteria', en: 'Highest scoring evaluation criteria in current cycle', vi: 'Các tiêu chí có điểm số cao nhất trong chu kỳ hiện tại' },
    { field: 'no_strengths_data', en: 'No competency breakdown data available yet', vi: 'Chưa có dữ liệu phân tích năng lực' },
    { field: 'no_trend_data', en: 'No historical score trends available yet', vi: 'Chưa có dữ liệu xu hướng lịch sử' },

    // Review Cadence
    { field: 'review_cadence_summary', en: 'Review Due & Cadence Status', vi: 'Tình trạng hạn chu kỳ đánh giá' },
    { field: 'cadence_overdue', en: 'Overdue', vi: 'Quá hạn' },
    { field: 'cadence_upcoming', en: 'Upcoming', vi: 'Sắp tới' },
    { field: 'cadence_upcoming_30d', en: 'Upcoming (Within 30d)', vi: 'Sắp tới (Trong 30 ngày)' },
    { field: 'cadence_not_due', en: 'On Schedule / Not Due', vi: 'Đúng tiến độ / Chưa đến hạn' },
    { field: 'cadence_no_schedule', en: 'No Schedule', vi: 'Chưa có lịch' },
    { field: 'upcoming', en: 'Upcoming', vi: 'Sắp tới' },
    { field: 'not_due', en: 'On Schedule', vi: 'Đúng hạn' },
    { field: 'no_schedule', en: 'No Schedule', vi: 'Chưa xếp lịch' },

    // Attention
    { field: 'action_required', en: 'Action Required', vi: 'Cần xử lý ngay' },
    { field: 'take_action', en: 'Take Action', vi: 'Thực hiện ngay' },
    { field: 'view_all', en: 'View All', vi: 'Xem tất cả' },
    { field: 'self_assessment_pending', en: 'Self-Assessment Pending', vi: 'Chờ hoàn thành tự đánh giá' },
    { field: 'self_assessment_pending_msg', en: 'Your self-evaluation is awaiting submission for the current cycle.', vi: 'Bản tự đánh giá của bạn đang chờ gửi trong chu kỳ hiện tại.' },
    { field: 'review_due_soon', en: 'Review Due Soon', vi: 'Sắp đến hạn đánh giá' },
    { field: 'review_overdue', en: 'Evaluation Overdue', vi: 'Đánh giá đã quá hạn' },

    // Table
    { field: 'dept_team_overview', en: 'Department & Team Performance Overview', vi: 'Tổng quan hiệu suất Phòng ban & Đội nhóm' },
    { field: 'team_col', en: 'Team', vi: 'Đội ngũ / Nhóm' },
    { field: 'dept_col', en: 'Department', vi: 'Phòng ban' },
    { field: 'members_col', en: 'Members', vi: 'Thành viên' },
    { field: 'completed_col', en: 'Completed', vi: 'Đã hoàn thành' },
    { field: 'completion_rate_col', en: 'Completion Rate', vi: 'Tỷ lệ hoàn thành' },
    { field: 'avg_score_col', en: 'Average Score', vi: 'Điểm trung bình' },

    // System Admin
    { field: 'total_users', en: 'Total Users', vi: 'Tổng số người dùng' },
    { field: 'active_system_users', en: 'Active system users', vi: 'Người dùng đang hoạt động' },
    { field: 'total_roles', en: 'Configured Roles', vi: 'Vai trò hệ thống' },
    { field: 'roles_in_system', en: 'Roles defined in system', vi: 'Vai trò thiết lập trong hệ thống' },
    { field: 'total_teams', en: 'Teams', vi: 'Nhóm' },
    { field: 'across_departments', en: 'Across departments', vi: 'Thuộc các phòng ban' },
    { field: 'total_departments', en: 'Departments', vi: 'Phòng ban' },
    { field: 'active_departments', en: 'Active organizational units', vi: 'Đơn vị tổ chức hoạt động' },
    { field: 'total_cycles', en: 'Evaluation Cycles', vi: 'Chu kỳ đánh giá' },
    { field: 'all_recorded_cycles', en: 'All recorded cycles', vi: 'Tất cả các chu kỳ đã tạo' },
    { field: 'published_templates', en: 'Published Templates', vi: 'Mẫu đánh giá công bố' },
    { field: 'active_evaluation_templates', en: 'Active evaluation templates', vi: 'Mẫu đánh giá đang sử dụng' },
    { field: 'audit_events_24h', en: 'Audit Events', vi: 'Sự kiện kiểm toán' },
    { field: 'events_recorded_in_system', en: 'Events recorded in system', vi: 'Sự kiện ghi nhận trong hệ thống' },
    { field: 'recent_system_activity', en: 'Recent System & Audit Activity', vi: 'Hoạt động hệ thống & Kiểm toán gần đây' },
    { field: 'operational_health', en: 'System & Service Status', vi: 'Tình trạng hệ thống & Dịch vụ' },
    { field: 'all_systems_operational', en: 'All services operational', vi: 'Tất cả dịch vụ hoạt động bình thường' },
    { field: 'db_connected', en: 'Database Connected', vi: 'Cơ sở dữ liệu kết nối' },
    { field: 'services_healthy', en: 'Services Healthy', vi: 'Dịch vụ hoạt động tốt' },
    { field: 'audit_active', en: 'Audit Logging Active', vi: 'Ghi nhật ký kiểm toán bật' },
    { field: 'no_recent_events', en: 'No recent audit events recorded', vi: 'Chưa có sự kiện kiểm toán gần đây' },

    // Empty & Error
    { field: 'empty_dashboard_title', en: 'No Evaluation Data Available', vi: 'Chưa có dữ liệu đánh giá' },
    { field: 'empty_dashboard_desc', en: 'There are no active evaluation records or statistics for this cycle.', vi: 'Chưa có bản ghi đánh giá hoặc số liệu thống kê nào trong chu kỳ này.' },
    { field: 'error_dashboard_title', en: 'Unable to Load Dashboard', vi: 'Không thể tải bảng thống kê' },
    { field: 'error_403_title', en: 'Access Restricted', vi: 'Quyền truy cập bị hạn chế' },
    { field: 'error_403_desc', en: 'You do not have permission to view dashboard statistics for this scope.', vi: 'Bạn không có quyền xem thống kê bảng điều khiển cho phạm vi này.' },
    { field: 'retry', en: 'Retry', vi: 'Thử lại' },
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
        VALUES ('DASHBOARD_UI', '${dashboardUiId}', '${f}', 'en', '${item.en.replace(/'/g, "''")}')
        ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
        DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
      `);

      // Vietnamese translation
      pgm.sql(`
        INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
        VALUES ('DASHBOARD_UI', '${dashboardUiId}', '${f}', 'vi', '${item.vi.replace(/'/g, "''")}')
        ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
        DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
      `);
    }
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const dashboardUiId = 'd0000000-0000-0000-0000-000000000001';
  pgm.sql(`
    DELETE FROM "i18n_translation"
    WHERE "entity_type" = 'DASHBOARD_UI' AND "entity_id" = '${dashboardUiId}';
  `);
}
