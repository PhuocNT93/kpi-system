import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, ChevronDown, ChevronUp, CircleStop,
  ExternalLink, FileCode, Play, Plus, RefreshCw, RotateCcw, Settings2, ShieldAlert, Sparkles, Trash2, X
} from 'lucide-react';
import { ApiClientError } from '@/shared/api/api-client';
import { useAuth } from '@/shared/auth/auth-context';
import { evaluationCycleApi } from '@/features/evaluation-cycles/api/cycle-api';
import { fetchCriterionLibrary } from '@/features/templates/api/template-api';
import { RADII, SHADOWS, useTheme } from '@/shared/theme';
import { crawlJobApi } from '../api/crawl-job-api';
import type {
  CrawlExecution, CrawlExecutionLog, CrawlExecutionStatus, CrawlFailurePolicy,
  CrawlJob, CrawlJobCreatePayload, CrawlScriptItem, CrawlSourceSystem, TestRunScriptResult
} from '../api/crawl-job.types';
import { CrawlDataScoresTab } from '../components/CrawlDataScoresTab';
import { CrawlConfigurationTab } from '../components/CrawlConfigurationTab';

type MainTab = 'jobs' | 'executions' | 'review' | 'config';
type JobFormState = {
  id?: string;
  code: string;
  name: string;
  sourceSystem: CrawlSourceSystem;
  scriptVersionId: string;
  credentialId: string;
  criterionIds: string[];
  sourceConfigText: string;
  schedule: string;
  failurePolicy: CrawlFailurePolicy;
  evaluationCycleId?: string;
};

const TABS: Array<{ id: MainTab; label: string; icon: typeof Activity }> = [
  { id: 'jobs', label: 'Crawl Jobs', icon: Settings2 },
  { id: 'executions', label: 'Crawl History', icon: Activity },
  { id: 'review', label: 'Crawl Data & Scores', icon: Sparkles },
  { id: 'config', label: 'Crawl Configuration', icon: FileCode },
];

const TERMINAL_STATUSES = new Set<CrawlExecutionStatus>([
  'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED', 'CANCELLED',
]);

const FAILURE_POLICIES: CrawlFailurePolicy[] = ['CONTINUE', 'STOP_CYCLE', 'RETRY_THEN_CONTINUE', 'RETRY_THEN_STOP'];

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

function statusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

function formatDate(value?: string | null): string {
  if (!value) return 'Not started';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

function formatDuration(value?: number | null): string {
  if (value == null) return '—';
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll('_', '-');
  return <span className={`crawl-status crawl-status--${normalized}`}><span className="crawl-status__dot" />{statusLabel(status)}</span>;
}

function ApiError({ error }: { error: unknown }) {
  return <div className="crawl-alert" role="alert"><AlertTriangle size={17} /><span>{errorMessage(error)}</span></div>;
}

function LoadingState({ label = 'Loading' }: { label?: string }) {
  return <div className="crawl-state" role="status"><span className="crawl-spinner" />{label}</div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="crawl-empty"><div className="crawl-empty__mark"><Activity size={20} /></div><strong>{title}</strong><span>{detail}</span></div>;
}

function newJobForm(defaultCycleId: string = ''): JobFormState {
  return {
    code: '', name: '', sourceSystem: 'JIRA', scriptVersionId: '', credentialId: '',
    criterionIds: [], sourceConfigText: '{\n  "base_url": "https://"\n}', schedule: '', failurePolicy: 'CONTINUE',
    evaluationCycleId: defaultCycleId,
  };
}

export function CrawlJobsPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = user?.role;
  const canConfigure = role === 'HR_ADMIN';
  const canManageScripts = role === 'HR_ADMIN' || role === 'SYSTEM_ADMIN';
  const canManageReadOnly = role === 'SYSTEM_ADMIN';
  const canReadOperations = role === 'HR_ADMIN' || role === 'SYSTEM_ADMIN' || role === 'MANAGER';
  const canReview = role === 'HR_ADMIN' || role === 'MANAGER';
  const availableTabs = role === 'MANAGER'
    ? TABS.filter((tab) => tab.id === 'review')
    : role === 'SYSTEM_ADMIN'
      ? TABS.filter((tab) => tab.id !== 'review')
      : TABS;
  const requestedTab = (searchParams.get('tab') || (role === 'MANAGER' ? 'review' : 'jobs')).toLowerCase();
  const activeTab: MainTab =
    requestedTab === 'executions' || requestedTab === 'history'
      ? 'executions'
      : requestedTab === 'review' || requestedTab === 'scores' || requestedTab === 'data'
      ? 'review'
      : requestedTab === 'config' || requestedTab === 'scripts' || requestedTab === 'sources' || requestedTab === 'prompts'
      ? 'config'
      : 'jobs';
  const effectiveTab = availableTabs.some((tab) => tab.id === activeTab) ? activeTab : availableTabs[0]!.id;

  const [sourceFilter, setSourceFilter] = useState<CrawlSourceSystem | 'ALL'>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [cycleFilter, setCycleFilter] = useState<string>('ALL');
  const [jobDialog, setJobDialog] = useState<JobFormState | null>(null);
  const [jobFormError, setJobFormError] = useState('');
  const [cycleDialogJob, setCycleDialogJob] = useState<CrawlJob | null>(null);
  const [cycleDialogCycleId, setCycleDialogCycleId] = useState('');
  const [cycleSequence, setCycleSequence] = useState(0);
  const [cycleFailurePolicy, setCycleFailurePolicy] = useState<CrawlFailurePolicy>('CONTINUE');
  const [runDialogJob, setRunDialogJob] = useState<CrawlJob | null>(null);
  const runSubmissionRef = useRef(false);
  const [runCycleId, setRunCycleId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(searchParams.get('job') ?? '');
  const [selectedExecutionId, setSelectedExecutionId] = useState(searchParams.get('execution') ?? '');
  const [executionStatusFilter, setExecutionStatusFilter] = useState<CrawlExecutionStatus | 'ALL'>('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [logLevel, setLogLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');

  const jobsQuery = useQuery({
    queryKey: ['crawlJobs', sourceFilter, activeFilter, cycleFilter],
    queryFn: () => crawlJobApi.listJobs({
      sourceSystem: sourceFilter === 'ALL' ? undefined : sourceFilter,
      active: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
      cycleId: cycleFilter === 'ALL' ? undefined : cycleFilter,
    }),
    enabled: role === 'HR_ADMIN' || canManageReadOnly,
  });
  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const criteriaQuery = useQuery({
    queryKey: ['crawlJobs', 'criteria'],
    queryFn: () => crawlJobApi.listCriteria().catch(() => fetchCriterionLibrary()),
    enabled: Boolean(jobDialog),
  });
  const scriptsQuery = useQuery({
    queryKey: ['crawlJobs', 'scripts', jobDialog?.sourceSystem],
    queryFn: () => crawlJobApi.listPublishedScripts(jobDialog?.sourceSystem),
    enabled: Boolean(jobDialog && canConfigure),
  });
  const credentialsQuery = useQuery({
    queryKey: ['crawlJobs', 'credentials', jobDialog?.sourceSystem],
    queryFn: () => crawlJobApi.listCredentialReferences(jobDialog?.sourceSystem),
    enabled: Boolean(jobDialog && canConfigure),
  });
  const openCyclesQuery = useQuery({
    queryKey: ['crawlJobs', 'openCycles'],
    queryFn: () => evaluationCycleApi.getCycles({ status: 'OPEN' }),
  });
  const cycleAssignmentQuery = useQuery({
    queryKey: ['crawlJobs', 'cycleJobs', cycleDialogCycleId],
    queryFn: () => crawlJobApi.listCycleJobs(cycleDialogCycleId),
    enabled: Boolean(cycleDialogCycleId && cycleDialogJob),
  });
  const runCycleJobsQuery = useQuery({
    queryKey: ['crawlJobs', 'runCycleJobs', runCycleId],
    queryFn: () => crawlJobApi.listCycleJobs(runCycleId),
    enabled: Boolean(runCycleId && runDialogJob),
  });
  const executionsQuery = useQuery({
    queryKey: ['crawlExecutions', selectedJobId, executionStatusFilter],
    queryFn: () => crawlJobApi.listExecutions(selectedJobId, {
      status: executionStatusFilter === 'ALL' ? undefined : executionStatusFilter,
      page: 1,
      limit: 50,
    }),
    enabled: Boolean(selectedJobId && activeTab === 'executions' && canReadOperations),
  });
  const executionDetailQuery = useQuery({
    queryKey: ['crawlExecutions', 'detail', selectedExecutionId],
    queryFn: () => crawlJobApi.getExecution(selectedExecutionId),
    enabled: Boolean(selectedExecutionId && effectiveTab === 'executions' && canReadOperations),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && !TERMINAL_STATUSES.has(status) ? 2500 : false;
    },
  });
  const executionLogsQuery = useQuery({
    queryKey: ['crawlExecutions', 'logs', selectedExecutionId, logSearch, logLevel],
    queryFn: () => crawlJobApi.listExecutionLogs(selectedExecutionId, {
      search: logSearch || undefined,
      level: logLevel === 'ALL' ? undefined : logLevel,
    }),
    enabled: Boolean(selectedExecutionId && effectiveTab === 'executions' && canReadOperations),
  });

  const invalidateJobs = () => queryClient.invalidateQueries({ queryKey: ['crawlJobs'] });
  const saveJobMutation = useMutation({
    mutationFn: async (form: JobFormState) => {
      let sourceConfig: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(form.sourceConfigText || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Source configuration must be a JSON object.');
        sourceConfig = parsed as Record<string, unknown>;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Source configuration is invalid JSON.');
      }
      const payload: CrawlJobCreatePayload = {
        code: form.code.trim(),
        name: form.name.trim(),
        source_system: form.sourceSystem,
        crawl_script_version_id: form.scriptVersionId,
        connector_credential_id: form.credentialId,
        source_config: sourceConfig,
        default_schedule_cron: form.schedule.trim() || null,
        failure_policy: form.failurePolicy,
        criterion_ids: form.criterionIds,
        evaluation_cycle_id: form.evaluationCycleId || undefined,
      };
      if (form.id) {
        const { code: _code, ...updatePayload } = payload;
        return crawlJobApi.updateJob(form.id, updatePayload);
      }
      return crawlJobApi.createJob(payload);
    },
    onSuccess: async (job) => {
      setJobDialog(null);
      setJobFormError('');
      setSelectedJobId(job.crawl_job_definition_id);
      await invalidateJobs();
    },
    onError: (error) => setJobFormError(errorMessage(error)),
  });
  const toggleJobMutation = useMutation({
    mutationFn: ({ jobId, enabled }: { jobId: string; enabled: boolean }) => crawlJobApi.setJobEnabled(jobId, enabled),
    onSuccess: invalidateJobs,
  });
  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => crawlJobApi.deleteJob(jobId),
    onSuccess: invalidateJobs,
  });
  const assignCycleMutation = useMutation({
    mutationFn: () => {
      if (!cycleDialogJob || !cycleDialogCycleId) throw new Error('Select an Evaluation Cycle.');
      return crawlJobApi.assignJobToCycle(cycleDialogCycleId, cycleDialogJob.crawl_job_definition_id, {
        enabled: true,
        sequence_order: cycleSequence,
        failure_policy: cycleFailurePolicy,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['crawlJobs'] });
      setCycleDialogJob(null);
      setCycleDialogCycleId('');
    },
  });
  const runMutation = useMutation({
    mutationFn: () => {
      if (!runDialogJob || !runCycleId) throw new Error('Select an Evaluation Cycle.');
      return crawlJobApi.createExecution(runDialogJob.crawl_job_definition_id, runCycleId, crypto.randomUUID());
    },
    onSuccess: async (execution) => {
      const jobId = runDialogJob?.crawl_job_definition_id ?? execution.crawl_job_definition_id;
      setSelectedJobId(jobId);
      setSelectedExecutionId(execution.crawl_job_execution_id);
      setRunDialogJob(null);
      setRunCycleId('');
      setSearchParams({ tab: 'executions', job: jobId, execution: execution.crawl_job_execution_id });
      await queryClient.invalidateQueries({ queryKey: ['crawlExecutions', jobId] });
    },
    onSettled: () => { runSubmissionRef.current = false; },
  });
  const retryMutation = useMutation({
    mutationFn: (executionId: string) => crawlJobApi.retryExecution(executionId, crypto.randomUUID()),
    onSuccess: async (execution) => {
      setSelectedExecutionId(execution.crawl_job_execution_id);
      setSearchParams({ tab: 'executions', job: execution.crawl_job_definition_id, execution: execution.crawl_job_execution_id });
      await queryClient.invalidateQueries({ queryKey: ['crawlExecutions', execution.crawl_job_definition_id] });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: (executionId: string) => crawlJobApi.cancelExecution(executionId),
    onSuccess: async (execution) => {
      await queryClient.invalidateQueries({ queryKey: ['crawlExecutions', 'detail', execution.crawl_job_execution_id] });
      await queryClient.invalidateQueries({ queryKey: ['crawlExecutions', execution.crawl_job_definition_id] });
    },
  });

  const visibleJobs = useMemo(() => jobs.filter((job) => {
    if (sourceFilter !== 'ALL' && job.source_system !== sourceFilter) return false;
    if (activeFilter === 'ACTIVE' && !job.active) return false;
    if (activeFilter === 'INACTIVE' && job.active) return false;
    return true;
  }), [jobs, sourceFilter, activeFilter]);
  const cycleJobsForRun = runCycleJobsQuery.data ?? [];
  const assignedRunJob = cycleJobsForRun.find((item) => item.crawl_job_definition_id === runDialogJob?.crawl_job_definition_id);
  const selectedExecution = executionDetailQuery.data;

  const handleTabChange = (tab: MainTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    setSearchParams(params);
  };

  const startEdit = async (job: CrawlJob) => {
    setJobDialog({
      id: job.crawl_job_definition_id,
      code: job.code,
      name: job.name,
      sourceSystem: job.source_system,
      scriptVersionId: job.crawl_script_version_id || '',
      credentialId: job.connector_credential_id || '',
      criterionIds: (job.criteria ?? []).map((criterion) => criterion.criterion_id),
      sourceConfigText: JSON.stringify(job.source_config ?? {}, null, 2),
      schedule: job.default_schedule_cron ?? '',
      failurePolicy: job.failure_policy,
      evaluationCycleId: job.evaluation_cycle_id || (openCyclesQuery.data ?? [])[0]?.id || '',
    });
    try {
      const full = await crawlJobApi.getJob(job.crawl_job_definition_id);
      if (full) {
        setJobDialog((prev) => {
          if (!prev || prev.id !== job.crawl_job_definition_id) return prev;
          return {
            ...prev,
            code: full.code || prev.code,
            name: full.name || prev.name,
            sourceSystem: full.source_system || prev.sourceSystem,
            scriptVersionId: full.crawl_script_version_id || prev.scriptVersionId,
            credentialId: full.connector_credential_id || prev.credentialId,
            criterionIds: Array.isArray(full.criteria) ? (full.criteria as Array<{ criterion_id: string }>).map((c) => c.criterion_id) : prev.criterionIds,
            sourceConfigText: JSON.stringify(full.source_config ?? {}, null, 2),
            schedule: full.default_schedule_cron ?? prev.schedule,
            failurePolicy: full.failure_policy || prev.failurePolicy,
            evaluationCycleId: full.evaluation_cycle_id || prev.evaluationCycleId,
          };
        });
      }
    } catch {
      // fallback
    }
  };

  const handleSaveJob = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!jobDialog) return;
    setJobFormError('');
    if (!jobDialog.scriptVersionId || !jobDialog.credentialId || jobDialog.criterionIds.length === 0) {
      setJobFormError('Select a published script, connector reference and at least one KPI.');
      return;
    }
    saveJobMutation.mutate(jobDialog);
  };

  const handleRunSubmit = () => {
    if (runSubmissionRef.current || runMutation.isPending) return;
    runSubmissionRef.current = true;
    runMutation.mutate();
  };

  if (!canReadOperations) {
    return <div className="crawl-page"><div className="crawl-permission"><ShieldAlert size={30} /><h1>Access restricted</h1><p>Your account does not have permission to view Crawl Jobs.</p></div></div>;
  }

  return (
    <main className={`crawl-page${isDark ? ' crawl-page--dark' : ''}`}>
      <div
        style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderRadius: RADII.xl,
          border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
          boxShadow: SHADOWS.sm,
          padding: 'clamp(16px, 2.5vw, 24px) clamp(16px, 3vw, 28px)',
          marginBottom: '20px',
          marginTop: '16px',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: RADII.full,
                backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff',
                color: '#2563eb',
                fontSize: '11px',
                fontWeight: 700,
                marginBottom: '8px',
                letterSpacing: '0.05em',
              }}
            >
              <Sparkles size={13} /> AUTOMATED KPI INTEGRATION & CRAWLER
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(20px, 2.5vw, 24px)',
                fontWeight: 800,
                color: isDark ? '#f8fafc' : '#0f172a',
                letterSpacing: '-0.02em',
              }}
            >
              Thu Thập & Đồng Bộ Dữ Liệu KPI Tự Động
            </h1>
            <p
              style={{
                margin: '6px 0 0',
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: '13px',
                maxWidth: '720px',
                lineHeight: 1.5,
              }}
            >
              Quản lý định nghĩa crawl jobs, phiên bản script sandbox kết nối Jira & Blueprint, lịch trình tự động định kỳ và kiểm duyệt dữ liệu trước khi nạp vào chu kỳ đánh giá.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '8px 14px',
                borderRadius: RADII.lg,
                border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                backgroundColor: isDark ? '#1f2937' : '#f8fafc',
                minWidth: '105px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>
                Crawl Jobs
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                {jobs.length} <span style={{ fontSize: '11px', fontWeight: 500, color: '#10b981' }}>({jobs.filter((j) => j.active).length} act)</span>
              </div>
            </div>
            <div
              style={{
                padding: '8px 14px',
                borderRadius: RADII.lg,
                border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                backgroundColor: isDark ? '#1f2937' : '#f8fafc',
                minWidth: '105px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>
                Row AI Engine
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: isDark ? '#38bdf8' : '#0284c7' }}>
                Gemini 2.5
              </div>
            </div>
            <div
              style={{
                padding: '8px 14px',
                borderRadius: RADII.lg,
                border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                backgroundColor: isDark ? '#1f2937' : '#f8fafc',
                minWidth: '105px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>
                Queue Model
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#34d399' : '#059669' }}>
                SKIP LOCKED
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="crawl-tabs" role="tablist" aria-label="Crawl operations">
        {availableTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={effectiveTab === id} className={effectiveTab === id ? 'is-active' : ''} onClick={() => handleTabChange(id)}>
            <Icon size={17} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {effectiveTab === 'jobs' && (
        <section className="crawl-section" role="tabpanel" aria-label="Crawl Jobs">
          <div className="crawl-section__toolbar">
            <div><h2>Job registry</h2><p>Published scripts mapped to KPI criteria and evaluation cycles.</p></div>
            <div className="crawl-toolbar-actions">
              <select aria-label="Filter by cycle" value={cycleFilter} onChange={(event) => setCycleFilter(event.target.value)}>
                <option value="ALL">All evaluation cycles</option>
                {(openCyclesQuery.data ?? []).map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>{cycle.name} ({cycle.code})</option>
                ))}
              </select>
              <select aria-label="Filter by source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as CrawlSourceSystem | 'ALL')}>
                <option value="ALL">All sources</option><option value="BLUEPRINT">Blueprint</option><option value="JIRA">Jira</option><option value="GOOGLE_SHEET">Google Sheets</option>
              </select>
              <select aria-label="Filter by active status" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)}>
                <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
              </select>
              {canConfigure && (
                <button
                  className="crawl-button crawl-button--primary"
                  type="button"
                  onClick={() => {
                    setJobFormError('');
                    const firstOpen = (openCyclesQuery.data ?? [])[0];
                    setJobDialog(newJobForm(firstOpen?.id ?? ''));
                  }}
                >
                  <Plus size={16} />New Crawl Job
                </button>
              )}
            </div>
          </div>
          {jobsQuery.isLoading ? <LoadingState label="Loading Crawl Jobs" /> : jobsQuery.error ? <ApiError error={jobsQuery.error} /> : visibleJobs.length === 0 ? (
            <EmptyState title="No Crawl Jobs" detail="No jobs match the selected filters." />
          ) : (
            <div className="crawl-table-wrap"><table className="crawl-table"><thead><tr>
              <th>Job</th><th>Cycle</th><th>Source</th><th>Script</th><th>Status</th><th>Schedule</th><th>KPIs</th><th>Last execution</th><th className="crawl-align-right">Actions</th>
            </tr></thead><tbody>{visibleJobs.map((job) => (
              <tr key={job.crawl_job_definition_id}>
                <td><div className="crawl-job-identity"><strong>{job.name}</strong><span>{job.code}</span></div></td>
                <td>
                  {job.evaluation_cycle_code ? (
                    <span className="crawl-badge" title={job.evaluation_cycle_name || job.evaluation_cycle_code} style={{ fontWeight: 600 }}>
                      {job.evaluation_cycle_code}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--crawl-muted, #94a3b8)', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                  )}
                </td>
                <td><span className="crawl-source-mark">{job.source_system.replace('_', ' ')}</span></td>
                <td><div className="crawl-script-identity"><strong>{job.script_code} v{job.script_version}</strong><span>{job.script_checksum.slice(0, 10)}</span></div></td>
                <td><StatusBadge status={job.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                <td className="crawl-mono">{job.default_schedule_cron || 'Manual'}</td>
                <td>{job.criteria_count ?? job.criteria?.length ?? 0}</td>
                <td><div className="crawl-last-run"><span>{job.last_execution_status ? <StatusBadge status={job.last_execution_status} /> : '—'}</span><small>{formatDate(job.last_execution_at)}</small></div></td>
                <td><div className="crawl-row-actions">
                  <button type="button" className="crawl-icon-button" title="View executions" aria-label={`View executions for ${job.name}`} onClick={() => { setSelectedJobId(job.crawl_job_definition_id); setSelectedExecutionId(''); setSearchParams({ tab: 'executions', job: job.crawl_job_definition_id }); }}><Activity size={16} /></button>
                  <button type="button" className="crawl-icon-button" title="Assign to cycle" aria-label={`Assign ${job.name} to cycle`} disabled={!canConfigure} onClick={() => { setCycleDialogJob(job); setCycleDialogCycleId(job.evaluation_cycle_id || ''); setCycleSequence(0); setCycleFailurePolicy(job.failure_policy); }}><Settings2 size={16} /></button>
                  <button type="button" className="crawl-icon-button" title="Run now" aria-label={`Run ${job.name} now`} disabled={!canConfigure || !job.active} onClick={() => { setRunDialogJob(job); setRunCycleId(job.evaluation_cycle_id || (openCyclesQuery.data ?? [])[0]?.id || ''); }}><Play size={16} /></button>
                  {canConfigure && <button type="button" className="crawl-icon-button" title="Edit job" aria-label={`Edit ${job.name}`} onClick={() => startEdit(job)}><Settings2 size={16} /></button>}
                  {canConfigure && (
                    <button
                      type="button"
                      className="crawl-icon-button"
                      title="Delete job"
                      aria-label={`Delete ${job.name}`}
                      disabled={deleteJobMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Bạn có chắc chắn muốn xóa Crawl Job "${job.name}" (${job.code})?`)) {
                          deleteJobMutation.mutate(job.crawl_job_definition_id);
                        }
                      }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  )}
                  {canConfigure && <button type="button" className="crawl-text-button" disabled={toggleJobMutation.isPending} onClick={() => toggleJobMutation.mutate({ jobId: job.crawl_job_definition_id, enabled: !job.active })}>{job.active ? 'Disable' : 'Enable'}</button>}
                </div></td>
              </tr>
            ))}</tbody></table></div>
          )}
          {toggleJobMutation.error && <ApiError error={toggleJobMutation.error} />}
        </section>
      )}

      {effectiveTab === 'executions' && (
        <section className="crawl-section" role="tabpanel" aria-label="Crawl Executions">
          <div className="crawl-section__toolbar">
            <div><h2>Execution history</h2><p>Each execution records the exact published configuration used by its worker.</p></div>
            <div className="crawl-toolbar-actions">
              <select aria-label="Filter executions by job" value={selectedJobId} onChange={(event) => { setSelectedJobId(event.target.value); setSelectedExecutionId(''); }}>
                <option value="">Select a job</option>{jobs.map((job) => <option key={job.crawl_job_definition_id} value={job.crawl_job_definition_id}>{job.code} · {job.name}</option>)}
              </select>
              <select aria-label="Filter executions by status" value={executionStatusFilter} onChange={(event) => setExecutionStatusFilter(event.target.value as CrawlExecutionStatus | 'ALL')}>
                <option value="ALL">All statuses</option>{['QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED', 'CANCELLED'].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
              <button type="button" className="crawl-icon-button" title="Refresh executions" aria-label="Refresh executions" disabled={!selectedJobId} onClick={() => void executionsQuery.refetch()}><RefreshCw size={16} /></button>
            </div>
          </div>
          {!selectedJobId ? <EmptyState title="Select a Crawl Job" detail="Choose a job to inspect its execution history." />
            : executionsQuery.isLoading ? <LoadingState label="Loading executions" />
              : executionsQuery.error ? <ApiError error={executionsQuery.error} />
                : (executionsQuery.data ?? []).length === 0 ? <EmptyState title="No executions yet" detail="This Crawl Job has no execution history." />
                  : <div className="crawl-table-wrap"><table className="crawl-table"><thead><tr><th>Execution</th><th>Cycle</th><th>Trigger</th><th>Attempt</th><th>Status</th><th>Queued</th><th>Started</th><th>Duration</th><th>Records</th></tr></thead><tbody>
                    {(executionsQuery.data ?? []).map((execution) => <tr key={execution.crawl_job_execution_id} className={selectedExecutionId === execution.crawl_job_execution_id ? 'is-selected' : ''} onClick={() => { setSelectedExecutionId(execution.crawl_job_execution_id); setSearchParams({ tab: 'executions', job: selectedJobId, execution: execution.crawl_job_execution_id }); }}>
                      <td className="crawl-mono">{execution.crawl_job_execution_id.slice(0, 12)}</td><td>{execution.cycle_code ?? execution.evaluation_cycle_id.slice(0, 8)}</td><td>{execution.trigger_type}</td><td>{execution.attempt_no}</td><td><StatusBadge status={execution.status} /></td><td>{formatDate(execution.created_at)}</td><td>{formatDate(execution.started_at)}</td><td>{formatDuration(execution.duration_ms)}</td><td>{execution.records_valid}/{execution.records_fetched}</td>
                    </tr>)}
                  </tbody></table></div>}
          {selectedExecutionId && <ExecutionDetail
            execution={selectedExecution}
            logs={executionLogsQuery.data ?? []}
            logLoading={executionLogsQuery.isLoading}
            logError={executionLogsQuery.error}
            logSearch={logSearch}
            logLevel={logLevel}
            onLogSearchChange={setLogSearch}
            onLogLevelChange={setLogLevel}
            loading={executionDetailQuery.isLoading}
            error={executionDetailQuery.error}
            canManage={canConfigure}
            retrying={retryMutation.isPending}
            cancelling={cancelMutation.isPending}
            onRetry={() => { if (window.confirm('Retry will create a new execution attempt. The historical execution will remain unchanged.')) retryMutation.mutate(selectedExecutionId); }}
            onCancel={() => { if (window.confirm('Cancel this crawl execution?')) cancelMutation.mutate(selectedExecutionId); }}
            onOpenScoresTab={() => handleTabChange('review')}
          />}
          {retryMutation.error && <ApiError error={retryMutation.error} />}{cancelMutation.error && <ApiError error={cancelMutation.error} />}
        </section>
      )}

      {effectiveTab === 'review' && (
        <CrawlDataScoresTab
          canReview={canReview}
          selectedExecutionId={selectedExecutionId}
          onSelectExecution={(id) => setSelectedExecutionId(id)}
        />
      )}

      {effectiveTab === 'config' && (
        <CrawlConfigurationTab
          canConfigure={canConfigure || canManageScripts}
          initialSubTab={requestedTab === 'sources' ? 'sources' : requestedTab === 'prompts' ? 'prompts' : 'scripts'}
        />
      )}

      {jobDialog && <JobDialog
        form={jobDialog}
        editing={Boolean(jobDialog.id)}
        loading={saveJobMutation.isPending}
        error={jobFormError || (criteriaQuery.error ? errorMessage(criteriaQuery.error) : '') || (scriptsQuery.error ? errorMessage(scriptsQuery.error) : '') || (credentialsQuery.error ? errorMessage(credentialsQuery.error) : '')}
        criteria={criteriaQuery.data ?? []}
        scripts={scriptsQuery.data ?? []}
        credentials={credentialsQuery.data ?? []}
        cycles={openCyclesQuery.data ?? []}
        existingJobs={jobs}
        onChange={setJobDialog}
        onSubmit={handleSaveJob}
        onClose={() => setJobDialog(null)}
        onScriptCreatedAndPublished={async (newVersionId) => {
          await queryClient.invalidateQueries({ queryKey: ['crawlJobs', 'scripts'] });
          setJobDialog((prev) => (prev ? { ...prev, scriptVersionId: newVersionId } : null));
        }}
      />}

      {cycleDialogJob && <CycleAssignmentDialog
        job={cycleDialogJob}
        cycles={openCyclesQuery.data ?? []}
        cycleId={cycleDialogCycleId}
        sequence={cycleSequence}
        failurePolicy={cycleFailurePolicy}
        assignedJobs={cycleAssignmentQuery.data ?? []}
        loading={assignCycleMutation.isPending || openCyclesQuery.isLoading || cycleAssignmentQuery.isLoading}
        error={assignCycleMutation.error ?? openCyclesQuery.error ?? cycleAssignmentQuery.error}
        onCycleChange={(value) => setCycleDialogCycleId(value)}
        onSequenceChange={setCycleSequence}
        onPolicyChange={setCycleFailurePolicy}
        onSubmit={() => assignCycleMutation.mutate()}
        onClose={() => { setCycleDialogJob(null); setCycleDialogCycleId(''); }}
      />}

      {runDialogJob && <RunDialog
        job={runDialogJob}
        cycles={openCyclesQuery.data ?? []}
        cycleId={runCycleId}
        assigned={Boolean(assignedRunJob?.enabled)}
        loading={runMutation.isPending || openCyclesQuery.isLoading || runCycleJobsQuery.isLoading}
        error={runMutation.error ?? openCyclesQuery.error ?? runCycleJobsQuery.error}
        onCycleChange={setRunCycleId}
        onSubmit={handleRunSubmit}
        onClose={() => { setRunDialogJob(null); setRunCycleId(''); }}
      />}
    </main>
  );
}

interface ExecutionTaskItem {
  key?: string;
  title?: string;
  url?: string;
  status?: string;
  is_on_time?: boolean;
}

interface ExecutionRecordItem {
  record_id: string;
  employee_code?: string;
  employee_name?: string | null;
  kpi_code?: string;
  row_staging_status?: string;
  scoring_status?: string;
  row_comment?: string | null;
  raw_measurement_value?: number | string | null;
  score?: number | null;
  final_score?: number | null;
  confidence?: number | null;
  reason?: string;
  ai_evidence?: { summary?: string; [key: string]: unknown } | null;
  source_snapshot?: {
    tasks?: ExecutionTaskItem[];
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

function ExecutionDetail({
  execution, loading, error, logs, logLoading, logError, logSearch, logLevel, onLogSearchChange, onLogLevelChange, canManage, retrying, cancelling, onRetry, onCancel, onOpenScoresTab,
}: {
  execution?: CrawlExecution;
  loading: boolean;
  error: unknown;
  logs: CrawlExecutionLog[];
  logLoading: boolean;
  logError: unknown;
  logSearch: string;
  logLevel: 'ALL' | 'INFO' | 'WARN' | 'ERROR';
  onLogSearchChange: (value: string) => void;
  onLogLevelChange: (value: 'ALL' | 'INFO' | 'WARN' | 'ERROR') => void;
  canManage: boolean;
  retrying: boolean;
  cancelling: boolean;
  onRetry: () => void;
  onCancel: () => void;
  onOpenScoresTab?: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [onlySteps, setOnlySteps] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    if (!onlySteps) return logs;
    return logs.filter((l) => /\[(Script Step|Source Connect|Sandbox Run|Data Normalization|AI Scoring|Crawl Complete)/i.test(l.message));
  }, [logs, onlySteps]);

  const recordsQuery = useQuery({
    queryKey: ['crawl-execution-records', execution?.crawl_job_execution_id],
    queryFn: () => execution ? crawlJobApi.listExecutionRecords(execution.crawl_job_execution_id) : Promise.resolve([]),
    enabled: Boolean(execution?.crawl_job_execution_id),
    refetchInterval: (query) => {
      if (!execution) return false;
      if (execution.status === 'RUNNING' || execution.status === 'QUEUED') return 3000;
      const records = (query.state.data ?? []) as ExecutionRecordItem[];
      const hasPending = records.some((r) => r.scoring_status === 'PENDING' || r.scoring_status === 'PROCESSING');
      return hasPending ? 3000 : false;
    },
  });

  const records = useMemo(() => {
    const list = (recordsQuery.data ?? []) as ExecutionRecordItem[];
    if (!recordSearch.trim()) return list;
    const term = recordSearch.toLowerCase();
    return list.filter((r) =>
      String(r.employee_code || '').toLowerCase().includes(term) ||
      String(r.employee_name || '').toLowerCase().includes(term) ||
      String(r.kpi_code || '').toLowerCase().includes(term) ||
      String(r.row_staging_status || '').toLowerCase().includes(term) ||
      String(r.reason || '').toLowerCase().includes(term)
    );
  }, [recordsQuery.data, recordSearch]);

  if (loading) return <LoadingState label="Loading execution detail" />;
  if (error) return <ApiError error={error} />;
  if (!execution) return null;
  const isRetryable = execution.can_retry === true;
  const isActive = execution.status === 'QUEUED' || execution.status === 'RUNNING';

  return <article className="crawl-detail">
    <div className="crawl-detail__header"><div><span className="crawl-detail__eyebrow">EXECUTION SNAPSHOT</span><h3>{execution.crawl_job_execution_id}</h3></div><div className="crawl-detail__actions"><StatusBadge status={execution.status} />{canManage && isRetryable && <button className="crawl-button crawl-button--secondary" type="button" disabled={retrying} onClick={onRetry}><RotateCcw size={15} />Retry</button>}{canManage && isActive && <button className="crawl-button crawl-button--danger" type="button" disabled={cancelling} onClick={onCancel}><CircleStop size={15} />Cancel</button>}</div></div>
    <div className="crawl-fact-grid"><Fact label="Job" value={`${execution.job_code ?? execution.crawl_job_definition_id} · ${execution.job_name ?? ''}`} /><Fact label="Evaluation Cycle" value={`${execution.cycle_code ?? execution.evaluation_cycle_id} · ${execution.cycle_name ?? ''}`} /><Fact label="Trigger / Attempt" value={`${execution.trigger_type} · ${execution.attempt_no} of ${execution.max_attempts}`} /><Fact label="Retry eligible at" value={execution.next_retry_at ? formatDate(execution.next_retry_at) : 'Now'} /><Fact label="Started" value={formatDate(execution.started_at)} /><Fact label="Finished" value={formatDate(execution.finished_at)} /><Fact label="Duration" value={formatDuration(execution.duration_ms)} /></div>
    <div className="crawl-timeline"><span className={execution.created_at ? 'is-done' : ''}><i />Queued <small>{formatDate(execution.created_at)}</small></span><span className={execution.started_at ? 'is-done' : ''}><i />Running <small>{formatDate(execution.started_at)}</small></span><span className={execution.finished_at ? 'is-done' : ''}><i />{statusLabel(execution.status)} <small>{formatDate(execution.finished_at)}</small></span></div>
    <div className="crawl-stat-grid">{[['Fetched', execution.records_fetched], ['Parsed', execution.records_parsed], ['Valid', execution.records_valid], ['Invalid', execution.records_invalid], ['Conflict', execution.records_conflict], ['Applied', execution.records_applied]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {execution.error_code && <div className="crawl-alert"><AlertTriangle size={17} /><span><strong>{execution.error_code}</strong>{execution.error_message ? ` · ${execution.error_message}` : ''}</span></div>}

    {/* Crawled Data Records & Gemini AI Scores */}
    <section className="crawl-records-viewer" style={{ marginTop: '20px', marginBottom: '20px', background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff', borderRadius: '12px', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, padding: '18px' }} aria-label="Crawled records and AI scores">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
              📋 Dữ liệu Crawl & Chấm điểm AI Gemini ({records.length})
            </h4>
            <span style={{ fontSize: '11px', background: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b', padding: '2px 8px', borderRadius: '12px', border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}` }}>
              Source: {execution.source_system}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
            Chi tiết các dòng dữ liệu đã crawl, danh sách task/issue có link trực tiếp để mở nhanh, và điểm số đánh giá bởi AI.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            aria-label="Search crawled records"
            placeholder="Tìm theo NV, KPI..."
            value={recordSearch}
            onChange={(e) => setRecordSearch(e.target.value)}
            style={{
              height: '32px',
              padding: '0 10px',
              fontSize: '12px',
              borderRadius: '6px',
              border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
              background: isDark ? '#0f172a' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              minWidth: '180px',
            }}
          />
          {onOpenScoresTab && (
            <button
              type="button"
              className="crawl-button crawl-button--primary"
              style={{ height: '32px', fontSize: '12px', whiteSpace: 'nowrap' }}
              onClick={onOpenScoresTab}
            >
              <Sparkles size={13} /> Chuyển sang Tab Duyệt & Chấm điểm
            </button>
          )}
        </div>
      </div>

      {recordsQuery.isLoading ? (
        <LoadingState label="Đang tải danh sách dòng dữ liệu đã crawl..." />
      ) : recordsQuery.error ? (
        <ApiError error={recordsQuery.error} />
      ) : records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: isDark ? '#94a3b8' : '#64748b', fontSize: '13px' }}>
          {isActive ? 'Đang thực hiện crawl dữ liệu hoặc xếp hàng...' : 'Chưa có dòng dữ liệu nào được ghi nhận cho lần crawl này.'}
        </div>
      ) : (
        <div className="crawl-table-wrap" style={{ maxHeight: '420px', overflowY: 'auto' }}>
          <table className="crawl-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Nhân viên</th>
                <th style={{ width: '130px' }}>Chỉ số KPI</th>
                <th>Dữ liệu thô & Tasks đã đọc (Click link mở task)</th>
                <th style={{ width: '190px' }}>Điểm AI Gemini</th>
                <th style={{ width: '100px' }}>Trạng thái</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r: ExecutionRecordItem) => {
                const snapshot = r.source_snapshot || {};
                const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
                const isExpanded = expandedRecordId === r.record_id;
                const hasScore = r.score != null || r.final_score != null;
                const isScoring = r.scoring_status === 'PROCESSING' || r.scoring_status === 'PENDING';

                return (
                  <tr key={r.record_id} style={{ borderBottom: isExpanded ? 'none' : undefined }}>
                    <td colSpan={6} style={{ padding: 0 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr style={{ background: isExpanded ? (isDark ? 'rgba(51, 65, 85, 0.4)' : '#f8fafc') : undefined }}>
                            <td style={{ width: '130px' }}>
                              <strong style={{ fontSize: '13px', color: isDark ? '#f1f5f9' : '#0f172a' }}>{r.employee_code}</strong>
                              {r.employee_name && (
                                <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
                                  {r.employee_name}
                                </div>
                              )}
                            </td>
                            <td style={{ width: '130px' }}>
                              <span className="crawl-badge" style={{ fontSize: '11px', fontWeight: 600 }}>{r.kpi_code}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '13px', color: isDark ? '#38bdf8' : '#0284c7' }}>
                                    Giá trị: {r.raw_measurement_value != null ? String(r.raw_measurement_value) : '—'}
                                  </span>
                                  {tasks.length > 0 && (
                                    <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>
                                      ({tasks.length} tasks/issues)
                                    </span>
                                  )}
                                </div>
                                {tasks.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '80px', overflowY: 'auto' }}>
                                    {tasks.map((task: ExecutionTaskItem, tIdx: number) => (
                                      <a
                                        key={`${task.key}-${tIdx}`}
                                        href={task.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`${task.key}: ${task.title || ''}${task.status ? ` [${task.status}]` : ''}`}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          textDecoration: 'none',
                                          color: isDark ? '#93c5fd' : '#1d4ed8',
                                          background: isDark ? 'rgba(30, 58, 138, 0.3)' : '#eff6ff',
                                          border: `1px solid ${isDark ? '#1e40af' : '#bfdbfe'}`,
                                        }}
                                      >
                                        <span>{task.key}</span>
                                        {task.is_on_time === true && <span style={{ color: '#16a34a', fontSize: '10px' }}>✓</span>}
                                        {task.is_on_time === false && <span style={{ color: '#dc2626', fontSize: '10px' }}>⏱</span>}
                                        <ExternalLink size={9} style={{ opacity: 0.7 }} />
                                      </a>
                                    ))}
                                  </div>
                                ) : r.row_comment ? (
                                  <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic' }}>
                                    {r.row_comment}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td style={{ width: '190px' }}>
                              {hasScore ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: isDark ? '#34d399' : '#059669' }}>
                                      {r.final_score ?? r.score} <small style={{ fontSize: '11px', fontWeight: 500, color: isDark ? '#94a3b8' : '#64748b' }}>/ 100</small>
                                    </span>
                                    {r.confidence != null && (
                                      <span style={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b', background: isDark ? '#1e293b' : '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>
                                        {Math.round(r.confidence * 100)}% tin cậy
                                      </span>
                                    )}
                                  </div>
                                  {r.reason && (
                                    <div style={{ fontSize: '11px', color: isDark ? '#cbd5e1' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={r.reason}>
                                      {r.reason}
                                    </div>
                                  )}
                                </div>
                              ) : isScoring ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                                  <Sparkles size={12} className="spin" /> Đang chấm điểm...
                                </span>
                              ) : r.scoring_status === 'FAILED' ? (
                                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                                  ❌ Thất bại
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>—</span>
                              )}
                            </td>
                            <td style={{ width: '100px' }}>
                              <StatusBadge status={r.row_staging_status ?? 'UNKNOWN'} />
                            </td>
                            <td style={{ width: '60px', textAlign: 'center' }}>
                              <button
                                type="button"
                                className="crawl-icon-button"
                                title={isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                                onClick={() => setExpandedRecordId(isExpanded ? null : r.record_id)}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc' }}>
                              <td colSpan={6} style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px' }}>
                                  <div>
                                    <strong style={{ color: isDark ? '#f8fafc' : '#0f172a', display: 'block', marginBottom: '6px' }}>
                                      💡 Nhận xét & Đánh giá của AI Gemini:
                                    </strong>
                                    <p style={{ margin: '0 0 8px', color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.5 }}>
                                      {r.reason || 'Chưa có phân tích lý do từ AI.'}
                                    </p>
                                    {r.ai_evidence?.summary && (
                                      <div style={{ marginTop: '6px', padding: '8px', background: isDark ? '#0f172a' : '#ffffff', borderRadius: '6px', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                                        <strong>Bằng chứng trích xuất (Evidence):</strong>
                                        <div style={{ marginTop: '4px', color: isDark ? '#94a3b8' : '#64748b' }}>
                                          {r.ai_evidence.summary}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <strong style={{ color: isDark ? '#f8fafc' : '#0f172a', display: 'block', marginBottom: '6px' }}>
                                      📦 Raw Source Snapshot:
                                    </strong>
                                    <pre style={{ margin: 0, padding: '8px', background: isDark ? '#0f172a' : '#ffffff', borderRadius: '6px', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, maxHeight: '140px', overflow: 'auto', fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>
                                      {JSON.stringify(r.source_snapshot, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
    <details className="crawl-snapshot" open><summary>Configuration actually used by this execution</summary><div className="crawl-snapshot__facts"><Fact label="Script version" value={`v${execution.script_version}`} /><Fact label="Checksum" value={execution.script_checksum} /><Fact label="Source" value={execution.source_system} /></div><pre>{JSON.stringify({ source_config: execution.source_config_snapshot, criteria: execution.criteria_snapshot }, null, 2)}</pre></details>
    <section className="crawl-log-viewer" aria-label="Execution logs">
      <div className="crawl-log-viewer__toolbar">
        <h4>Execution logs</h4>
        <input aria-label="Search execution logs" placeholder="Search logs" value={logSearch} onChange={(event) => onLogSearchChange(event.target.value)} />
        <select aria-label="Filter log level" value={logLevel} onChange={(event) => onLogLevelChange(event.target.value as typeof logLevel)}>
          <option value="ALL">All levels</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warning</option>
          <option value="ERROR">Error</option>
        </select>
        <button
          type="button"
          className={`crawl-button ${onlySteps ? 'crawl-button--primary' : 'crawl-button--secondary'}`}
          style={{ height: 32, fontSize: 11, padding: '0 8px', whiteSpace: 'nowrap' }}
          onClick={() => setOnlySteps((prev) => !prev)}
        >
          <Activity size={12} /> {onlySteps ? 'Tất cả log' : 'Chỉ hiện các bước script'}
        </button>
      </div>
      {logLoading ? <LoadingState label="Loading logs" /> : logError ? <ApiError error={logError} /> : filteredLogs.length === 0 ? <EmptyState title="No execution logs" detail="No log entries match this execution and filter." /> : (
        <div className="crawl-log-list">
          {filteredLogs.map((entry) => {
            const stepMatch = entry.message.match(/^\[(Script Step[^\]]*|Source Connect|Sandbox Run|Data Normalization|AI Scoring[^\]]*|Crawl Complete)\]\s*(.*)$/i);
            const isStep = Boolean(stepMatch && stepMatch[1]);
            const stepTitle = isStep ? (stepMatch![1].replace(/^Script Step:?\s*/i, '').trim() || 'Script Step') : '';
            const stepDetail = isStep ? (stepMatch![2] || '').trim() : entry.message;

            return (
              <div
                key={entry.crawl_job_execution_log_id}
                className={`crawl-log-row crawl-log-row--${entry.level.toLowerCase()} ${isStep ? 'crawl-log-row--step' : ''}`}
              >
                <time>{formatDate(entry.logged_at)}</time>
                <strong>{entry.level}</strong>
                {isStep ? (
                  <span>
                    <span className="crawl-step-badge">
                      <Activity size={10} style={{ display: 'inline', marginRight: 3 }} />
                      {stepTitle}
                    </span>
                    <span style={{ color: 'var(--crawl-fg)', fontWeight: 500 }}>{stepDetail}</span>
                  </span>
                ) : (
                  <span>{entry.message}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  </article>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="crawl-fact"><span>{label}</span><strong>{value || '—'}</strong></div>;
}

function JobDialog({ form, editing, loading, error, criteria, scripts, credentials, cycles, existingJobs, onChange, onSubmit, onClose, onScriptCreatedAndPublished }: {
  form: JobFormState;
  editing: boolean;
  loading: boolean;
  error: string;
  criteria: Array<{ id: string; code: string; name: string; status?: string; active?: boolean }>;
  scripts: CrawlScriptItem[];
  credentials: Array<{ connector_credential_id: string; code: string; source_system: CrawlSourceSystem; display_name: string }>;
  cycles: Array<{ id: string; code: string; name: string }>;
  existingJobs?: CrawlJob[];
  onChange: (state: JobFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onScriptCreatedAndPublished?: (newVersionId: string) => void;
}) {
  const [showCreateScriptModal, setShowCreateScriptModal] = useState(false);
  const activeCriteria = criteria.filter((criterion) => (criterion.status ? criterion.status === 'ACTIVE' : criterion.active !== false));
  const matchingScripts = scripts.filter((script) => script.source_system === form.sourceSystem && (script.status !== 'DISABLED' || script.crawl_script_version_id === form.scriptVersionId));
  const matchingCredentials = credentials.filter((credential) => credential.source_system === form.sourceSystem);
  const change = <K extends keyof JobFormState>(key: K, value: JobFormState[K]) => onChange({ ...form, [key]: value });
  const selectedCycle = cycles.find((c) => c.id === form.evaluationCycleId);

  const handleScriptChange = (selectedVersionId: string) => {
    const chosenScript = scripts.find((s) => s.crawl_script_version_id === selectedVersionId);
    let newCriterionIds = [...form.criterionIds];
    if (chosenScript && !editing) {
      const saved = localStorage.getItem(`crawl_script_criteria_${chosenScript.code}`);
      if (saved) {
        try {
          const ids = JSON.parse(saved);
          if (Array.isArray(ids) && ids.length > 0) {
            newCriterionIds = Array.from(new Set([...newCriterionIds, ...ids]));
          }
        } catch {
          // ignore
        }
      }
      const codeUpper = chosenScript.code.toUpperCase();
      const isJira = codeUpper.includes('JIRA') || chosenScript.source_system === 'JIRA';
      const isBp = codeUpper.includes('BLUEPRINT') || codeUpper.includes('BP') || chosenScript.source_system === 'BLUEPRINT';
      const matched = criteria
        .filter((c) => {
          if (c.status !== 'ACTIVE') return false;
          const cUpper = c.code.toUpperCase();
          if (isJira && (cUpper.includes('JIRA') || cUpper.includes('BUG') || cUpper.includes('TASK_COMPLETION'))) return true;
          if (isBp && (cUpper.includes('BP') || cUpper.includes('BLUEPRINT') || cUpper.includes('TASK_ONTIME') || cUpper.includes('DELAYED'))) return true;
          return false;
        })
        .map((c) => c.id);
      if (matched.length > 0) {
        newCriterionIds = form.criterionIds.length === 0 ? matched : Array.from(new Set([...newCriterionIds, ...matched]));
      }
    }
    onChange({
      ...form,
      scriptVersionId: selectedVersionId,
      criterionIds: newCriterionIds,
    });
  };

  const selectedScript = scripts.find((script) => script.crawl_script_version_id === form.scriptVersionId);
  const selectedCredential = credentials.find((cred) => cred.connector_credential_id === form.credentialId);

  return <Modal title={editing ? 'Edit Crawl Job' : 'Create Crawl Job'} onClose={onClose} maxWidth={920}>
    <form className="crawl-form" onSubmit={onSubmit}>
      <div className="crawl-form-grid"><label>Job code<input value={form.code} disabled={editing} required minLength={2} maxLength={100} placeholder="JIRA_DEV_METRICS_Q3" onChange={(event) => change('code', event.target.value)} /></label><label>Job name<input value={form.name} required minLength={2} maxLength={200} placeholder="Thu thập KPI Jira Sprint & Bug Q3" onChange={(event) => change('name', event.target.value)} /></label></div>
      <label>
        Evaluation Cycle (Chỉ áp dụng chu kỳ đang OPEN)
        <select
          value={form.evaluationCycleId || ''}
          required
          onChange={(event) => change('evaluationCycleId', event.target.value)}
        >
          <option value="">Select an OPEN evaluation cycle</option>
          {form.evaluationCycleId && !cycles.some((c) => c.id === form.evaluationCycleId) && (
            <option value={form.evaluationCycleId}>
              {`Chu kỳ hiện tại (${form.evaluationCycleId.slice(0, 8)}...)`}
            </option>
          )}
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.code} · {cycle.name} (OPEN)
            </option>
          ))}
        </select>
      </label>
      {selectedCycle && (
        <div style={{ marginTop: '-6px', marginBottom: '10px', fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span>Chu kỳ mở: <strong>{selectedCycle.code}</strong> ({selectedCycle.name}) - OPEN</span>
        </div>
      )}
      <div className="crawl-form-grid" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: '28px' }}>
            <label style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
              Source system *
            </label>
          </div>
          <select
            value={form.sourceSystem}
            onChange={(event) => onChange({ ...form, sourceSystem: event.target.value as CrawlSourceSystem, scriptVersionId: '', credentialId: '' })}
          >
            <option value="BLUEPRINT">Blueprint</option>
            <option value="JIRA">Jira</option>
            <option value="GOOGLE_SHEET">Google Sheets</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px' }}>
            <label style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
              Published script version *
            </label>
            <button
              type="button"
              className="crawl-button crawl-button--secondary"
              style={{ minHeight: '28px', padding: '2px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setShowCreateScriptModal(true)}
            >
              <Plus size={13} /> Tạo Script mới
            </button>
          </div>
          <select value={form.scriptVersionId} required onChange={(event) => handleScriptChange(event.target.value)}>
            <option value="">Select a published script</option>
            {form.scriptVersionId && !matchingScripts.some((s) => s.crawl_script_version_id === form.scriptVersionId) && (
              <option value={form.scriptVersionId}>
                {selectedScript ? `${selectedScript.code} v${selectedScript.version_no} (PUBLISHED)` : `Script (${form.scriptVersionId.slice(0, 10)}...)`}
              </option>
            )}
            {matchingScripts.map((script) => (
              <option key={script.crawl_script_version_id} value={script.crawl_script_version_id}>
                {script.code} v{script.version_no} · {script.checksum.slice(0, 12)} · {formatDate(script.published_at)} (PUBLISHED)
              </option>
            ))}
          </select>
        </div>
      </div>
      {selectedScript && (
        <div style={{ padding: '8px 12px', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 8, marginTop: '2px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <FileCode size={16} color="#2563eb" />
            <span>Script đang chọn để chạy: <strong>{selectedScript.code}</strong> (v{selectedScript.version_no})</span>
          </div>
          <span className="crawl-badge" style={{ fontSize: 11, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
            {selectedScript.status} · {selectedScript.checksum?.slice(0, 10)}
          </span>
        </div>
      )}
      {matchingScripts.length === 0 && (
        <div className="crawl-alert" style={{ marginTop: '-4px', marginBottom: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span>Chưa có script nào được Publish cho nguồn <strong>{form.sourceSystem}</strong>.</span>
          <button
            type="button"
            className="crawl-button crawl-button--primary"
            style={{ minHeight: '26px', padding: '2px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
            onClick={() => setShowCreateScriptModal(true)}
          >
            + Đăng ký & Publish Script ngay →
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
            Connector reference (Xác thực nguồn dữ liệu) *
          </label>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #64748b)', lineHeight: 1.45 }}>
          💡 <strong>Connector reference dùng để làm gì?</strong> Đây là cấu hình tài khoản &amp; mã bảo mật (Personal Access Token, Basic Auth hoặc OAuth Session) được lưu trữ an toàn trong kho credential, giúp Crawl Worker kết nối đến hệ thống nguồn (<strong>{form.sourceSystem}</strong>) để cào dữ liệu mà không cần nhúng trực tiếp mật khẩu vào code script.
        </p>
        <select
          value={form.credentialId}
          required
          onChange={(event) => change('credentialId', event.target.value)}
          style={{ minHeight: '38px', fontSize: '13px' }}
        >
          <option value="">-- Chọn cấu hình xác thực (Connector reference) --</option>
          {form.credentialId && !matchingCredentials.some((c) => c.connector_credential_id === form.credentialId) && (
            <option value={form.credentialId}>
              {selectedCredential ? `${selectedCredential.display_name} (${selectedCredential.code})` : `Credential (${form.credentialId.slice(0, 10)}...)`}
            </option>
          )}
          {matchingCredentials.map((credential) => (
            <option key={credential.connector_credential_id} value={credential.connector_credential_id}>
              {credential.display_name} · {credential.code} ({credential.source_system})
            </option>
          ))}
        </select>
      </div>
      <fieldset className="crawl-criteria">
        <legend>KPI criteria</legend>
        {activeCriteria.length === 0 ? (
          <span className="crawl-muted">No active criteria available.</span>
        ) : (
          activeCriteria.map((criterion) => {
            const criterionId = criterion.id || (criterion as unknown as { criterion_id?: string }).criterion_id || '';
            const isChecked = form.criterionIds.includes(criterionId) ||
              form.criterionIds.includes(criterion.id) ||
              Boolean((criterion as unknown as { criterion_id?: string }).criterion_id && form.criterionIds.includes((criterion as unknown as { criterion_id?: string }).criterion_id!));
            const conflictJob = existingJobs?.find(
              (j) =>
                j.crawl_job_definition_id !== form.id &&
                j.active &&
                (!form.evaluationCycleId || !j.evaluation_cycle_id || j.evaluation_cycle_id === form.evaluationCycleId) &&
                j.criteria?.some((c) => c.criterion_id === criterionId || c.criterion_code === criterion.code)
            );
            return (
              <label
                key={criterionId || criterion.code}
                style={
                  conflictJob && isChecked
                    ? { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.05)' }
                    : undefined
                }
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) =>
                    change(
                      'criterionIds',
                      event.target.checked
                        ? [...form.criterionIds, criterionId]
                        : form.criterionIds.filter((id) => id !== criterionId && id !== criterion.id && id !== (criterion as unknown as { criterion_id?: string }).criterion_id)
                    )
                  }
                />
                <span>
                  <strong>{criterion.code}</strong>
                  <small>{criterion.name}</small>
                  {conflictJob && (
                    <span
                      style={{
                        display: 'block',
                        marginTop: '2px',
                        fontSize: '11px',
                        color: '#d97706',
                        fontWeight: 500,
                      }}
                    >
                      ⚠ Trùng với job: {conflictJob.code}
                    </span>
                  )}
                </span>
              </label>
            );
          })
        )}
      </fieldset>
      <div className="crawl-form-grid"><label>Default schedule (cron)<input value={form.schedule} placeholder="0 2 * * *" onChange={(event) => change('schedule', event.target.value)} /></label><label>Failure policy<select value={form.failurePolicy} onChange={(event) => change('failurePolicy', event.target.value as CrawlFailurePolicy)}>{FAILURE_POLICIES.map((policy) => <option key={policy} value={policy}>{statusLabel(policy)}</option>)}</select></label></div>
      <label>Source configuration (JSON)<textarea rows={5} spellCheck={false} value={form.sourceConfigText} onChange={(event) => change('sourceConfigText', event.target.value)} /></label>
      {error && <ApiError error={error} />}
      <div className="crawl-modal__footer"><button className="crawl-button crawl-button--secondary" type="button" onClick={onClose}>Cancel</button><button className="crawl-button crawl-button--primary" type="submit" disabled={loading}>{loading ? 'Saving…' : editing ? 'Save changes' : 'Create job'}</button></div>
    </form>
    {showCreateScriptModal && (
      <ScriptCreationSubModal
        cycle={selectedCycle}
        sourceSystem={form.sourceSystem}
        criterionIds={form.criterionIds}
        allCriteria={criteria}
        onClose={() => setShowCreateScriptModal(false)}
        onSuccess={(newVersionId) => {
          setShowCreateScriptModal(false);
          onScriptCreatedAndPublished?.(newVersionId);
        }}
      />
    )}
  </Modal>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function getLiveCollectorTemplate(sourceSystem: CrawlSourceSystem, cycleCode: string = 'OPEN'): string {
  if (sourceSystem === 'JIRA') {
    return `async function (input, fetchSource) {
  // Pure raw data collection (Zero Gemini calls)
  // Inherits Evaluation Cycle: ${cycleCode}
  const targetCycle = input.targetCycle || input.target_cycle || { code: '${cycleCode}' };
  const cycleCode = targetCycle.code || '${cycleCode}';
  const employees = targetCycle.employees || input.employees || [];
  const now = input.collectedAt || input.collected_at || new Date().toISOString();
  const records = [];

  console.log('[Script Step: 1/4 - Khởi tạo] Bắt đầu thu thập dữ liệu Jira cho kỳ ' + cycleCode + ' (' + employees.length + ' nhân sự)');

  // Build employee lookup from current open evaluation cycle
  const employeeMap = new Map();
  for (const emp of employees) {
    if (emp.employee_code) employeeMap.set(emp.employee_code.toLowerCase(), emp.employee_code);
    if (emp.email) {
      employeeMap.set(emp.email.toLowerCase(), emp.employee_code);
      const username = emp.email.split('@')[0].toLowerCase();
      employeeMap.set(username, emp.employee_code);
    }
  }

  const sourceConfig = input.sourceConfig || input.source_config || {};
  const projectKey = sourceConfig.project_key || '';
  const jql = sourceConfig.jql || (projectKey ? \`project = "\${projectKey}" ORDER BY updated DESC\` : 'project is not EMPTY ORDER BY updated DESC');

  try {
    console.log('[Script Step: 2/4 - Kết nối API] Gửi truy vấn JQL tới Jira search endpoint...');
    const data = await fetchSource('/rest/api/2/search', {
      method: 'POST',
      body: {
        jql,
        startAt: 0,
        maxResults: sourceConfig.max_results || 100,
        fields: ['summary', 'project', 'issuetype', 'priority', 'status', 'created', 'updated', 'duedate', 'resolutiondate', 'assignee']
      }
    });

    const issues = (data && data.issues) || [];
    console.log('[Script Step: 3/4 - Lọc & Khớp dữ liệu] Đã nhận ' + issues.length + ' issues từ Jira, đang lọc theo nhân sự kỳ đánh giá...');

    for (const issue of issues) {
      const f = issue.fields || {};
      const rawAssignee = f.assignee?.name || f.assignee?.emailAddress || f.assignee?.displayName;
      if (!rawAssignee) continue;
      const empCode = employeeMap.get(rawAssignee.toLowerCase()) || rawAssignee;

      const isCompleted = f.status?.statusCategory?.name?.toLowerCase() === 'done';
      let isOnTime = true;
      if (f.resolutiondate && f.duedate) {
        isOnTime = new Date(f.resolutiondate) <= new Date(f.duedate + 'T23:59:59.999Z');
      }

      records.push({
        schema_version: '1.0',
        employee_code: empCode,
        criterion_code: 'CRIT_JIRA_TASK_COMPLETION',
        measurement_value: isCompleted ? (isOnTime ? 100.0 : 80.0) : 0.0,
        measurement_unit: '%',
        measured_at: f.resolutiondate || f.updated || now,
        source_reference: 'JIRA:' + issue.key,
        raw_payload_reference: JSON.stringify({ key: issue.key, summary: f.summary, status: f.status?.name, isOnTime, cycleCode }),
        collected_at: now
      });
    }
    console.log('[Script Step: 4/4 - Hoàn tất] Trích xuất thành công ' + records.length + ' deliverables chuẩn bị đưa vào staging.');
  } catch (err) {
    console.log('[Script Step: Gặp lỗi] ' + (err && err.message ? err.message : String(err)));
  }
  return records;
}`;
  }

  if (sourceSystem === 'BLUEPRINT') {
    return `async function (input, fetchSource) {
  // Pure raw data collection (Zero Gemini calls)
  // Inherits Evaluation Cycle: ${cycleCode}
  const targetCycle = input.targetCycle || input.target_cycle || { code: '${cycleCode}' };
  const cycleCode = targetCycle.code || '${cycleCode}';
  const now = input.collectedAt || input.collected_at || new Date().toISOString();
  const records = [];

  console.log('[Script Step: 1/4 - Khởi tạo] Bắt đầu thu thập dữ liệu Blueprint cho kỳ ' + cycleCode);

  const sourceConfig = input.sourceConfig || input.source_config || {};
  const projectId = sourceConfig.project_id || 'PJT20230208000000001';
  const userId = sourceConfig.user_id || 'kyluong';

  try {
    console.log('[Script Step: 2/4 - Kết nối API] Gửi yêu cầu tìm kiếm requirements tới Blueprint API...');
    const data = await fetchSource('/api/uiPim001/searchRequirement', {
      method: 'POST',
      body: {
        pjtId: projectId,
        seqNo: '',
        reqNm: '',
        advFlg: 'Y',
        reqStsCd: ['REQ_STS_CDPRC', 'REQ_STS_CDOPN', 'REQ_STS_CDFIN', 'REQ_STS_CDPD', 'REQ_STS_CDCC'],
        jbTpCd: '_ALL_',
        itrtnId: '_ALL_',
        beginIdx: 0,
        endIdx: 150,
        isLoadLast: false,
        pageSize: 150,
        regstStDt: '',
        regstEndDt: '',
        plnDueStDt: '',
        plnDueEndDt: '',
        actFinStDt: '',
        actFinEndDt: '',
        creUsrId: userId,
        assiUsrId: '',
        picId: ''
      }
    });

    const tasks = (data && (data.lstReq || data.tasks || data.lstRequirement)) || [];
    console.log('[Script Step: 3/4 - Lọc & Khớp dữ liệu] Đã nhận ' + tasks.length + ' tasks từ Blueprint, đang trích xuất...');

    for (const t of tasks) {
      const empCode = t.assiUsrId || t.assignee || t.createUserId || t.createUser;
      if (!empCode) continue;

      const isOnTime = t.delayProc === 'N';
      records.push({
        schema_version: '1.0',
        employee_code: empCode,
        criterion_code: 'CRIT_BP_TASK_ONTIME_RATE',
        measurement_value: isOnTime ? 100.0 : 50.0,
        measurement_unit: '%',
        measured_at: t.actFinDt || t.plnDueDt || now,
        source_reference: 'BP:' + (t.reqId || t.id || t.seqNo),
        raw_payload_reference: JSON.stringify({ reqId: t.reqId, title: t.reqTitNm || t.reqNm, delayProc: t.delayProc, cycleCode }),
        collected_at: now
      });
    }
    console.log('[Script Step: 4/4 - Hoàn tất] Trích xuất thành công ' + records.length + ' deliverables chuẩn bị đưa vào staging.');
  } catch (err) {
    console.log('[Script Step: Gặp lỗi] ' + (err && err.message ? err.message : String(err)));
  }
  return records;
}`;
  }

  return `async function (input, fetchSource) {
  // Pure raw data collection (Zero Gemini calls)
  const now = input.collectedAt || new Date().toISOString();
  return [];
}`;
}

function ScriptCreationSubModal({
  cycle,
  sourceSystem,
  criterionIds,
  allCriteria,
  onClose,
  onSuccess,
}: {
  cycle?: { id: string; code: string; name: string };
  sourceSystem: CrawlSourceSystem;
  criterionIds: string[];
  allCriteria: Array<{ id: string; code: string; name: string }>;
  onClose: () => void;
  onSuccess: (newVersionId: string) => void;
}) {
  const [code, setCode] = useState(`${sourceSystem}_AUTO_COLLECTOR`);
  const [name, setName] = useState(`${sourceSystem} Data Collector`);
  const [description, setDescription] = useState(`Thu thập số liệu KPI tự động từ ${sourceSystem}`);
  const [sourceCode, setSourceCode] = useState(() => getLiveCollectorTemplate(sourceSystem, cycle?.code || 'OPEN'));
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestRunScriptResult | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCriteria = allCriteria.filter((c) => criterionIds.includes(c.id));

  const handleTest = async () => {
    setTestLoading(true);
    setError('');
    setTestResult(null);
    try {
      const res = await crawlJobApi.testRunScript({
        source_system: sourceSystem,
        source_code: sourceCode,
        evaluation_cycle_id: cycle?.id,
      });
      setTestResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Script test failed.');
    } finally {
      setTestLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!code.trim()) {
      setError('Script code is required.');
      return;
    }
    setPublishLoading(true);
    setError('');
    try {
      const scriptRes = await crawlJobApi.createScript({
        code: code.trim().toUpperCase(),
        source_system: sourceSystem,
        source_code: sourceCode,
        evaluation_cycle_id: cycle?.id,
        criteria_ids: criterionIds,
        name: name.trim(),
        description: description.trim(),
      });
      const versionId = scriptRes.crawl_script_version_id;
      await crawlJobApi.publishScript(versionId);
      onSuccess(versionId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Publish script failed.');
    } finally {
      setPublishLoading(false);
    }
  };

  return (
    <Modal title={`Tạo & Publish Script Mới (${sourceSystem})`} onClose={onClose} maxWidth={920}>
      <div className="crawl-form">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#059669', textTransform: 'uppercase' }}>Evaluation Cycle Context</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#047857' }}>
              {cycle ? `${cycle.code} · ${cycle.name} (OPEN)` : 'Default OPEN Cycle'}
            </div>
            <div style={{ fontSize: '10px', color: '#10b981' }}>Kế thừa trực tiếp từ Crawl Job</div>
          </div>
          <div style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' }}>Source System Context</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>{sourceSystem}</div>
            <div style={{ fontSize: '10px', color: '#3b82f6' }}>Kế thừa trực tiếp từ Crawl Job</div>
          </div>
        </div>

        {selectedCriteria.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>KPI / Criteria Kế thừa:</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {selectedCriteria.map((c) => (
                <span key={c.id} style={{ fontSize: '11px', padding: '2px 8px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  ☑ <strong>{c.code}</strong> ({c.name})
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="crawl-form-grid">
          <label>
            Script Code
            <input value={code} required onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="JIRA_TASK_COMPLETION" />
          </label>
          <label>
            Script Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên gợi nhớ cho script" />
          </label>
        </div>

        <label>
          Mô tả Script
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả phạm vi dữ liệu thu thập..." />
        </label>

        <label>
          JavaScript Collector Sandbox (Chỉ thu thập RAW data - KHÔNG gọi Gemini / tính điểm)
          <textarea rows={10} spellCheck={false} style={{ fontFamily: 'monospace', fontSize: '12.5px' }} value={sourceCode} onChange={(e) => setSourceCode(e.target.value)} />
        </label>

        {testResult && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: testResult.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`, marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: testResult.success ? '#15803d' : '#b91c1c' }}>
              {testResult.success ? `✓ Sandbox Test thành công (${testResult.recordCount} records, ${testResult.executionTimeMs}ms)` : `✗ Sandbox Test thất bại: ${testResult.error}`}
            </div>
          </div>
        )}

        {error && <ApiError error={error} />}

        <div className="crawl-modal__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="crawl-button crawl-button--secondary" disabled={testLoading} onClick={handleTest}>
            <Play size={14} /> {testLoading ? 'Đang test...' : 'Test Sandbox'}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="crawl-button crawl-button--secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="button" className="crawl-button crawl-button--primary" disabled={publishLoading} onClick={handlePublish}>
              {publishLoading ? 'Đang Publish...' : 'Publish & Tự động chọn cho Job'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CycleAssignmentDialog({ job, cycles, cycleId, sequence, failurePolicy, assignedJobs, loading, error, onCycleChange, onSequenceChange, onPolicyChange, onSubmit, onClose }: {
  job: CrawlJob;
  cycles: Array<{ id: string; code: string; name: string }>;
  cycleId: string;
  sequence: number;
  failurePolicy: CrawlFailurePolicy;
  assignedJobs: Array<{ crawl_job_definition_id: string; enabled: boolean; sequence_order: number }>;
  loading: boolean;
  error: unknown;
  onCycleChange: (value: string) => void;
  onSequenceChange: (value: number) => void;
  onPolicyChange: (value: CrawlFailurePolicy) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const currentAssignment = assignedJobs.find((item) => item.crawl_job_definition_id === job.crawl_job_definition_id);
  return <Modal title="Assign Crawl Job to Cycle" onClose={onClose} maxWidth={640}>
    <div className="crawl-confirm-summary"><Fact label="Job" value={`${job.code} · ${job.name}`} /><Fact label="Source / script" value={`${job.source_system} · v${job.script_version}`} /><Fact label="KPI count" value={String(job.criteria_count ?? job.criteria?.length ?? 0)} /></div>
    <label className="crawl-modal-field">Evaluation Cycle<select value={cycleId} onChange={(event) => onCycleChange(event.target.value)}><option value="">Select an OPEN cycle</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.code} · {cycle.name}</option>)}</select></label>
    {cycleId && currentAssignment?.enabled && <div className="crawl-alert"><AlertTriangle size={17} /><span>This job is already enabled for this cycle.</span></div>}
    <div className="crawl-form-grid"><label className="crawl-modal-field">Sequence order<input type="number" min={0} max={10000} value={sequence} onChange={(event) => onSequenceChange(Number(event.target.value))} /></label><label className="crawl-modal-field">Failure policy<select value={failurePolicy} onChange={(event) => onPolicyChange(event.target.value as CrawlFailurePolicy)}>{FAILURE_POLICIES.map((policy) => <option key={policy} value={policy}>{statusLabel(policy)}</option>)}</select></label></div>
    <p className="crawl-muted">Sequence order determines execution order. It does not create a dependency between jobs.</p>
    {error != null && <ApiError error={error} />}
    <div className="crawl-modal__footer"><button className="crawl-button crawl-button--secondary" type="button" onClick={onClose}>Cancel</button><button className="crawl-button crawl-button--primary" type="button" disabled={loading || !cycleId} onClick={onSubmit}>{loading ? 'Saving…' : 'Enable for cycle'}</button></div>
  </Modal>;
}

function RunDialog({ job, cycles, cycleId, assigned, loading, error, onCycleChange, onSubmit, onClose }: {
  job: CrawlJob;
  cycles: Array<{ id: string; code: string; name: string }>;
  cycleId: string;
  assigned: boolean;
  loading: boolean;
  error: unknown;
  onCycleChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return <Modal title="Run Crawl Job" onClose={onClose} maxWidth={680}>
    <div className="crawl-confirm-summary"><Fact label="Job" value={`${job.code} · ${job.name}`} /><Fact label="Source" value={job.source_system} /><Fact label="Script version" value={`v${job.script_version} · ${job.script_checksum.slice(0, 16)}`} /><Fact label="Criteria" value={(job.criteria ?? []).map((criterion) => criterion.criterion_code).join(', ') || `${job.criteria_count ?? 0} KPI(s)`} /></div>
    <label className="crawl-modal-field">Evaluation Cycle<select value={cycleId} onChange={(event) => onCycleChange(event.target.value)}><option value="">Select an OPEN cycle</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.code} · {cycle.name}</option>)}</select></label>
    {cycleId && !assigned && <div className="crawl-alert"><AlertTriangle size={17} /><span>This job is not enabled for the selected cycle.</span></div>}
    <p className="crawl-muted">This execution uses an immutable snapshot of the current published configuration.</p>
    {error != null && <ApiError error={error} />}
    <div className="crawl-modal__footer"><button className="crawl-button crawl-button--secondary" type="button" onClick={onClose}>Cancel</button><button className="crawl-button crawl-button--primary" type="button" disabled={loading || !cycleId || !assigned} onClick={onSubmit}><Play size={15} />{loading ? 'Queueing…' : 'Queue execution'}</button></div>
  </Modal>;
}


function Modal({
  title,
  onClose,
  maxWidth = 920,
  children,
}: {
  title: string;
  onClose: () => void;
  maxWidth?: number | string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="crawl-modal-backdrop"
      role="presentation"
    >
      <section
        className="crawl-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          maxWidth,
          width: `min(${typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth}, 94vw)`,
        }}
      >
        <header className="crawl-modal__header">
          <h2>{title}</h2>
          <button type="button" className="crawl-icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="crawl-modal__body">{children}</div>
      </section>
    </div>
  );
}
