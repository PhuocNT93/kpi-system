import { getApi, postApi, putApi, patchApi } from '@/shared/api/api-client';

export interface ManagedMember {
  code: string;
  name: string;
  email: string;
  team: 'ALLEGRO' | 'MARITIME';
  role?: string;
  reviewCadence?: string;
  reviewCadenceMonths?: number;
  blueprintUsername?: string;
  lastReviewDate?: string | null;
  nextReviewDate?: string | null;
  nextReviewDueDate?: string | null;
  recommendedDateFrom?: string;
  recommendedDateTo?: string;
  isDueForReview?: boolean;
}

export interface MemberJiraMetrics {
  employeeCode: string;
  memberName: string;
  team: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
  onTimeRate: number;
  totalBugs: number;
  criticalBugs: number;
  resolvedBugs: number;
  totalHoursSpent: number;
  filterUrl: string;
  inProgressFilterUrl?: string;
  completedFilterUrl?: string;
  sampleTaskKeys: string[];
  bugTaskKeys: string[];
  inProgressTaskKeys?: string[];
}

export interface EvaluatedKpiRecord {
  employee_code: string;
  evaluation_cycle_code: string;
  kpi_code: string;
  value: number;
  resolved_level: number;
  comment: string;
  rationale: string;
  blendingInfo?: {
    hasBlueprint: boolean;
    blueprintScore: number;
    jiraScore: number;
    blendedScore: number;
    note: string;
  };
  source_snapshot: {
    source_type: 'JIRA';
    source_name: string;
    source_reference: string;
    collected_at: string;
    collector_version: string;
    metadata: Record<string, unknown>;
  };
  evidences: Array<{
    evidence_type: 'URL' | 'DOCUMENT' | 'FILE' | 'SCREENSHOT' | 'EXTERNAL_REF';
    title: string;
    evidence_url?: string;
    description?: string;
  }>;
}

export interface EvaluateMemberResponse {
  member: ManagedMember;
  metrics: MemberJiraMetrics;
  cycleCode: string;
  fromDate?: string | null;
  toDate?: string | null;
  evaluatedAt: string;
  evaluator: string;
  scriptUsed?: string;
  records: EvaluatedKpiRecord[];
}

export interface MembersResponse {
  manager: string;
  total: number;
  members: ManagedMember[];
}

export interface CollectorScriptConfig {
  id?: string;
  scriptCode: string;
  name: string;
  description: string;
  targetSystem: string;
  jqlTemplate: string;
  picCustomField: string;
  completedStatuses: string[];
  bugIssueTypes: string[];
  criticalPriorities?: string[];
  includeWorklogs: boolean;
  leadTimeDays?: number;
  defaultFromDays?: number;
  geminiModel?: string;
  scoringRubric?: Record<string, unknown>;
  transformScript: string;
  aiPromptTemplate: string;
  aiTaskPromptTemplate?: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface TestScriptResult {
  employeeCode: string;
  memberName: string;
  totalFound: number;
  metrics: MemberJiraMetrics;
  sampleIssues: Array<{
    key: string;
    summary: string;
    status: string;
    issueType: string;
    isBug: boolean;
    isCompleted: boolean;
    isOnTime: boolean;
    timeSpentHours: number;
  }>;
  activeScriptUsed: {
    jqlTemplate: string;
    picCustomField: string;
    completedStatuses: string[];
    bugIssueTypes: string[];
  };
}

// ── Batch Job Types ──

export interface TaskContributionScore {
  taskKey: string;
  summary: string;
  issueType?: string;
  priority?: string;
  status?: string;
  isOnTime?: boolean;
  timeSpentHours?: number;
  originalEstimateHours?: number;
  complexityScore: number;
  complexityRationale?: string;
  contributionScore: number;
  contributionRationale?: string;
  aiComment: string;
  jiraUrl: string;
  components?: string[];
  labels?: string[];
  commentsCount?: number;
  latestComment?: string;
  descriptionPreview?: string;
}

export interface BlueprintAttendanceLateRecord {
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  lateMinutes: number;
  workShift?: string;
  reason?: string | null;
}

export interface BlueprintMemberSummary {
  hasData: boolean;
  source: string;
  collectedAt?: string;
  attendance?: {
    totalWorkDays: number;
    onTimeDays: number;
    lateDays: number;
    lateMinutes: number;
    leaveDays: number;
    punctualityRate: number;
    score10: number;
    lateRecords?: BlueprintAttendanceLateRecord[];
  };
  tasks?: {
    totalTasks: number;
    completedTasks: number;
    score10: number;
  };
  blendedKpis: Array<{
    kpiCode: string;
    kpiName: string;
    jiraScore: number;
    blueprintScore: number;
    blendedScore: number;
    formula: string;
  }>;
}

export interface MemberBatchResult {
  employeeCode: string;
  memberName: string;
  team: string;
  cycleCode: string;
  evaluatedAt: string;
  metrics: MemberJiraMetrics;
  records: EvaluatedKpiRecord[];
  taskContributions: TaskContributionScore[];
  overallScore: number;
  overallLevel: number;
  dateFrom: string | null;
  dateTo: string | null;
  blueprintSummary?: BlueprintMemberSummary;
}

export interface BatchRunSummaryItem {
  employeeCode: string;
  memberName: string;
  team: string;
  overallScore: number;
  overallLevel: number;
  dateFrom: string | null;
  dateTo: string | null;
  evaluatedAt: string;
  hasBlueprint?: boolean;
  kpiScores: Array<{ kpi_code: string; value: number; resolved_level: number }>;
  taskContributionCount: number;
  avgTaskContribution: number | null;
}

export interface BatchRunListItem {
  id: string;
  versionNumber?: number;
  versionTag?: string;
  runAt: string;
  cycleCode: string;
  triggeredBy: 'CRON' | 'MANUAL';
  status: 'RUNNING' | 'DONE' | 'FAILED';
  totalMembers: number;
  completedMembers: number;
  failedMembers: number;
  durationMs: number;
  cronExpression: string;
  blueprintMembersCount?: number;
  errorLog?: string[];
  scoreSummary: BatchRunSummaryItem[];
}

export interface ScheduleInfo {
  cronExpression: string;
  scheduleDescription: string;
  systemTimezone: string;
  nextRunDescription: string;
  isActive: boolean;
}

export interface BatchRunsResponse {
  total: number;
  currentCron: string;
  schedule?: ScheduleInfo;
  runs: BatchRunListItem[];
}

// ── Member APIs ──

export async function getJiraManagedMembers(): Promise<MembersResponse> {
  return getApi<MembersResponse>('/api/collector/jira/members');
}

export async function evaluateJiraMember(payload: {
  employeeCode: string;
  cycleCode?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<EvaluateMemberResponse> {
  return postApi<EvaluateMemberResponse>('/api/collector/jira/evaluate', payload);
}

export async function applyJiraMemberKpis(payload: {
  employeeCode: string;
  records: EvaluatedKpiRecord[];
  cycleCode?: string;
  markReviewed?: boolean;
}): Promise<{
  employeeCode: string;
  employeeName: string;
  appliedCount: number;
  blendedCount?: number;
  cycleCode: string;
  reviewMarked?: boolean;
}> {
  return postApi('/api/collector/jira/apply', payload);
}

// ── Collector Script APIs ──

export async function getCollectorScript(): Promise<CollectorScriptConfig> {
  return getApi<CollectorScriptConfig>('/api/collector/jira/script');
}

export async function saveCollectorScript(patch: Partial<CollectorScriptConfig>): Promise<CollectorScriptConfig> {
  return putApi<CollectorScriptConfig>('/api/collector/jira/script', patch);
}

export async function resetCollectorScript(): Promise<CollectorScriptConfig> {
  return postApi<CollectorScriptConfig>('/api/collector/jira/script/reset', {});
}

export async function testCollectorScript(payload: {
  employeeCode?: string;
  fromDate?: string;
  toDate?: string;
  scriptConfig?: Partial<CollectorScriptConfig>;
}): Promise<TestScriptResult> {
  return postApi<TestScriptResult>('/api/collector/jira/script/test', payload);
}

// ── Batch Job APIs ──

export async function triggerBatchRun(cycleCode = 'H2-2026'): Promise<{ status: string; message: string; totalMembers: number }> {
  return postApi('/api/collector/jira/batch-run', { cycleCode });
}

export async function getBatchRuns(): Promise<BatchRunsResponse> {
  return getApi<BatchRunsResponse>('/api/collector/jira/batch-runs');
}

export interface FullBatchRunRecord {
  id: string;
  versionNumber?: number;
  versionTag?: string;
  runAt: string;
  cycleCode: string;
  triggeredBy: 'CRON' | 'MANUAL';
  status: 'RUNNING' | 'DONE' | 'FAILED';
  totalMembers: number;
  completedMembers: number;
  failedMembers: number;
  durationMs: number;
  cronExpression: string;
  results: MemberBatchResult[];
  errorLog: string[];
}

export async function getBatchRunDetail(runId: string): Promise<FullBatchRunRecord> {
  return getApi<FullBatchRunRecord>(`/api/collector/jira/batch-runs/${runId}`);
}

export async function getBatchSchedule(): Promise<ScheduleInfo> {
  return getApi<ScheduleInfo>('/api/collector/jira/batch-schedule');
}

export async function getMemberBatchDetail(runId: string, employeeCode: string): Promise<MemberBatchResult> {
  return getApi<MemberBatchResult>(`/api/collector/jira/batch-runs/${runId}/member/${employeeCode}`);
}

export async function updateBatchCron(cronExpression: string): Promise<{ cronExpression: string; message: string }> {
  return putApi('/api/collector/jira/batch-cron', { cronExpression });
}

export async function applyBatchMemberResult(employeeCode: string, payload: {
  runId: string;
  cycleCode?: string;
  markReviewed?: boolean;
}): Promise<{ appliedCount: number; blendedCount: number; cycleCode: string }> {
  return postApi(`/api/collector/jira/members/${employeeCode}/apply-batch`, payload);
}

export async function updateMemberCadenceApi(
  employeeCode: string,
  payload: {
    reviewCadenceMonths?: number;
    nextReviewDueDate?: string | null;
    blueprintUsername?: string;
  }
): Promise<ManagedMember> {
  return patchApi<ManagedMember>(`/api/collector/jira/members/${employeeCode}/cadence`, payload);
}
