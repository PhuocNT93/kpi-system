import { JIRA_CONFIG } from './config.js';
import { CollectorScriptConfig } from './collector-script.store.js';

export interface JiraRawIssue {
  key: string;
  fields: {
    summary: string;
    project?: { key: string; name: string };
    issuetype?: { name: string; subtask?: boolean };
    priority?: { name: string };
    status?: {
      name: string;
      statusCategory?: { name: string; key: string };
    };
    created?: string;
    updated?: string;
    duedate?: string | null;
    resolutiondate?: string | null;
    timespent?: number | null;
    timeoriginalestimate?: number | null;
    assignee?: { name: string; displayName: string };
    reporter?: { name: string; displayName: string };
    description?: string | null;
    components?: Array<{ name: string }>;
    labels?: string[];
    resolution?: { name: string } | null;
    comment?: { total: number; comments?: Array<{ body?: string; author?: { displayName: string } }> };
  };
}

export interface JiraIssueRecord {
  key: string;
  summary: string;
  projectKey: string;
  projectName: string;
  issueType: string;
  isBug: boolean;
  priority: string;
  status: string;
  isCompleted: boolean;
  isOnTime: boolean;
  createdDate: string | null;
  dueDate: string | null;
  resolutionDate: string | null;
  timeSpentHours: number;
  originalEstimateHours?: number;
  jiraUrl: string;
  descriptionPreview?: string;
  components?: string[];
  labels?: string[];
  commentsCount?: number;
  latestComment?: string;
  resolution?: string | null;
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
  onTimeRate: number; // % (0-100)
  totalBugs: number;
  resolvedBugs: number;
  criticalBugs: number;
  totalHoursSpent: number;
  tasks: JiraIssueRecord[];
  sampleTaskKeys: string[];
  bugTaskKeys: string[];
  inProgressTaskKeys: string[];
  filterUrl: string;
  inProgressFilterUrl: string;
  completedFilterUrl: string;
}

export class JiraPimClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(
    baseUrl = JIRA_CONFIG.baseUrl,
    username = JIRA_CONFIG.username,
    password = JIRA_CONFIG.password
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Jira API ${res.status} [${url}]: ${errText.slice(0, 300)}`);
    }

    return (await res.json()) as T;
  }

  /**
   * Crawl all Jira issues for a given employee code, auto-paginating until complete.
   */
  public async fetchMemberIssues(
    employeeCode: string,
    options?: {
      fromDate?: string;
      toDate?: string;
      maxLimit?: number;
      scriptConfig?: Partial<CollectorScriptConfig>;
    }
  ): Promise<JiraIssueRecord[]> {
    const { fromDate, toDate, maxLimit = 2000, scriptConfig } = options || {};
    if (!scriptConfig) {
      console.warn(`[JiraClient] Warning: scriptConfig not provided for ${employeeCode}, using default dynamic script definitions`);
    }

    const picField = scriptConfig?.picCustomField || '11902';
    let jql = scriptConfig?.jqlTemplate || `(assignee = "{{employee_code}}" OR cf[{{pic_field}}] = "{{employee_code}}") {{date_filter}} ORDER BY updated DESC`;

    // Substitute placeholders
    jql = jql
      .replace(/\{\{employee_code\}\}/g, employeeCode)
      .replace(/\{\{pic_field\}\}/g, picField);

    let dateFilterStr = '';
    if (fromDate && toDate) {
      dateFilterStr = `AND (updated >= "${fromDate}" AND updated <= "${toDate}")`;
    } else if (fromDate) {
      dateFilterStr = `AND updated >= "${fromDate}"`;
    } else if (toDate) {
      dateFilterStr = `AND updated <= "${toDate}"`;
    }

    if (jql.includes('{{date_filter}}')) {
      jql = jql.replace(/\{\{date_filter\}\}/g, dateFilterStr);
    } else if (dateFilterStr && !jql.includes('updated >=')) {
      if (jql.toUpperCase().includes('ORDER BY')) {
        jql = jql.replace(/ORDER BY/i, `${dateFilterStr} ORDER BY`);
      } else {
        jql = `${jql} ${dateFilterStr}`;
      }
    }

    if (!jql.toUpperCase().includes('ORDER BY')) {
      jql = `${jql} ORDER BY updated DESC`;
    }
    const PAGE_SIZE = 100;
    let startAt = 0;
    const allRawIssues: JiraRawIssue[] = [];

    while (startAt < maxLimit) {
      const searchRes = await this.request<{
        total: number;
        startAt: number;
        maxResults: number;
        issues: JiraRawIssue[];
      }>('/rest/api/2/search', {
        method: 'POST',
        body: JSON.stringify({
          jql,
          startAt,
          maxResults: PAGE_SIZE,
          fields: [
            'summary',
            'project',
            'issuetype',
            'priority',
            'status',
            'created',
            'updated',
            'duedate',
            'resolutiondate',
            'timespent',
            'timeoriginalestimate',
            'assignee',
            'reporter',
            'description',
            'components',
            'labels',
            'resolution',
            'comment',
          ],
        }),
      });

      if (!searchRes.issues || searchRes.issues.length === 0) {
        break;
      }

      allRawIssues.push(...searchRes.issues);
      startAt += searchRes.issues.length;

      if (startAt >= searchRes.total) {
        break;
      }
    }

    const now = new Date();

    return allRawIssues.map((iss) => {
      const f = iss.fields;
      const statusName = f.status?.name || 'Open';
      const statusCat = f.status?.statusCategory?.name || 'To Do';
      const issueTypeName = f.issuetype?.name || 'Task';

      const bugTypes = scriptConfig?.bugIssueTypes;
      const isBug = bugTypes && bugTypes.length > 0
        ? bugTypes.some((bt) => issueTypeName.toLowerCase() === bt.toLowerCase() || issueTypeName.toLowerCase().includes(bt.toLowerCase()))
        : (issueTypeName.toLowerCase().includes('bug') || issueTypeName.toLowerCase().includes('defect'));

      const completedStatuses = scriptConfig?.completedStatuses;
      const isCompleted = completedStatuses && completedStatuses.length > 0
        ? (statusCat.toLowerCase() === 'done' || completedStatuses.some((st) => statusName.toLowerCase().includes(st.toLowerCase())))
        : (statusCat.toLowerCase() === 'done');

      let isOnTime = true;
      if (isCompleted) {
        if (f.resolutiondate && f.duedate) {
          const resDate = new Date(f.resolutiondate);
          const dueDate = new Date(f.duedate);
          dueDate.setHours(23, 59, 59, 999);
          isOnTime = resDate <= dueDate;
        }
      } else if (f.duedate) {
        const dueDate = new Date(f.duedate);
        dueDate.setHours(23, 59, 59, 999);
        if (now > dueDate) {
          isOnTime = false;
        }
      }

      const timeSpentHours = f.timespent ? Math.round((f.timespent / 3600) * 10) / 10 : 0;
      const originalEstimateHours = f.timeoriginalestimate ? Math.round((f.timeoriginalestimate / 3600) * 10) / 10 : undefined;
      const components = Array.isArray(f.components) ? f.components.map((c) => c.name).filter(Boolean) : [];
      const labels = Array.isArray(f.labels) ? f.labels : [];
      const commentsList = f.comment?.comments || [];
      const commentsCount = typeof f.comment?.total === 'number' ? f.comment.total : commentsList.length;
      const latestComment = commentsList.length > 0 && commentsList[commentsList.length - 1]?.body
        ? commentsList[commentsList.length - 1]!.body!.replace(/[\r\n]+/g, ' ').slice(0, 200).trim()
        : undefined;
      const descriptionPreview = typeof f.description === 'string'
        ? f.description.replace(/[\r\n]+/g, ' ').slice(0, 300).trim()
        : undefined;

      return {
        key: iss.key,
        summary: f.summary,
        projectKey: f.project?.key || '',
        projectName: f.project?.name || f.project?.key || 'Jira',
        issueType: issueTypeName,
        isBug,
        priority: f.priority?.name || 'Medium',
        status: statusName,
        isCompleted,
        isOnTime,
        createdDate: f.created ? f.created.slice(0, 10) : null,
        dueDate: f.duedate || null,
        resolutionDate: f.resolutiondate ? f.resolutiondate.slice(0, 10) : null,
        timeSpentHours,
        originalEstimateHours,
        jiraUrl: `${this.baseUrl}/browse/${iss.key}`,
        descriptionPreview,
        components,
        labels,
        commentsCount,
        latestComment,
        resolution: f.resolution?.name || null,
      };
    });
  }

  /**
   * Aggregate high-level metrics for an employee
   */
  public aggregateMemberMetrics(
    member: { code: string; name: string; team: string },
    tasks: JiraIssueRecord[],
    scriptConfig?: Partial<CollectorScriptConfig>
  ): MemberJiraMetrics {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.isCompleted).length;
    const inProgressTasks = totalTasks - completedTasks;
    const onTimeTasks = tasks.filter((t) => t.isCompleted && t.isOnTime).length;
    const delayedTasks = tasks.filter((t) => !t.isOnTime).length;

    const onTimeRate =
      completedTasks > 0
        ? Math.round((onTimeTasks / completedTasks) * 1000) / 10
        : totalTasks > 0
        ? Math.round(((totalTasks - delayedTasks) / totalTasks) * 1000) / 10
        : 100;

    const bugTasks = tasks.filter((t) => t.isBug);
    const totalBugs = bugTasks.length;
    const resolvedBugs = bugTasks.filter((t) => t.isCompleted).length;

    const criticalPriorities = scriptConfig?.criticalPriorities || ['Critical', 'Highest', 'Blocker'];
    const criticalBugs = bugTasks.filter((t) =>
      criticalPriorities.some((cp) => cp.toLowerCase() === t.priority.toLowerCase())
    ).length;

    const totalHoursSpent = Math.round(tasks.reduce((sum, t) => sum + t.timeSpentHours, 0) * 10) / 10;
    const sampleTaskKeys = tasks.slice(0, 5).map((t) => t.key);
    const bugTaskKeys = bugTasks.map((t) => t.key);
    const inProgressTaskRecords = tasks.filter((t) => !t.isCompleted);
    const inProgressTaskKeys = inProgressTaskRecords.map((t) => t.key);

    const filterUrl = `${this.baseUrl}/issues/?jql=${encodeURIComponent(
      `assignee = "${member.code}" OR reporter = "${member.code}" ORDER BY updated DESC`
    )}`;

    const completedStatusList = (scriptConfig?.completedStatuses && scriptConfig.completedStatuses.length > 0)
      ? scriptConfig.completedStatuses.join(', ')
      : 'Closed, Resolved, Done, Complete';

    const inProgressFilterUrl =
      inProgressTaskKeys.length > 0
        ? `${this.baseUrl}/issues/?jql=${encodeURIComponent(
            `key in (${inProgressTaskKeys.join(', ')}) ORDER BY updated DESC`
          )}`
        : `${this.baseUrl}/issues/?jql=${encodeURIComponent(
            `(assignee = "${member.code}" OR reporter = "${member.code}") AND status not in (${completedStatusList}) ORDER BY updated DESC`
          )}`;

    const completedFilterUrl = `${this.baseUrl}/issues/?jql=${encodeURIComponent(
      `(assignee = "${member.code}" OR reporter = "${member.code}") AND status in (${completedStatusList}) ORDER BY updated DESC`
    )}`;

    return {
      employeeCode: member.code,
      memberName: member.name,
      team: member.team,
      totalTasks,
      completedTasks,
      inProgressTasks,
      onTimeTasks,
      delayedTasks,
      onTimeRate,
      totalBugs,
      resolvedBugs,
      criticalBugs,
      totalHoursSpent,
      tasks,
      sampleTaskKeys,
      bugTaskKeys,
      inProgressTaskKeys,
      filterUrl,
      inProgressFilterUrl,
      completedFilterUrl,
    };
  }
}
