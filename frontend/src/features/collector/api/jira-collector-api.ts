import { getApi, postApi } from '@/shared/api/api-client';

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
  registeredDate: string | null;
  dueDate: string | null;
  resolutionDate: string | null;
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
  displayName: string;
  fromDate?: string | null;
  toDate?: string | null;
  filterRole?: 'all' | 'assignee' | 'reporter' | 'worklog' | 'both' | string;
}

export interface JiraMember {
  id: string;
  jiraUsername: string;
  name: string;
  employeeCode: string;
  role: string;
  email?: string;
  part: string;
}

export interface JiraProject {
  key: string;
  name: string;
}

export interface JiraSyncResult {
  success: boolean;
  score10: number;
  grade: string;
  weightedScore: number;
  comment: string;
  tasksSummary: JiraTaskSummary;
}

export const jiraCollectorApi = {
  getMembers: () => getApi<JiraMember[]>('/api/collectors/jira/members'),
  getProjects: () => getApi<JiraProject[]>('/api/collectors/jira/projects'),
  previewTasks: (params: {
    targetUsername: string;
    displayName?: string;
    fromDate?: string;
    toDate?: string;
    projectFilter?: string;
    filterRole?: 'all' | 'assignee' | 'reporter' | 'worklog' | 'both';
  }) => postApi<JiraTaskSummary>('/api/collectors/jira/preview-tasks', params),
  syncTasks: (params: {
    targetUsername: string;
    displayName?: string;
    fromDate?: string;
    toDate?: string;
    projectFilter?: string;
    filterRole?: 'all' | 'assignee' | 'reporter' | 'worklog' | 'both';
    cycleId?: string;
    employeeId?: string;
  }) => postApi<JiraSyncResult>('/api/collectors/jira/sync-tasks', params),
};
