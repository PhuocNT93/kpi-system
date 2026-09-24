/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import * as dashboardApiModule from '../api/dashboard.api';
import type {
  EmployeeDashboardData,
  ManagerDashboardData,
  HrDashboardData,
  SystemAdminDashboardData,
} from '../types/dashboard.types';

vi.mock('../api/dashboard.api');

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-1',
      employee_id: 'emp-1',
      name: 'Test User',
      email: 'user@example.com',
      role: 'EMPLOYEE',
    },
    isAuthenticated: true,
  }),
}));

describe('DashboardPage Component Suite', () => {
  let queryClient: QueryClient;

  const mockCycle = {
    id: 'cycle-1',
    name: 'Q3 2026 Evaluation',
    status: 'ACTIVE',
    start_date: '2026-07-01T00:00:00Z',
    end_date: '2026-09-30T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  // TC-11: Employee Dashboard View Rendering
  it('TC-11: renders Employee Dashboard view with personal KPIs, trends, and strengths', async () => {
    const mockEmployeeData: EmployeeDashboardData = {
      role: 'EMPLOYEE',
      scope: { type: 'SELF', id: 'emp-1' },
      cycle: mockCycle,
      summary: {
        current_evaluation_status: 'SELF_ASSESSMENT',
        current_overall_score: 4.25,
        last_published_score: 4.1,
        next_review_due: '2026-10-15T00:00:00Z',
        review_status: 'UPCOMING',
        days_until_due: 23,
        review_cadence: 'ANNUAL',
      },
      details: {
        score_trend: [
          { cycle_id: 'c-1', cycle_name: 'Q2 2026', overall_score: 4.1, published_at: '2026-06-30T00:00:00Z' },
          { cycle_id: 'c-2', cycle_name: 'Q3 2026', overall_score: 4.25, published_at: null },
        ],
        score_breakdown: [
          {
            criterion_code: 'CODE_QUALITY',
            criterion_name: 'Code Review Quality',
            category: 'Engineering',
            weight: 50,
            raw_score: 4.5,
            weighted_score: 2.25,
          },
        ],
        strengths: [
          { criterion_code: 'CODE_QUALITY', criterion_name: 'Code Review Quality', category: 'Engineering', score: 4.5 },
        ],
        development_areas: [],
        review_schedule: {
          last_evaluation_completed_at: '2025-10-15T00:00:00Z',
          next_review_due_date: '2026-10-15T00:00:00Z',
          review_cadence: 'ANNUAL',
          status: 'UPCOMING',
          days_until_due: 23,
        },
      },
      attention: [
        {
          id: 'self-assessment-pending',
          type: 'WARNING',
          title: 'Self-Assessment Pending',
          message: 'Your self-assessment is ready for submission.',
          action_url: '/admin/my-evaluations',
        },
      ],
      last_updated_at: '2026-09-22T09:00:00Z',
    };

    vi.mocked(dashboardApiModule.dashboardApi.getDashboard).mockResolvedValue(mockEmployeeData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Performance & Statistics Overview')).toBeInTheDocument();
      expect(screen.getByText('Employee Dashboard')).toBeInTheDocument();
    });

    // Verify summary values
    expect(screen.getByText('SELF ASSESSMENT')).toBeInTheDocument();
    expect(screen.getAllByText('4.25').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('4.10').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('UPCOMING')).toBeInTheDocument();

    // Verify attention banner
    expect(screen.getByText('Self-Assessment Pending')).toBeInTheDocument();
    expect(screen.getByText('Take Action')).toBeInTheDocument();

    // Verify strengths and breakdown
    expect(screen.getAllByText('Code Review Quality').length).toBeGreaterThanOrEqual(1);
  });

  // TC-12: Manager Dashboard View Rendering
  it('TC-12: renders Manager Dashboard view with team aggregates and anonymous histogram', async () => {
    const mockManagerData: ManagerDashboardData = {
      role: 'MANAGER',
      scope: { type: 'TEAM', ids: ['team-1'], teams: [{ id: 'team-1', name: 'Alpha Team' }] },
      cycle: mockCycle,
      summary: {
        team_members_count: 8,
        total_evaluations: 8,
        completed_evaluations: 6,
        in_progress_evaluations: 1,
        pending_review_evaluations: 1,
        overdue_reviews_count: 1,
        completion_rate: 75.0,
        team_average_score: 4.15,
      },
      details: {
        workflow_distribution: [
          { status: 'PUBLISHED', count: 6 },
          { status: 'REVIEWING', count: 1 },
          { status: 'OPEN', count: 1 },
        ],
        score_distribution: [
          { range: '0.0 - 1.0', count: 0 },
          { range: '1.0 - 2.0', count: 0 },
          { range: '2.0 - 3.0', count: 1 },
          { range: '3.0 - 4.0', count: 3 },
          { range: '4.0 - 5.0', count: 4 },
        ],
        criterion_aggregates: [
          { criterion_code: 'CODE_REVIEW', criterion_name: 'Code Reviews', category: 'Engineering', average_score: 4.2 },
        ],
        review_due_summary: {
          upcoming_count: 2,
          overdue_count: 1,
          not_due_count: 5,
          no_schedule_count: 0,
        },
      },
      attention: [
        {
          id: 'team-overdue-reviews',
          type: 'DANGER',
          title: 'Team Reviews Overdue',
          message: '1 team member has an overdue evaluation.',
          action_url: '/admin/team-evaluations',
        },
      ],
      last_updated_at: '2026-09-22T09:00:00Z',
    };

    vi.mocked(dashboardApiModule.dashboardApi.getDashboard).mockResolvedValue(mockManagerData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('4.15')).toBeInTheDocument();
    expect(screen.getByText('Team Score Distribution')).toBeInTheDocument();
  });

  // TC-13: HR Admin Dashboard View Rendering
  it('TC-13: renders HR Admin Dashboard view with organization overview and department table', async () => {
    const mockHrData: HrDashboardData = {
      role: 'HR_ADMIN',
      scope: { type: 'ORGANIZATION' },
      cycle: mockCycle,
      summary: {
        total_employees: 60,
        active_employees: 58,
        total_evaluations: 58,
        completed_evaluations: 45,
        in_progress_evaluations: 10,
        published_evaluations: 45,
        overdue_reviews_count: 3,
        completion_rate: 77.6,
        organization_average_score: 4.08,
      },
      details: {
        workflow_distribution: [{ status: 'PUBLISHED', count: 45 }],
        score_distribution: [{ range: '4.0 - 5.0', count: 30, percentage: 66.7 }],
        department_team_aggregates: [
          {
            team_id: 't-1',
            team_name: 'Core Engineering',
            department_name: 'Engineering',
            employee_count: 15,
            completed_count: 12,
            completion_rate: 80.0,
            average_score: 4.2,
          },
        ],
        cycle_trend: [],
        review_due_summary: {
          upcoming_count: 5,
          overdue_count: 3,
          not_due_count: 50,
          no_schedule_count: 0,
        },
      },
      attention: [],
      last_updated_at: '2026-09-22T09:00:00Z',
    };

    vi.mocked(dashboardApiModule.dashboardApi.getDashboard).mockResolvedValue(mockHrData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('HR Admin Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Employees')).toBeInTheDocument();
    expect(screen.getByText('Core Engineering')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  // TC-14: System Admin Dashboard View Rendering
  it('TC-14: renders System Admin Dashboard view with operational metrics and audit summary', async () => {
    const mockSysAdminData: SystemAdminDashboardData = {
      role: 'SYSTEM_ADMIN',
      scope: { type: 'SYSTEM' },
      cycle: mockCycle,
      summary: {
        total_users: 75,
        active_users: 72,
        total_roles: 5,
        total_teams: 10,
        total_departments: 4,
        total_cycles: 6,
        published_templates: 3,
      },
      details: {
        system_health: {
          status: 'OPERATIONAL',
          database: 'HEALTHY',
          read_models: 'UP_TO_DATE',
        },
        audit_summary: {
          total_recent_events: 210,
          events_by_action: [{ action: 'EVALUATION_PUBLISHED', count: 35 }],
          events_by_day: [],
          recent_events: [],
        },
      },
      attention: [
        {
          id: 'sys-health',
          type: 'SUCCESS',
          title: 'System Health Optimal',
          message: 'All application services and projections are operational.',
        },
      ],
      last_updated_at: '2026-09-22T09:00:00Z',
    };

    vi.mocked(dashboardApiModule.dashboardApi.getDashboard).mockResolvedValue(mockSysAdminData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('System Admin Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('System & Service Status')).toBeInTheDocument();
    expect(screen.getByText('OPERATIONAL')).toBeInTheDocument();
  });

  // TC-16 & TC-17: Error and 403 Forbidden handling
  it('TC-17: handles 403 Forbidden error with access restricted message', async () => {
    vi.mocked(dashboardApiModule.dashboardApi.getDashboard).mockRejectedValue(
      new Error('Forbidden 403: Scope boundary restriction')
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });
    expect(screen.getByText(/server-side role boundaries/i)).toBeInTheDocument();
  });

  // TC-18: Privacy & Anti-Ranking DOM Verification
  it('TC-18: DOM contains zero ranking badges, percentiles, or stack-ranking labels', async () => {
    const mockManagerData: ManagerDashboardData = {
      role: 'MANAGER',
      scope: { type: 'TEAM', ids: ['team-1'], teams: [{ id: 'team-1', name: 'Alpha Team' }] },
      cycle: mockCycle,
      summary: {
        team_members_count: 5,
        total_evaluations: 5,
        completed_evaluations: 5,
        in_progress_evaluations: 0,
        pending_review_evaluations: 0,
        overdue_reviews_count: 0,
        completion_rate: 100,
        team_average_score: 4.1,
      },
      details: {
        workflow_distribution: [{ status: 'PUBLISHED', count: 5 }],
        score_distribution: [{ range: '4.0 - 5.0', count: 5 }],
        criterion_aggregates: [],
        review_due_summary: { upcoming_count: 0, overdue_count: 0, not_due_count: 5, no_schedule_count: 0 },
      },
      attention: [],
      last_updated_at: '2026-09-22T09:00:00Z',
    };

    vi.mocked(dashboardApiModule.dashboardApi.getDashboard).mockResolvedValue(mockManagerData);

    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument();
    });

    const textContent = container.textContent?.toLowerCase() || '';

    expect(textContent).not.toContain('rank #');
    expect(textContent).not.toContain('top performer');
    expect(textContent).not.toContain('bottom performer');
    expect(textContent).not.toContain('percentile');
  });

  // TC-19: Multiple Languages (i18n) Support
  it('TC-19: renders Vietnamese translations when active locale is vi', async () => {
    localStorage.setItem('kpi_locale', 'vi');
    localStorage.setItem(
      'kpi_ui_translations',
      JSON.stringify({
        vi: {
          page_title: 'Tổng quan Hiệu suất & Thống kê',
          role_employee: 'Bảng điều khiển Nhân viên',
        },
      })
    );
    window.dispatchEvent(new CustomEvent('kpi_ui_translations_updated'));
    window.dispatchEvent(new CustomEvent('kpi_locale_changed', { detail: 'vi' }));

    const mockEmployeeData: EmployeeDashboardData = {
      role: 'EMPLOYEE',
      scope: { type: 'SELF', id: 'emp-1' },
      cycle: mockCycle,
      summary: {
        current_evaluation_status: 'OPEN',
        current_overall_score: 4.25,
        last_published_score: 4.10,
        next_review_due: '2026-10-15T00:00:00Z',
        review_status: 'UPCOMING',
        days_until_due: 15,
        review_cadence: 'SEMI_ANNUAL',
      },
      details: {
        score_trend: [],
        review_schedule: {
          status: 'UPCOMING',
          next_review_due_date: '2026-10-15',
          days_until_due: 15,
          review_cadence: 'SEMI_ANNUAL',
          last_evaluation_completed_at: null,
        },
        score_breakdown: [],
        strengths: [],
        development_areas: [],
      },
      attention: [],
      last_updated_at: '2026-09-22T09:00:00Z',
    };

    vi.mocked(dashboardApiModule.dashboardApi.getDashboard).mockResolvedValue(mockEmployeeData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Tổng quan Hiệu suất & Thống kê')).toBeInTheDocument();
      expect(screen.getByText('Bảng điều khiển Nhân viên')).toBeInTheDocument();
    });

    // Reset locale
    localStorage.setItem('kpi_locale', 'en');
    window.dispatchEvent(new CustomEvent('kpi_locale_changed', { detail: 'en' }));
  });
});
