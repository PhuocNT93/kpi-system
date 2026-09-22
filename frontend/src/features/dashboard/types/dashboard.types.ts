export type DashboardRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SYSTEM_ADMIN';

export interface DashboardCycle {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

export interface AttentionItem {
  id: string;
  type: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
  title: string;
  message: string;
  action_url?: string;
}

export interface ScoreDistributionBucket {
  range: string;
  count: number;
  percentage?: number;
}

export interface WorkflowDistributionItem {
  status: string;
  count: number;
}

// ── Employee Dashboard Types ──────────────────────────────────────────────

export interface CriterionScoreItem {
  criterion_code: string;
  criterion_name: string;
  category: string;
  weight: number;
  raw_score: number | null;
  weighted_score: number | null;
}

export interface ScoreTrendItem {
  cycle_id: string;
  cycle_name: string;
  overall_score: number;
  published_at: string | null;
}

export interface StrengthOrAreaItem {
  criterion_code: string;
  criterion_name: string;
  category: string;
  score: number | null;
}

export interface ReviewScheduleData {
  last_evaluation_completed_at: string | null;
  next_review_due_date: string | null;
  review_cadence: string | null;
  status: 'UPCOMING' | 'OVERDUE' | 'NOT_DUE' | 'NO_SCHEDULE';
  days_until_due: number | null;
}

export interface EmployeeDashboardSummary {
  current_evaluation_status: string;
  current_overall_score: number | null;
  last_published_score: number | null;
  next_review_due: string | null;
  review_status: 'UPCOMING' | 'OVERDUE' | 'NOT_DUE' | 'NO_SCHEDULE';
  days_until_due: number | null;
  review_cadence: string | null;
}

export interface EmployeeDashboardData {
  role: 'EMPLOYEE';
  scope: {
    type: 'SELF';
    id: string;
  };
  cycle: DashboardCycle;
  summary: EmployeeDashboardSummary;
  details: {
    score_trend: ScoreTrendItem[];
    score_breakdown: CriterionScoreItem[];
    strengths: StrengthOrAreaItem[];
    development_areas: StrengthOrAreaItem[];
    review_schedule: ReviewScheduleData;
  };
  attention: AttentionItem[];
  last_updated_at: string;
}

// ── Manager Dashboard Types ───────────────────────────────────────────────

export interface ManagerDashboardSummary {
  team_members_count: number;
  total_evaluations: number;
  completed_evaluations: number;
  in_progress_evaluations: number;
  pending_review_evaluations: number;
  overdue_reviews_count: number;
  completion_rate: number;
  team_average_score: number | null;
}

export interface ManagerDashboardData {
  role: 'MANAGER';
  scope: {
    type: 'TEAM';
    ids: string[];
    teams: Array<{ id: string; name: string; department_id?: string }>;
  };
  cycle: DashboardCycle;
  summary: ManagerDashboardSummary;
  details: {
    workflow_distribution: WorkflowDistributionItem[];
    score_distribution: ScoreDistributionBucket[];
    criterion_aggregates: Array<{
      criterion_code: string;
      criterion_name: string;
      category: string;
      average_score: number;
    }>;
    review_due_summary: {
      upcoming_count: number;
      overdue_count: number;
      not_due_count: number;
      no_schedule_count: number;
    };
  };
  attention: AttentionItem[];
  last_updated_at: string;
}

// ── HR/Admin Dashboard Types ──────────────────────────────────────────────

export interface HrDashboardSummary {
  total_employees: number;
  active_employees: number;
  total_evaluations: number;
  completed_evaluations: number;
  in_progress_evaluations: number;
  published_evaluations: number;
  overdue_reviews_count: number;
  completion_rate: number;
  organization_average_score: number | null;
}

export interface DepartmentTeamAggregateItem {
  team_id: string;
  team_name: string;
  department_name: string;
  employee_count: number;
  completed_count: number;
  completion_rate: number;
  average_score: number | null;
}

export interface CycleTrendItem {
  cycle_id: string;
  cycle_name: string;
  average_score: number | null;
  completion_rate: number;
}

export interface HrDashboardData {
  role: 'HR_ADMIN';
  scope: {
    type: 'ORGANIZATION';
  };
  cycle: DashboardCycle;
  summary: HrDashboardSummary;
  details: {
    workflow_distribution: WorkflowDistributionItem[];
    score_distribution: ScoreDistributionBucket[];
    department_team_aggregates: DepartmentTeamAggregateItem[];
    cycle_trend: CycleTrendItem[];
    review_due_summary: {
      upcoming_count: number;
      overdue_count: number;
      not_due_count: number;
      no_schedule_count: number;
    };
  };
  attention: AttentionItem[];
  last_updated_at: string;
}

// ── System Admin Dashboard Types ──────────────────────────────────────────

export interface SystemAdminDashboardSummary {
  total_users: number;
  active_users: number;
  total_roles: number;
  total_teams: number;
  total_departments: number;
  total_cycles: number;
  published_templates: number;
}

export interface SystemAdminDashboardData {
  role: 'SYSTEM_ADMIN';
  scope: {
    type: 'SYSTEM';
  };
  cycle: DashboardCycle;
  summary: SystemAdminDashboardSummary;
  details: {
    system_health: {
      status: string;
      database: string;
      read_models: string;
    };
    audit_summary: {
      total_recent_events: number;
      events_by_action: Array<{ action: string; count: number }>;
      events_by_day: Array<{ date: string; count: number }>;
      recent_events: Array<{ id: string; action: string; entity_name: string; timestamp: string }>;
    };
  };
  attention: AttentionItem[];
  last_updated_at: string;
}

export type RoleDashboardData =
  | EmployeeDashboardData
  | ManagerDashboardData
  | HrDashboardData
  | SystemAdminDashboardData;
