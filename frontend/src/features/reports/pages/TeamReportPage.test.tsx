/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamReportPage } from './TeamReportPage';
import * as reportsApi from '../api/reports.api';
import * as cycleApi from '../../evaluation-cycles/api/cycle-api';
import * as orgApi from '@/features/organization/api/organization-api';
import type { EvaluationCycleDTO } from '../../evaluation-cycles/types/cycle-types';
import type { OrgTeam } from '../../organization/domain/organization-models';

vi.mock('../api/reports.api', () => ({
  fetchTeamReport: vi.fn(),
  fetchTeamKpiReport: vi.fn(),
  fetchKpiTrend: vi.fn(),
  fetchKpiEvidence: vi.fn(),
}));

vi.mock('../../evaluation-cycles/api/cycle-api', () => ({
  evaluationCycleApi: {
    getCycles: vi.fn(),
  },
}));

vi.mock('@/features/organization/api/organization-api', () => ({
  organizationApi: {
    getTeams: vi.fn(),
  },
}));

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'mgr-1',
      employeeId: 'emp-mgr',
      email: 'manager@kpi.com',
      name: 'Manager User',
      role: 'MANAGER',
      managedTeamIds: ['team-1'],
    },
    isAuthenticated: true,
  }),
}));

describe('TeamReportPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(cycleApi.evaluationCycleApi.getCycles).mockResolvedValue([
      {
        id: 'cycle-1',
        name: '2026 Q2 Evaluation',
        code: '2026-Q2',
        status: 'OPEN',
      } as unknown as EvaluationCycleDTO,
    ]);
    vi.mocked(orgApi.organizationApi.getTeams).mockResolvedValue([
      {
        id: 'team-1',
        name: 'Engineering Alpha',
        code: 'ENG_ALPHA',
        active: true,
      } as unknown as OrgTeam,
    ]);
    vi.mocked(reportsApi.fetchTeamKpiReport).mockResolvedValue({
      data: [],
    });
    vi.mocked(reportsApi.fetchKpiTrend).mockResolvedValue({
      data: [],
    });
  });

  it('renders Team Dashboard header and team selector', async () => {
    vi.mocked(reportsApi.fetchTeamReport).mockResolvedValue({
      aggregate: {
        id: 'agg-1',
        evaluationCycleId: 'cycle-1',
        teamId: 'team-1',
        employeeCount: 5,
        completedEmployeeCount: 3,
        completionRate: 60.0,
        teamAverageScore: 82.5,
        lastRefreshedAt: '2026-06-01T00:00:00.000Z',
      },
      kpis: [],
      dataAsOf: '2026-06-01T00:00:00.000Z',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/team-report/team-1']}>
          <Routes>
            <Route path="/admin/team-report/:teamId" element={<TeamReportPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Team Dashboard')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('82.50')).toBeInTheDocument();
      expect(screen.getByText('60.0%')).toBeInTheDocument();
      expect(screen.getByText('Engineering Alpha')).toBeInTheDocument();
    });
  });
});
