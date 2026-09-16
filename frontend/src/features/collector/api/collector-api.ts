import { getApi, postApi, putApi, deleteApi } from '@/shared/api/api-client';

export interface CollectorDataSource {
  id: string;
  name: string;
  source_type: 'BLUEPRINT' | 'JIRA' | 'GOOGLE_SHEET';
  auth_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectorJob {
  id: string;
  name: string;
  source_id: string;
  source_name?: string;
  source_type?: string;
  evaluation_cycle_id?: string | null;
  target_criterion_code: string;
  cron_expression?: string | null;
  params: Record<string, unknown>;
  is_active: boolean;
  last_run_at?: string | null;
  last_status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDayRecord {
  date: string;
  dayType: string;
  isBusinessDay: boolean;
  checkIn?: string | null;
  checkOut?: string | null;
  shift?: string | null;
  status: 'ON_TIME' | 'LATE' | 'ABSENT' | 'LEAVE' | 'OFF';
  lateMinutes: number;
  leaveDesc?: string | null;
}

export interface CollectorCacheInfo {
  cachedMonths?: string[];
  liveMonths?: string[];
  fromCache?: boolean;
}

export interface BlueprintAttendanceSummary {
  username: string;
  month: string;
  totalDays: number;
  businessDays: number;
  attendedDays: number;
  onTimeDays: number;
  lateDays: number;
  leaveDays: number;
  punctualityRate: number;
  records: AttendanceDayRecord[];
  cacheInfo?: CollectorCacheInfo;
}

export interface BlueprintTeamMemberAttendance {
  empeNo: string;
  empeName: string;
  usrId?: string;
  orzNm: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  workShift: string;
  status: 'ON_TIME' | 'LATE' | 'ABSENT' | 'LEAVE';
  lateMinutes: number;
  leaveType?: string | null;
  requestStatus?: string | null;
  reason?: string | null;
}

export interface BlueprintOrgTeam {
  orzId: string;
  orzNm: string;
  teamLvl?: number;
}

export interface BlueprintTeamAttendanceSummary {
  teamId?: string;
  teamName: string;
  fromDate: string;
  toDate: string;
  totalMembers: number;
  attendedMembers: number;
  onTimeMembers: number;
  lateMembers: number;
  leaveMembers: number;
  absentMembers: number;
  punctualityRate: number;
  score10: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  suggestedLevel: number;
  records: BlueprintTeamMemberAttendance[];
  cacheInfo?: CollectorCacheInfo;
}

export interface CollectorRunLog {
  id: string;
  job_id: string;
  job_name?: string;
  source_name?: string;
  source_type?: string;
  started_at: string;
  finished_at?: string | null;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  records_count: number;
  summary?: Record<string, unknown> | null;
  error_message?: string | null;
}

export interface BlueprintTaskItem {
  id: string;
  seqNo?: string;
  title: string;
  category?: string;
  registeredDate?: string | null;
  plannedDue: string | null;
  actualFinish: string | null;
  status: string;
  isOnTime: boolean;
  delayHours: number;
  assignee?: string;
  requester?: string;
}

export interface BlueprintTasksSummary {
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
  onTimeRate: number;
  score10?: number;
  grade?: 'S' | 'A' | 'B' | 'C' | 'D';
  suggestedLevel?: number;
  tasks: BlueprintTaskItem[];
  delayedTaskList?: BlueprintTaskItem[];
  username?: string;
  fromDate?: string | null;
  toDate?: string | null;
  filterRole?: string;
  cacheInfo?: CollectorCacheInfo;
}

export interface BlueprintMemberItem {
  id: string;
  name: string;
  role: string;
  email?: string;
}

export interface BlueprintVacationDetail {
  leaveType: string;
  days: number;
}

export interface BlueprintDeductionItem {
  date: string;
  comment: string;
  leaveType: string;
  days: string;
}

export interface BlueprintVacationSummary {
  username: string;
  year: string;
  annualVacationDays: number;
  absentWithoutPayDays: number;
  compensatoryTimeDays: number;
  lateInEarlyOutCount: number;
  score10: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  suggestedLevel: number;
  vacationDetails: BlueprintVacationDetail[];
  deductions: BlueprintDeductionItem[];
  cacheInfo?: CollectorCacheInfo;
}

export const collectorApi = {
  // Sources
  listDataSources: () => getApi<CollectorDataSource[]>('/api/collectors/sources'),
  createDataSource: (data: Partial<CollectorDataSource>) => postApi<CollectorDataSource>('/api/collectors/sources', data),
  updateDataSource: (id: string, data: Partial<CollectorDataSource>) => putApi<CollectorDataSource>(`/api/collectors/sources/${id}`, data),
  deleteDataSource: (id: string) => deleteApi<void>(`/api/collectors/sources/${id}`),
  testConnection: (data: { source_id?: string; username?: string; password?: string; baseUrl?: string }) =>
    postApi<{ success: boolean; message: string }>('/api/collectors/sources/test', data),

  // Live Blueprint Preview & Direct Sync
  previewBlueprint: (data: { username: string; password: string; baseUrl?: string; month?: string; forceRefresh?: boolean }) =>
    postApi<BlueprintAttendanceSummary>('/api/collectors/blueprint/preview', data),

  getBlueprintTeams: () =>
    getApi<BlueprintOrgTeam[]>('/api/collectors/blueprint/teams'),

  previewBlueprintTeamAttendance: (data: {
    username?: string;
    password?: string;
    baseUrl?: string;
    teamId?: string;
    fromDate?: string;
    toDate?: string;
    employeeName?: string;
    forceRefresh?: boolean;
  }) =>
    postApi<BlueprintTeamAttendanceSummary>('/api/collectors/blueprint/preview-team-attendance', data),

  syncBlueprintTeamAttendance: (data: {
    username?: string;
    password?: string;
    baseUrl?: string;
    teamId?: string;
    fromDate?: string;
    toDate?: string;
    cycleId?: string;
    employeeId?: string;
    targetMember?: string;
    forceRefresh?: boolean;
  }) =>
    postApi<{
      success: boolean;
      score10: number;
      grade: string;
      weightedScore: number;
      comment: string;
      summary: BlueprintTeamAttendanceSummary;
    }>('/api/collectors/blueprint/sync-team-attendance', data),

  previewBlueprintTasks: (data: {
    username?: string;
    password?: string;
    baseUrl?: string;
    projectFilter?: string;
    member?: string;
    fromDate?: string;
    toDate?: string;
    filterRole?: 'requester' | 'assignee' | 'both';
    dateType?: 'registered' | 'due' | 'finished';
    forceRefresh?: boolean;
  }) =>
    postApi<BlueprintTasksSummary>('/api/collectors/blueprint/preview-tasks', data),

  getBlueprintMembers: () =>
    getApi<BlueprintMemberItem[]>('/api/collectors/blueprint/members'),

  syncBlueprintAttendance: (data: {
    username?: string;
    password?: string;
    baseUrl?: string;
    month?: string;
    cycleId?: string;
    employeeId?: string;
    forceRefresh?: boolean;
  }) =>
    postApi<{
      success: boolean;
      score10: number;
      grade: string;
      weightedScore: number;
      comment: string;
      summary: BlueprintAttendanceSummary;
    }>('/api/collectors/blueprint/sync-attendance', data),

  syncBlueprintTasks: (data: {
    username?: string;
    password?: string;
    baseUrl?: string;
    projectFilter?: string;
    cycleId?: string;
    employeeId?: string;
    member?: string;
    fromDate?: string;
    toDate?: string;
    filterRole?: 'requester' | 'assignee' | 'both';
    dateType?: 'registered' | 'due' | 'finished';
    forceRefresh?: boolean;
  }) =>
    postApi<{
      success: boolean;
      score10: number;
      grade: string;
      weightedScore: number;
      comment: string;
      tasksSummary: BlueprintTasksSummary;
    }>('/api/collectors/blueprint/sync-tasks', data),

  previewBlueprintVacation: (data: {
    username?: string;
    password?: string;
    baseUrl?: string;
    year?: string;
    member?: string;
    fromDate?: string;
    toDate?: string;
    forceRefresh?: boolean;
  }) =>
    postApi<BlueprintVacationSummary>('/api/collectors/blueprint/preview-vacation', data),

  syncBlueprintVacation: (data: {
    username?: string;
    password?: string;
    baseUrl?: string;
    year?: string;
    cycleId?: string;
    employeeId?: string;
    member?: string;
    fromDate?: string;
    toDate?: string;
    forceRefresh?: boolean;
  }) =>
    postApi<{
      success: boolean;
      score10: number;
      grade: string;
      weightedScore: number;
      comment: string;
      summary: BlueprintVacationSummary;
    }>('/api/collectors/blueprint/sync-vacation', data),

  syncAllBlueprint: (data: {
    username?: string;
    password?: string;
    baseUrl?: string;
    month?: string;
    projectFilter?: string;
    cycleId?: string;
    employeeId?: string;
    member?: string;
    fromDate?: string;
    toDate?: string;
    filterRole?: 'requester' | 'assignee' | 'both';
    dateType?: 'registered' | 'due' | 'finished';
    forceRefresh?: boolean;
  }) =>
    postApi<{
      success: boolean;
      cycleId: string;
      attendance: {
        punctualityRate: number;
        score10: number;
        grade: string;
        weightedScore: number;
        comment: string;
        summary: BlueprintAttendanceSummary;
      };
      tasks: {
        onTimeRate: number;
        score10: number;
        grade: string;
        weightedScore: number;
        comment: string;
        summary: BlueprintTasksSummary;
      };
      totalScore: number;
    }>('/api/collectors/blueprint/sync-all', data),

  getBlueprintConfig: () =>
    getApi<{
      id?: string;
      name?: string;
      username: string;
      password?: string;
      baseUrl?: string;
      month?: string;
      projectFilter?: string;
    }>('/api/collectors/blueprint/config'),

  saveBlueprintConfig: (data: {
    username?: string;
    password?: string;
    baseUrl?: string;
    month?: string;
    projectFilter?: string;
  }) =>

    postApi<{
      id: string;
      username: string;
      password?: string;
      baseUrl?: string;
      month?: string;
      projectFilter?: string;
    }>('/api/collectors/blueprint/config', data),

  // Jobs
  listJobs: () => getApi<CollectorJob[]>('/api/collectors/jobs'),
  createJob: (data: Partial<CollectorJob>) => postApi<CollectorJob>('/api/collectors/jobs', data),
  updateJob: (id: string, data: Partial<CollectorJob>) => putApi<CollectorJob>(`/api/collectors/jobs/${id}`, data),
  deleteJob: (id: string) => deleteApi<void>(`/api/collectors/jobs/${id}`),
  runJob: (id: string) => postApi<{ success: boolean; log: CollectorRunLog; summary?: Record<string, unknown> }>(`/api/collectors/jobs/${id}/run`, {}),

  // Logs
  listLogs: (limit: number = 30) => getApi<CollectorRunLog[]>(`/api/collectors/logs?limit=${limit}`),
};
