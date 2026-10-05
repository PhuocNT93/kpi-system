import { deleteApi, getApi, patchApi, postApi, putApi } from '@/shared/api/api-client';
import type {
  CrawlCredentialReference,
  CrawlCycleJob,
  CrawlExecution,
  CrawlExecutionLog,
  CrawlExecutionStatus,
  CrawlJob,
  CrawlJobCreatePayload,
  CrawlSourceSystem,
  CrawlScriptDetails,
  CreateCrawlScriptPayload,
  PublishedCrawlScript,
  TestRunScriptPayload,
  TestRunScriptResult,
  UpdateCrawlScriptPayload,
  CrawlFailurePolicy,
  CrawlSourceSystemRecord,
  CreateCrawlSourceSystemPayload,
  KpiScoringPrompt,
  KpiScoringPromptVersion,
  CreateKpiScoringPromptPayload,
  CreateKpiScoringPromptVersionPayload,
  DryRunPromptTestPayload,
  DryRunPromptTestResult,
  CrawlScoringExecutionRecord,
  ReviewScoringPayload,
} from './crawl-job.types';

export const crawlJobApi = {
  // ── Crawl Jobs ──────────────────────────────────────────────────────────
  listJobs: (filters: { sourceSystem?: CrawlSourceSystem; active?: boolean; cycleId?: string } = {}) => {
    const query = new URLSearchParams();
    if (filters.sourceSystem) query.set('source_system', filters.sourceSystem);
    if (filters.active !== undefined) query.set('active', String(filters.active));
    if (filters.cycleId) query.set('cycleId', filters.cycleId);
    const suffix = query.size ? `?${query.toString()}` : '';
    return getApi<CrawlJob[]>(`/api/crawl-jobs${suffix}`);
  },
  getJob: (jobId: string) => getApi<CrawlJob>(`/api/crawl-jobs/${jobId}`),
  createJob: (payload: CrawlJobCreatePayload) => postApi<CrawlJob>('/api/crawl-jobs', payload),
  updateJob: (jobId: string, payload: Partial<CrawlJobCreatePayload>) => patchApi<CrawlJob>(`/api/crawl-jobs/${jobId}`, payload),
  deleteJob: (jobId: string) => deleteApi<{ success: boolean; message: string }>(`/api/crawl-jobs/${jobId}`),
  setJobEnabled: (jobId: string, enabled: boolean) => postApi<CrawlJob>(`/api/crawl-jobs/${jobId}/${enabled ? 'enable' : 'disable'}`, {}),
  listCriteria: () =>
    getApi<Array<{ id: string; criterion_id: string; code: string; name: string; category: string; description?: string; active: boolean; status: string }>>('/api/crawl-criteria'),

  // ── Crawl Scripts ───────────────────────────────────────────────────────
  listPublishedScripts: (sourceSystem?: CrawlSourceSystem) => {
    const query = sourceSystem ? `?source_system=${encodeURIComponent(sourceSystem)}` : '';
    return getApi<PublishedCrawlScript[]>(`/api/crawl-scripts${query}`);
  },
  listScripts: (filters: { sourceSystem?: CrawlSourceSystem; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (filters.sourceSystem) query.set('source_system', filters.sourceSystem);
    if (filters.status) query.set('status', filters.status);
    const suffix = query.size ? `?${query.toString()}` : '';
    return getApi<PublishedCrawlScript[]>(`/api/crawl-scripts${suffix}`);
  },
  getScriptDetails: (scriptVersionId: string) =>
    getApi<CrawlScriptDetails>(`/api/crawl-scripts/${scriptVersionId}`),
  createScript: (payload: CreateCrawlScriptPayload) =>
    postApi<PublishedCrawlScript>('/api/crawl-scripts', payload),
  updateScript: (scriptVersionId: string, payload: UpdateCrawlScriptPayload) =>
    putApi<PublishedCrawlScript>(`/api/crawl-scripts/${scriptVersionId}`, payload),
  deleteScript: (scriptVersionId: string) =>
    deleteApi<{ success: boolean; message: string }>(`/api/crawl-scripts/${scriptVersionId}`),
  testRunScript: (payload: TestRunScriptPayload, scriptVersionId?: string) => {
    const url = scriptVersionId ? `/api/crawl-scripts/${scriptVersionId}/test-run` : '/api/crawl-scripts/test-run';
    return postApi<TestRunScriptResult>(url, payload);
  },
  publishScript: (scriptVersionId: string) =>
    postApi<PublishedCrawlScript>(`/api/crawl-scripts/${scriptVersionId}/publish`, {}),
  disableScript: (scriptVersionId: string) =>
    postApi<PublishedCrawlScript>(`/api/crawl-scripts/${scriptVersionId}/disable`, {}),
  enableScript: (scriptVersionId: string) =>
    postApi<PublishedCrawlScript>(`/api/crawl-scripts/${scriptVersionId}/enable`, {}),

  // ── Credentials ─────────────────────────────────────────────────────────
  listCredentialReferences: (sourceSystem?: CrawlSourceSystem) => {
    const query = sourceSystem ? `?source_system=${encodeURIComponent(sourceSystem)}` : '';
    return getApi<CrawlCredentialReference[]>(`/api/connector-credentials${query}`);
  },

  // ── Cycle Assignment ────────────────────────────────────────────────────
  listCycleJobs: (cycleId: string) => getApi<CrawlCycleJob[]>(`/api/evaluation-cycles/${cycleId}/crawl-jobs`),
  assignJobToCycle: (cycleId: string, jobId: string, payload: { enabled: boolean; sequence_order: number; failure_policy: CrawlFailurePolicy }) =>
    putApi<null>(`/api/evaluation-cycles/${cycleId}/crawl-jobs/${jobId}`, payload),

  // ── Crawl Executions ────────────────────────────────────────────────────
  createExecution: (jobId: string, cycleId: string, idempotencyKey: string) =>
    postApi<CrawlExecution>(`/api/crawl-jobs/${jobId}/executions`, { evaluation_cycle_id: cycleId }, idempotencyKey),
  listExecutions: (jobId: string, filters: { status?: CrawlExecutionStatus; cycleId?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (filters.status) query.set('status', filters.status);
    if (filters.cycleId) query.set('evaluation_cycle_id', filters.cycleId);
    query.set('page', String(filters.page ?? 1));
    query.set('limit', String(filters.limit ?? 20));
    return getApi<CrawlExecution[]>(`/api/crawl-jobs/${jobId}/executions?${query.toString()}`);
  },
  getExecution: (executionId: string) => getApi<CrawlExecution>(`/api/crawl-executions/${executionId}`),
  listExecutionRecords: (executionId: string) => getApi<Array<Record<string, unknown>>>(`/api/crawl-executions/${executionId}/records`),
  listExecutionLogs: (executionId: string, filters: { search?: string; level?: 'INFO' | 'WARN' | 'ERROR' } = {}) => {
    const query = new URLSearchParams({ page: '1', limit: '100' });
    if (filters.search) query.set('search', filters.search);
    if (filters.level) query.set('level', filters.level);
    return getApi<CrawlExecutionLog[]>(`/api/crawl-executions/${executionId}/logs?${query.toString()}`);
  },
  retryExecution: (executionId: string, idempotencyKey: string) =>
    postApi<CrawlExecution>(`/api/crawl-executions/${executionId}/retry`, {}, idempotencyKey),
  cancelExecution: (executionId: string) => postApi<CrawlExecution>(`/api/crawl-executions/${executionId}/cancel`, {}),

  // ── Source Systems Registry ─────────────────────────────────────────────
  listSourceSystems: () => getApi<CrawlSourceSystemRecord[]>('/api/crawl-source-systems'),
  getSourceSystem: (id: string) => getApi<CrawlSourceSystemRecord>(`/api/crawl-source-systems/${id}`),
  createSourceSystem: (payload: CreateCrawlSourceSystemPayload) =>
    postApi<CrawlSourceSystemRecord>('/api/crawl-source-systems', payload),
  updateSourceSystem: (id: string, payload: Partial<CreateCrawlSourceSystemPayload>) =>
    putApi<CrawlSourceSystemRecord>(`/api/crawl-source-systems/${id}`, payload),
  deleteSourceSystem: (id: string) =>
    deleteApi<{ success: boolean; message: string }>(`/api/crawl-source-systems/${id}`),
  testSourceSystemConnection: (id: string) =>
    postApi<{ success: boolean; message: string; duration_ms: number }>(`/api/crawl-source-systems/${id}/test-connection`, {}),

  // ── KPI Scoring Prompts ─────────────────────────────────────────────────
  listPrompts: () => getApi<KpiScoringPrompt[]>('/api/kpi-scoring-prompts'),
  getPrompt: (promptId: string) => getApi<KpiScoringPrompt>(`/api/kpi-scoring-prompts/${promptId}`),
  createPrompt: (payload: CreateKpiScoringPromptPayload) =>
    postApi<KpiScoringPrompt>('/api/kpi-scoring-prompts', payload),
  updatePrompt: (promptId: string, payload: Partial<CreateKpiScoringPromptPayload>) =>
    putApi<KpiScoringPrompt>(`/api/kpi-scoring-prompts/${promptId}`, payload),
  deletePrompt: (promptId: string) =>
    deleteApi<{ success: boolean; message: string }>(`/api/kpi-scoring-prompts/${promptId}`),
  listPromptVersions: (promptId: string) =>
    getApi<KpiScoringPromptVersion[]>(`/api/kpi-scoring-prompts/${promptId}/versions`),
  createPromptVersion: (promptId: string, payload: CreateKpiScoringPromptVersionPayload) =>
    postApi<KpiScoringPromptVersion>(`/api/kpi-scoring-prompts/${promptId}/versions`, payload),
  publishPromptVersion: (promptId: string, versionId: string) =>
    postApi<KpiScoringPromptVersion>(`/api/kpi-scoring-prompts/${promptId}/versions/${versionId}/publish`, {}),
  testDryRunPrompt: (payload: DryRunPromptTestPayload) =>
    postApi<DryRunPromptTestResult>('/api/kpi-scoring-prompts/test-dry-run', payload),

  // ── Row-Level Scoring Executions & Human Review Gate ───────────────────
  listScoringExecutions: (filters: {
    crawlExecutionId?: string;
    cycleId?: string;
    status?: string;
    reviewStatus?: string;
    employeeCode?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (filters.crawlExecutionId) query.set('crawl_execution_id', filters.crawlExecutionId);
    if (filters.cycleId) query.set('cycle_id', filters.cycleId);
    if (filters.status) query.set('status', filters.status);
    if (filters.reviewStatus) query.set('review_status', filters.reviewStatus);
    if (filters.employeeCode) query.set('employee_code', filters.employeeCode);
    query.set('page', String(filters.page ?? 1));
    query.set('limit', String(filters.limit ?? 50));
    return getApi<CrawlScoringExecutionRecord[]>(`/api/crawl-scoring-executions?${query.toString()}`);
  },
  getScoringExecution: (id: string) =>
    getApi<CrawlScoringExecutionRecord>(`/api/crawl-scoring-executions/${id}`),
  retryScoringExecution: (id: string) =>
    postApi<CrawlScoringExecutionRecord>(`/api/crawl-scoring-executions/${id}/retry`, {}),
  rescoreRow: (crawlDataRowId: string, promptVersionId?: string) =>
    postApi<CrawlScoringExecutionRecord>(`/api/crawl-scoring-executions/rescore-row/${crawlDataRowId}`, { prompt_version_id: promptVersionId }),
  reviewScoringExecution: (id: string, payload: ReviewScoringPayload) =>
    postApi<CrawlScoringExecutionRecord>(`/api/crawl-scoring-executions/${id}/review`, payload),
  applyScoringExecution: (id: string) =>
    postApi<CrawlScoringExecutionRecord>(`/api/crawl-scoring-executions/${id}/apply`, {}),
};