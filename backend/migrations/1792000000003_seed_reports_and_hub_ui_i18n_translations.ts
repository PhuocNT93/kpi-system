import type { MigrationBuilder } from 'node-pg-migrate';

// Performance Reports UI strings plus shared hub role labels. Uses the REPORTS_UI entity
// from 1791000000006, which this migration updates (un-numbered tab labels, no "ranking"
// wording) and extends with the tab content strings.
const ENTITY_TYPE = 'REPORTS_UI';
const ENTITY_ID = '00000000-0000-0000-0000-000000000016';

interface Translation {
  field: string;
  en: string;
  vi: string;
}

// Values seeded by 1791000000006, restored on down.
const UPDATED_PREVIOUS: Translation[] = [
  { field: 'reports.scope.my', en: '1. My Report', vi: '1. Báo cáo của tôi' },
  { field: 'reports.scope.team', en: '2. Team Report', vi: '2. Báo cáo Đội nhóm' },
  { field: 'reports.scope.org', en: '3. Organization Report', vi: '3. Báo cáo Toàn công ty' },
  { field: 'reports.scope.summary', en: '4. KPI Summary Dashboard', vi: '4. Bảng tổng hợp KPI' },
  {
    field: 'reports.desc.team',
    en: 'Rankings, average score distribution, and evaluation progress of team members',
    vi: 'Xếp hạng, phân phối điểm trung bình và tiến độ đánh giá của các thành viên trong nhóm',
  },
  {
    field: 'reports.desc.summary',
    en: 'Grade distribution matrix S, A, B, C, D and core metric trend analysis',
    vi: 'Ma trận thống kê phân bổ hạng S, A, B, C, D và phân tích biến động chỉ số cốt lõi',
  },
];

const UPDATED: Translation[] = [
  { field: 'reports.scope.my', en: 'My Report', vi: 'Báo cáo của tôi' },
  { field: 'reports.scope.team', en: 'Team Report', vi: 'Báo cáo đội nhóm' },
  { field: 'reports.scope.org', en: 'Organization Report', vi: 'Báo cáo toàn công ty' },
  { field: 'reports.scope.summary', en: 'KPI Summary Dashboard', vi: 'Tổng hợp KPI' },
  {
    field: 'reports.desc.team',
    en: 'Average scores, score distribution, and evaluation progress of team members',
    vi: 'Điểm trung bình, phân phối điểm và tiến độ đánh giá của các thành viên trong nhóm',
  },
  {
    field: 'reports.desc.summary',
    en: "Look up an employee's official scores, criteria breakdown, and KPI relationships",
    vi: 'Tra cứu điểm chính thức, chi tiết tiêu chí và quan hệ KPI của từng nhân viên',
  },
];

// Readable role names shared by the hub banners (Performance Reports, System & Security).
const COMMON_ENTITY_TYPE = 'COMMON_UI';
const COMMON_ENTITY_ID = '00000000-0000-0000-0000-000000000021';
const COMMON_ADDED: Translation[] = [
  // IAM filter labels (label above the control, as in the Audit Logs filter bar).
  { field: 'iam.filter.search', en: 'Search', vi: 'Tìm kiếm' },
  { field: 'iam.filter.role', en: 'Role', vi: 'Vai trò' },
  { field: 'iam.filter.status', en: 'Status', vi: 'Trạng thái' },
  { field: 'iam.filter.module', en: 'Module', vi: 'Phân hệ' },
  { field: 'common.role_label.system_admin', en: 'System Admin', vi: 'Quản trị hệ thống' },
  { field: 'common.role_label.hr_admin', en: 'HR Admin', vi: 'Quản trị nhân sự' },
  { field: 'common.role_label.manager', en: 'Manager', vi: 'Quản lý' },
  { field: 'common.role_label.employee', en: 'Employee', vi: 'Nhân viên' },
];

// Organization UI labels added by this task (root title, sub-tabs, create buttons, table columns) in the System & Security Hub.
const ORGANIZATION_ENTITY_TYPE = 'ORGANIZATION_UI';
const ORGANIZATION_ENTITY_ID = '00000000-0000-0000-0000-000000000001';
const ORGANIZATION_ADDED: Translation[] = [
  // Root of the org tree; distinct from the Departments sub-tab it contains.
  { field: 'org.structure.root', en: 'Organization Overview', vi: 'Tổng quan tổ chức' },
  // Organization table columns; feature-prefixed because the flat UI dictionary let
  // REVIEW_DUE_UI's col_status ("Due Status") and col_actions override them.
  { field: 'org.col.status', en: 'Status', vi: 'Trạng thái' },
  { field: 'org.col.actions', en: 'Actions', vi: 'Thao tác' },
  { field: 'org.col.cadence', en: 'Cadence', vi: 'Chu kỳ đánh giá' },
  { field: 'org.col.last_review', en: 'Last Review', vi: 'Lần đánh giá gần nhất' },
  { field: 'org.col.next_review', en: 'Next Review', vi: 'Lần đánh giá tiếp theo' },
  { field: 'org.field.active', en: 'Active', vi: 'Đang hoạt động' },
  // Create buttons shown beside the Org Structure sub-tabs.
  { field: 'org.action.create_department', en: '+ Create Department', vi: '+ Tạo phòng ban' },
  { field: 'org.action.create_team', en: '+ Create Team', vi: '+ Tạo đội nhóm' },
  { field: 'org.action.add_employee', en: '+ Add Employee', vi: '+ Thêm nhân viên' },
  { field: 'org.subtab.departments', en: 'Departments', vi: 'Phòng ban' },
  { field: 'org.subtab.teams', en: 'Teams', vi: 'Đội nhóm' },
  { field: 'org.subtab.employees', en: 'Employees', vi: 'Nhân viên' },
  { field: 'org.subtab.members', en: 'Members', vi: 'Thành viên' },
  { field: 'org.subtab.formula', en: 'Evaluation Formula', vi: 'Công thức đánh giá' },
];

const ADDED: Translation[] = [
  { field: 'reports.team.subtab.averages', en: 'KPI Averages', vi: 'KPI trung bình' },
  { field: 'reports.team.subtab.trend', en: 'KPI Trend', vi: 'Xu hướng KPI' },
  // Shared
  { field: 'reports.common.filters', en: 'Report Filters', vi: 'Bộ lọc báo cáo' },
  { field: 'reports.common.cycle', en: 'Evaluation Cycle', vi: 'Kỳ đánh giá' },
  { field: 'reports.common.cycles_load_error', en: 'Failed to load cycles', vi: 'Không tải được danh sách kỳ đánh giá' },
  { field: 'reports.common.loading_cycles', en: 'Loading cycle...', vi: 'Đang tải kỳ đánh giá...' },
  { field: 'reports.common.no_comparison', en: 'No comparison', vi: 'Không so sánh' },
  { field: 'reports.common.data_as_of', en: 'Data as of {time}', vi: 'Dữ liệu tính đến {time}' },
  { field: 'reports.common.select_cycle', en: 'Please select an evaluation cycle from the dropdown above.', vi: 'Vui lòng chọn kỳ đánh giá ở bộ lọc phía trên.' },
  {
    field: 'reports.common.load_error',
    en: "You don't have permission to view this report or data is unavailable.",
    vi: 'Bạn không có quyền xem báo cáo này hoặc dữ liệu chưa sẵn sàng.',
  },
  { field: 'reports.common.no_score_hint', en: 'Scores appear once evaluations are completed.', vi: 'Điểm sẽ hiển thị khi các đánh giá được hoàn tất.' },
  { field: 'reports.common.out_of_100', en: 'Out of 100 points', vi: 'Trên thang 100 điểm' },
  { field: 'reports.common.completed_of', en: '{completed} / {total} Employees Completed', vi: '{completed} / {total} nhân viên đã hoàn tất' },

  // My report
  { field: 'reports.my.title', en: 'Performance Report', vi: 'Báo cáo hiệu suất' },
  { field: 'reports.my.description', en: 'View your evaluation scores and KPI breakdown for the selected cycle.', vi: 'Xem điểm đánh giá và chi tiết KPI của bạn trong kỳ đã chọn.' },
  { field: 'reports.my.locked', en: 'Evaluation Locked', vi: 'Đánh giá đã khóa' },
  { field: 'reports.my.loading', en: 'Loading performance report...', vi: 'Đang tải báo cáo hiệu suất...' },
  { field: 'reports.my.empty_title', en: 'No Evaluation Record', vi: 'Chưa có bản ghi đánh giá' },
  { field: 'reports.my.empty_desc', en: 'There is no evaluation record found for this cycle.', vi: 'Không tìm thấy bản ghi đánh giá nào trong kỳ này.' },
  { field: 'reports.my.final_score', en: 'Final Score', vi: 'Điểm cuối cùng' },
  { field: 'reports.my.manager_score', en: 'Manager Score', vi: 'Điểm quản lý' },
  { field: 'reports.my.self_score', en: 'Self Score', vi: 'Điểm tự đánh giá' },
  { field: 'reports.my.kpi_title', en: 'Your KPI Breakdown', vi: 'Chi tiết KPI của bạn' },
  { field: 'reports.my.no_profile_title', en: 'No employee profile linked', vi: 'Tài khoản chưa gắn với hồ sơ nhân viên' },
  {
    field: 'reports.my.no_profile_desc',
    en: 'This account is not linked to an employee profile, so there is no personal report. Use the Team, Organization or KPI Summary tabs instead.',
    vi: 'Tài khoản này chưa gắn với hồ sơ nhân viên nên không có báo cáo cá nhân. Hãy dùng các tab Đội nhóm, Toàn công ty hoặc Tổng hợp KPI.',
  },

  // Team report
  { field: 'reports.team.title', en: 'Team Dashboard', vi: 'Bảng điều khiển đội nhóm' },
  { field: 'reports.team.description', en: 'View aggregated evaluation scores, KPI progress, and compliance metrics for your team.', vi: 'Xem điểm đánh giá tổng hợp, tiến độ KPI và mức độ tuân thủ của đội nhóm.' },
  { field: 'reports.team.team_label', en: 'Team', vi: 'Đội nhóm' },
  { field: 'reports.team.select_team', en: 'Select a team...', vi: 'Chọn đội nhóm...' },
  { field: 'reports.team.current_cycle', en: 'Current Cycle', vi: 'Kỳ hiện tại' },
  { field: 'reports.team.compare_cycle', en: 'Compare with (Previous Cycle)', vi: 'So sánh với (kỳ trước)' },
  { field: 'reports.team.select_prompt', en: 'Please select a team and evaluation cycle from the filters above.', vi: 'Vui lòng chọn đội nhóm và kỳ đánh giá ở bộ lọc phía trên.' },
  { field: 'reports.team.loading', en: 'Loading team dashboard...', vi: 'Đang tải báo cáo đội nhóm...' },
  { field: 'reports.team.empty_title', en: 'No Team Evaluation Data', vi: 'Chưa có dữ liệu đánh giá của đội nhóm' },
  { field: 'reports.team.empty_desc', en: 'No evaluation data found for this team in the selected cycle.', vi: 'Không tìm thấy dữ liệu đánh giá của đội nhóm này trong kỳ đã chọn.' },
  { field: 'reports.team.average_score', en: 'Team Average Score', vi: 'Điểm trung bình đội nhóm' },
  { field: 'reports.team.completion_rate', en: 'Completion Rate', vi: 'Tỷ lệ hoàn tất' },
  { field: 'reports.team.member_count', en: 'Total Team Members', vi: 'Tổng số thành viên' },
  { field: 'reports.team.kpi_title', en: 'Team KPI Averages', vi: 'KPI trung bình của đội nhóm' },
  { field: 'reports.team.trend_pick_title', en: 'Choose a comparison cycle to see KPI trends.', vi: 'Chọn kỳ so sánh để xem xu hướng KPI.' },
  { field: 'reports.team.trend_pick_desc', en: 'Use "Compare with (Previous Cycle)" in the filters above.', vi: 'Dùng ô "So sánh với (kỳ trước)" ở bộ lọc phía trên.' },

  // Organization report
  { field: 'reports.org.title', en: 'Organization Dashboard', vi: 'Bảng điều khiển toàn công ty' },
  { field: 'reports.org.description', en: 'View organizational performance and completion metrics across all departments and teams.', vi: 'Xem hiệu suất và tỷ lệ hoàn tất đánh giá của toàn bộ phòng ban và đội nhóm.' },
  { field: 'reports.org.loading', en: 'Loading organization dashboard...', vi: 'Đang tải báo cáo toàn công ty...' },
  { field: 'reports.org.empty_title', en: 'No Organization Data', vi: 'Chưa có dữ liệu toàn công ty' },
  { field: 'reports.org.empty_desc', en: 'No organizational report data found for the selected cycle.', vi: 'Không tìm thấy dữ liệu báo cáo toàn công ty trong kỳ đã chọn.' },
  { field: 'reports.org.average_score', en: 'Organization Average Score', vi: 'Điểm trung bình toàn công ty' },
  { field: 'reports.org.completion_rate', en: 'Overall Completion Rate', vi: 'Tỷ lệ hoàn tất chung' },
  { field: 'reports.org.distribution_title', en: 'Score Distribution', vi: 'Phân phối điểm' },
  { field: 'reports.org.distribution_hint', en: 'Aggregate counts only — no individual ranking.', vi: 'Chỉ số liệu tổng hợp — không xếp hạng cá nhân.' },
  { field: 'reports.org.distribution_empty', en: 'No score distribution data available for this cycle yet.', vi: 'Chưa có dữ liệu phân phối điểm cho kỳ này.' },
  { field: 'reports.org.distribution_value', en: '{count} ({percentage}%)', vi: '{count} ({percentage}%)' },

  // KPI breakdown
  { field: 'reports.kpi.title', en: 'KPI Breakdown', vi: 'Chi tiết KPI' },
  { field: 'reports.kpi.empty', en: 'No KPI data available for this report.', vi: 'Chưa có dữ liệu KPI cho báo cáo này.' },
  { field: 'reports.kpi.evidence', en: 'Evidence', vi: 'Minh chứng' },
  { field: 'reports.kpi.evidence_count', en: '{count} evidence items attached', vi: 'Đã đính kèm {count} minh chứng' },
  { field: 'reports.kpi.has_comment', en: 'Has comment', vi: 'Có nhận xét' },
  { field: 'reports.kpi.note', en: 'Note', vi: 'Ghi chú' },
  { field: 'reports.kpi.points', en: 'pts', vi: 'điểm' },
  { field: 'reports.kpi.explain', en: 'Explain', vi: 'Giải thích' },

  // KPI trend
  { field: 'reports.trend.title', en: 'Cross-cycle KPI Trend', vi: 'Xu hướng KPI giữa các kỳ' },
  { field: 'reports.trend.empty', en: 'No KPI trend data available.', vi: 'Chưa có dữ liệu xu hướng KPI.' },
  { field: 'reports.trend.col_code', en: 'Code', vi: 'Mã' },
  { field: 'reports.trend.col_name', en: 'KPI Name', vi: 'Tên KPI' },
  { field: 'reports.trend.col_status', en: 'Status', vi: 'Trạng thái' },
  { field: 'reports.trend.col_prev', en: 'Prev Score', vi: 'Điểm kỳ trước' },
  { field: 'reports.trend.col_curr', en: 'Curr Score', vi: 'Điểm kỳ này' },
  { field: 'reports.trend.col_delta', en: 'Delta', vi: 'Chênh lệch' },

  // KPI explainability drawer
  { field: 'reports.explain.title', en: 'KPI Explainability & Lineage', vi: 'Giải thích & nguồn gốc KPI' },
  { field: 'reports.explain.close', en: 'Close', vi: 'Đóng' },
  { field: 'reports.explain.loading', en: 'Fetching KPI calculation lineage & evidence...', vi: 'Đang tải nguồn gốc tính toán & minh chứng KPI...' },
  { field: 'reports.explain.load_error', en: 'Failed to load KPI explanation & evidence.', vi: 'Không tải được giải thích & minh chứng KPI.' },
  { field: 'reports.explain.final_score', en: 'Final Score', vi: 'Điểm cuối cùng' },
  { field: 'reports.explain.raw_measurement', en: 'Raw Measurement', vi: 'Giá trị đo gốc' },
  { field: 'reports.explain.rationale', en: 'Calculation Rationale', vi: 'Cơ sở tính toán' },
  { field: 'reports.explain.no_rationale', en: 'No automated rationale provided for this measurement.', vi: 'Chưa có cơ sở tính toán tự động cho giá trị đo này.' },
  { field: 'reports.explain.comment', en: 'Evaluator Comment', vi: 'Nhận xét của người đánh giá' },
  { field: 'reports.explain.lineage', en: 'Data Source & Ingestion Lineage', vi: 'Nguồn dữ liệu & quá trình nạp' },
  { field: 'reports.explain.source_system', en: 'Source System:', vi: 'Hệ thống nguồn:' },
  { field: 'reports.explain.reference', en: 'Reference:', vi: 'Tham chiếu:' },
  { field: 'reports.explain.collected_at', en: 'Collected At:', vi: 'Thu thập lúc:' },
  { field: 'reports.explain.no_source', en: 'Directly entered or legacy measurement without source snapshot.', vi: 'Giá trị nhập trực tiếp hoặc dữ liệu cũ không có ảnh chụp nguồn.' },
  { field: 'reports.explain.import_batch', en: 'Import Batch ID:', vi: 'Mã lô nhập:' },
  { field: 'reports.explain.import_by', en: '(by {name})', vi: '(bởi {name})' },
  { field: 'reports.explain.evidence', en: 'Evidence ({count})', vi: 'Minh chứng ({count})' },
  { field: 'reports.explain.append_only', en: 'Append-only audit trail', vi: 'Nhật ký chỉ ghi thêm' },

  // KPI Summary tab
  { field: 'reports.summary.access_restricted_description', en: 'You do not have permission to view this employee evaluation. Please contact your manager or system administrator if you believe this is an error.', vi: 'Bạn không có quyền xem đánh giá của nhân viên này. Vui lòng liên hệ quản lý hoặc quản trị viên hệ thống nếu bạn cho rằng đây là lỗi.' },
  { field: 'reports.summary.access_restricted_title', en: 'Access Restricted', vi: 'Truy cập bị hạn chế' },
  { field: 'reports.summary.all_statuses', en: 'All Statuses', vi: 'Tất cả trạng thái' },
  { field: 'reports.summary.authoritative', en: 'Authoritative', vi: 'Chính thức' },
  { field: 'reports.summary.clear_filters', en: 'Clear Filters', vi: 'Xóa bộ lọc' },
  { field: 'reports.summary.clear_search', en: 'Clear search', vi: 'Xóa tìm kiếm' },
  { field: 'reports.summary.close_detail_panel', en: 'Close detail panel', vi: 'Đóng bảng chi tiết' },
  { field: 'reports.summary.column_action', en: 'Action', vi: 'Thao tác' },
  { field: 'reports.summary.column_category', en: 'Category', vi: 'Nhóm tiêu chí' },
  { field: 'reports.summary.column_criterion', en: 'Criterion', vi: 'Tiêu chí' },
  { field: 'reports.summary.column_evidence', en: 'Evidence', vi: 'Minh chứng' },
  { field: 'reports.summary.column_level', en: 'Level', vi: 'Mức' },
  { field: 'reports.summary.column_measurement', en: 'Measurement', vi: 'Đo lường' },
  { field: 'reports.summary.column_raw', en: 'Raw', vi: 'Điểm thô' },
  { field: 'reports.summary.column_relationship_type', en: 'Relationship Type', vi: 'Loại quan hệ' },
  { field: 'reports.summary.column_source_entity', en: 'Source Entity', vi: 'Thực thể nguồn' },
  { field: 'reports.summary.column_source_id', en: 'Source ID', vi: 'ID nguồn' },
  { field: 'reports.summary.column_status', en: 'Status', vi: 'Trạng thái' },
  { field: 'reports.summary.column_target_entity', en: 'Target Entity', vi: 'Thực thể đích' },
  { field: 'reports.summary.column_target_id', en: 'Target ID', vi: 'ID đích' },
  { field: 'reports.summary.column_weight', en: 'Weight', vi: 'Trọng số' },
  { field: 'reports.summary.column_weighted', en: 'Weighted', vi: 'Có trọng số' },
  { field: 'reports.summary.completion_progress', en: 'Completion Progress', vi: 'Tiến độ hoàn thành' },
  { field: 'reports.summary.completion_rate', en: 'Completion Rate', vi: 'Tỷ lệ hoàn thành' },
  { field: 'reports.summary.criteria_count', en: '{count} criteria', vi: '{count} tiêu chí' },
  { field: 'reports.summary.cycle_label', en: 'Cycle:', vi: 'Kỳ:' },
  { field: 'reports.summary.data_source', en: 'Data Source:', vi: 'Nguồn dữ liệu:' },
  { field: 'reports.summary.department', en: 'Department', vi: 'Phòng ban' },
  { field: 'reports.summary.department_placeholder', en: 'e.g. Engineering', vi: 'VD: Kỹ thuật' },
  { field: 'reports.summary.description', en: 'Description', vi: 'Mô tả' },
  { field: 'reports.summary.diagnostic_id', en: 'Diagnostic ID: {id}', vi: 'Mã chẩn đoán: {id}' },
  { field: 'reports.summary.entity_cycle', en: 'Cycle', vi: 'Kỳ đánh giá' },
  { field: 'reports.summary.entity_department', en: 'Department', vi: 'Phòng ban' },
  { field: 'reports.summary.entity_employee', en: 'Employee', vi: 'Nhân viên' },
  { field: 'reports.summary.entity_evaluation', en: 'Evaluation', vi: 'Đánh giá' },
  { field: 'reports.summary.entity_kpi', en: 'KPI', vi: 'KPI' },
  { field: 'reports.summary.entity_manager', en: 'Manager', vi: 'Quản lý' },
  { field: 'reports.summary.entity_team', en: 'Team', vi: 'Đội nhóm' },
  { field: 'reports.summary.evaluated_criteria', en: 'Evaluated Criteria ({count})', vi: 'Tiêu chí đã đánh giá ({count})' },
  { field: 'reports.summary.evaluation_cycle', en: 'Evaluation Cycle', vi: 'Kỳ đánh giá' },
  { field: 'reports.summary.evaluation_time_snapshot', en: 'Evaluation-time snapshot', vi: 'Ảnh chụp tại thời điểm đánh giá' },
  { field: 'reports.summary.evaluation_with_status', en: 'Evaluation ({status})', vi: 'Đánh giá ({status})' },
  { field: 'reports.summary.evidence_count', en: 'Evidence ({count})', vi: 'Minh chứng ({count})' },
  { field: 'reports.summary.filters', en: 'Filters', vi: 'Bộ lọc' },
  { field: 'reports.summary.inspect_detail', en: 'Inspect detail drill-down', vi: 'Xem chi tiết' },
  { field: 'reports.summary.kpi_detail', en: 'KPI Detail', vi: 'Chi tiết KPI' },
  { field: 'reports.summary.kpi_items_description', en: 'Ordered by template display sequence. Click any row to inspect historical snapshot details and evidence.', vi: 'Sắp xếp theo thứ tự hiển thị của mẫu. Nhấp vào một dòng để xem chi tiết ảnh chụp lịch sử và minh chứng.' },
  { field: 'reports.summary.kpi_items_title', en: 'KPI Evaluation Items', vi: 'Các mục đánh giá KPI' },
  { field: 'reports.summary.kpi_total', en: '/ {count} KPIs', vi: '/ {count} KPI' },
  { field: 'reports.summary.level_number', en: 'Level {level}', vi: 'Mức {level}' },
  { field: 'reports.summary.load_detail_error', en: 'Failed to load KPI detail.', vi: 'Không thể tải chi tiết KPI.' },
  { field: 'reports.summary.load_error_description', en: 'An unexpected error occurred while loading evaluation records.', vi: 'Đã xảy ra lỗi không mong muốn khi tải dữ liệu đánh giá.' },
  { field: 'reports.summary.load_error_title', en: 'Error Retrieving KPI Summary', vi: 'Lỗi khi tải tổng hợp KPI' },
  { field: 'reports.summary.loading_kpi_detail', en: 'Loading KPI Detail...', vi: 'Đang tải chi tiết KPI...' },
  { field: 'reports.summary.loading_snapshot_details', en: 'Loading historical snapshot details...', vi: 'Đang tải dữ liệu ảnh chụp lịch sử...' },
  { field: 'reports.summary.loading_summary', en: 'Loading employee evaluation summary...', vi: 'Đang tải tổng hợp đánh giá của nhân viên...' },
  { field: 'reports.summary.manager', en: 'Manager', vi: 'Quản lý' },
  { field: 'reports.summary.manual_evaluation', en: 'Manual evaluation', vi: 'Đánh giá thủ công' },
  { field: 'reports.summary.measurement_information', en: 'Measurement Information', vi: 'Thông tin đo lường' },
  { field: 'reports.summary.measurement_via', en: 'via {source}', vi: 'qua {source}' },
  { field: 'reports.summary.more_criteria', en: '+{count} more criteria', vi: '+{count} tiêu chí khác' },
  { field: 'reports.summary.no_department', en: 'No Dept', vi: 'Chưa có phòng ban' },
  { field: 'reports.summary.no_employee_description', en: 'Use the search bar above to search by name, code, or department, and select an employee to inspect their KPI summary.', vi: 'Dùng thanh tìm kiếm phía trên để tìm theo tên, mã hoặc phòng ban, sau đó chọn một nhân viên để xem tổng hợp KPI.' },
  { field: 'reports.summary.no_employee_title', en: 'No Employee Selected', vi: 'Chưa chọn nhân viên' },
  { field: 'reports.summary.no_employees_found', en: 'No employees found matching criteria.', vi: 'Không tìm thấy nhân viên phù hợp với điều kiện.' },
  { field: 'reports.summary.no_evidence', en: 'No evidence submitted for this criterion.', vi: 'Chưa có minh chứng nào cho tiêu chí này.' },
  { field: 'reports.summary.no_kpi_items_description', en: 'This evaluation does not contain any evaluated criteria items.', vi: 'Đánh giá này không có tiêu chí nào đã được đánh giá.' },
  { field: 'reports.summary.no_kpi_items_title', en: 'No KPI Items Found', vi: 'Không có mục KPI nào' },
  { field: 'reports.summary.no_level_definitions', en: 'No level definitions recorded in snapshot.', vi: 'Không có định nghĩa mức nào trong ảnh chụp.' },
  { field: 'reports.summary.no_manager', en: 'None', vi: 'Không có' },
  { field: 'reports.summary.no_role', en: 'No Role', vi: 'Chưa có vai trò' },
  { field: 'reports.summary.no_team', en: 'No Team', vi: 'Chưa có đội nhóm' },
  { field: 'reports.summary.not_measured', en: 'Not measured', vi: 'Chưa đo lường' },
  { field: 'reports.summary.official_score', en: 'Official Score', vi: 'Điểm chính thức' },
  { field: 'reports.summary.overall_raw_score', en: 'Overall Score (Raw Average)', vi: 'Điểm tổng (trung bình thô)' },
  { field: 'reports.summary.overall_raw_score_hint', en: 'Unweighted average across criteria', vi: 'Trung bình không trọng số của các tiêu chí' },
  { field: 'reports.summary.overall_weighted_score', en: 'Overall Weighted Score', vi: 'Tổng điểm có trọng số' },
  { field: 'reports.summary.overall_weighted_score_hint', en: 'Sum of weighted criteria scores', vi: 'Tổng điểm có trọng số của các tiêu chí' },
  { field: 'reports.summary.page_description', en: 'Comprehensive view of employee performance evaluations, official scores, criteria breakdowns, and organizational relationships.', vi: 'Cái nhìn toàn diện về kết quả đánh giá hiệu suất của nhân viên, điểm chính thức, chi tiết tiêu chí và các mối quan hệ trong tổ chức.' },
  { field: 'reports.summary.page_title', en: 'KPI Summary Dashboard', vi: 'Bảng tổng hợp KPI' },
  { field: 'reports.summary.raw_score', en: 'Raw Score', vi: 'Điểm thô' },
  { field: 'reports.summary.read_only', en: 'Read-Only', vi: 'Chỉ xem' },
  { field: 'reports.summary.read_only_tooltip', en: 'This evaluation is finalized and read-only', vi: 'Đánh giá này đã hoàn tất và chỉ được xem' },
  { field: 'reports.summary.recorded_at', en: 'Recorded At:', vi: 'Thời điểm ghi nhận:' },
  { field: 'reports.summary.recorded_value', en: 'Recorded Value:', vi: 'Giá trị ghi nhận:' },
  { field: 'reports.summary.reference_id', en: 'Reference ID: {id}', vi: 'Mã tham chiếu: {id}' },
  { field: 'reports.summary.relationship_diagram_description', en: 'Rendered directly from backend entity relationships ({count} graph edges)', vi: 'Hiển thị trực tiếp từ quan hệ thực thể của hệ thống ({count} cạnh đồ thị)' },
  { field: 'reports.summary.relationship_diagram_title', en: 'Organizational & Evaluation Relationship Diagram', vi: 'Sơ đồ quan hệ tổ chức & đánh giá' },
  { field: 'reports.summary.resolved', en: 'Resolved', vi: 'Đạt được' },
  { field: 'reports.summary.resolved_level', en: 'Resolved Level', vi: 'Mức đạt được' },
  { field: 'reports.summary.retry', en: 'Retry', vi: 'Thử lại' },
  { field: 'reports.summary.role', en: 'Role', vi: 'Vai trò' },
  { field: 'reports.summary.role_and_level', en: 'Role & Level', vi: 'Vai trò & Cấp bậc' },
  { field: 'reports.summary.role_placeholder', en: 'e.g. Engineer', vi: 'VD: Kỹ sư' },
  { field: 'reports.summary.score_semantics_description', en: 'The {official_score} is the authoritative result determined by the evaluation lifecycle/calibration. It is distinct from the unweighted arithmetic average.', vi: '{official_score} là kết quả chính thức được xác định qua quy trình đánh giá/hiệu chỉnh. Điểm này khác với điểm trung bình cộng không trọng số.' },
  { field: 'reports.summary.score_semantics_label', en: 'Score Semantics:', vi: 'Ý nghĩa điểm số:' },
  { field: 'reports.summary.search_placeholder', en: 'Search employee by name (supports Vietnamese diacritics), code, email...', vi: 'Tìm nhân viên theo tên (hỗ trợ tiếng Việt có dấu), mã, email...' },
  { field: 'reports.summary.search_placeholder_self', en: 'Your profile is selected', vi: 'Hồ sơ của bạn đã được chọn' },
  { field: 'reports.summary.searching_employees', en: 'Searching employees...', vi: 'Đang tìm nhân viên...' },
  { field: 'reports.summary.snapshot_level_definitions', en: 'Snapshot Level Definitions', vi: 'Định nghĩa mức (ảnh chụp)' },
  { field: 'reports.summary.status', en: 'Status', vi: 'Trạng thái' },
  { field: 'reports.summary.status_disabled', en: 'Disabled', vi: 'Đã vô hiệu' },
  { field: 'reports.summary.status_done', en: 'Done', vi: 'Hoàn thành' },
  { field: 'reports.summary.status_pending', en: 'Pending', vi: 'Đang chờ' },
  { field: 'reports.summary.subtab.items', en: 'KPI Items', vi: 'Tiêu chí KPI' },
  { field: 'reports.summary.subtab.relationships', en: 'Relationships', vi: 'Sơ đồ quan hệ' },
  { field: 'reports.summary.status_value', en: 'Status: {status}', vi: 'Trạng thái: {status}' },
  { field: 'reports.summary.target_employee', en: 'Target Employee', vi: 'Nhân viên được đánh giá' },
  { field: 'reports.summary.team', en: 'Team', vi: 'Đội nhóm' },
  { field: 'reports.summary.team_placeholder', en: 'e.g. Backend', vi: 'VD: Backend' },
  { field: 'reports.summary.unnamed_employee', en: 'Unnamed Employee', vi: 'Nhân viên chưa có tên' },
  { field: 'reports.summary.view_accessible', en: 'Accessible List', vi: 'Danh sách hỗ trợ tiếp cận' },
  { field: 'reports.summary.view_accessible_aria', en: 'Accessible table view', vi: 'Chế độ xem bảng hỗ trợ tiếp cận' },
  { field: 'reports.summary.view_graphical', en: 'Graphical DAG', vi: 'Sơ đồ DAG' },
  { field: 'reports.summary.weight', en: 'Weight', vi: 'Trọng số' },
  { field: 'reports.summary.weighted_score', en: 'Weighted Score', vi: 'Điểm có trọng số' },
];

const toCamelCase = (str: string): string => str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const escape = (value: string): string => value.replace(/'/g, "''");
const variants = (field: string): string[] => Array.from(new Set([field, toCamelCase(field)]));

function upsert(pgm: MigrationBuilder, entityType: string, entityId: string, items: Translation[]): void {
  for (const item of items) {
    for (const field of variants(item.field)) {
      for (const [locale, value] of [['en', item.en], ['vi', item.vi]] as const) {
        pgm.sql(`
          INSERT INTO "i18n_translation" ("entity_type", "entity_id", "field_name", "locale", "value")
          VALUES ('${entityType}', '${entityId}', '${field}', '${locale}', '${escape(value)}')
          ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
          DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = CURRENT_TIMESTAMP;
        `);
      }
    }
  }
}

function remove(pgm: MigrationBuilder, entityType: string, entityId: string, items: Translation[]): void {
  const fields = items.flatMap((item) => variants(item.field)).map((field) => `'${escape(field)}'`);
  pgm.sql(`
    DELETE FROM "i18n_translation"
    WHERE "entity_type" = '${entityType}' AND "entity_id" = '${entityId}'
      AND "field_name" IN (${fields.join(', ')});
  `);
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  upsert(pgm, ENTITY_TYPE, ENTITY_ID, UPDATED);
  upsert(pgm, ENTITY_TYPE, ENTITY_ID, ADDED);
  upsert(pgm, COMMON_ENTITY_TYPE, COMMON_ENTITY_ID, COMMON_ADDED);
  upsert(pgm, ORGANIZATION_ENTITY_TYPE, ORGANIZATION_ENTITY_ID, ORGANIZATION_ADDED);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  remove(pgm, ORGANIZATION_ENTITY_TYPE, ORGANIZATION_ENTITY_ID, ORGANIZATION_ADDED);
  remove(pgm, COMMON_ENTITY_TYPE, COMMON_ENTITY_ID, COMMON_ADDED);
  remove(pgm, ENTITY_TYPE, ENTITY_ID, ADDED);
  upsert(pgm, ENTITY_TYPE, ENTITY_ID, UPDATED_PREVIOUS);
}
