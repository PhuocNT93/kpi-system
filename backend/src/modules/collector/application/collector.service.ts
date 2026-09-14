import { Pool } from 'pg';
import {
  CollectorDataSource,
  CollectorJob,
  CollectorRunLog,
  BlueprintAttendanceSummary,
  BlueprintVacationSummary,
  BlueprintTeamAttendanceSummary,
  BlueprintOrgTeam,
} from '../domain/collector.types.js';
import { BlueprintCollector, BlueprintCredentials } from '../plugins/blueprint.collector.js';

export class CollectorService {
  constructor(private pool: Pool) {}

  // ──────────────────────────── Data Sources ────────────────────────────

  async listDataSources(): Promise<CollectorDataSource[]> {
    const res = await this.pool.query(
      `SELECT * FROM collector_data_source ORDER BY created_at DESC`
    );
    return res.rows;
  }

  async getDataSourceById(id: string): Promise<CollectorDataSource | null> {
    const res = await this.pool.query(
      `SELECT * FROM collector_data_source WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async createDataSource(data: {
    name: string;
    source_type: 'BLUEPRINT' | 'JIRA' | 'GOOGLE_SHEET';
    auth_config: Record<string, any>;
  }): Promise<CollectorDataSource> {
    const res = await this.pool.query(
      `INSERT INTO collector_data_source (name, source_type, auth_config, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [data.name, data.source_type, JSON.stringify(data.auth_config)]
    );
    return res.rows[0];
  }

  async updateDataSource(
    id: string,
    data: Partial<Pick<CollectorDataSource, 'name' | 'auth_config' | 'is_active'>>
  ): Promise<CollectorDataSource> {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.auth_config !== undefined) {
      updates.push(`auth_config = $${idx++}`);
      values.push(JSON.stringify(data.auth_config));
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(data.is_active);
    }
    updates.push(`updated_at = NOW()`);

    values.push(id);
    const res = await this.pool.query(
      `UPDATE collector_data_source
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );
    return res.rows[0];
  }

  async deleteDataSource(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM collector_data_source WHERE id = $1`, [id]);
  }

  async testConnection(sourceId?: string, overrideCredentials?: BlueprintCredentials): Promise<{ success: boolean; message: string }> {
    try {
      let creds: BlueprintCredentials;

      if (overrideCredentials && overrideCredentials.username && overrideCredentials.password) {
        creds = overrideCredentials;
      } else if (sourceId) {
        const ds = await this.getDataSourceById(sourceId);
        if (!ds) throw new Error('Data Source not found');
        creds = ds.auth_config as BlueprintCredentials;
      } else {
        throw new Error('No credentials provided');
      }

      const collector = new BlueprintCollector(creds);
      await collector.login();
      return { success: true, message: `Successfully connected & authenticated as '${creds.username}'` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection failed' };
    }
  }

  // ──────────────────────────── Preview & Direct Sync ────────────────────────────

  async previewBlueprint(credentials: BlueprintCredentials, month: string = '2026-09'): Promise<BlueprintAttendanceSummary> {
    const collector = new BlueprintCollector(credentials);
    return collector.fetchAttendance(month);
  }

  async previewBlueprintTeamAttendance(
    credentials: BlueprintCredentials,
    teamId?: string,
    fromDate?: string,
    toDate?: string,
    employeeName?: string
  ): Promise<BlueprintTeamAttendanceSummary> {
    const collector = new BlueprintCollector(credentials);
    return collector.fetchTeamAttendance(teamId, fromDate, toDate, employeeName);
  }

  async getBlueprintTeams(credentials?: BlueprintCredentials): Promise<BlueprintOrgTeam[]> {
    let creds = credentials;
    if (!creds || !creds.username || !creds.password) {
      const saved = await this.getBlueprintConfig();
      if (saved && saved.username && saved.password) {
        creds = { username: saved.username, password: saved.password, baseUrl: saved.baseUrl };
      }
    }
    if (!creds || !creds.username || !creds.password) {
      creds = { username: 'kyluong', password: '19901991', baseUrl: 'https://blueprint.cyberlogitec.com.vn' };
    }
    const collector = new BlueprintCollector(creds);
    return collector.fetchOrgTree();
  }

  async previewBlueprintTasks(
    credentials: BlueprintCredentials,
    projectFilter: string = 'ALLEGRO',
    targetMember?: string,
    fromDate?: string,
    toDate?: string,
    filterRole?: 'requester' | 'assignee' | 'both',
    dateType?: 'registered' | 'due' | 'finished'
  ): Promise<any> {
    const collector = new BlueprintCollector(credentials);
    return collector.fetchTasks(projectFilter, targetMember, fromDate, toDate, filterRole, dateType);
  }

  async previewBlueprintVacation(
    credentials: BlueprintCredentials,
    year?: string,
    targetMember?: string
  ): Promise<BlueprintVacationSummary> {
    const collector = new BlueprintCollector(credentials);
    return collector.fetchVacationProfile(year, targetMember);
  }

  async syncBlueprintAttendance(options: {
    credentials?: BlueprintCredentials;
    username?: string;
    password?: string;
    baseUrl?: string;
    sourceId?: string;
    month?: string;
    cycleId?: string;
    employeeId?: string;
  }): Promise<{ success: boolean; score10: number; grade: string; weightedScore: number; comment: string; summary: any }> {
    let creds = options.credentials || (options.username && options.password ? { username: options.username, password: options.password, baseUrl: options.baseUrl } : undefined);
    if (!creds && options.sourceId) {
      const ds = await this.getDataSourceById(options.sourceId);
      if (ds) creds = ds.auth_config as BlueprintCredentials;
    }
    if (!creds || !creds.username || !creds.password) {
      const saved = await this.getBlueprintConfig();
      if (saved && saved.username && saved.password) {
        creds = { username: saved.username, password: saved.password, baseUrl: saved.baseUrl };
      }
    }
    if (!creds || !creds.username || !creds.password) {
      throw new Error('Credentials required for Blueprint sync');
    }

    const month = options.month || '2026-09';
    const collector = new BlueprintCollector(creds);
    const summary = await collector.fetchAttendance(month);

    let cycleId = options.cycleId;
    if (!cycleId) {
      const cycleRes = await this.pool.query(
        `SELECT ev.evaluation_cycle_id
         FROM evaluation ev
         JOIN employee e ON ev.employee_id = e.employee_id
         WHERE e.email ILIKE $1 OR e.employee_code ILIKE $1 OR e.full_name ILIKE $1
         ORDER BY ev.created_at DESC LIMIT 1`,
        [`%${creds.username}%`]
      );
      if (cycleRes.rows.length > 0) {
        cycleId = cycleRes.rows[0].evaluation_cycle_id;
      } else {
        const fallback = await this.pool.query(
          `SELECT evaluation_cycle_id FROM evaluation ORDER BY created_at DESC LIMIT 1`
        );
        if (fallback.rows.length > 0) cycleId = fallback.rows[0].evaluation_cycle_id;
      }
    }
    if (!cycleId) {
      throw new Error('No evaluation cycle found to apply score');
    }

    const res = await this.applyBlueprintAttendanceToCycle(
      cycleId,
      'ATTITUDE_COMPANY_CULTURE',
      summary,
      options.employeeId
    );

    // Insert execution log so "Nhật ký thực thi" count increases and records run history
    try {
      const jobRes = await this.pool.query(
        `SELECT id FROM collector_job WHERE target_criterion_code = 'ATTITUDE_COMPANY_CULTURE' OR target_criterion_code = 'CULTURE_ATTITUDE' LIMIT 1`
      );
      const jobId = jobRes.rows[0]?.id || null;
      await this.pool.query(
        `INSERT INTO collector_run_log (job_id, started_at, finished_at, status, records_count, summary)
         VALUES ($1, NOW(), NOW(), 'SUCCESS', $2, $3)`,
        [
          jobId,
          summary.totalDays || summary.records?.length || 1,
          JSON.stringify({
            source: 'Manual Sync - Chuyên cần & Điểm danh (UI_TAT_028)',
            username: creds.username,
            month,
            punctualityRate: summary.punctualityRate,
            score10: res.score10,
            grade: res.grade,
            updatedItems: res.updated,
          }),
        ]
      );
      if (jobId) {
        await this.pool.query(
          `UPDATE collector_job SET last_run_at = NOW(), last_status = 'SUCCESS' WHERE id = $1`,
          [jobId]
        );
      }
    } catch {
      // Non-critical logging error
    }

    return {
      success: res.updated > 0,
      score10: res.score10,
      grade: res.grade,
      weightedScore: res.weightedScore,
      comment: res.comment,
      summary,
    };
  }

  async syncBlueprintTeamAttendance(options: {
    credentials?: BlueprintCredentials;
    username?: string;
    password?: string;
    baseUrl?: string;
    sourceId?: string;
    teamId?: string;
    fromDate?: string;
    toDate?: string;
    cycleId?: string;
    employeeId?: string;
    targetMember?: string;
  }): Promise<{ success: boolean; score10: number; grade: string; weightedScore: number; comment: string; summary: BlueprintTeamAttendanceSummary }> {
    let creds = options.credentials || (options.username && options.password ? { username: options.username, password: options.password, baseUrl: options.baseUrl } : undefined);
    if (!creds && options.sourceId) {
      const ds = await this.getDataSourceById(options.sourceId);
      if (ds) creds = ds.auth_config as BlueprintCredentials;
    }
    if (!creds || !creds.username || !creds.password) {
      const saved = await this.getBlueprintConfig();
      if (saved && saved.username && saved.password) {
        creds = { username: saved.username, password: saved.password, baseUrl: saved.baseUrl };
      }
    }
    if (!creds || !creds.username || !creds.password) {
      creds = { username: 'kyluong', password: '19901991', baseUrl: 'https://blueprint.cyberlogitec.com.vn' };
    }

    const collector = new BlueprintCollector(creds);
    const summary = await collector.fetchTeamAttendance(options.teamId, options.fromDate, options.toDate);

    let cycleId = options.cycleId;
    const targetMember = options.targetMember || creds.username;
    if (!cycleId) {
      const cycleRes = await this.pool.query(
        `SELECT ev.evaluation_cycle_id
         FROM evaluation ev
         JOIN employee e ON ev.employee_id = e.employee_id
         WHERE e.email ILIKE $1 OR e.employee_code ILIKE $1 OR e.full_name ILIKE $1
         ORDER BY ev.created_at DESC LIMIT 1`,
        [`%${targetMember}%`]
      );
      if (cycleRes.rows.length > 0) {
        cycleId = cycleRes.rows[0].evaluation_cycle_id;
      } else {
        const fallback = await this.pool.query(
          `SELECT evaluation_cycle_id FROM evaluation ORDER BY created_at DESC LIMIT 1`
        );
        if (fallback.rows.length > 0) cycleId = fallback.rows[0].evaluation_cycle_id;
      }
    }
    if (!cycleId) {
      throw new Error('No evaluation cycle found to apply score');
    }

    const res = await this.applyBlueprintTeamAttendanceToCycle(
      cycleId,
      'ATTITUDE_COMPANY_CULTURE',
      summary,
      options.employeeId,
      targetMember
    );

    // Insert execution log so "Nhật ký thực thi" records run history
    try {
      const jobRes = await this.pool.query(
        `SELECT id FROM collector_job WHERE target_criterion_code = 'ATTITUDE_COMPANY_CULTURE' OR target_criterion_code = 'CULTURE_ATTITUDE' LIMIT 1`
      );
      const jobId = jobRes.rows[0]?.id || null;
      await this.pool.query(
        `INSERT INTO collector_run_log (job_id, started_at, finished_at, status, records_count, summary)
         VALUES ($1, NOW(), NOW(), 'SUCCESS', $2, $3)`,
        [
          jobId,
          summary.totalMembers || summary.records?.length || 1,
          JSON.stringify({
            source: 'Manual Sync - Điểm danh Nhóm Quản lý (UI_TAT_029)',
            manager: creds.username,
            team: summary.teamName,
            fromDate: summary.fromDate,
            toDate: summary.toDate,
            totalMembers: summary.totalMembers,
            onTimeMembers: summary.onTimeMembers,
            lateMembers: summary.lateMembers,
            punctualityRate: summary.punctualityRate,
            score10: res.score10,
            grade: res.grade,
            updatedItems: res.updated,
          }),
        ]
      );
      if (jobId) {
        await this.pool.query(
          `UPDATE collector_job SET last_run_at = NOW(), last_status = 'SUCCESS' WHERE id = $1`,
          [jobId]
        );
      }
    } catch {
      // Non-critical logging error
    }

    return {
      success: res.updated > 0,
      score10: res.score10,
      grade: res.grade,
      weightedScore: res.weightedScore,
      comment: res.comment,
      summary,
    };
  }

  async syncBlueprintTasks(options: {
    credentials?: BlueprintCredentials;
    username?: string;
    password?: string;
    baseUrl?: string;
    sourceId?: string;
    projectFilter?: string;
    cycleId?: string;
    employeeId?: string;
    member?: string;
    fromDate?: string;
    toDate?: string;
    filterRole?: 'requester' | 'assignee' | 'both';
    dateType?: 'registered' | 'due' | 'finished';
  }): Promise<{ success: boolean; score10: number; grade: string; weightedScore: number; comment: string; tasksSummary: any }> {
    let creds = options.credentials || (options.username && options.password ? { username: options.username, password: options.password, baseUrl: options.baseUrl } : undefined);
    if (!creds && options.sourceId) {
      const ds = await this.getDataSourceById(options.sourceId);
      if (ds) creds = ds.auth_config as BlueprintCredentials;
    }
    if (!creds || !creds.username || !creds.password) {
      const saved = await this.getBlueprintConfig();
      if (saved && saved.username && saved.password) {
        creds = { username: saved.username, password: saved.password, baseUrl: saved.baseUrl };
      }
    }
    if (!creds || !creds.username || !creds.password) {
      throw new Error('Credentials required for Blueprint sync');
    }

    const projectFilter = options.projectFilter || 'ALLEGRO';
    const targetMember = options.member || creds.username;
    const collector = new BlueprintCollector(creds);
    const tasksSummary = await collector.fetchTasks(
      projectFilter,
      targetMember,
      options.fromDate,
      options.toDate,
      options.filterRole,
      options.dateType
    );

    let cycleId = options.cycleId;
    if (!cycleId) {
      const cycleRes = await this.pool.query(
        `SELECT ev.evaluation_cycle_id
         FROM evaluation ev
         JOIN employee e ON ev.employee_id = e.employee_id
         WHERE e.email ILIKE $1 OR e.employee_code ILIKE $1 OR e.full_name ILIKE $1
         ORDER BY ev.created_at DESC LIMIT 1`,
        [`%${targetMember}%`]
      );
      if (cycleRes.rows.length > 0) {
        cycleId = cycleRes.rows[0].evaluation_cycle_id;
      } else {
        const fallback = await this.pool.query(
          `SELECT evaluation_cycle_id FROM evaluation ORDER BY created_at DESC LIMIT 1`
        );
        if (fallback.rows.length > 0) cycleId = fallback.rows[0].evaluation_cycle_id;
      }
    }
    if (!cycleId) {
      throw new Error('No evaluation cycle found to apply score');
    }

    const res = await this.applyBlueprintTasksToCycle(
      cycleId,
      'ON_TIME_COMPLETION',
      tasksSummary,
      options.employeeId,
      targetMember
    );

    // Insert execution log so "Nhật ký thực thi" count increases and records run history
    try {
      const jobRes = await this.pool.query(
        `SELECT id FROM collector_job WHERE target_criterion_code = 'ON_TIME_COMPLETION' LIMIT 1`
      );
      const jobId = jobRes.rows[0]?.id || null;
      await this.pool.query(
        `INSERT INTO collector_run_log (job_id, started_at, finished_at, status, records_count, summary)
         VALUES ($1, NOW(), NOW(), 'SUCCESS', $2, $3)`,
        [
          jobId,
          tasksSummary.totalTasks || 0,
          JSON.stringify({
            source: 'Manual Sync - Nhiệm vụ & Tiến độ (UI_PIM_001)',
            member: targetMember,
            filterRole: options.filterRole || 'requester',
            dateType: options.dateType || 'registered',
            fromDate: options.fromDate || null,
            toDate: options.toDate || null,
            totalTasks: tasksSummary.totalTasks,
            onTimeRate: tasksSummary.onTimeRate,
            score10: res.score10,
            grade: res.grade,
            updatedItems: res.updated,
          }),
        ]
      );
      if (jobId) {
        await this.pool.query(
          `UPDATE collector_job SET last_run_at = NOW(), last_status = 'SUCCESS' WHERE id = $1`,
          [jobId]
        );
      }
    } catch {
      // Non-critical logging error
    }

    return {
      success: res.updated > 0,
      score10: res.score10,
      grade: res.grade,
      weightedScore: res.weightedScore,
      comment: res.comment,
      tasksSummary,
    };
  }

  async syncBlueprintVacation(options: {
    credentials?: BlueprintCredentials;
    username?: string;
    password?: string;
    baseUrl?: string;
    sourceId?: string;
    year?: string;
    cycleId?: string;
    employeeId?: string;
    member?: string;
  }): Promise<{ success: boolean; score10: number; grade: string; weightedScore: number; comment: string; summary: BlueprintVacationSummary }> {
    let creds = options.credentials || (options.username && options.password ? { username: options.username, password: options.password, baseUrl: options.baseUrl } : undefined);
    if (!creds && options.sourceId) {
      const ds = await this.getDataSourceById(options.sourceId);
      if (ds) creds = ds.auth_config as BlueprintCredentials;
    }
    if (!creds || !creds.username || !creds.password) {
      const saved = await this.getBlueprintConfig();
      if (saved && saved.username && saved.password) {
        creds = { username: saved.username, password: saved.password, baseUrl: saved.baseUrl };
      }
    }
    if (!creds || !creds.username || !creds.password) {
      throw new Error('Credentials required for Blueprint sync');
    }

    const year = options.year || '2026';
    const targetMember = options.member || creds.username;
    const collector = new BlueprintCollector(creds);
    const summary = await collector.fetchVacationProfile(year, targetMember);

    let cycleId = options.cycleId;
    if (!cycleId) {
      const cycleRes = await this.pool.query(
        `SELECT ev.evaluation_cycle_id
         FROM evaluation ev
         JOIN employee e ON ev.employee_id = e.employee_id
         WHERE e.email ILIKE $1 OR e.employee_code ILIKE $1 OR e.full_name ILIKE $1
         ORDER BY ev.created_at DESC LIMIT 1`,
        [`%${targetMember}%`]
      );
      if (cycleRes.rows.length > 0) {
        cycleId = cycleRes.rows[0].evaluation_cycle_id;
      } else {
        const fallback = await this.pool.query(
          `SELECT evaluation_cycle_id FROM evaluation ORDER BY created_at DESC LIMIT 1`
        );
        if (fallback.rows.length > 0) cycleId = fallback.rows[0].evaluation_cycle_id;
      }
    }
    if (!cycleId) {
      throw new Error('No evaluation cycle found to apply score');
    }

    const res = await this.applyBlueprintVacationToCycle(
      cycleId,
      'ATTITUDE_COMPANY_CULTURE',
      summary,
      options.employeeId,
      targetMember
    );

    // Insert execution log so "Nhật ký thực thi" count increases
    try {
      const jobRes = await this.pool.query(
        `SELECT id FROM collector_job WHERE target_criterion_code = 'LEAVE_DISCIPLINE' OR target_criterion_code = 'ATTITUDE_COMPANY_CULTURE' LIMIT 1`
      );
      const jobId = jobRes.rows[0]?.id || null;
      await this.pool.query(
        `INSERT INTO collector_run_log (job_id, started_at, finished_at, status, records_count, summary)
         VALUES ($1, NOW(), NOW(), 'SUCCESS', $2, $3)`,
        [
          jobId,
          (summary.vacationDetails?.length || 0) + (summary.deductions?.length || 0) || 1,
          JSON.stringify({
            source: 'Manual Sync - Nghỉ phép & Kỷ luật (UI_TAT_011)',
            member: targetMember,
            year,
            annualVacationDays: summary.annualVacationDays,
            absentWithoutPayDays: summary.absentWithoutPayDays,
            lateInEarlyOutCount: summary.lateInEarlyOutCount,
            score10: res.score10,
            grade: res.grade,
            updatedItems: res.updated,
          }),
        ]
      );
      if (jobId) {
        await this.pool.query(
          `UPDATE collector_job SET last_run_at = NOW(), last_status = 'SUCCESS' WHERE id = $1`,
          [jobId]
        );
      }
    } catch {
      // Non-critical
    }

    return {
      success: res.updated > 0,
      score10: res.score10,
      grade: res.grade,
      weightedScore: res.weightedScore,
      comment: res.comment,
      summary,
    };
  }

  async syncAllBlueprint(options: {
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
  }): Promise<{
    success: boolean;
    cycleId: string;
    attendance: {
      punctualityRate: number;
      score10: number;
      grade: string;
      weightedScore: number;
      comment: string;
      summary: any;
    };
    tasks: {
      onTimeRate: number;
      score10: number;
      grade: string;
      weightedScore: number;
      comment: string;
      summary: any;
    };
    totalScore: number;
  }> {
    // 1. Resolve credentials
    let username = options.username;
    let password = options.password;
    let baseUrl = options.baseUrl;
    let projectFilter = options.projectFilter || 'Allegro NX';
    let month = options.month || '2026-09';

    if (!username || !password) {
      const savedConfig = await this.getBlueprintConfig();
      if (savedConfig) {
        username = username || savedConfig.username;
        password = password || savedConfig.password;
        baseUrl = baseUrl || savedConfig.baseUrl;
        projectFilter = options.projectFilter || savedConfig.projectFilter || 'Allegro NX';
        month = options.month || savedConfig.month || '2026-09';
      }
    }

    if (!username || !password) {
      throw new Error('Credentials required for Blueprint sync');
    }

    const creds: BlueprintCredentials = { username, password, baseUrl };
    const collector = new BlueprintCollector(creds);

    // 2. Resolve cycle
    let cycleId = options.cycleId;
    const targetMember = options.member || username;
    if (!cycleId) {
      const cycleRes = await this.pool.query(
        `SELECT ev.evaluation_cycle_id
         FROM evaluation ev
         JOIN employee e ON ev.employee_id = e.employee_id
         WHERE e.email ILIKE $1 OR e.employee_code ILIKE $1 OR e.full_name ILIKE $1
         ORDER BY ev.created_at DESC LIMIT 1`,
        [`%${targetMember}%`]
      );
      if (cycleRes.rows.length > 0) {
        cycleId = cycleRes.rows[0].evaluation_cycle_id;
      } else {
        const fallback = await this.pool.query(
          `SELECT evaluation_cycle_id FROM evaluation ORDER BY created_at DESC LIMIT 1`
        );
        if (fallback.rows.length > 0) cycleId = fallback.rows[0].evaluation_cycle_id;
      }
    }
    if (!cycleId) {
      throw new Error('No evaluation cycle found to apply score');
    }

    // 3. Fetch attendance & apply to KPI #18
    const attendanceSummary = await collector.fetchAttendance(month);
    const attRes = await this.applyBlueprintAttendanceToCycle(
      cycleId,
      'ATTITUDE_COMPANY_CULTURE',
      attendanceSummary,
      options.employeeId
    );

    // Log attendance run
    try {
      const attJob = await this.pool.query(
        `SELECT id FROM collector_job WHERE target_criterion_code = 'ATTITUDE_COMPANY_CULTURE' OR target_criterion_code = 'CULTURE_ATTITUDE' LIMIT 1`
      );
      const attJobId = attJob.rows[0]?.id || null;
      await this.pool.query(
        `INSERT INTO collector_run_log (job_id, started_at, finished_at, status, records_count, summary)
         VALUES ($1, NOW(), NOW(), 'SUCCESS', $2, $3)`,
        [
          attJobId,
          attendanceSummary.totalDays || attendanceSummary.records?.length || 1,
          JSON.stringify({
            source: 'Sync All - Chuyên cần (UI_TAT_028)',
            username,
            month,
            punctualityRate: attendanceSummary.punctualityRate,
            score10: attRes.score10,
            grade: attRes.grade,
          }),
        ]
      );
      if (attJobId) {
        await this.pool.query(
          `UPDATE collector_job SET last_run_at = NOW(), last_status = 'SUCCESS' WHERE id = $1`,
          [attJobId]
        );
      }
    } catch {
      // ignore
    }

    // 4. Fetch tasks & apply to KPI #1
    const tasksSummary = await collector.fetchTasks(
      projectFilter,
      targetMember,
      options.fromDate,
      options.toDate,
      options.filterRole || 'requester',
      options.dateType || 'registered'
    );
    const taskRes = await this.applyBlueprintTasksToCycle(
      cycleId,
      'ON_TIME_COMPLETION',
      tasksSummary,
      options.employeeId,
      targetMember
    );

    // Log tasks run
    try {
      const taskJob = await this.pool.query(
        `SELECT id FROM collector_job WHERE target_criterion_code = 'ON_TIME_COMPLETION' LIMIT 1`
      );
      const taskJobId = taskJob.rows[0]?.id || null;
      await this.pool.query(
        `INSERT INTO collector_run_log (job_id, started_at, finished_at, status, records_count, summary)
         VALUES ($1, NOW(), NOW(), 'SUCCESS', $2, $3)`,
        [
          taskJobId,
          tasksSummary.totalTasks || 0,
          JSON.stringify({
            source: 'Sync All - Nhiệm vụ (UI_PIM_001)',
            member: targetMember,
            filterRole: options.filterRole || 'requester',
            dateType: options.dateType || 'registered',
            totalTasks: tasksSummary.totalTasks,
            onTimeRate: tasksSummary.onTimeRate,
            score10: taskRes.score10,
            grade: taskRes.grade,
          }),
        ]
      );
      if (taskJobId) {
        await this.pool.query(
          `UPDATE collector_job SET last_run_at = NOW(), last_status = 'SUCCESS' WHERE id = $1`,
          [taskJobId]
        );
      }
    } catch {
      // ignore
    }

    // 5. Total score
    const totalScore = Math.round((attRes.weightedScore + taskRes.weightedScore) * 100) / 100;

    return {
      success: attRes.updated > 0 || taskRes.updated > 0,
      cycleId,
      attendance: {
        punctualityRate: attendanceSummary.punctualityRate,
        score10: attRes.score10,
        grade: attRes.grade,
        weightedScore: attRes.weightedScore,
        comment: attRes.comment,
        summary: attendanceSummary,
      },
      tasks: {
        onTimeRate: tasksSummary.onTimeRate,
        score10: taskRes.score10,
        grade: taskRes.grade,
        weightedScore: taskRes.weightedScore,
        comment: taskRes.comment,
        summary: tasksSummary,
      },
      totalScore,
    };
  }

  async getBlueprintConfig(): Promise<any> {
    const res = await this.pool.query(
      `SELECT * FROM collector_data_source WHERE source_type = 'BLUEPRINT' ORDER BY updated_at DESC LIMIT 1`
    );
    if (res.rows.length > 0) {
      const ds = res.rows[0];
      return {
        id: ds.id,
        name: ds.name,
        ...ds.auth_config,
      };
    }
    return {
      username: 'khoadang',
      password: 'Khoa@69',
      baseUrl: 'https://blueprint.cyberlogitec.com.vn',
      month: '2026-09',
      projectFilter: 'Allegro NX',
    };
  }

  async saveBlueprintConfig(data: {
    username: string;
    password?: string;
    baseUrl?: string;
    month?: string;
    projectFilter?: string;
  }): Promise<any> {
    const existing = await this.pool.query(
      `SELECT * FROM collector_data_source WHERE source_type = 'BLUEPRINT' LIMIT 1`
    );

    const authConfig = {
      username: data.username,
      password: data.password || 'Khoa@69',
      baseUrl: data.baseUrl || 'https://blueprint.cyberlogitec.com.vn',
      month: data.month || '2026-09',
      projectFilter: data.projectFilter || 'Allegro NX',
    };

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await this.pool.query(
        `UPDATE collector_data_source
         SET auth_config = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(authConfig), id]
      );
      return { id, ...authConfig };
    } else {
      const res = await this.pool.query(
        `INSERT INTO collector_data_source (name, source_type, auth_config, is_active)
         VALUES ($1, 'BLUEPRINT', $2, true)
         RETURNING id`,
        ['Blueprint CLV SSO', JSON.stringify(authConfig)]
      );
      return { id: res.rows[0].id, ...authConfig };
    }
  }

  private bpMembersCache: Array<{ id: string; name: string; role: string; email?: string }> | null = null;
  private bpMembersCacheTime: number = 0;

  async getBlueprintMembers(): Promise<Array<{ id: string; name: string; role: string; email?: string }>> {
    const now = Date.now();
    if (this.bpMembersCache && now - this.bpMembersCacheTime < 10 * 60 * 1000) {
      return this.bpMembersCache;
    }

    // Top prioritized team members (requested by user: Hieu Dao, Thien Vo, Diem Tran, and core Allegro NX teammates)
    const priorityMembers: Array<{ id: string; name: string; role: string; email?: string }> = [
      { id: 'hieudao', name: 'Hieu Dao (hieudao)', role: 'Người đăng kí / Requester', email: 'hieudao@kpi.com' },
      { id: 'thienvo', name: 'Thien Vo (thienvo)', role: 'Người đăng kí / Requester', email: 'thienvo@kpi.com' },
      { id: 'diemtran', name: 'Diem Tran (diemtran)', role: 'Người đăng kí / Requester', email: 'diemtran@kpi.com' },
      { id: 'anlt', name: 'Lê Trọng An (anlt)', role: 'Developer / Người đăng kí', email: 'anlt@kpi.com' },
      { id: 'khoadang', name: 'Đặng Đình Khoa (khoadang)', role: 'Developer / Người đăng kí', email: 'khoadang@kpi.com' },
      { id: 'kyluong', name: 'Lương Đình Kỳ (kyluong)', role: 'Senior Developer / Reviewer / PIC', email: 'kyluong@kpi.com' },
      { id: 'tungha', name: 'Tung Ha (tungha)', role: 'Developer / PIC', email: 'tungha@kpi.com' },
      { id: 'ducnguyen', name: 'Duc Nguyen (ducnguyen)', role: 'Developer / PIC', email: 'ducnguyen@kpi.com' },
      { id: 'hyle', name: 'Hy Le (hyle)', role: 'Developer / PIC', email: 'hyle@kpi.com' },
      { id: 'ngocnb', name: 'Ngoc Nguyen Ba (ngocnb)', role: 'Developer / PIC', email: 'ngocnb@kpi.com' },
      { id: 'phuocnt', name: 'Phuoc Nguyen Thanh (phuocnt)', role: 'Developer / PIC', email: 'phuocnt@kpi.com' },
      { id: 'thangng', name: 'Thang Nguyen (thangng)', role: 'Developer / PIC', email: 'thangng@kpi.com' },
      { id: 'trangluong', name: 'Trang Luong (trangluong)', role: 'Developer / PIC', email: 'trangluong@kpi.com' },
      { id: 'triettran', name: 'Triet Tran (triettran)', role: 'Developer / PIC', email: 'triettran@kpi.com' },
      { id: 'trungtm', name: 'Trung Tran Minh (trungtm)', role: 'Developer / PIC', email: 'trungtm@kpi.com' },
    ];

    const memberMap = new Map<string, { id: string; name: string; role: string; email?: string }>();
    priorityMembers.forEach((m) => memberMap.set(m.id.toLowerCase(), m));

    try {
      // 1. Fetch live Blueprint directory from UI_PIM_001
      const creds = await this.getBlueprintConfig();
      if (creds && creds.username && creds.password) {
        const collector = new BlueprintCollector(creds);
        const bpMembers = await collector.fetchMembers();
        if (Array.isArray(bpMembers) && bpMembers.length > 0) {
          bpMembers.forEach((u) => {
            const lowerId = u.id.toLowerCase();
            if (!memberMap.has(lowerId)) {
              memberMap.set(lowerId, {
                id: u.id,
                name: `${u.name} (${u.id})`,
                role: 'Allegro NX Member',
                email: `${u.id}@cyberlogitec.com.vn`,
              });
            }
          });
        }
      }
    } catch {
      // Keep priority members if network or login fails
    }

    const result = Array.from(memberMap.values());
    this.bpMembersCache = result;
    this.bpMembersCacheTime = now;
    return result;
  }

  // ──────────────────────────── Collector Jobs ────────────────────────────

  async listJobs(): Promise<CollectorJob[]> {
    const res = await this.pool.query(
      `SELECT cj.*, ds.name as source_name, ds.source_type
       FROM collector_job cj
       LEFT JOIN collector_data_source ds ON cj.source_id = ds.id
       ORDER BY cj.created_at DESC`
    );
    return res.rows;
  }

  async getJobById(id: string): Promise<CollectorJob | null> {
    const res = await this.pool.query(
      `SELECT * FROM collector_job WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async createJob(data: {
    name: string;
    source_id: string;
    evaluation_cycle_id?: string | null;
    target_criterion_code?: string;
    cron_expression?: string | null;
    params?: Record<string, any>;
  }): Promise<CollectorJob> {
    const res = await this.pool.query(
      `INSERT INTO collector_job (
        name, source_id, evaluation_cycle_id, target_criterion_code, cron_expression, params, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [
        data.name,
        data.source_id,
        data.evaluation_cycle_id || null,
        data.target_criterion_code || 'ATTITUDE_COMPANY_CULTURE',
        data.cron_expression || '*/30 * * * *',
        JSON.stringify(data.params || {}),
      ]
    );
    return res.rows[0];
  }

  async updateJob(
    id: string,
    data: Partial<Pick<CollectorJob, 'name' | 'evaluation_cycle_id' | 'target_criterion_code' | 'cron_expression' | 'params' | 'is_active'>>
  ): Promise<CollectorJob> {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.evaluation_cycle_id !== undefined) {
      updates.push(`evaluation_cycle_id = $${idx++}`);
      values.push(data.evaluation_cycle_id);
    }
    if (data.target_criterion_code !== undefined) {
      updates.push(`target_criterion_code = $${idx++}`);
      values.push(data.target_criterion_code);
    }
    if (data.cron_expression !== undefined) {
      updates.push(`cron_expression = $${idx++}`);
      values.push(data.cron_expression);
    }
    if (data.params !== undefined) {
      updates.push(`params = $${idx++}`);
      values.push(JSON.stringify(data.params));
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(data.is_active);
    }
    updates.push(`updated_at = NOW()`);

    values.push(id);
    const res = await this.pool.query(
      `UPDATE collector_job
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );
    return res.rows[0];
  }

  async deleteJob(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM collector_job WHERE id = $1`, [id]);
  }

  // ──────────────────────────── Execute Job ────────────────────────────

  async runJob(jobId: string): Promise<{ success: boolean; log: CollectorRunLog; summary?: any }> {
    const job = await this.getJobById(jobId);
    if (!job) throw new Error('Job not found');

    const ds = await this.getDataSourceById(job.source_id);
    if (!ds) throw new Error('Data Source not found');

    // Create initial run log
    const logRes = await this.pool.query(
      `INSERT INTO collector_run_log (job_id, started_at, status, records_count)
       VALUES ($1, NOW(), 'RUNNING', 0)
       RETURNING *`,
      [jobId]
    );
    const logId = logRes.rows[0].id;

    try {
      if (ds.source_type === 'BLUEPRINT') {
        const creds = ds.auth_config as BlueprintCredentials;
        const collector = new BlueprintCollector(creds);
        let recordsCount = 0;
        let summaryResult: any = null;

        let cycleId = job.evaluation_cycle_id;
        if (!cycleId) {
          const cycleRes = await this.pool.query(
            `SELECT evaluation_cycle_id FROM evaluation_cycle ORDER BY created_at DESC LIMIT 1`
          );
          if (cycleRes.rows.length > 0) {
            cycleId = cycleRes.rows[0].evaluation_cycle_id;
          }
        }

        if (job.target_criterion_code === 'ON_TIME_COMPLETION') {
          const projectFilter = job.params?.project_filter || 'ALLEGRO';
          const tasksSummary = await collector.fetchTasks(projectFilter);
          summaryResult = tasksSummary;

          if (cycleId) {
            const syncRes = await this.applyBlueprintTasksToCycle(
              cycleId,
              job.target_criterion_code,
              tasksSummary,
              job.params?.target_employee_id
            );
            recordsCount = tasksSummary.totalTasks || syncRes.updated;
          } else {
            recordsCount = tasksSummary.totalTasks || 0;
          }
        } else if (job.target_criterion_code === 'LEAVE_DISCIPLINE' || job.params?.module === 'VACATION') {
          const year = job.params?.year || '2026';
          const targetMember = job.params?.member || creds.username;
          const vacationSummary = await collector.fetchVacationProfile(year, targetMember);
          summaryResult = vacationSummary;

          if (cycleId) {
            const syncRes = await this.applyBlueprintVacationToCycle(
              cycleId,
              job.target_criterion_code || 'ATTITUDE_COMPANY_CULTURE',
              vacationSummary,
              job.params?.target_employee_id,
              targetMember
            );
            recordsCount = (vacationSummary.vacationDetails?.length || 0) + (vacationSummary.deductions?.length || 0) || syncRes.updated;
          } else {
            recordsCount = (vacationSummary.vacationDetails?.length || 0) + (vacationSummary.deductions?.length || 0);
          }
        } else {
          const month = job.params?.month || '2026-09';
          const attendanceSummary = await collector.fetchAttendance(month);
          summaryResult = attendanceSummary;

          if (cycleId) {
            const syncRes = await this.applyBlueprintAttendanceToCycle(
              cycleId,
              job.target_criterion_code || 'ATTITUDE_COMPANY_CULTURE',
              attendanceSummary,
              job.params?.target_employee_id
            );
            recordsCount = attendanceSummary.totalDays || syncRes.updated;
          } else {
            recordsCount = attendanceSummary.totalDays || 0;
          }
        }

        // Update run log
        const updatedLog = await this.pool.query(
          `UPDATE collector_run_log
           SET status = 'SUCCESS',
               finished_at = NOW(),
               records_count = $1,
               summary = $2
           WHERE id = $3
           RETURNING *`,
          [recordsCount, JSON.stringify(summaryResult), logId]
        );

        // Update job last run
        await this.pool.query(
          `UPDATE collector_job
           SET last_run_at = NOW(), last_status = 'SUCCESS'
           WHERE id = $1`,
          [jobId]
        );

        return { success: true, log: updatedLog.rows[0], summary: summaryResult };
      } else {
        throw new Error(`Source type ${ds.source_type} is not yet implemented`);
      }
    } catch (err: any) {
      const failedLog = await this.pool.query(
        `UPDATE collector_run_log
         SET status = 'FAILED',
             finished_at = NOW(),
             error_message = $1
         WHERE id = $2
         RETURNING *`,
        [err.message || 'Unknown error', logId]
      );

      await this.pool.query(
        `UPDATE collector_job
         SET last_run_at = NOW(), last_status = 'FAILED'
         WHERE id = $1`,
        [jobId]
      );

      return { success: false, log: failedLog.rows[0] };
    }
  }

  /**
   * Updates measurement_value and 10-point scale score for Attitude & Company Culture KPI (#18)
   */
  public async applyBlueprintAttendanceToCycle(
    cycleId: string,
    targetCriterionCode: string,
    summary: BlueprintAttendanceSummary,
    explicitEmployeeId?: string
  ): Promise<{ updated: number; score10: number; grade: string; weightedScore: number; comment: string }> {
    let employeeId = explicitEmployeeId;

    if (!employeeId) {
      // Look up employee by username matching email or name or code
      const empRes = await this.pool.query(
        `SELECT e.employee_id
         FROM employee e
         LEFT JOIN app_user u ON u.employee_id = e.employee_id
         WHERE e.email ILIKE $1
            OR e.employee_code ILIKE $1
            OR u.email ILIKE $1
            OR e.full_name ILIKE $1
         LIMIT 1`,
        [`%${summary.username}%`]
      );

      if (empRes.rows.length > 0) {
        employeeId = empRes.rows[0].employee_id;
      } else {
        const fallbackRes = await this.pool.query(
          `SELECT employee_id FROM evaluation WHERE evaluation_cycle_id = $1 LIMIT 1`,
          [cycleId]
        );
        if (fallbackRes.rows.length > 0) {
          employeeId = fallbackRes.rows[0].employee_id;
        }
      }
    }

    if (!employeeId) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Employee not found' };
    }

    // Find active evaluation for employee in this cycle
    const evalRes = await this.pool.query(
      `SELECT evaluation_id FROM evaluation WHERE evaluation_cycle_id = $1 AND employee_id = $2`,
      [cycleId, employeeId]
    );

    if (evalRes.rows.length === 0) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Evaluation not found' };
    }
    const evaluationId = evalRes.rows[0].evaluation_id;

    // Find evaluation item by targetCriterionCode
    let itemRes = await this.pool.query(
      `SELECT evaluation_item_id, weight_snapshot
       FROM evaluation_item
       WHERE evaluation_id = $1 AND (criterion_code_snapshot ILIKE $2 OR kpi_code_snapshot ILIKE $2)
       LIMIT 1`,
      [evaluationId, `%${targetCriterionCode}%`]
    );

    if (itemRes.rows.length === 0) {
      itemRes = await this.pool.query(
        `SELECT evaluation_item_id, weight_snapshot
         FROM evaluation_item
         WHERE evaluation_id = $1 AND (criterion_code_snapshot ILIKE '%ATTITUDE%' OR kpi_code_snapshot ILIKE '%ATTITUDE%')
         LIMIT 1`,
        [evaluationId]
      );
    }

    if (itemRes.rows.length === 0) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Evaluation item not found' };
    }

    const item = itemRes.rows[0];
    const weight = Number(item.weight_snapshot) || 0.04;
    const rate = Number(summary.punctualityRate) || 0;

    // Quy tắc tính kết quả theo thang điểm 10 (Rubric quy tắc đính kèm):
    // 10: Hoàn thành xuất sắc (100% đúng giờ, vượt tiêu chí KPI đề ra) -> S
    // 8: Hoàn thành (KPI bình thường: 90% - 99%) -> A
    // <7: Không hoàn thành (<90%): 80-89% = 6 -> B; 70-79% = 5 -> C; <70% = 3 -> D
    let score10: number;
    let grade: 'S' | 'A' | 'B' | 'C' | 'D';
    let assessmentText: string;

    if (rate >= 100) {
      score10 = 10;
      grade = 'S';
      assessmentText = `Chuyên cần & tuân thủ văn hóa công ty tuyệt đối 100% (${summary.onTimeDays}/${summary.businessDays - summary.leaveDays} ngày đúng giờ, 0 ngày trễ). Đạt danh hiệu Hoàn thành xuất sắc vượt tiêu chí KPI.`;
    } else if (rate >= 90) {
      score10 = 8;
      grade = 'A';
      assessmentText = `Tuân thủ văn hóa công ty tốt đạt ${rate}% (${summary.onTimeDays}/${summary.businessDays - summary.leaveDays} ngày đúng giờ, trễ ${summary.lateDays} ngày). Đạt chuẩn KPI bình thường.`;
    } else if (rate >= 80) {
      score10 = 6;
      grade = 'B';
      assessmentText = `Tỷ lệ tuân thủ ${rate}%, có ${summary.lateDays} ngày trễ. Cần cải thiện tính đúng giờ và kỷ luật làm việc.`;
    } else if (rate >= 70) {
      score10 = 5;
      grade = 'C';
      assessmentText = `Tỷ lệ tuân thủ ${rate}% (${summary.lateDays} ngày trễ). Chưa đạt yêu cầu văn hóa doanh nghiệp, cần chấn chỉnh kỷ luật.`;
    } else {
      score10 = 3;
      grade = 'D';
      assessmentText = `Tỷ lệ tuân thủ chỉ ${rate}%, trễ ${summary.lateDays} ngày. Vi phạm quy định giờ giấc làm việc.`;
    }

    const weightedScore = Math.round(score10 * weight * 100) / 100;
    const systemNote = `[Blueprint UI_TAT_028] ${assessmentText} (Đúng giờ: ${rate}%, Hạng ${grade})`;
    const suggestedLevel = score10 === 10 ? 5 : score10 >= 8 ? 4 : score10 >= 6 ? 3 : score10 >= 5 ? 2 : 1;

    await this.pool.query(
      `UPDATE evaluation_item
       SET raw_score = $1,
           normalized_score = $1,
           weighted_score = $2,
           system_note = $3,
           system_suggested_level = $4,
           system_suggested_score = $1,
           system_source = 'Blueprint UI_TAT_028',
           comment = CASE 
             WHEN comment IS NULL OR comment = '' OR comment LIKE '[Đánh giá tự động%' 
             THEN '' 
             ELSE comment 
           END,
           updated_at = NOW(),
           version = version + 1
       WHERE evaluation_item_id = $5`,
      [score10, weightedScore, systemNote, suggestedLevel, item.evaluation_item_id]
    );

    await this.pool.query(
      `INSERT INTO measurement (
         measurement_id, evaluation_item_id, measurement_key, measurement_value,
         measurement_unit, source_label, recorded_at
       ) VALUES (
         gen_random_uuid(), $1, 'punctuality_rate', $2, '%', 'Blueprint UI_TAT_028', NOW()
       )`,
      [item.evaluation_item_id, rate]
    );

    // Recalculate evaluation score
    await this.recalculateEvaluationTotal(evaluationId);

    return { updated: 1, score10, grade, weightedScore, comment: systemNote };
  }

  /**
   * Updates measurement_value and 10-point scale score from UI_TAT_029 (Daily Team Status Face)
   */
  public async applyBlueprintTeamAttendanceToCycle(
    cycleId: string,
    targetCriterionCode: string,
    summary: BlueprintTeamAttendanceSummary,
    explicitEmployeeId?: string,
    targetMember?: string
  ): Promise<{ updated: number; score10: number; grade: string; weightedScore: number; comment: string }> {
    let employeeId = explicitEmployeeId;

    if (!employeeId) {
      const searchKey = targetMember || 'khoa';
      const empRes = await this.pool.query(
        `SELECT e.employee_id
         FROM employee e
         LEFT JOIN app_user u ON u.employee_id = e.employee_id
         WHERE e.email ILIKE $1
            OR e.employee_code ILIKE $1
            OR u.email ILIKE $1
            OR e.full_name ILIKE $1
         LIMIT 1`,
        [`%${searchKey}%`]
      );
      if (empRes.rows.length > 0) {
        employeeId = empRes.rows[0].employee_id;
      } else {
        const fallbackRes = await this.pool.query(
          `SELECT employee_id FROM evaluation WHERE evaluation_cycle_id = $1 LIMIT 1`,
          [cycleId]
        );
        if (fallbackRes.rows.length > 0) {
          employeeId = fallbackRes.rows[0].employee_id;
        }
      }
    }

    if (!employeeId) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Employee not found' };
    }

    const evalRes = await this.pool.query(
      `SELECT evaluation_id FROM evaluation WHERE evaluation_cycle_id = $1 AND employee_id = $2`,
      [cycleId, employeeId]
    );

    if (evalRes.rows.length === 0) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Evaluation not found' };
    }
    const evaluationId = evalRes.rows[0].evaluation_id;

    // Find evaluation item for ATTITUDE_COMPANY_CULTURE
    let itemRes = await this.pool.query(
      `SELECT evaluation_item_id, weight_snapshot
       FROM evaluation_item
       WHERE evaluation_id = $1 AND (criterion_code_snapshot ILIKE $2 OR kpi_code_snapshot ILIKE $2)
       LIMIT 1`,
      [evaluationId, `%${targetCriterionCode}%`]
    );

    if (itemRes.rows.length === 0) {
      itemRes = await this.pool.query(
        `SELECT evaluation_item_id, weight_snapshot
         FROM evaluation_item
         WHERE evaluation_id = $1 AND (criterion_code_snapshot ILIKE '%ATTITUDE%' OR kpi_code_snapshot ILIKE '%ATTITUDE%')
         LIMIT 1`,
        [evaluationId]
      );
    }

    if (itemRes.rows.length === 0) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Evaluation item not found' };
    }

    const item = itemRes.rows[0];
    const weight = Number(item.weight_snapshot) || 0.04;
    const rate = Number(summary.punctualityRate) || 0;
    const score10 = summary.score10;
    const grade = summary.grade;
    const weightedScore = Math.round(score10 * weight * 100) / 100;

    let assessmentText = '';
    if (rate >= 100) {
      assessmentText = `Team ${summary.teamName} điểm danh đúng giờ tuyệt đối 100% (${summary.onTimeMembers}/${summary.totalMembers} người đúng giờ). Đạt danh hiệu Hoàn thành xuất sắc vượt tiêu chí.`;
    } else if (rate >= 90) {
      assessmentText = `Team ${summary.teamName} tuân thủ tốt đạt ${rate}% (${summary.onTimeMembers}/${summary.totalMembers} đúng giờ, ${summary.lateMembers} người đi muộn). Đạt chuẩn văn hóa doanh nghiệp.`;
    } else if (rate >= 80) {
      assessmentText = `Team ${summary.teamName} tỷ lệ đúng giờ ${rate}%, có ${summary.lateMembers} người đi muộn. Cần cải thiện tính đúng giờ của nhóm.`;
    } else {
      assessmentText = `Team ${summary.teamName} tỷ lệ đúng giờ chỉ đạt ${rate}%, có ${summary.lateMembers} người đi muộn. Cần chấn chỉnh kỷ luật nhóm.`;
    }

    const systemNote = `[Blueprint UI_TAT_029] ${assessmentText} (Đúng giờ: ${rate}%, Hạng ${grade})`;
    const suggestedLevel = summary.suggestedLevel;

    await this.pool.query(
      `UPDATE evaluation_item
       SET raw_score = $1,
           normalized_score = $1,
           weighted_score = $2,
           system_note = $3,
           system_suggested_level = $4,
           system_suggested_score = $1,
           system_source = 'Blueprint UI_TAT_029',
           comment = CASE 
             WHEN comment IS NULL OR comment = '' OR comment LIKE '[Đánh giá tự động%' 
             THEN '' 
             ELSE comment 
           END,
           updated_at = NOW(),
           version = version + 1
       WHERE evaluation_item_id = $5`,
      [score10, weightedScore, systemNote, suggestedLevel, item.evaluation_item_id]
    );

    await this.pool.query(
      `INSERT INTO measurement (
         measurement_id, evaluation_item_id, measurement_key, measurement_value,
         measurement_unit, source_label, recorded_at
       ) VALUES (
         gen_random_uuid(), $1, 'team_punctuality_rate', $2, '%', 'Blueprint UI_TAT_029', NOW()
       )`,
      [item.evaluation_item_id, rate]
    );

    await this.recalculateEvaluationTotal(evaluationId);

    return { updated: 1, score10, grade, weightedScore, comment: systemNote };
  }

  /**
   * Updates measurement_value and 10-point scale score for On-time Completion KPI (#1)
   */
  public async applyBlueprintTasksToCycle(
    cycleId: string,
    targetCriterionCode: string,
    tasksSummary: any,
    explicitEmployeeId?: string,
    targetMember?: string
  ): Promise<{ updated: number; score10: number; grade: string; weightedScore: number; comment: string }> {
    let employeeId = explicitEmployeeId;

    if (!employeeId) {
      const searchKey = targetMember || 'khoa';
      const empRes = await this.pool.query(
        `SELECT e.employee_id
         FROM employee e
         LEFT JOIN app_user u ON u.employee_id = e.employee_id
         WHERE e.email ILIKE $1
            OR e.employee_code ILIKE $1
            OR u.email ILIKE $1
            OR e.full_name ILIKE $1
         LIMIT 1`,
        [`%${searchKey}%`]
      );
      if (empRes.rows.length > 0) {
        employeeId = empRes.rows[0].employee_id;
      } else {
        const fallbackRes = await this.pool.query(
          `SELECT employee_id FROM evaluation WHERE evaluation_cycle_id = $1 LIMIT 1`,
          [cycleId]
        );
        if (fallbackRes.rows.length > 0) {
          employeeId = fallbackRes.rows[0].employee_id;
        }
      }
    }

    if (!employeeId) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Employee not found' };
    }

    const evalRes = await this.pool.query(
      `SELECT evaluation_id FROM evaluation WHERE evaluation_cycle_id = $1 AND employee_id = $2`,
      [cycleId, employeeId]
    );

    if (evalRes.rows.length === 0) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Evaluation not found' };
    }
    const evaluationId = evalRes.rows[0].evaluation_id;

    // Find evaluation item for ON_TIME_COMPLETION
    let itemRes = await this.pool.query(
      `SELECT evaluation_item_id, weight_snapshot
       FROM evaluation_item
       WHERE evaluation_id = $1 AND (criterion_code_snapshot ILIKE $2 OR kpi_code_snapshot ILIKE $2)
       LIMIT 1`,
      [evaluationId, `%${targetCriterionCode}%`]
    );

    if (itemRes.rows.length === 0) {
      itemRes = await this.pool.query(
        `SELECT evaluation_item_id, weight_snapshot
         FROM evaluation_item
         WHERE evaluation_id = $1 AND (criterion_code_snapshot ILIKE '%ON_TIME%' OR kpi_code_snapshot ILIKE '%ON_TIME%')
         LIMIT 1`,
        [evaluationId]
      );
    }

    if (itemRes.rows.length === 0) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Criterion item not found' };
    }

    const item = itemRes.rows[0];
    const weight = Number(item.weight_snapshot) || 0.10;
    const rate = Number(tasksSummary.onTimeRate) || 0;

    // KPI #1 là KPI CỐT LÕI (Core KPI ★, rất quan trọng):
    // 10: Hoàn thành xuất sắc (100% đúng hạn) -> S
    // 9: Hoàn thành (KPI cốt lõi, rất quan trọng: >= 90%) -> A
    // <7: Không hoàn thành (<90%): 80-89% = 6 -> B; 70-79% = 5 -> C; <70% = 3 -> D
    let score10: number;
    let grade: 'S' | 'A' | 'B' | 'C' | 'D';
    let assessmentText: string;

    if (rate >= 100) {
      score10 = 10;
      grade = 'S';
      assessmentText = `100% task hoàn thành đúng hạn (${tasksSummary.onTimeTasks}/${tasksSummary.totalTasks} task, 0 task trễ). Hoàn thành vượt tiến độ xuất sắc.`;
    } else if (rate >= 90) {
      score10 = 9;
      grade = 'A';
      assessmentText = `Tiến độ task đạt ${rate}% (${tasksSummary.onTimeTasks}/${tasksSummary.totalTasks} task đúng hạn, trễ ${tasksSummary.delayedTasks} task). Đạt chuẩn KPI cốt lõi rất quan trọng.`;
    } else if (rate >= 80) {
      score10 = 6;
      grade = 'B';
      assessmentText = `Tiến độ task đạt ${rate}%, có ${tasksSummary.delayedTasks} task trễ hạn. Cần cải thiện việc bám sát tiến độ cam kết.`;
    } else if (rate >= 70) {
      score10 = 5;
      grade = 'C';
      assessmentText = `Tiến độ task đạt ${rate}%, ${tasksSummary.delayedTasks} task trễ hạn. Chưa đạt yêu cầu hoàn thành đúng hạn.`;
    } else {
      score10 = 3;
      grade = 'D';
      assessmentText = `Tiến độ task chỉ đạt ${rate}%, trễ ${tasksSummary.delayedTasks}/${tasksSummary.totalTasks} task. Cần lập kế hoạch khắc phục tiến độ ngay.`;
    }

    const weightedScore = Math.round(score10 * weight * 100) / 100;
    const systemNote = `[Blueprint UI_PIM_001] ${assessmentText} (Đúng hạn: ${rate}%, Hạng ${grade})`;
    const suggestedLevel = score10 === 10 ? 5 : score10 >= 8 ? 4 : score10 >= 6 ? 3 : score10 >= 5 ? 2 : 1;

    await this.pool.query(
      `UPDATE evaluation_item
       SET raw_score = $1,
           normalized_score = $1,
           weighted_score = $2,
           system_note = $3,
           system_suggested_level = $4,
           system_suggested_score = $1,
           system_source = 'Blueprint UI_PIM_001',
           comment = CASE 
             WHEN comment IS NULL OR comment = '' OR comment LIKE '[Đánh giá tự động%' 
             THEN '' 
             ELSE comment 
           END,
           updated_at = NOW(),
           version = version + 1
       WHERE evaluation_item_id = $5`,
      [score10, weightedScore, systemNote, suggestedLevel, item.evaluation_item_id]
    );

    await this.pool.query(
      `INSERT INTO measurement (
         measurement_id, evaluation_item_id, measurement_key, measurement_value,
         measurement_unit, source_label, recorded_at
       ) VALUES (
         gen_random_uuid(), $1, 'on_time_task_rate', $2, '%', 'Blueprint UI_PIM_001', NOW()
       )`,
      [item.evaluation_item_id, rate]
    );

    // Recalculate evaluation totals
    await this.recalculateEvaluationTotal(evaluationId);

    return { updated: 1, score10, grade, weightedScore, comment: systemNote };
  }

  /**
   * Updates measurement_value and 10-point scale score for Attitude & Leave Discipline KPI
   */
  public async applyBlueprintVacationToCycle(
    cycleId: string,
    targetCriterionCode: string,
    vacationSummary: BlueprintVacationSummary,
    explicitEmployeeId?: string,
    targetMember?: string
  ): Promise<{ updated: number; score10: number; grade: string; weightedScore: number; comment: string }> {
    let employeeId = explicitEmployeeId;

    if (!employeeId) {
      const searchKey = targetMember || 'khoa';
      const empRes = await this.pool.query(
        `SELECT e.employee_id
         FROM employee e
         LEFT JOIN app_user u ON u.employee_id = e.employee_id
         WHERE e.email ILIKE $1
            OR e.employee_code ILIKE $1
            OR u.email ILIKE $1
            OR e.full_name ILIKE $1
         LIMIT 1`,
        [`%${searchKey}%`]
      );
      if (empRes.rows.length > 0) {
        employeeId = empRes.rows[0].employee_id;
      } else {
        const fallbackRes = await this.pool.query(
          `SELECT employee_id FROM evaluation WHERE evaluation_cycle_id = $1 LIMIT 1`,
          [cycleId]
        );
        if (fallbackRes.rows.length > 0) {
          employeeId = fallbackRes.rows[0].employee_id;
        }
      }
    }

    if (!employeeId) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Employee not found' };
    }

    const evalRes = await this.pool.query(
      `SELECT evaluation_id FROM evaluation WHERE evaluation_cycle_id = $1 AND employee_id = $2`,
      [cycleId, employeeId]
    );

    if (evalRes.rows.length === 0) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Evaluation not found' };
    }
    const evaluationId = evalRes.rows[0].evaluation_id;

    // Find evaluation item for ATTITUDE_COMPANY_CULTURE or LEAVE_DISCIPLINE
    let itemRes = await this.pool.query(
      `SELECT evaluation_item_id, weight_snapshot
       FROM evaluation_item
       WHERE evaluation_id = $1 AND (criterion_code_snapshot ILIKE $2 OR kpi_code_snapshot ILIKE $2)
       LIMIT 1`,
      [evaluationId, `%${targetCriterionCode}%`]
    );

    if (itemRes.rows.length === 0) {
      itemRes = await this.pool.query(
        `SELECT evaluation_item_id, weight_snapshot
         FROM evaluation_item
         WHERE evaluation_id = $1 AND (
           criterion_code_snapshot ILIKE '%ATTITUDE%' OR 
           kpi_code_snapshot ILIKE '%ATTITUDE%' OR
           criterion_code_snapshot ILIKE '%DISCIPLINE%'
         )
         LIMIT 1`,
        [evaluationId]
      );
    }

    if (itemRes.rows.length === 0) {
      return { updated: 0, score10: 0, grade: 'N/A', weightedScore: 0, comment: 'Criterion item not found' };
    }

    const item = itemRes.rows[0];
    const weight = Number(item.weight_snapshot) || 0.04;
    const score10 = vacationSummary.score10;
    const grade = vacationSummary.grade;
    const weightedScore = Math.round(score10 * weight * 100) / 100;

    let assessmentText = '';
    const violations = vacationSummary.absentWithoutPayDays + vacationSummary.lateInEarlyOutCount;
    if (violations === 0) {
      assessmentText = `Tuân thủ kỷ luật lao động và nội quy công ty tuyệt đối (0 ngày nghỉ không phép, 0 lần đi muộn/về sớm). Phép năm đã dùng: ${vacationSummary.annualVacationDays} ngày. Đạt loại S xuất sắc.`;
    } else if (violations === 1) {
      assessmentText = `Tuân thủ tốt nội quy lao động (${vacationSummary.absentWithoutPayDays} ngày không phép, ${vacationSummary.lateInEarlyOutCount} lần đi muộn/về sớm). Phép năm: ${vacationSummary.annualVacationDays} ngày. Đạt chuẩn loại A.`;
    } else if (violations === 2) {
      assessmentText = `Ghi nhận ${violations} lần vi phạm kỷ luật (${vacationSummary.absentWithoutPayDays} ngày không lương, ${vacationSummary.lateInEarlyOutCount} lần đi muộn/về sớm). Phép năm: ${vacationSummary.annualVacationDays} ngày. Hạng B.`;
    } else {
      assessmentText = `Ghi nhận ${violations} lần vi phạm kỷ luật nội quy (${vacationSummary.absentWithoutPayDays} ngày không lương, ${vacationSummary.lateInEarlyOutCount} lần đi muộn/về sớm). Cần chấn chỉnh kỷ luật nghiêm túc.`;
    }

    const systemNote = `[Blueprint UI_TAT_011] ${assessmentText} (Điểm kỷ luật: ${score10}/10, Hạng ${grade})`;
    const suggestedLevel = vacationSummary.suggestedLevel;

    await this.pool.query(
      `UPDATE evaluation_item
       SET raw_score = $1,
           normalized_score = $1,
           weighted_score = $2,
           system_note = $3,
           system_suggested_level = $4,
           system_suggested_score = $1,
           system_source = 'Blueprint UI_TAT_011',
           comment = CASE 
             WHEN comment IS NULL OR comment = '' OR comment LIKE '[Đánh giá tự động%' 
             THEN '' 
             ELSE comment 
           END,
           updated_at = NOW(),
           version = version + 1
       WHERE evaluation_item_id = $5`,
      [score10, weightedScore, systemNote, suggestedLevel, item.evaluation_item_id]
    );

    await this.pool.query(
      `INSERT INTO measurement (
         measurement_id, evaluation_item_id, measurement_key, measurement_value,
         measurement_unit, source_label, recorded_at
       ) VALUES (
         gen_random_uuid(), $1, 'absent_without_pay_days', $2, 'ngày', 'Blueprint UI_TAT_011', NOW()
       )`,
      [item.evaluation_item_id, vacationSummary.absentWithoutPayDays]
    );

    await this.pool.query(
      `INSERT INTO measurement (
         measurement_id, evaluation_item_id, measurement_key, measurement_value,
         measurement_unit, source_label, recorded_at
       ) VALUES (
         gen_random_uuid(), $1, 'late_in_early_out_count', $2, 'lần', 'Blueprint UI_TAT_011', NOW()
       )`,
      [item.evaluation_item_id, vacationSummary.lateInEarlyOutCount]
    );

    await this.pool.query(
      `INSERT INTO measurement (
         measurement_id, evaluation_item_id, measurement_key, measurement_value,
         measurement_unit, source_label, recorded_at
       ) VALUES (
         gen_random_uuid(), $1, 'discipline_score', $2, '/10', 'Blueprint UI_TAT_011', NOW()
       )`,
      [item.evaluation_item_id, score10]
    );

    // Recalculate evaluation totals
    await this.recalculateEvaluationTotal(evaluationId);

    return { updated: 1, score10, grade, weightedScore, comment: systemNote };
  }

  private async recalculateEvaluationTotal(evaluationId: string): Promise<void> {
    const sumRes = await this.pool.query(
      `SELECT COALESCE(SUM(weighted_score), 0) as total_weighted
       FROM evaluation_item
       WHERE evaluation_id = $1`,
      [evaluationId]
    );
    const totalScore = Number(sumRes.rows[0]?.total_weighted) || 0;
    await this.pool.query(
      `UPDATE evaluation
       SET final_score = $1,
           manager_score = $1,
           updated_at = NOW()
       WHERE evaluation_id = $2`,
      [totalScore, evaluationId]
    );
  }

  // ──────────────────────────── Logs ────────────────────────────

  async listRunLogs(limit: number = 30): Promise<CollectorRunLog[]> {
    const res = await this.pool.query(
      `SELECT rl.*, cj.name as job_name, ds.name as source_name, ds.source_type
       FROM collector_run_log rl
       JOIN collector_job cj ON rl.job_id = cj.id
       JOIN collector_data_source ds ON cj.source_id = ds.id
       ORDER BY rl.started_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
}
