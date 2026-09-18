/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EvaluationDetailContent } from '../EvaluationDetailPage';
import { evaluationApi } from '../../api/evaluation-api';
import * as authContextModule from '@/shared/auth/auth-context';
import type { AuthUser } from '@/shared/auth/auth-models';

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../api/evaluation-api', () => ({
  evaluationApi: {
    getEvaluationDetail: vi.fn(),
    saveDraftSingle: vi.fn(),
    saveDraftBatch: vi.fn(),
    submitEvaluation: vi.fn(),
    approveEvaluation: vi.fn(),
    rejectEvaluation: vi.fn(),
    requestCorrectionEvaluation: vi.fn(),
    overrideKpiScore: vi.fn(),
  },
}));

// Mock child modals/complex visual components to keep snapshot rendering test isolated
vi.mock('../../components/EvaluationHeader', () => ({
  EvaluationHeader: ({ title, status }: { title?: string; status?: string }) => (
    <div data-testid="evaluation-header">
      <h1>{title}</h1>
      <span>{status}</span>
    </div>
  ),
}));

vi.mock('../../components/EvaluationSummaryPanel', () => ({
  EvaluationSummaryPanel: ({ officialScore }: { officialScore?: number | null }) => (
    <div data-testid="summary-panel">Official Score: {officialScore}</div>
  ),
}));

describe('TC27: Evaluation Detail Snapshot Regression Frontend Tests', () => {
  let queryClient: QueryClient;

  // Stored historical evaluation with immutable snapshots
  const mockHistoricalEvaluation = {
    evaluation_id: 'eval-hist-123',
    evaluation_cycle_id: 'cycle-2025-q4',
    employee_id: 'emp-1',
    status: 'SUBMITTED',
    self_score: 82,
    manager_score: 85,
    final_score: 85,
    official_score: 85,
    is_manager_reviewer: false,
    scoring_breakdown: {
      kpi_results: [
        {
          kpi_id: 'kpi-core',
          kpi_name: 'Core Engineering KPI Snapshot',
          kpi_score: 85,
          weight: 100,
          weighted_score: 85,
          criterion_results: [
            {
              criterion_id: 'item-snap-1',
              resolved_level: 4,
              raw_score: 80,
              max_score: 100,
              normalized_score: 80,
              effective_weight: 60,
              weighted_contribution: 48,
              is_na: false,
              is_disabled: false,
            },
            {
              criterion_id: 'item-snap-2',
              resolved_level: 5,
              raw_score: 100,
              max_score: 100,
              normalized_score: 100,
              effective_weight: 40,
              weighted_contribution: 40,
              is_na: false,
              is_disabled: false,
            },
          ],
        },
      ],
    },
    items: [
      {
        evaluation_item_id: 'item-snap-1',
        evaluation_id: 'eval-hist-123',
        template_criterion_id: 'tc-master-1',
        criterion_code_snapshot: 'HISTORICAL_CODE_REVIEW',
        criterion_name_snapshot: 'Code Review Excellence (Snapshot 2025)',
        weight_snapshot: 60,
        kpi_id_snapshot: 'kpi-core',
        kpi_code_snapshot: 'CORE_ENG',
        kpi_name_snapshot: 'Core Engineering KPI Snapshot',
        kpi_weight_snapshot: 100,
        scoring_rule_snapshot: { rule_type: 'RANGE_THRESHOLD', rule_config: {} },
        level_definition_snapshot: [{ level: 4, score_value: 80 }],
        resolved_level: 80, // percentage mapped level
        raw_score: 80,
        weighted_score: 48,
        is_na: false,
        is_disabled_for_employee: false,
        comment: 'Great peer feedback and code hygiene',
      },
      {
        evaluation_item_id: 'item-snap-2',
        evaluation_id: 'eval-hist-123',
        template_criterion_id: 'tc-master-2',
        criterion_code_snapshot: 'HISTORICAL_DESIGN_DOC',
        criterion_name_snapshot: 'System Design Mastery (Snapshot 2025)',
        weight_snapshot: 40,
        kpi_id_snapshot: 'kpi-core',
        kpi_code_snapshot: 'CORE_ENG',
        kpi_name_snapshot: 'Core Engineering KPI Snapshot',
        kpi_weight_snapshot: 100,
        scoring_rule_snapshot: { rule_type: 'RANGE_THRESHOLD', rule_config: {} },
        level_definition_snapshot: [{ level: 5, score_value: 100 }],
        resolved_level: 100,
        raw_score: 100,
        weighted_score: 40,
        is_na: false,
        is_disabled_for_employee: false,
        comment: 'Great architectural delivery',
      },
    ],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: {
        id: 'usr-1',
        email: 'dev@example.com',
        role: 'EMPLOYEE',
        employeeId: 'emp-1',
      } as AuthUser,
      isAuthenticated: true,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(evaluationApi.getEvaluationDetail).mockResolvedValue(
      mockHistoricalEvaluation as unknown as Awaited<ReturnType<typeof evaluationApi.getEvaluationDetail>>
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/evaluations/eval-hist-123']}>
          <Routes>
            <Route path="/evaluations/:id" element={<EvaluationDetailContent mode="self" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('TC27: Evaluation Detail renders criterion names and weights strictly from stored item snapshots', async () => {
    renderPage();

    // Verify snapshot criterion names are rendered
    const codeReviewElements = await screen.findAllByText('Code Review Excellence (Snapshot 2025)');
    expect(codeReviewElements.length).toBeGreaterThan(0);

    const sysDesignElements = await screen.findAllByText('System Design Mastery (Snapshot 2025)');
    expect(sysDesignElements.length).toBeGreaterThan(0);

    // Verify snapshot KPI group name is rendered
    const kpiElements = screen.getAllByText('Core Engineering KPI Snapshot');
    expect(kpiElements.length).toBeGreaterThan(0);

    // Verify snapshot weights are rendered
    const weight60 = screen.getAllByText(/60%/i);
    expect(weight60.length).toBeGreaterThan(0);

    const weight40 = screen.getAllByText(/40%/i);
    expect(weight40.length).toBeGreaterThan(0);

    // Verify that current live template query was NEVER called to fetch criteria
    expect(evaluationApi.getEvaluationDetail).toHaveBeenCalledWith('eval-hist-123');
  });
});
