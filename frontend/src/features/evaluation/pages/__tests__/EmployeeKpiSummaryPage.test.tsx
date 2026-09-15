/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeKpiSummaryPage } from '../EmployeeKpiSummaryPage';
import * as kpiSummaryApiModule from '../../api/employee-kpi-summary.api';
import * as cycleApiModule from '../../../evaluation-cycles/api/cycle-api';

vi.mock('../../api/employee-kpi-summary.api', () => ({
  employeeKpiSummaryApi: {
    getSummary: vi.fn(),
  },
}));

vi.mock('../../../evaluation-cycles/api/cycle-api', () => ({
  evaluationCycleApi: {
    getCycles: vi.fn(),
  },
}));

describe('EmployeeKpiSummaryPage', () => {
  let queryClient: QueryClient;

  const mockSummary: kpiSummaryApiModule.EmployeeKpiSummary = {
    employee: {
      id: 'emp-1',
      employeeCode: 'EMP-001',
      fullName: 'Nguyễn Văn An',
      email: 'an.nguyen@example.com',
      department: { id: 'dept-1', name: 'Engineering', code: 'ENG' },
      team: { id: 'team-1', name: 'Backend', code: 'BE' },
      role: { id: 'role-1', name: 'Software Engineer', code: 'SE' },
      jobLevel: { id: 'level-1', name: 'Senior', code: 'SR' },
      manager: { id: 'mgr-1', name: 'Trần Thị Bình', code: 'EMP-000' },
    },
    evaluation: {
      evaluationId: 'eval-1',
      cycleId: 'cycle-1',
      cycleName: '2026-H1 Review',
      status: 'APPROVED',
      submittedAt: '2026-06-15T08:00:00Z',
      approvedAt: '2026-06-20T10:00:00Z',
      isLocked: true,
    },
    overallScore: 4.2,
    overallWeightedScore: 4.35,
    officialScoreField: 'overall_weighted_score',
    officialScoreValue: 4.35,
    kpiItems: [
      {
        evaluationItemId: 'item-1',
        criterionCode: 'PERF-01',
        criterionName: 'On-time Delivery Snapshot',
        category: 'Performance',
        weight: 30,
        rawScore: 4.5,
        weightedScore: 1.35,
        resolvedLevel: 4,
        isDisabled: false,
        isMissingScore: false,
        measurement: {
          key: 'sprint_completion_rate',
          value: 95.5,
          unit: '%',
          source: 'Jira',
        },
        evidence: [
          {
            evidenceId: 'ev-1',
            evidenceType: 'URL',
            title: 'Sprint 12 Dashboard',
            evidenceUrl: 'https://jira.example.com/sprint/12',
            fileReference: null,
            rationale: 'Completed all sprint story points on time',
            source: 'JIRA_INTEGRATION',
          },
        ],
        comment: 'Great velocity and commitment during Q2',
        rationale: 'Exceeded target completion rate by 5.5%',
        reviewer: {
          id: 'mgr-1',
          name: 'Trần Thị Bình',
          reviewDate: '2026-06-18T14:30:00Z',
        },
        kpiRelationshipSnapshot: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(cycleApiModule.evaluationCycleApi.getCycles).mockResolvedValue([
      {
        id: 'cycle-1',
        name: '2026-H1 Review',
        code: '2026-H1',
        status: 'OPEN',
      } as never,
    ]);
    vi.mocked(kpiSummaryApiModule.employeeKpiSummaryApi.getSummary).mockResolvedValue(mockSummary);
  });

  it('renders employee details and official score card highlighting official_score_field', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/employees/emp-1/kpi-summary?evaluation_cycle_id=cycle-1']}>
          <Routes>
            <Route path="/admin/employees/:id/kpi-summary" element={<EmployeeKpiSummaryPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText(/Official Score of Record/i)).toBeInTheDocument();
      expect(screen.getAllByText(/4.35/).length).toBeGreaterThan(0);
      expect(screen.getByText('OVERALL WEIGHTED SCORE')).toBeInTheDocument();
      expect(screen.getByText('On-time Delivery Snapshot')).toBeInTheDocument();
      expect(screen.getByText('PERF-01')).toBeInTheDocument();
    });
  });

  it('expands detail accordion on click to show measurement snapshot and evidence', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/employees/emp-1/kpi-summary?evaluation_cycle_id=cycle-1']}>
          <Routes>
            <Route path="/admin/employees/:id/kpi-summary" element={<EmployeeKpiSummaryPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('On-time Delivery Snapshot')).toBeInTheDocument();
    });

    const itemRow = screen.getByText('On-time Delivery Snapshot');
    fireEvent.click(itemRow);

    await waitFor(() => {
      expect(screen.getByText(/sprint_completion_rate/i)).toBeInTheDocument();
      expect(screen.getByText(/95.5 %/i)).toBeInTheDocument();
      expect(screen.getByText('Sprint 12 Dashboard')).toBeInTheDocument();
      expect(screen.getByText('View Artifact')).toBeInTheDocument();
    });
  });
});
