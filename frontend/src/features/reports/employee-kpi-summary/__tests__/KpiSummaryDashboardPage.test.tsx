/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KpiSummaryDashboardPage } from '../pages/KpiSummaryDashboardPage';
import * as kpiSummaryApiModule from '../api/kpi-summary.api';
import * as employeeSearchApiModule from '../../../organization/api/employee-search.api';
import * as cycleApiModule from '../../../evaluation-cycles/api/cycle-api';
import type { EvaluationCycleDTO } from '../../../evaluation-cycles/types/cycle-types';
import type { KpiSummaryData, KpiDetailData } from '../types/kpi-summary.types';

// Mock auth context
vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-user-1',
      employeeId: 'EMP-001',
      name: 'System Admin',
      email: 'admin@example.com',
      role: 'HR_ADMIN',
    },
    isAuthenticated: true,
  }),
}));

vi.mock('../api/kpi-summary.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/kpi-summary.api')>();
  return {
    ...actual,
    fetchEmployeeKpiSummary: vi.fn(),
    fetchEmployeeKpiDetail: vi.fn(),
  };
});

vi.mock('../../../organization/api/employee-search.api', () => ({
  employeeSearchApi: {
    search: vi.fn(),
  },
}));

vi.mock('../../../evaluation-cycles/api/cycle-api', () => ({
  evaluationCycleApi: {
    getCycles: vi.fn(),
  },
}));

describe('KpiSummaryDashboardPage', () => {
  let queryClient: QueryClient;

  const mockSummaryData: KpiSummaryData = {
    employee: {
      employeeId: 'emp-100',
      employeeCode: 'EMP-100',
      fullName: 'Nguyễn Văn Toàn',
      email: 'toan.nguyen@example.com',
      department: { departmentId: 'dept-1', name: 'Product Engineering' },
      team: { teamId: 'team-1', name: 'Platform Core' },
      role: { roleId: 'role-1', name: 'Senior Software Engineer' },
      jobLevel: { jobLevelId: 'level-1', name: 'Senior' },
      manager: { employeeId: 'mgr-1', fullName: 'Lê Văn Quản Lý' },
    },
    evaluation: {
      evaluationId: 'eval-1',
      evaluationCycleId: 'cycle-2026',
      cycleName: '2026 Annual Cycle',
      status: 'APPROVED',
      isLocked: true,
    },
    scoreSummary: {
      officialScore: 4.65,
      officialScoreLabel: 'Calibrated Final Score',
      overallScore: 4.40,
      overallWeightedScore: 4.65,
      kpiCount: 3,
      completedCount: 3,
    },
    kpis: [
      {
        evaluationItemId: 'item-1',
        criterionCode: 'PERF-01',
        criterionName: 'Code Quality & Reliability',
        category: 'Core Engineering',
        weight: 40,
        rawScore: 4.5,
        weightedScore: 1.8,
        displayOrder: 1,
        resolvedLevel: 4,
        isCompleted: true,
        isDisabled: false,
        comment: null,
        evidenceCount: 1,
        hasEvidence: true,
        measurement: {
          value: '92%',
          unit: '%',
          sourceLabel: 'SonarQube',
        },
      },
      {
        evaluationItemId: 'item-2',
        criterionCode: 'PERF-02',
        criterionName: 'Delivery Speed & On-Time Rate',
        category: 'Delivery',
        weight: 35,
        rawScore: 4.8,
        weightedScore: 1.68,
        displayOrder: 2,
        resolvedLevel: 5,
        isCompleted: true,
        isDisabled: false,
        comment: null,
        evidenceCount: 0,
        hasEvidence: false,
        measurement: {
          value: null,
          unit: null,
          sourceLabel: null,
        },
      },
      {
        evaluationItemId: 'item-3',
        criterionCode: 'LEAD-01',
        criterionName: 'Mentorship & Knowledge Sharing',
        category: 'Leadership',
        weight: 25,
        rawScore: 4.7,
        weightedScore: 1.17,
        displayOrder: 3,
        resolvedLevel: 5,
        isCompleted: true,
        isDisabled: false,
        comment: null,
        evidenceCount: 0,
        hasEvidence: false,
        measurement: {
          value: null,
          unit: null,
          sourceLabel: null,
        },
      },
    ],
    relationships: [
      { sourceId: 'emp-100', targetId: 'eval-1', relationshipType: 'EVALUATED_IN' },
      { sourceId: 'eval-1', targetId: 'crit-1', relationshipType: 'INCLUDES' },
      { sourceId: 'eval-1', targetId: 'crit-2', relationshipType: 'INCLUDES' },
      { sourceId: 'eval-1', targetId: 'crit-3', relationshipType: 'INCLUDES' },
    ],
  };

  const mockDetailData: KpiDetailData = {
    evaluationItemId: 'item-1',
    evaluationId: 'eval-1',
    employeeId: 'emp-100',
    criteria: {
      criterionCode: 'PERF-01',
      criterionName: 'Code Quality & Reliability',
      category: 'Core Engineering',
      description: 'Maintains low bug count and high automated test coverage.',
    },
    measurement: {
      value: '92%',
      unit: '%',
      sourceLabel: 'SonarQube',
    },
    scoring: {
      weight: 40,
      resolvedLevel: 4,
      rawScore: 4.5,
      weightedScore: 1.8,
    },
    levelDefinitions: [
      { level: 1, name: 'Needs Improvement', description: 'Under 60% coverage' },
      { level: 4, name: 'Exceeds Expectations', description: '90%+ coverage with zero critical bugs' },
    ],
    evidence: [
      {
        evidenceId: 'ev-1',
        evidenceType: 'URL',
        evidenceValue: null,
        title: 'SonarQube Analysis Report Q2',
        evidenceUrl: 'https://sonar.internal/reports/q2-2026',
        fileReference: null,
        rationale: 'Quality gate passed with 92% coverage',
        source: 'SonarQube',
        uploadedAt: '2026-06-10T00:00:00Z',
      },
    ],
    isLocked: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.mocked(cycleApiModule.evaluationCycleApi.getCycles).mockResolvedValue([
      { id: 'cycle-2026', name: '2026 Annual Cycle', code: 'CYCLE-2026', status: 'ACTIVE' } as unknown as EvaluationCycleDTO,
    ]);

    vi.mocked(employeeSearchApiModule.employeeSearchApi.search).mockResolvedValue({
      employees: [
        {
          employeeId: 'emp-100',
          employeeCode: 'EMP-100',
          fullName: 'Nguyễn Văn Toàn',
          email: 'toan.nguyen@example.com',
          department: { id: 'dept-1', name: 'Product Engineering', code: 'ENG' },
          team: { id: 'team-1', name: 'Platform Core', code: 'PC' },
          role: { id: 'role-1', name: 'Senior Software Engineer', code: 'SE' },
          jobLevel: { id: 'level-1', name: 'Senior', code: 'SR' },
          manager: null,
          employmentStatus: 'ACTIVE',
          joinDate: '2022-01-01',
        },
      ],
      page: { number: 1, size: 20, total_items: 1, total_pages: 1 },
    });
  });

  afterEach(() => {
    cleanup();
    queryClient?.clear();
  });

  const renderDashboard = (initialUrl = '/reports/employees/emp-100/kpi-summary') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialUrl]}>
          <Routes>
            <Route path="/reports/employees/:employeeId/kpi-summary" element={<KpiSummaryDashboardPage />} />
            <Route path="/reports/kpi-summary" element={<KpiSummaryDashboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('TC-FE-01: Renders page title and search bar', async () => {
    vi.mocked(kpiSummaryApiModule.fetchEmployeeKpiSummary).mockResolvedValue(mockSummaryData);

    renderDashboard();

    expect(screen.getByText('KPI Summary Dashboard')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search employee by name/i)).toBeInTheDocument();
  });

  it('TC-FE-02: Displays authoritative Employee Info Card and Score Summary Card', async () => {
    vi.mocked(kpiSummaryApiModule.fetchEmployeeKpiSummary).mockResolvedValue(mockSummaryData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText('Nguyễn Văn Toàn')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText(/EMP-100/)[0]).toBeInTheDocument();
    expect(screen.getAllByText('Product Engineering')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Platform Core')[0]).toBeInTheDocument();

    // Official Score prominence
    expect(screen.getByText('Calibrated Final Score')).toBeInTheDocument();
    expect(screen.getAllByText('4.65')[0]).toBeInTheDocument();
    expect(screen.getByText('4.40')).toBeInTheDocument();
    expect(screen.getByText('Completion Progress')).toBeInTheDocument();
    expect(screen.getByText(/3 KPIs/)).toBeInTheDocument();
  });

  it('TC-FE-03: Renders KPI Summary Table in display_order ASC with metrics', async () => {
    vi.mocked(kpiSummaryApiModule.fetchEmployeeKpiSummary).mockResolvedValue(mockSummaryData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText('Code Quality & Reliability')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('Delivery Speed & On-Time Rate')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Mentorship & Knowledge Sharing')[0]).toBeInTheDocument();

    // Verify measurement rendering
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('TC-FE-04: Opens KPI detail slide-out drawer on row click and fetches detail', async () => {
    vi.mocked(kpiSummaryApiModule.fetchEmployeeKpiSummary).mockResolvedValue(mockSummaryData);
    vi.mocked(kpiSummaryApiModule.fetchEmployeeKpiDetail).mockResolvedValue(mockDetailData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText('Code Quality & Reliability')[0]).toBeInTheDocument();
    });

    // Click on row to open drill-down panel
    const row = screen.getAllByText('Code Quality & Reliability')[0];
    fireEvent.click(row);

    await waitFor(() => {
      expect(kpiSummaryApiModule.fetchEmployeeKpiDetail).toHaveBeenCalledWith('emp-100', 'item-1');
      expect(screen.getByText('Measurement Information')).toBeInTheDocument();
    });

    expect(screen.getByText('SonarQube Analysis Report Q2')).toBeInTheDocument();
    expect(screen.getByText('Exceeds Expectations')).toBeInTheDocument();
  });

  it('TC-FE-05: Renders KPI relationship diagram with toggleable accessible list view', async () => {
    vi.mocked(kpiSummaryApiModule.fetchEmployeeKpiSummary).mockResolvedValue(mockSummaryData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Organizational & Evaluation Relationship Diagram')).toBeInTheDocument();
    });

    // Toggle to accessible list view
    const listToggleBtn = screen.getByRole('button', { name: /accessible/i });
    expect(listToggleBtn).toBeInTheDocument();
    fireEvent.click(listToggleBtn);

    expect(screen.getByText(/EVALUATED_IN/)).toBeInTheDocument();
    expect(screen.getAllByText(/INCLUDES/).length).toBeGreaterThan(0);
  });

  it('TC-FE-06: Displays 403 Forbidden permission banner with diagnostic reference ID', async () => {
    const forbiddenError = Object.assign(new Error('User does not have access to view this employee'), {
      status: 403,
      requestId: 'req-perm-test-1234',
    });

    vi.mocked(kpiSummaryApiModule.fetchEmployeeKpiSummary).mockRejectedValue(forbiddenError);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    expect(screen.getByText(/You do not have permission to view this employee evaluation/i)).toBeInTheDocument();
    expect(screen.getByText(/Reference ID: req-perm-test-1234/i)).toBeInTheDocument();
  });

  it('TC-FE-07: Shows empty state when no employee is selected', async () => {
    renderDashboard('/reports/kpi-summary');

    expect(screen.getByText('No Employee Selected')).toBeInTheDocument();
    expect(screen.getByText(/Use the search bar above/i)).toBeInTheDocument();
  });
});
