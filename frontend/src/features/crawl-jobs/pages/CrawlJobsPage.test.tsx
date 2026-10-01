/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CrawlJobsPage } from './CrawlJobsPage';
import { crawlJobApi } from '../api/crawl-job-api';
import { evaluationCycleApi } from '@/features/evaluation-cycles/api/cycle-api';
import { listEvaluationDataImports } from '@/features/imports/api/evaluation-data-import-api';
import { fetchCriterionLibrary } from '@/features/templates/api/template-api';
import { AuthContext } from '@/shared/auth/auth-context';
import * as themeContext from '@/shared/theme';
import type { CrawlExecution, CrawlJob } from '../api/crawl-job.types';
import type { AuthUser } from '@/shared/auth/auth-models';

vi.mock('../api/crawl-job-api', () => ({
  crawlJobApi: {
    listJobs: vi.fn(),
    getJob: vi.fn(),
    listPublishedScripts: vi.fn(),
    listCredentialReferences: vi.fn(),
    createJob: vi.fn(),
    updateJob: vi.fn(),
    setJobEnabled: vi.fn(),
    listCycleJobs: vi.fn(),
    assignJobToCycle: vi.fn(),
    createExecution: vi.fn(),
    listExecutions: vi.fn(),
    getExecution: vi.fn(),
    retryExecution: vi.fn(),
    cancelExecution: vi.fn(),
    listScoringExecutions: vi.fn().mockResolvedValue([]),
    reviewScoringExecution: vi.fn(),
    applyScoringExecution: vi.fn(),
    rescoreRow: vi.fn(),
  },
}));
vi.mock('@/features/evaluation-cycles/api/cycle-api', () => ({ evaluationCycleApi: { getCycles: vi.fn() } }));
vi.mock('@/features/imports/api/evaluation-data-import-api', () => ({
  applyEvaluationDataImport: vi.fn(),
  getEvaluationDataImportPreview: vi.fn(),
  listEvaluationDataImports: vi.fn(),
  patchEvaluationDataImportRecord: vi.fn(),
  rejectEvaluationDataImport: vi.fn(),
}));
vi.mock('@/features/templates/api/template-api', () => ({ fetchCriterionLibrary: vi.fn() }));
vi.mock('@/shared/theme', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/theme')>();
  return { ...original, useTheme: vi.fn() };
});

const job: CrawlJob = {
  crawl_job_definition_id: 'job-1',
  code: 'JIRA_METRICS',
  name: 'Jira metrics',
  source_system: 'JIRA',
  crawl_script_version_id: 'script-v1',
  script_code: 'JIRA_FETCH',
  script_version: 3,
  script_checksum: 'a'.repeat(64),
  published_at: '2026-09-01T00:00:00Z',
  connector_credential_id: 'credential-1',
  credential_code: 'JIRA_READONLY',
  source_config: { base_url: 'https://jira.example.test' },
  default_schedule_cron: null,
  failure_policy: 'CONTINUE',
  active: true,
  criteria: [{ criterion_id: 'criterion-1', criterion_code: 'STORY_POINTS' }],
  criteria_count: 1,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

function renderPage(role: AuthUser['role']) {
  const authValue = {
    user: { id: 'user-1', role, name: role } as unknown as AuthUser,
    isAuthenticated: true,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  };
  vi.mocked(themeContext.useTheme).mockReturnValue({ isDark: false } as ReturnType<typeof themeContext.useTheme>);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<AuthContext.Provider value={authValue}><MemoryRouter><QueryClientProvider client={client}><CrawlJobsPage /></QueryClientProvider></MemoryRouter></AuthContext.Provider>);
}

describe('CrawlJobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crawlJobApi.listJobs).mockResolvedValue([]);
    vi.mocked(listEvaluationDataImports).mockResolvedValue([]);
    vi.mocked(evaluationCycleApi.getCycles).mockResolvedValue([
      { id: 'cycle-1', code: '2026-Q3', name: 'Q3 2026', status: 'OPEN' },
    ] as never);
    vi.mocked(crawlJobApi.listCycleJobs).mockResolvedValue([{
      evaluation_cycle_id: 'cycle-1', crawl_job_definition_id: 'job-1', enabled: true,
      sequence_order: 0, failure_policy: 'CONTINUE', code: 'JIRA_METRICS', name: 'Jira metrics',
      source_system: 'JIRA', active: true, script_version: 3,
    }]);
    vi.mocked(fetchCriterionLibrary).mockResolvedValue([]);
  });

  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders independent tabs and a meaningful empty job state', async () => {
    renderPage('HR_ADMIN');
    expect(screen.getByRole('tab', { name: /Crawl Jobs/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Crawl History|Executions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Crawl Data & Scores|Data Review/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('No Crawl Jobs')).toBeInTheDocument());
  });

  it('limits Managers to the scoped review tab', async () => {
    renderPage('MANAGER');
    expect(screen.queryByRole('tab', { name: /Crawl Jobs/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Crawl Data & Scores|Data Review/i })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.getByText(/No crawl data records found/i)).toBeInTheDocument());
    expect(crawlJobApi.listJobs).not.toHaveBeenCalled();
  });

  it('prevents duplicate Run Now requests while creation is pending', async () => {
    vi.mocked(crawlJobApi.listJobs).mockResolvedValue([job]);
    let finishRequest: ((execution: CrawlExecution) => void) | undefined;
    vi.mocked(crawlJobApi.createExecution).mockImplementation(() => new Promise((resolve) => {
      finishRequest = resolve;
    }));
    renderPage('HR_ADMIN');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Run Jira metrics now' }));
    await user.selectOptions(screen.getByLabelText('Evaluation Cycle'), 'cycle-1');
    const submit = screen.getByRole('button', { name: /Queue execution/i });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(crawlJobApi.createExecution).toHaveBeenCalledTimes(1));
    finishRequest?.({
      crawl_job_execution_id: 'execution-1', crawl_job_definition_id: 'job-1', evaluation_cycle_id: 'cycle-1',
      status: 'QUEUED', attempt_no: 1, max_attempts: 3, trigger_type: 'MANUAL', triggered_by: 'user-1', scheduled_at: null,
      next_retry_at: '2026-09-29T00:00:00Z',
      started_at: null, finished_at: null, duration_ms: null, script_version: 3, script_checksum: 'a'.repeat(64),
      source_system: 'JIRA', source_config_snapshot: {}, criteria_snapshot: [], records_fetched: 0, records_parsed: 0,
      records_valid: 0, records_invalid: 0, records_conflict: 0, records_applied: 0, error_code: null, error_message: null,
      retry_of_execution_id: null, evaluation_data_import_id: null, created_at: '2026-09-29T00:00:00Z',
    });
  });
});