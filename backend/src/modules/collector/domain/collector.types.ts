export type CollectorSourceType = 'BLUEPRINT' | 'JIRA' | 'GOOGLE_SHEET';

export interface CollectorDataSource {
  id: string;
  name: string;
  source_type: CollectorSourceType;
  auth_config: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CollectorJob {
  id: string;
  name: string;
  source_id: string;
  evaluation_cycle_id?: string | null;
  target_criterion_code: string;
  cron_expression?: string | null;
  params: Record<string, unknown>;
  is_active: boolean;
  last_run_at?: Date | null;
  last_status?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CollectorRunLog {
  id: string;
  job_id: string;
  started_at: Date;
  finished_at?: Date | null;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  records_count: number;
  summary?: Record<string, unknown> | null;
  error_message?: string | null;
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
}

export interface BlueprintTaskRecord {
  id: string;
  seqNo?: string;
  title: string;
  category?: string;
  registeredDate?: string | null;
  plannedDue?: string | null;
  actualFinish?: string | null;
  status: string;
  isOnTime: boolean;
  delayHours: number;
  assignee?: string;
  requester?: string;
}

export interface BlueprintTaskSummary {
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
  onTimeRate: number;
  score10?: number;
  grade?: 'S' | 'A' | 'B' | 'C' | 'D';
  suggestedLevel?: number;
  tasks: BlueprintTaskRecord[];
  delayedTaskList?: BlueprintTaskRecord[];
  username?: string;
  fromDate?: string | null;
  toDate?: string | null;
  filterRole?: string;
  dateType?: string;
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
  teams: BlueprintOrgTeam[];
}

export interface CollectorMonthlySnapshot {
  id: string;
  source_type: 'ATTENDANCE' | 'TASKS' | 'VACATION' | 'TEAM_ATTENDANCE' | 'JIRA_TASKS';
  year_month: string;
  target_member: string;
  team_id?: string | null;
  data_json: Record<string, unknown>;
  score10?: number | null;
  total_records: number;
  is_locked: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JiraTaskRecord {
  id: string;
  key: string;
  title: string;
  projectKey: string;
  projectName: string;
  issueType: string;
  priority: string;
  status: string;
  statusCategory: string;
  isCompleted: boolean;
  isOnTime: boolean;
  registeredDate?: string | null;
  dueDate?: string | null;
  resolutionDate?: string | null;
  assignee?: string;
  reporter?: string;
  timeSpentHours: number;
  estimatedHours: number;
  jiraUrl: string;
}

export interface JiraTaskSummary {
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
  onTimeRate: number;
  totalHours: number;
  score10: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  suggestedLevel: number;
  tasks: JiraTaskRecord[];
  delayedTaskList: JiraTaskRecord[];
  username: string;
  displayName?: string;
  fromDate?: string | null;
  toDate?: string | null;
  filterRole?: string;
}

