/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MyEvaluationPage } from '../pages/MyEvaluationPage';
import { ThemeProvider } from '@/shared/theme';
import { AuthContext, type AuthContextValue } from '@/shared/auth/auth-context';
import { evaluationApi } from '../api/evaluation-api';
import { employeeSearchApi } from '@/features/organization/api/employee-search.api';

vi.mock('../api/evaluation-api', () => ({
  evaluationApi: {
    getMyEvaluations: vi.fn(),
    getTeamEvaluations: vi.fn(),
    getEvaluationDetail: vi.fn(),
    saveDevelopmentBlocks: vi.fn(),
    submitEvaluation: vi.fn(),
  },
}));

vi.mock('@/features/organization/api/employee-search.api', () => ({
  employeeSearchApi: {
    search: vi.fn(),
  },
}));

vi.mock('../components/EvaluationOverviewPanel', () => ({
  EvaluationOverviewPanel: () => <div data-testid="overview-panel" />,
}));

vi.mock('../components/EvaluationScoreSummaryPanel', () => ({
  EvaluationScoreSummaryPanel: () => <div data-testid="score-panel" />,
}));

vi.mock('../components/PersonalDevelopmentPlanPanel', () => ({
  PersonalDevelopmentPlanPanel: () => <div data-testid="pdp-panel" />,
}));

const createMockAuth = (user: AuthContextValue['user']): AuthContextValue => ({
  user,
  isAuthenticated: !!user,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
});

describe('MyEvaluationPage profile loading', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(evaluationApi.getMyEvaluations).mockResolvedValue([
      {
        evaluation: {
          evaluation_id: 'eval-self-1',
          evaluation_cycle_id: 'cycle-1',
          employee_id: 'emp-1',
          status: 'OPEN',
          is_locked: false,
        },
        cycle: {
          name: 'Cycle 1',
          start_date: '2026-09-01',
          end_date: '2026-09-30',
          status: 'OPEN',
        },
      },
    ] as unknown as Awaited<ReturnType<typeof evaluationApi.getMyEvaluations>>);

    vi.mocked(evaluationApi.getTeamEvaluations).mockResolvedValue([
      {
        evaluation: {
          evaluation_id: 'eval-team-1',
          evaluation_cycle_id: 'cycle-1',
          employee_id: 'emp-2',
          manager_id_snapshot: 'mgr-1',
          status: 'OPEN',
          is_locked: false,
        },
        employee: {
          employee_id: 'emp-2',
          full_name: 'Team Employee',
          employee_code: 'EMP-002',
          email: 'team.employee@example.com',
        },
        cycle: {
          name: 'Cycle 1',
          start_date: '2026-09-01',
          end_date: '2026-09-30',
          status: 'OPEN',
        },
      },
    ] as unknown as Awaited<ReturnType<typeof evaluationApi.getTeamEvaluations>>);

    vi.mocked(evaluationApi.getEvaluationDetail).mockResolvedValue({
      evaluation_id: 'eval-self-1',
      evaluation_cycle_id: 'cycle-1',
      employee_id: 'emp-1',
      status: 'OPEN',
      items: [],
    } as unknown as Awaited<ReturnType<typeof evaluationApi.getEvaluationDetail>>);

    vi.mocked(employeeSearchApi.search).mockResolvedValue({
      employees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'EMP-001',
          fullName: 'Logged In Employee',
          email: 'self.employee@example.com',
          department: { id: 'dept-1', name: 'Dept', code: 'D1' },
          team: { id: 'team-1', name: 'Team', code: 'T1' },
          role: { id: 'role-1', name: 'Employee', code: 'EMPLOYEE' },
          jobLevel: { id: 'level-1', name: 'Level 1', code: 'L1' },
          manager: { id: 'mgr-1', name: 'Manager', code: 'M1' },
          employmentStatus: 'ACTIVE',
          joinDate: '2026-01-01',
        },
      ],
      page: { number: 1, size: 1, total_items: 1, total_pages: 1 },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads the logged-in employee profile when role is EMPLOYEE', async () => {
    render(
      <AuthContext.Provider value={createMockAuth({
        id: 'usr-1',
        email: 'self.employee@example.com',
        name: 'Logged In Employee',
        role: 'EMPLOYEE',
        employeeId: 'emp-1',
      })}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/admin/evaluations?tab=my']}>
            <QueryClientProvider client={queryClient}>
              <MyEvaluationPage />
            </QueryClientProvider>
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(employeeSearchApi.search).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 'emp-1', size: 1 }));
    });
  });

  it('loads the selected evaluation employee profile for manager roles', async () => {
    render(
      <AuthContext.Provider value={createMockAuth({
        id: 'mgr-1',
        email: 'manager@example.com',
        name: 'Team Manager',
        role: 'MANAGER',
      })}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/admin/evaluations?tab=my']}>
            <QueryClientProvider client={queryClient}>
              <MyEvaluationPage />
            </QueryClientProvider>
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(employeeSearchApi.search).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 'emp-2', size: 1 }));
    });
  });
});
