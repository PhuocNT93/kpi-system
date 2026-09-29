/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrganizationReportPage } from './OrganizationReportPage';
import * as reportsApi from '../api/reports.api';
import * as cycleApi from '../../evaluation-cycles/api/cycle-api';
import type { EvaluationCycleDTO } from '../../evaluation-cycles/types/cycle-types';

vi.mock('../api/reports.api', () => ({
  fetchOrganizationReport: vi.fn(),
  fetchOrganizationKpiReport: vi.fn(),
  fetchKpiTrend: vi.fn(),
}));

vi.mock('../../evaluation-cycles/api/cycle-api', () => ({
  evaluationCycleApi: {
    getCycles: vi.fn(),
  },
}));

describe('OrganizationReportPage', () => {
  let queryClient: QueryClient;

  afterEach(() => {
    cleanup();
  });

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
  });

  it('renders Organization Dashboard with score cards and distribution', async () => {
    vi.mocked(reportsApi.fetchOrganizationReport).mockResolvedValue({
      data: [
        {
          id: 'org-agg-1',
          evaluationCycleId: 'cycle-1',
          employeeCount: 20,
          completedEmployeeCount: 15,
          completionRate: 75.0,
          averageScore: 84.2,
          scoreDistribution: { EXCELLENT: 5, GOOD: 10 },
          lastRefreshedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      dataAsOf: '2026-06-01T00:00:00.000Z',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/org-report']}>
          <Routes>
            <Route path="/admin/org-report" element={<OrganizationReportPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Organization Dashboard')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('84.20')).toBeInTheDocument();
      expect(screen.getByText('75.0%')).toBeInTheDocument();
      expect(screen.getByText('Score Distribution')).toBeInTheDocument();
    });
  });

  const renderOrg = (scoreDistribution: unknown, isEmbedded = false) => {
    vi.mocked(reportsApi.fetchOrganizationReport).mockResolvedValue({
      data: [
        {
          id: 'org-agg-1',
          evaluationCycleId: 'cycle-1',
          employeeCount: 19,
          completedEmployeeCount: 0,
          completionRate: 0,
          scoreDistribution: scoreDistribution as Record<string, unknown>,
          lastRefreshedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      dataAsOf: '2026-06-01T00:00:00.000Z',
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <OrganizationReportPage isEmbedded={isEmbedded} />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders the distribution as bars instead of raw JSON', async () => {
    const { container } = renderOrg([
      { range: '0.0 - 1.0', count: 1, percentage: 20 },
      { range: '1.0 - 2.0', count: 4, percentage: 80 },
    ]);

    expect(await screen.findByText('0.0 - 1.0')).toBeInTheDocument();
    expect(screen.getByText('1 (20.0%)')).toBeInTheDocument();
    expect(screen.getByText('4 (80.0%)')).toBeInTheDocument();
    expect(container.querySelector('pre')).toBeNull();
  });

  it('shows an empty state when there is no distribution and a dash for a missing average', async () => {
    renderOrg({});

    expect(await screen.findByText('No score distribution data available for this cycle yet.')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('hides its own page title when embedded', async () => {
    renderOrg({}, true);

    expect(await screen.findByText('Score Distribution')).toBeInTheDocument();
    expect(screen.queryByText('Organization Dashboard')).not.toBeInTheDocument();
  });
});
