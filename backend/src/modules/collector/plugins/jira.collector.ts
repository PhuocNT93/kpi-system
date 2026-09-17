import {
  JiraTaskRecord,
  JiraTaskSummary,
} from '../domain/collector.types.js';

export interface JiraCredentials {
  baseUrl?: string;
  username: string;
  password: string;
}

export interface JiraPreviewOptions {
  targetUsername: string;
  displayName?: string;
  fromDate?: string;
  toDate?: string;
  projectFilter?: string;
  filterRole?: 'assignee' | 'reporter' | 'worklog' | 'both' | 'all';
}

export class JiraCollector {
  private static instances = new Map<string, JiraCollector>();

  public static getInstance(credentials: JiraCredentials): JiraCollector {
    const key = `${credentials.username}@${credentials.baseUrl || 'default'}`;
    let instance = JiraCollector.instances.get(key);
    if (!instance || instance.credentials.password !== credentials.password) {
      instance = new JiraCollector(credentials);
      JiraCollector.instances.set(key, instance);
    }
    return instance;
  }

  private baseUrl: string;
  private authHeader: string;

  constructor(public readonly credentials: JiraCredentials) {
    this.baseUrl = (credentials.baseUrl || 'https://pim.cyberlogitec.com/jira').replace(/\/$/, '');
    this.authHeader = 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
  }

  private async request<T = unknown>(path: string, options: RequestInit = {}): Promise<{ status: number; data?: T; error?: string }> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const text = await res.text();
        return { status: res.status, error: text };
      }

      const data = await res.json() as T;
      return { status: res.status, data };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { status: 500, error: `Network/Jira API error: ${errorMsg}` };
    }
  }

  public async getProjects(): Promise<Array<{ key: string; name: string }>> {
    const res = await this.request<Array<{ key: string; name: string }>>('/rest/api/2/project');
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(p => ({ key: p.key, name: p.name }));
    }
    return [];
  }

  public async previewTasks(options: JiraPreviewOptions): Promise<JiraTaskSummary> {
    const {
      targetUsername,
      displayName,
      fromDate,
      toDate,
      projectFilter,
      filterRole = 'all',
    } = options;

    // 1. Build JQL Query
    const clauses: string[] = [];

    // Role filter
    if (filterRole === 'assignee') {
      clauses.push(`assignee = "${targetUsername}"`);
    } else if (filterRole === 'reporter') {
      clauses.push(`reporter = "${targetUsername}"`);
    } else if (filterRole === 'worklog') {
      clauses.push(`worklogAuthor = "${targetUsername}"`);
    } else if (filterRole === 'both') {
      clauses.push(`(assignee = "${targetUsername}" OR reporter = "${targetUsername}")`);
    } else {
      // 'all' (default): covers assignee, reporter, and worklog author
      clauses.push(`(assignee = "${targetUsername}" OR reporter = "${targetUsername}" OR worklogAuthor = "${targetUsername}")`);
    }

    // Project filter
    if (projectFilter && projectFilter !== 'ALL') {
      clauses.push(`project = "${projectFilter}"`);
    }

    // Date range filter
    const endOfDay = toDate && !toDate.includes(':') ? `${toDate} 23:59` : toDate;
    if (fromDate && toDate) {
      clauses.push(`((updated >= "${fromDate}" AND updated <= "${endOfDay}") OR (worklogDate >= "${fromDate}" AND worklogDate <= "${toDate}"))`);
    } else if (fromDate) {
      clauses.push(`(updated >= "${fromDate}" OR worklogDate >= "${fromDate}")`);
    } else if (toDate) {
      clauses.push(`(updated <= "${endOfDay}" OR worklogDate <= "${toDate}")`);
    }

    const jql = `${clauses.join(' AND ')} ORDER BY updated DESC`;

    // 2. Query Jira REST API (fetch up to 200 items for full period review)
    const searchRes = await this.request<{
      total: number;
      issues: Array<{
        key: string;
        fields: {
          summary: string;
          project?: { key: string; name: string };
          issuetype?: { name: string };
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
          assignee?: { displayName: string };
          reporter?: { displayName: string };
        };
      }>;
    }>('/rest/api/2/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jql,
        startAt: 0,
        maxResults: 200,
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
        ],
      }),
    });

    if (!searchRes.data || !Array.isArray(searchRes.data.issues)) {
      throw new Error(`Failed to fetch tasks from Jira: ${searchRes.error || 'Unknown error'}`);
    }

    const rawIssues = searchRes.data.issues;
    const now = new Date();

    // 3. Map to JiraTaskRecord
    const tasks: JiraTaskRecord[] = rawIssues.map((iss) => {
      const f = iss.fields;
      const statusName = f.status?.name || 'Open';
      const statusCategory = f.status?.statusCategory?.name || 'To Do';
      const isCompleted =
        statusCategory === 'Done' ||
        ['Closed', 'Resolved', 'Done', 'Completed'].some((st) =>
          statusName.toLowerCase().includes(st.toLowerCase())
        );

      // Evaluate on-time status
      let isOnTime = true;
      if (isCompleted) {
        if (f.resolutiondate && f.duedate) {
          const resDate = new Date(f.resolutiondate);
          const dueDate = new Date(f.duedate);
          // Allow completion within the due day
          dueDate.setHours(23, 59, 59, 999);
          isOnTime = resDate <= dueDate;
        }
      } else {
        if (f.duedate) {
          const dueDate = new Date(f.duedate);
          dueDate.setHours(23, 59, 59, 999);
          if (now > dueDate) {
            isOnTime = false; // Overdue
          }
        }
      }

      const timeSpentHours = f.timespent ? Math.round((f.timespent / 3600) * 10) / 10 : 0;
      const estimatedHours = f.timeoriginalestimate ? Math.round((f.timeoriginalestimate / 3600) * 10) / 10 : 0;

      return {
        id: iss.key,
        key: iss.key,
        title: f.summary,
        projectKey: f.project?.key || '',
        projectName: f.project?.name || f.project?.key || 'Jira',
        issueType: f.issuetype?.name || 'Task',
        priority: f.priority?.name || 'Medium',
        status: statusName,
        statusCategory,
        isCompleted,
        isOnTime,
        registeredDate: f.created ? f.created.slice(0, 10) : null,
        dueDate: f.duedate || null,
        resolutionDate: f.resolutiondate ? f.resolutiondate.slice(0, 10) : null,
        assignee: f.assignee?.displayName,
        reporter: f.reporter?.displayName,
        timeSpentHours,
        estimatedHours,
        jiraUrl: `${this.baseUrl}/browse/${iss.key}`,
      };
    });

    // 4. Compute Metrics and Score
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.isCompleted).length;
    const inProgressTasks = totalTasks - completedTasks;
    const onTimeTasks = tasks.filter((t) => t.isCompleted && t.isOnTime).length;
    const delayedTasks = tasks.filter((t) => !t.isOnTime).length;
    const delayedTaskList = tasks.filter((t) => !t.isOnTime);
    const totalHours = Math.round(tasks.reduce((sum, t) => sum + t.timeSpentHours, 0) * 10) / 10;

    const onTimeRate =
      completedTasks > 0
        ? Math.round((onTimeTasks / completedTasks) * 1000) / 10
        : totalTasks > 0
        ? Math.round(((totalTasks - delayedTasks) / totalTasks) * 1000) / 10
        : 100;

    // Standard KPI Scale /10
    let score10 = 10;
    if (onTimeRate >= 95) score10 = 10;
    else if (onTimeRate >= 90) score10 = 9;
    else if (onTimeRate >= 80) score10 = 8;
    else if (onTimeRate >= 70) score10 = 7;
    else if (onTimeRate >= 60) score10 = 6;
    else score10 = 5;

    let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'A';
    if (score10 >= 9.5) grade = 'S';
    else if (score10 >= 8.5) grade = 'A';
    else if (score10 >= 7.0) grade = 'B';
    else if (score10 >= 5.0) grade = 'C';
    else grade = 'D';

    let suggestedLevel = 4;
    if (score10 >= 9) suggestedLevel = 5;
    else if (score10 >= 8) suggestedLevel = 4;
    else if (score10 >= 7) suggestedLevel = 3;
    else if (score10 >= 5) suggestedLevel = 2;
    else suggestedLevel = 1;

    return {
      projectName: projectFilter && projectFilter !== 'ALL' ? projectFilter : 'Jira PIM (All Projects)',
      totalTasks,
      completedTasks,
      inProgressTasks,
      onTimeTasks,
      delayedTasks,
      onTimeRate,
      totalHours,
      score10,
      grade,
      suggestedLevel,
      tasks,
      delayedTaskList,
      username: targetUsername,
      displayName: displayName || targetUsername,
      fromDate: fromDate || null,
      toDate: toDate || null,
      filterRole,
    };
  }
}
