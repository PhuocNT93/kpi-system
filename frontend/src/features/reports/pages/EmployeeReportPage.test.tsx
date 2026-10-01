/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeReportPage } from './EmployeeReportPage';
import * as reportsApi from '../api/reports.api';
import * as cycleApi from '../../evaluation-cycles/api/cycle-api';
import type { EvaluationCycleDTO } from '../../evaluation-cycles/types/cycle-types';

vi.mock('../api/reports.api');
vi.mock('../../evaluation-cycles/api/cycle-api');

const authState = vi.hoisted(() => ({
  user: {
    id: 'emp-001',
    employeeId: 'emp-001' as string | undefined,
    name: 'Nguyen Van A',
    email: 'a.nguyen@example.com',
    role: 'EMPLOYEE',
  },
}));

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: () => ({ user: authState.user, isAuthenticated: true }),
}));

describe('EmployeeReportPage', () => {
  let queryClient: QueryClient;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.fetchEmployeeReport).mockReset();
    if (queryClient) {
      queryClient.clear();
    }
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    vi.mocked(cycleApi.evaluationCycleApi.getCycles).mockResolvedValue([
      {
        id: 'cycle-1',
        name: '2026 Q2 Evaluation',
        code: '2026-Q2',
        status: 'OPEN',
      } as unknown as EvaluationCycleDTO,
    ]);
  });

  it('mounts cycle selector without deadlock and displays prompt when no cycle is chosen', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/my-report']}>
          <Routes>
            <Route path="/admin/my-report" element={<EmployeeReportPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Performance Report')).toBeInTheDocument();
  });

  it('renders employee report with score cards and kpi breakdown', async () => {
    vi.mocked(reportsApi.fetchEmployeeReport).mockResolvedValue({
      score: {
        evaluationId: 'eval-1',
        evaluationCycleId: 'cycle-1',
        employeeId: 'emp-001',
        cycleStatus: 'OPEN',
        evaluationStatus: 'OPEN',
        finalScore: 88.5,
        managerScore: 90.0,
        selfScore: 85.0,
        isLocked: false,
        lastRefreshedAt: '2026-06-01T00:00:00.000Z',
      },
      kpis: [
        {
          id: 'kpi-1',
          evaluationId: 'eval-1',
          evaluationCycleId: 'cycle-1',
          employeeId: 'emp-001',
          criterionCode: 'PERF_01',
          criterionName: 'Code Quality',
          weightSnapshot: 100,
          rawScore: 88.5,
          weightedScore: 88.5,
          isDisabledForEmployee: false,
          isMissingScore: false,
          lastRefreshedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      dataAsOf: '2026-06-01T00:00:00.000Z',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/my-report/emp-001']}>
          <Routes>
            <Route path="/admin/my-report/:employeeId" element={<EmployeeReportPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('88.50')).toBeInTheDocument();
      expect(screen.getByText('Code Quality')).toBeInTheDocument();
    });
  });

  it('renders clean empty state when no report exists for selected cycle', async () => {
    vi.mocked(reportsApi.fetchEmployeeReport).mockResolvedValue(null);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/my-report']}>
          <Routes>
            <Route path="/admin/my-report" element={<EmployeeReportPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No Evaluation Record')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('explains instead of erroring when the account has no linked employee profile', async () => {
    authState.user.employeeId = undefined;
    try {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeeReportPage isEmbedded />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(await screen.findByText('No employee profile linked')).toBeInTheDocument();
      expect(reportsApi.fetchEmployeeReport).not.toHaveBeenCalled();
    } finally {
      authState.user.employeeId = 'emp-001';
    }
  });

  it('hides its own page title when embedded in the hub', async () => {
    vi.mocked(reportsApi.fetchEmployeeReport).mockResolvedValue(null);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EmployeeReportPage isEmbedded />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('No Evaluation Record')).toBeInTheDocument();
    expect(screen.queryByText('Performance Report')).not.toBeInTheDocument();
    expect(screen.getByText('Report Filters')).toBeInTheDocument();
  });

  it('renders filter and empty-state text in Vietnamese when the locale is vi', async () => {
    vi.mocked(reportsApi.fetchEmployeeReport).mockResolvedValue(null);
    localStorage.setItem('kpi_locale', 'vi');
    localStorage.setItem(
      'kpi_ui_translations',
      JSON.stringify({
        vi: {
          'reports.common.filters': 'Bộ lọc báo cáo',
          'reports.my.empty_title': 'Chưa có bản ghi đánh giá',
        },
      })
    );

    try {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeeReportPage isEmbedded />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(await screen.findByText('Chưa có bản ghi đánh giá')).toBeInTheDocument();
      expect(screen.getByText('Bộ lọc báo cáo')).toBeInTheDocument();
    } finally {
      localStorage.removeItem('kpi_locale');
      localStorage.removeItem('kpi_ui_translations');
    }
  });
});
