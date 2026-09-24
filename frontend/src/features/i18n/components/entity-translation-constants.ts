/**
 * Shared constants for EntityTranslationEditor.
 * Kept separate to satisfy react-refresh/only-export-components rule.
 */
export const MASTER_ENTITY_TYPES = [
  { value: 'DEPARTMENT', label: 'Department (Phòng ban)', defaultFields: ['name'] },
  { value: 'TEAM', label: 'Team (Nhóm / Đội)', defaultFields: ['name'] },
  { value: 'ROLE', label: 'Role (Chức danh / Vai trò)', defaultFields: ['name'] },
  { value: 'JOB_LEVEL', label: 'Job Level (Cấp bậc công việc)', defaultFields: ['name'] },
  { value: 'REVIEW_CADENCE', label: 'Review Cadence (Chu kỳ đánh giá)', defaultFields: ['name'] },
  { value: 'CRITERION', label: 'Criterion (Tiêu chí đánh giá)', defaultFields: ['name', 'description'] },
  { value: 'CRITERION_LEVEL', label: 'Criterion Level (Mức độ tiêu chí)', defaultFields: ['label'] },
  { value: 'EVALUATION_TEMPLATE', label: 'Evaluation Template (Mẫu đánh giá)', defaultFields: ['name', 'description'] },
  { value: 'AUDIT_UI', label: 'Audit Log UI Strings (Giao diện Nhật ký kiểm toán)', defaultFields: ['page_title', 'page_subtitle', 'modal_title'] },
  { value: 'DASHBOARD_UI', label: 'Dashboard UI Strings (Giao diện Thống kê tổng hợp)', defaultFields: ['page_title', 'page_subtitle'] },
  { value: 'ORGANIZATION_UI', label: 'Organization UI Strings (Giao diện Cơ cấu tổ chức)', defaultFields: ['page_title', 'page_subtitle', 'job_roles', 'job_levels', 'review_cadences'] },
  { value: 'REVIEW_DUE_UI', label: 'Review Due & Cadence UI Strings (Giao diện Lịch đánh giá & Chu kỳ)', defaultFields: ['page_title', 'page_subtitle', 'tab_all', 'tab_due', 'tab_overdue', 'tab_upcoming'] },
  { value: 'INDIVIDUAL_CYCLE_UI', label: 'Individual Evaluation UI Strings (Giao diện Tạo đánh giá cá nhân)', defaultFields: ['ic_page_title', 'ic_page_subtitle', 'ic_section_employees', 'ic_section_settings'] },
];
