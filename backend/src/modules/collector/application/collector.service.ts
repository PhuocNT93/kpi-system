import { Pool } from 'pg';
import {
  CollectorDataSource,
  CollectorJob,
  CollectorRunLog,
  BlueprintAttendanceSummary,
  BlueprintTaskSummary,
  BlueprintTaskRecord,
  BlueprintVacationSummary,
  BlueprintTeamAttendanceSummary,
  BlueprintTeamMemberAttendance,
  BlueprintOrgTeam,
  CollectorMonthlySnapshot,
} from '../domain/collector.types.js';
import { BlueprintCollector, BlueprintCredentials } from '../plugins/blueprint.collector.js';

export interface BlueprintSavedConfig {
  id?: string;
  name?: string;
  username: string;
  password?: string;
  baseUrl?: string;
  month?: string;
  projectFilter?: string;
  [key: string]: unknown;
}

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
    auth_config: Record<string, unknown>;
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
    const values: unknown[] = [];
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
        creds = ds.auth_config as unknown as BlueprintCredentials;
      } else {
        const saved = await this.getBlueprintConfig();
        if (saved && saved.username && saved.password) {
          creds = { username: saved.username, password: saved.password, baseUrl: saved.baseUrl };
        } else {
          throw new Error('No credentials provided');
        }
      }


      const collector = BlueprintCollector.getInstance(creds);
      await collector.login();
      return { success: true, message: `Successfully connected & authenticated as '${creds.username}'` };
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message || 'Connection failed' };
    }
  }

  // ──────────────────────────── Monthly Snapshot Caching & Helper Methods ────────────────────────────

  getMonthsBetween(fromDate?: string, toDate?: string): string[] {
    const parseYearMonth = (dStr?: string): { year: number; month: number } | null => {
      if (!dStr) return null;
      const s = String(dStr).trim();
      if (/^\d{4}-\d{2}/.test(s)) {
        const parts = s.split('-');
        const yStr = parts[0];
        const mStr = parts[1];
        if (yStr && mStr) {
          return { year: parseInt(yStr, 10), month: parseInt(mStr, 10) };
        }
      }
      if (s.includes('/')) {
        const parts = s.split('/');
        const p0 = parts[0];
        const p2 = parts[2];
        if (parts.length === 3 && p2 && p2.length === 4 && p0) {
          const m = parseInt(p0, 10);
          const y = parseInt(p2, 10);
          return { year: y, month: m };
        }
      }
      const monthMap: Record<string, number> = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
      };
      if (s.includes('-')) {
        const parts = s.split('-');
        const p0 = parts[0];
        const p2 = parts[2];
        if (parts.length === 3 && p2 && p2.length === 4 && p0) {
          const m = monthMap[p0.toLowerCase()] || parseInt(p0, 10);
          const y = parseInt(p2, 10);
          if (m >= 1 && m <= 12) return { year: y, month: m };
        }
      }
      return null;
    };

    const start = parseYearMonth(fromDate) || { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
    const end = parseYearMonth(toDate) || start;

    const months: string[] = [];
    let curY = start.year;
    let curM = start.month;

    while (curY < end.year || (curY === end.year && curM <= end.month)) {
      months.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    return months.length > 0 ? months : [`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`];
  }

  normalizeToYearMonth(dateStr?: string | null): string {
    if (!dateStr) return '';
    const clean = String(dateStr).trim();
    if (/^\d{4}-\d{2}/.test(clean)) return clean.slice(0, 7);
    if (/^\d{8}$/.test(clean)) return `${clean.slice(0, 4)}-${clean.slice(4, 6)}`;
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const partsDash = clean.split('-');
    const pd0 = partsDash[0];
    const pd2 = partsDash[2];
    if (partsDash.length === 3 && pd2 && pd2.length === 4 && pd0) {
      const m = monthMap[pd0.toLowerCase()] || pd0.padStart(2, '0');
      return `${pd2}-${m}`;
    }
    const partsSlash = clean.split('/');
    const ps0 = partsSlash[0];
    const ps2 = partsSlash[2];
    if (partsSlash.length === 3 && ps2 && ps2.length === 4 && ps0) {
      return `${ps2}-${ps0.padStart(2, '0')}`;
    }
    return '';
  }

  async getMonthlySnapshots(
    sourceType: 'ATTENDANCE' | 'TASKS' | 'VACATION' | 'TEAM_ATTENDANCE',
    targetMember: string,
    yearMonths: string[]
  ): Promise<CollectorMonthlySnapshot[]> {
    if (yearMonths.length === 0) return [];
    const res = await this.pool.query(
      `SELECT * FROM collector_monthly_snapshot
       WHERE source_type = $1 AND target_member = $2 AND year_month = ANY($3::text[])
       ORDER BY year_month ASC`,
      [sourceType, targetMember, yearMonths]
    );
    return res.rows;
  }

  async saveMonthlySnapshot(snapshot: {
    sourceType: 'ATTENDANCE' | 'TASKS' | 'VACATION' | 'TEAM_ATTENDANCE';
    yearMonth: string;
    targetMember: string;
    teamId?: string | null;
    dataJson: Record<string, unknown>;
    score10?: number | null;
    totalRecords: number;
    isLocked: boolean;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO collector_monthly_snapshot
        (source_type, year_month, target_member, team_id, data_json, score10, total_records, is_locked, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (source_type, year_month, target_member)
       DO UPDATE SET
         team_id = EXCLUDED.team_id,
         data_json = EXCLUDED.data_json,
         score10 = EXCLUDED.score10,
         total_records = EXCLUDED.total_records,
         is_locked = EXCLUDED.is_locked,
         updated_at = NOW()`,
      [
        snapshot.sourceType,
        snapshot.yearMonth,
        snapshot.targetMember,
        snapshot.teamId || null,
        JSON.stringify(snapshot.dataJson),
        snapshot.score10 ?? null,
        snapshot.totalRecords,
        snapshot.isLocked,
      ]
    );
  }

  aggregateTeamAttendanceRecords(
    records: BlueprintTeamMemberAttendance[],
    teamId?: string,
    fromDate?: string,
    toDate?: string,
    employeeName?: string,
    teams: BlueprintOrgTeam[] = []
  ): BlueprintTeamAttendanceSummary {
    let finalRecords = records;
    let totalMembers = records.length;
    let attendedMembers = 0;
    let onTimeMembers = 0;
    let lateMembers = 0;
    let leaveMembers = 0;
    let absentMembers = 0;

    if (employeeName && employeeName !== 'ALL') {
      const q = employeeName.toLowerCase().trim();
      const matched = records.filter(
        (r) =>
          (r.usrId && r.usrId.toLowerCase() === q) ||
          r.empeNo.toLowerCase() === q ||
          r.empeName.toLowerCase().includes(q)
      );
      if (matched.length > 0) {
        finalRecords = matched;
        totalMembers = matched.length;
      }
    }

    for (const r of finalRecords) {
      if (r.status === 'LEAVE') {
        leaveMembers++;
      } else if (r.status === 'ON_TIME') {
        attendedMembers++;
        onTimeMembers++;
      } else if (r.status === 'LATE') {
        attendedMembers++;
        lateMembers++;
      } else if (r.status === 'ABSENT') {
        absentMembers++;
      }
    }

    const countableMembers =
      attendedMembers > 0
        ? attendedMembers
        : Math.max(1, totalMembers - leaveMembers);
    const punctualityRate =
      countableMembers > 0 ? Math.round((onTimeMembers / countableMembers) * 10000) / 100 : 100;

    let score10 = 3;
    let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'D';
    if (punctualityRate >= 100) {
      score10 = 10;
      grade = 'S';
    } else if (punctualityRate >= 90) {
      score10 = 8;
      grade = 'A';
    } else if (punctualityRate >= 80) {
      score10 = 6;
      grade = 'B';
    } else if (punctualityRate >= 70) {
      score10 = 5;
      grade = 'C';
    } else {
      score10 = 3;
      grade = 'D';
    }

    const suggestedLevel =
      score10 === 10 ? 5 : score10 >= 8 ? 4 : score10 >= 6 ? 3 : score10 >= 5 ? 2 : 1;

    return {
      teamId,
      teamName: teamId ? (teams.find((t) => t.orzId === teamId)?.orzNm || teamId) : 'Tất cả Team (ALLEGRO NX & Maritime)',
      fromDate: fromDate || '',
      toDate: toDate || '',
      totalMembers,
      attendedMembers,
      onTimeMembers,
      lateMembers,
      leaveMembers,
      absentMembers,
      punctualityRate,
      score10,
      grade,
      suggestedLevel,
      records: finalRecords,
      teams,
    };
  }

  aggregateTasks(
    tasks: BlueprintTaskRecord[],
    projectName: string = 'Allegro NX',
    member?: string,
    fromDate?: string,
    toDate?: string,
    filterRole?: string,
    dateType?: string
  ): BlueprintTaskSummary {
    let completedTasks = 0;
    let onTimeTasks = 0;
    let delayedTasks = 0;

    for (const t of tasks) {
      const sts = (t.status || '').toLowerCase();
      if (sts.includes('finish') || sts.includes('closed') || sts.includes('complete')) {
        completedTasks++;
      }
      if (t.isOnTime) {
        onTimeTasks++;
      } else {
        delayedTasks++;
      }
    }

    const totalCount = tasks.length;
    const onTimeRate = totalCount > 0 ? Math.round((onTimeTasks / totalCount) * 10000) / 100 : 0;

    let score10 = 3;
    let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'D';
    if (onTimeRate >= 100) {
      score10 = 10;
      grade = 'S';
    } else if (onTimeRate >= 90) {
      score10 = 9;
      grade = 'A';
    } else if (onTimeRate >= 80) {
      score10 = 6;
      grade = 'B';
    } else if (onTimeRate >= 70) {
      score10 = 5;
      grade = 'C';
    } else {
      score10 = 3;
      grade = 'D';
    }

    const suggestedLevel =
      score10 === 10 ? 5 : score10 >= 8 ? 4 : score10 >= 6 ? 3 : score10 >= 5 ? 2 : 1;
    const delayedTaskList = tasks.filter((t) => !t.isOnTime);

    return {
      projectName,
      totalTasks: totalCount,
      completedTasks,
      onTimeTasks,
      delayedTasks,
      onTimeRate,
      score10,
      grade,
      suggestedLevel,
      tasks,
      delayedTaskList,
      username: member,
      fromDate: fromDate || null,
      toDate: toDate || null,
      filterRole,
      dateType,
    };
  }

  // ──────────────────────────── Preview & Direct Sync ────────────────────────────

  async previewBlueprint(
    credentials: BlueprintCredentials,
    month: string = '2026-09',
    options?: { forceRefresh?: boolean }
  ): Promise<BlueprintAttendanceSummary & { cacheInfo?: { fromCache: boolean } }> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const targetMember = credentials.username;

    if (!options?.forceRefresh) {
      const snaps = await this.getMonthlySnapshots('ATTENDANCE', targetMember, [month]);
      const firstSnap = snaps[0];
      if (firstSnap && (firstSnap.is_locked || firstSnap.year_month < currentMonth)) {
        return {
          ...(firstSnap.data_json as unknown as BlueprintAttendanceSummary),
          cacheInfo: { fromCache: true },
        };
      }
    }

    const collector = BlueprintCollector.getInstance(credentials);
    const summary = await collector.fetchAttendance(month);

    const isLocked = month < currentMonth;
    await this.saveMonthlySnapshot({
      sourceType: 'ATTENDANCE',
      yearMonth: month,
      targetMember,
      dataJson: summary as unknown as Record<string, unknown>,
      score10: summary.punctualityRate >= 95 ? 10 : 7,
      totalRecords: summary.records?.length || 0,
      isLocked,
    }).catch((e) => console.warn('Failed to save attendance snapshot:', e));

    return {
      ...summary,
      cacheInfo: { fromCache: false },
    };
  }

  async previewBlueprintTeamAttendance(
    credentials: BlueprintCredentials,
    teamId?: string,
    fromDate?: string,
    toDate?: string,
    employeeName?: string,
    options?: { forceRefresh?: boolean }
  ): Promise<BlueprintTeamAttendanceSummary & { cacheInfo?: { cachedMonths: string[]; liveMonths: string[]; fromCache: boolean } }> {
    const cacheTarget = teamId && teamId !== 'ALL' ? teamId : 'ALL';
    const allMonths = this.getMonthsBetween(fromDate, toDate);
    const currentMonth = new Date().toISOString().slice(0, 7);

    let cachedSnapshots: CollectorMonthlySnapshot[] = [];
    if (!options?.forceRefresh) {
      cachedSnapshots = await this.getMonthlySnapshots('TEAM_ATTENDANCE', cacheTarget, allMonths);
    }

    const cachedMonthsMap = new Map<string, CollectorMonthlySnapshot>();
    for (const s of cachedSnapshots) {
      if (s.is_locked || s.year_month < currentMonth) {
        cachedMonthsMap.set(s.year_month, s);
      }
    }

    const cachedMonths = allMonths.filter((m) => cachedMonthsMap.has(m));
    const uncachedMonths = allMonths.filter((m) => !cachedMonthsMap.has(m));

    const collector = BlueprintCollector.getInstance(credentials);

    // If all months are cached and no force refresh requested, return purely from cache
    if (uncachedMonths.length === 0 && cachedMonths.length > 0) {
      const allRecords: BlueprintTeamMemberAttendance[] = [];
      for (const m of cachedMonths) {
        const snap = cachedMonthsMap.get(m)!;
        const recs = (snap.data_json?.records as BlueprintTeamMemberAttendance[]) || [];
        allRecords.push(...recs);
      }
      const teams = await this.getBlueprintTeams(credentials).catch(() => []);
      const summary = this.aggregateTeamAttendanceRecords(allRecords, teamId, fromDate, toDate, employeeName, teams);
      return {
        ...summary,
        cacheInfo: {
          cachedMonths,
          liveMonths: [],
          fromCache: true,
        },
      };
    }

    // Live query: If some past months are cached, query Blueprint only for the uncached period
    let liveRecords: BlueprintTeamMemberAttendance[] = [];
    let liveFetchedSummary: BlueprintTeamAttendanceSummary | null = null;

    if (cachedMonths.length > 0 && uncachedMonths.length > 0) {
      const firstUncached = uncachedMonths[0] || currentMonth;
      const lastUncached = uncachedMonths[uncachedMonths.length - 1] || firstUncached;
      const liveFrom = `${firstUncached}-01`;
      const lastDay = new Date(parseInt(lastUncached.slice(0, 4), 10), parseInt(lastUncached.slice(5, 7), 10), 0).getDate();
      const liveTo = `${lastUncached}-${String(lastDay).padStart(2, '0')}`;

      liveFetchedSummary = await collector.fetchTeamAttendance(teamId, liveFrom, toDate || liveTo, employeeName);
      liveRecords = liveFetchedSummary.records || [];
    } else {
      liveFetchedSummary = await collector.fetchTeamAttendance(teamId, fromDate, toDate, employeeName);
      liveRecords = liveFetchedSummary.records || [];
    }

    // Save/update snapshots for each month from the fetched records
    const recordsByMonth = new Map<string, BlueprintTeamMemberAttendance[]>();
    for (const r of liveRecords) {
      const ym = this.normalizeToYearMonth(r.date);
      if (ym) {
        if (!recordsByMonth.has(ym)) recordsByMonth.set(ym, []);
        recordsByMonth.get(ym)!.push(r);
      }
    }

    const monthsToSave = options?.forceRefresh ? allMonths : uncachedMonths;
    for (const m of monthsToSave) {
      const mRecords = recordsByMonth.get(m) || [];
      const isLocked = m < currentMonth;
      const onTime = mRecords.filter((r) => r.status === 'ON_TIME').length;
      const attended = mRecords.filter((r) => r.punchIn !== null).length;
      const late = mRecords.filter((r) => r.status === 'LATE').length;
      const total = mRecords.length;
      const countable = attended + late > 0 ? attended + late : Math.max(1, total);
      const punctualityRate = countable > 0 ? Math.round((onTime / countable) * 10000) / 100 : 100;
      const score10 = punctualityRate >= 100 ? 10 : punctualityRate >= 90 ? 8 : punctualityRate >= 80 ? 6 : punctualityRate >= 70 ? 5 : 3;

      await this.saveMonthlySnapshot({
        sourceType: 'TEAM_ATTENDANCE',
        yearMonth: m,
        targetMember: cacheTarget,
        teamId: teamId || null,
        dataJson: { records: mRecords, punctualityRate },
        score10,
        totalRecords: mRecords.length,
        isLocked,
      }).catch((e) => console.warn(`Failed to save snapshot for ${m}:`, e));
    }

    // Combine cached records with live records
    const combinedRecords: BlueprintTeamMemberAttendance[] = [];
    for (const m of cachedMonths) {
      const snap = cachedMonthsMap.get(m)!;
      const recs = (snap.data_json?.records as BlueprintTeamMemberAttendance[]) || [];
      combinedRecords.push(...recs);
    }
    combinedRecords.push(...liveRecords);

    // Deduplicate records by empeNo/usrId + date
    const seen = new Set<string>();
    const finalRecords: BlueprintTeamMemberAttendance[] = [];
    for (const r of combinedRecords) {
      const key = `${r.empeNo || r.usrId}_${r.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        finalRecords.push(r);
      }
    }

    const teams = liveFetchedSummary?.teams || (await this.getBlueprintTeams(credentials).catch(() => []));
    const aggregated = this.aggregateTeamAttendanceRecords(finalRecords, teamId, fromDate, toDate, employeeName, teams);

    return {
      ...aggregated,
      cacheInfo: {
        cachedMonths,
        liveMonths: uncachedMonths,
        fromCache: cachedMonths.length > 0,
      },
    };
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
      return [];
    }
    const collector = BlueprintCollector.getInstance(creds);
    return collector.fetchOrgTree();
  }

  async previewBlueprintTasks(
    credentials: BlueprintCredentials,
    projectFilter: string = 'ALLEGRO',
    targetMember?: string,
    fromDate?: string,
    toDate?: string,
    filterRole?: 'requester' | 'assignee' | 'both',
    dateType?: 'registered' | 'due' | 'finished',
    options?: { forceRefresh?: boolean }
  ): Promise<BlueprintTaskSummary & { cacheInfo?: { cachedMonths: string[]; liveMonths: string[]; fromCache: boolean } }> {
    const memberKey = targetMember || credentials.username;
    const allMonths = this.getMonthsBetween(fromDate, toDate);
    const currentMonth = new Date().toISOString().slice(0, 7);

    let cachedSnapshots: CollectorMonthlySnapshot[] = [];
    if (!options?.forceRefresh) {
      cachedSnapshots = await this.getMonthlySnapshots('TASKS', memberKey, allMonths);
    }

    const cachedMonthsMap = new Map<string, CollectorMonthlySnapshot>();
    for (const s of cachedSnapshots) {
      if (s.is_locked || s.year_month < currentMonth) {
        cachedMonthsMap.set(s.year_month, s);
      }
    }

    const cachedMonths = allMonths.filter((m) => cachedMonthsMap.has(m));
    const uncachedMonths = allMonths.filter((m) => !cachedMonthsMap.has(m));

    const collector = BlueprintCollector.getInstance(credentials);

    // If all months are cached, return purely from cache
    if (uncachedMonths.length === 0 && cachedMonths.length > 0) {
      const allTasksMap = new Map<string, BlueprintTaskRecord>();
      for (const m of cachedMonths) {
        const snap = cachedMonthsMap.get(m)!;
        const tasks = (snap.data_json?.tasks as BlueprintTaskRecord[]) || [];
        for (const t of tasks) {
          allTasksMap.set(t.id, t);
        }
      }
      const aggregated = this.aggregateTasks(
        Array.from(allTasksMap.values()),
        projectFilter,
        memberKey,
        fromDate,
        toDate,
        filterRole,
        dateType
      );
      return {
        ...aggregated,
        cacheInfo: {
          cachedMonths,
          liveMonths: [],
          fromCache: true,
        },
      };
    }

    // Live query for missing or current months
    let liveTasks: BlueprintTaskRecord[] = [];
    let liveSummary: BlueprintTaskSummary | null = null;

    if (cachedMonths.length > 0 && uncachedMonths.length > 0) {
      const firstUncached = uncachedMonths[0] || currentMonth;
      const lastUncached = uncachedMonths[uncachedMonths.length - 1] || firstUncached;
      const liveFrom = `${firstUncached}-01`;
      const lastDay = new Date(parseInt(lastUncached.slice(0, 4), 10), parseInt(lastUncached.slice(5, 7), 10), 0).getDate();
      const liveTo = `${lastUncached}-${String(lastDay).padStart(2, '0')}`;

      liveSummary = await collector.fetchTasks(
        projectFilter,
        targetMember,
        liveFrom,
        toDate || liveTo,
        filterRole,
        dateType
      );
      liveTasks = liveSummary.tasks || [];
    } else {
      liveSummary = await collector.fetchTasks(
        projectFilter,
        targetMember,
        fromDate,
        toDate,
        filterRole,
        dateType
      );
      liveTasks = liveSummary.tasks || [];
    }

    // Group live tasks by month and save snapshots
    const tasksByMonth = new Map<string, BlueprintTaskRecord[]>();
    for (const t of liveTasks) {
      const taskDate = t.actualFinish || t.plannedDue || t.registeredDate || '';
      const ym = this.normalizeToYearMonth(taskDate) || currentMonth;
      if (!tasksByMonth.has(ym)) tasksByMonth.set(ym, []);
      tasksByMonth.get(ym)!.push(t);
    }

    const monthsToSave = options?.forceRefresh ? allMonths : uncachedMonths;
    for (const m of monthsToSave) {
      const mTasks = tasksByMonth.get(m) || [];
      const isLocked = m < currentMonth;
      const onTime = mTasks.filter((t) => t.isOnTime).length;
      const total = mTasks.length;
      const onTimeRate = total > 0 ? Math.round((onTime / total) * 10000) / 100 : 0;
      const score10 = onTimeRate >= 100 ? 10 : onTimeRate >= 90 ? 9 : onTimeRate >= 80 ? 6 : onTimeRate >= 70 ? 5 : 3;

      await this.saveMonthlySnapshot({
        sourceType: 'TASKS',
        yearMonth: m,
        targetMember: memberKey,
        dataJson: { tasks: mTasks, onTimeRate },
        score10,
        totalRecords: mTasks.length,
        isLocked,
      }).catch((e) => console.warn(`Failed to save task snapshot for ${m}:`, e));
    }

    // Merge cached tasks with live tasks
    const combinedTaskMap = new Map<string, BlueprintTaskRecord>();
    for (const m of cachedMonths) {
      const snap = cachedMonthsMap.get(m)!;
      const tasks = (snap.data_json?.tasks as BlueprintTaskRecord[]) || [];
      for (const t of tasks) {
        combinedTaskMap.set(t.id, t);
      }
    }
    for (const t of liveTasks) {
      combinedTaskMap.set(t.id, t);
    }

    const aggregated = this.aggregateTasks(
      Array.from(combinedTaskMap.values()),
      projectFilter,
      memberKey,
      fromDate,
      toDate,
      filterRole,
      dateType
    );

    return {
      ...aggregated,
      cacheInfo: {
        cachedMonths,
        liveMonths: uncachedMonths,
        fromCache: cachedMonths.length > 0,
      },
    };
  }

  async previewBlueprintVacation(
    credentials: BlueprintCredentials,
    year?: string,
    targetMember?: string,
    fromDate?: string,
    toDate?: string,
    options?: { forceRefresh?: boolean }
  ): Promise<BlueprintVacationSummary & { cacheInfo?: { fromCache: boolean } }> {
    const member = targetMember || credentials.username;
    const vctYear = (year || '2026').slice(0, 4);

    if (!options?.forceRefresh) {
      const snaps = await this.getMonthlySnapshots('VACATION', member, [vctYear]);
      const firstSnap = snaps[0];
      if (firstSnap) {
        return {
          ...(firstSnap.data_json as unknown as BlueprintVacationSummary),
          cacheInfo: { fromCache: true },
        };
      }
    }

    const collector = BlueprintCollector.getInstance(credentials);
    const summary = await collector.fetchVacationProfile(year, targetMember, fromDate, toDate);

    await this.saveMonthlySnapshot({
      sourceType: 'VACATION',
      yearMonth: vctYear,
      targetMember: member,
      dataJson: summary as unknown as Record<string, unknown>,
      score10: summary.score10,
      totalRecords: summary.vacationDetails?.length || 0,
      isLocked: false,
    }).catch((e) => console.warn('Failed to save vacation snapshot:', e));

    return {
      ...summary,
      cacheInfo: { fromCache: false },
    };
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
    forceRefresh?: boolean;
  }): Promise<{ success: boolean; score10: number; grade: string; weightedScore: number; comment: string; summary: BlueprintAttendanceSummary | Record<string, unknown> }> {
    let creds = options.credentials || (options.username && options.password ? { username: options.username, password: options.password, baseUrl: options.baseUrl } : undefined);
    if (!creds && options.sourceId) {
      const ds = await this.getDataSourceById(options.sourceId);
      if (ds) creds = ds.auth_config as unknown as BlueprintCredentials;
    }
    if (!creds || !creds.username || !creds.password) {
      const saved = await this.getBlueprintConfig();
      if (saved && saved.username && saved.password) {
        creds = { username: saved.username, password: saved.password as string, baseUrl: saved.baseUrl as string | undefined };
      }
    }
    if (!creds || !creds.username || !creds.password) {
      throw new Error('Credentials required for Blueprint sync');
    }

    const month = options.month || '2026-09';
    const summary = await this.previewBlueprint(creds, month, { forceRefresh: options.forceRefresh });

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
    forceRefresh?: boolean;
  }): Promise<{ success: boolean; score10: number; grade: string; weightedScore: number; comment: string; summary: BlueprintTeamAttendanceSummary }> {
    let creds = options.credentials || (options.username && options.password ? { username: options.username, password: options.password, baseUrl: options.baseUrl } : undefined);
    if (!creds && options.sourceId) {
      const ds = await this.getDataSourceById(options.sourceId);
      if (ds) creds = ds.auth_config as unknown as BlueprintCredentials;
    }
    if (!creds || !creds.username || !creds.password) {
      const saved = await this.getBlueprintConfig();
      if (saved && saved.username && saved.password) {
        creds = { username: saved.username, password: saved.password as string, baseUrl: saved.baseUrl as string | undefined };
      }
    }
    if (!creds || !creds.username || !creds.password) {
      throw new Error('Chưa có tài khoản và mật khẩu kết nối Blueprint. Vui lòng nhập thông tin trên giao diện.');
    }

    const summary = await this.previewBlueprintTeamAttendance(
      creds,
      options.teamId,
      options.fromDate,
      options.toDate,
      options.targetMember,
      { forceRefresh: options.forceRefresh }
    );

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
    forceRefresh?: boolean;
  }): Promise<{ success: boolean; score10: number; grade: string; weightedScore: number; comment: string; tasksSummary: BlueprintTaskSummary | Record<string, unknown> }> {
    let creds = options.credentials || (options.username && options.password ? { username: options.username, password: options.password, baseUrl: options.baseUrl } : undefined);
    if (!creds && options.sourceId) {
      const ds = await this.getDataSourceById(options.sourceId);
      if (ds) creds = ds.auth_config as unknown as BlueprintCredentials;
    }
    if (!creds || !creds.username || !creds.password) {
      const saved = await this.getBlueprintConfig();
      if (saved && saved.username && saved.password) {
        creds = { username: saved.username, password: saved.password as string, baseUrl: saved.baseUrl as string | undefined };
      }
    }
    if (!creds || !creds.username || !creds.password) {
      throw new Error('Credentials required for Blueprint sync');
    }

    const projectFilter = options.projectFilter || 'ALLEGRO';
    const targetMember = options.member || creds.username;
    const tasksSummary = await this.previewBlueprintTasks(
      creds,
      projectFilter,
      targetMember,
      options.fromDate,
      options.toDate,
      options.filterRole,
      options.dateType,
      { forceRefresh: options.forceRefresh }
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
    fromDate?: string;
    toDate?: string;
    forceRefresh?: boolean;
  }): Promise<{ success: boolean; score10: number; grade: string; weightedScore: number; comment: string; summary: BlueprintVacationSummary }> {
    let creds = options.credentials || (options.username && options.password ? { username: options.username, password: options.password, baseUrl: options.baseUrl } : undefined);
    if (!creds && options.sourceId) {
      const ds = await this.getDataSourceById(options.sourceId);
      if (ds) creds = ds.auth_config as unknown as BlueprintCredentials;
    }
    if (!creds || !creds.username || !creds.password) {
      const saved = await this.getBlueprintConfig();
      if (saved && saved.username && saved.password) {
        creds = { username: saved.username, password: saved.password as string, baseUrl: saved.baseUrl as string | undefined };
      }
    }
    if (!creds || !creds.username || !creds.password) {
      throw new Error('Credentials required for Blueprint sync');
    }

    const year = options.year || '2026';
    const targetMember = options.member || creds.username;
    const summary = await this.previewBlueprintVacation(
      creds,
      year,
      targetMember,
      options.fromDate,
      options.toDate,
      { forceRefresh: options.forceRefresh }
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
    forceRefresh?: boolean;
  }): Promise<{
    success: boolean;
    cycleId: string;
    attendance: {
      punctualityRate: number;
      score10: number;
      grade: string;
      weightedScore: number;
      comment: string;
      summary: BlueprintAttendanceSummary | Record<string, unknown>;
    };
    tasks: {
      onTimeRate: number;
      score10: number;
      grade: string;
      weightedScore: number;
      comment: string;
      summary: BlueprintTaskSummary | Record<string, unknown>;
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
    const attendanceSummary = await this.previewBlueprint(creds, month, { forceRefresh: options.forceRefresh });
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
    const tasksSummary = await this.previewBlueprintTasks(
      creds,
      projectFilter,
      targetMember,
      options.fromDate,
      options.toDate,
      options.filterRole || 'requester',
      options.dateType || 'registered',
      { forceRefresh: options.forceRefresh }
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

  async getBlueprintConfig(): Promise<BlueprintSavedConfig> {
    const defaultUsername = process.env.BLUEPRINT_USERNAME || 'kyluong';
    const defaultPassword = process.env.BLUEPRINT_PASSWORD || '19901991';
    const defaultBaseUrl = process.env.BLUEPRINT_BASE_URL || 'https://blueprint.cyberlogitec.com.vn';

    const res = await this.pool.query(
      `SELECT * FROM collector_data_source WHERE source_type = 'BLUEPRINT' ORDER BY updated_at DESC LIMIT 1`
    );
    if (res.rows.length > 0) {
      const ds = res.rows[0];
      return {
        id: ds.id,
        name: ds.name,
        username: (ds.auth_config?.username as string) || defaultUsername,
        password: (ds.auth_config?.password as string) || defaultPassword,
        baseUrl: (ds.auth_config?.baseUrl as string) || defaultBaseUrl,
        month: (ds.auth_config?.month as string) || '2026-09',
        projectFilter: (ds.auth_config?.projectFilter as string) || 'Allegro NX',
        ...ds.auth_config,
      };
    }
    return {
      username: defaultUsername,
      password: defaultPassword,
      baseUrl: defaultBaseUrl,
      month: '2026-09',
      projectFilter: 'Allegro NX',
    };
  }

  async saveBlueprintConfig(data: {
    username?: string;
    password?: string;
    baseUrl?: string;
    month?: string;
    projectFilter?: string;
  }): Promise<Record<string, unknown>> {
    const defaultUsername = process.env.BLUEPRINT_USERNAME || 'kyluong';
    const defaultPassword = process.env.BLUEPRINT_PASSWORD || '19901991';
    const defaultBaseUrl = process.env.BLUEPRINT_BASE_URL || 'https://blueprint.cyberlogitec.com.vn';

    const existing = await this.pool.query(
      `SELECT * FROM collector_data_source WHERE source_type = 'BLUEPRINT' LIMIT 1`
    );

    const prevConfig = (existing.rows[0]?.auth_config as Record<string, unknown>) || {};
    const effectiveUsername =
      data.username && data.username.trim() ? data.username.trim() : (prevConfig.username as string) || defaultUsername;
    const effectivePassword =
      data.password && data.password.trim() && !data.password.includes('•')
        ? data.password.trim()
        : (prevConfig.password as string) || defaultPassword;

    const authConfig = {
      username: effectiveUsername,
      password: effectivePassword,
      baseUrl: data.baseUrl || (prevConfig.baseUrl as string) || defaultBaseUrl,
      month: data.month || (prevConfig.month as string) || '2026-09',
      projectFilter: data.projectFilter || (prevConfig.projectFilter as string) || 'Allegro NX',
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

    // 20 Management team members from Blueprint UI_TAT_029 (ALLEGRO NX Part & Maritime Solutions Part)
    const priorityMembers: Array<{ id: string; name: string; role: string; email?: string }> = [
      // ALLEGRO NX Part (12 members)
      { id: 'kyluong', name: 'Lương Công Kỳ (163188)', role: 'Senior Developer / Manager', email: 'ky.luong@cyberlogitec.com' },
      { id: 'ducnguyen', name: 'Nguyễn Quang Đức (173232)', role: 'Developer / PIC', email: 'duc.nguyen@cyberlogitec.com' },
      { id: 'hieudao', name: 'Đào Trung Hiếu (183322)', role: 'Người đăng kí / Requester', email: 'hieu.dao@cyberlogitec.com' },
      { id: 'anlt', name: 'Lê Trọng Ân (213813)', role: 'Developer', email: 'an.lt@cyberlogitec.com' },
      { id: 'tungha', name: 'Hà Việt Tùng (213866)', role: 'Developer / PIC', email: 'tung.ha@cyberlogitec.com' },
      { id: 'hyle', name: 'Lê Minh Hy (213844)', role: 'Developer / PIC', email: 'hy.le@cyberlogitec.com' },
      { id: 'diemtran', name: 'Trần Quang Diệm (227031)', role: 'Người đăng kí / Requester', email: 'diem.tran@cyberlogitec.com' },
      { id: 'ngocnb', name: 'Nguyễn Bá Ngọc (237157)', role: 'Developer / PIC', email: 'ngoc.nb@cyberlogitec.com' },
      { id: 'thienvo', name: 'Võ Chí Thiện (237196)', role: 'Người đăng kí / Requester', email: 'thien.vo@cyberlogitec.com' },
      { id: 'nhanph', name: 'Phan Huy Nhân (247203)', role: 'Developer / PIC', email: 'nhan.ph@cyberlogitec.com' },
      { id: 'phuocnt', name: 'Nguyễn Thành Phước (247097)', role: 'Developer / PIC', email: 'phuoc.nt@cyberlogitec.com' },
      { id: 'nhatpham', name: 'Phạm Mai Nhật (203701)', role: 'Developer / PIC', email: 'nhat.pham@cyberlogitec.com' },

      // Maritime Solutions Part (8 members)
      { id: 'xuanthai', name: 'Thái Thanh Xuân (203755)', role: 'Developer / PIC', email: 'xuan.thai@cyberlogitec.com' },
      { id: 'lamnguyen', name: 'Nguyễn Sỹ Hoàng Lâm (247204)', role: 'Developer / PIC', email: 'lam.nsh@cyberlogitec.com' },
      { id: 'thangpham', name: 'Phạm Hữu Thắng (247222)', role: 'Developer / PIC', email: 'thang.ph@cyberlogitec.com' },
      { id: 'phuongcq', name: 'Chung Quang Phương (247423)', role: 'Developer / PIC', email: 'phuong.cq@cyberlogitec.com' },
      { id: 'khoadang', name: 'Đặng Phước Khoa (267036)', role: 'Developer / PIC', email: 'khoa.dang@cyberlogitec.com' },
      { id: 'minhdoan', name: 'Đoàn Anh Minh (213835)', role: 'Developer / PIC', email: 'minh.doan@cyberlogitec.com' },
      { id: 'trungqn', name: 'Nguyễn Quang Trung (193613)', role: 'Developer / PIC', email: 'trung.nguyenquang@cyberlogitec.com' },
      { id: 'quangnguyen', name: 'Nguyễn Minh Quang (257130)', role: 'Developer / PIC', email: 'quang.ng@cyberlogitec.com' },
    ];

    const memberMap = new Map<string, { id: string; name: string; role: string; email?: string }>();
    priorityMembers.forEach((m) => memberMap.set(m.id.toLowerCase(), m));

    try {
      // 1. Fetch live Blueprint directory from UI_PIM_001
      const creds = await this.getBlueprintConfig();
      if (creds && creds.username && creds.password) {
        const collector = BlueprintCollector.getInstance({ username: creds.username, password: creds.password, baseUrl: creds.baseUrl });
        const bpMembers = await collector.fetchMembers();
        if (Array.isArray(bpMembers) && bpMembers.length > 0) {
          bpMembers.forEach((u) => {
            const lowerId = u.id.toLowerCase();
            // Only enrich the 21 managed team members, ignore outside junk members
            if (memberMap.has(lowerId)) {
              const existing = memberMap.get(lowerId)!;
              memberMap.set(lowerId, {
                ...existing,
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
    params?: Record<string, unknown>;
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
    const values: unknown[] = [];
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

  async runJob(jobId: string): Promise<{ success: boolean; log: CollectorRunLog; summary?: Record<string, unknown> | BlueprintTaskSummary | BlueprintVacationSummary | BlueprintAttendanceSummary | null }> {
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
        const creds = ds.auth_config as unknown as BlueprintCredentials;
        const collector = BlueprintCollector.getInstance(creds);
        let recordsCount = 0;
        let summaryResult: Record<string, unknown> | BlueprintTaskSummary | BlueprintVacationSummary | BlueprintAttendanceSummary | null = null;

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
          const projectFilter = typeof job.params?.project_filter === 'string' ? job.params.project_filter : 'ALLEGRO';
          const tasksSummary = await collector.fetchTasks(projectFilter);
          summaryResult = tasksSummary;

          if (cycleId) {
            const syncRes = await this.applyBlueprintTasksToCycle(
              cycleId,
              job.target_criterion_code,
              tasksSummary,
              typeof job.params?.target_employee_id === 'string' ? job.params.target_employee_id : undefined
            );
            recordsCount = tasksSummary.totalTasks || syncRes.updated;
          } else {
            recordsCount = tasksSummary.totalTasks || 0;
          }
        } else if (job.target_criterion_code === 'LEAVE_DISCIPLINE' || job.params?.module === 'VACATION') {
          const year = typeof job.params?.year === 'string' ? job.params.year : '2026';
          const targetMember = typeof job.params?.member === 'string' ? job.params.member : creds.username;
          const vacationSummary = await collector.fetchVacationProfile(year, targetMember);
          summaryResult = vacationSummary;

          if (cycleId) {
            const syncRes = await this.applyBlueprintVacationToCycle(
              cycleId,
              job.target_criterion_code || 'ATTITUDE_COMPANY_CULTURE',
              vacationSummary,
              typeof job.params?.target_employee_id === 'string' ? job.params.target_employee_id : undefined,
              targetMember
            );
            recordsCount = (vacationSummary.vacationDetails?.length || 0) + (vacationSummary.deductions?.length || 0) || syncRes.updated;
          } else {
            recordsCount = (vacationSummary.vacationDetails?.length || 0) + (vacationSummary.deductions?.length || 0);
          }
        } else {
          const month = typeof job.params?.month === 'string' ? job.params.month : '2026-09';
          const attendanceSummary = await collector.fetchAttendance(month);
          summaryResult = attendanceSummary;

          if (cycleId) {
            const syncRes = await this.applyBlueprintAttendanceToCycle(
              cycleId,
              job.target_criterion_code || 'ATTITUDE_COMPANY_CULTURE',
              attendanceSummary,
              typeof job.params?.target_employee_id === 'string' ? job.params.target_employee_id : undefined
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
    } catch (err: unknown) {
      const failedLog = await this.pool.query(
        `UPDATE collector_run_log
         SET status = 'FAILED',
             finished_at = NOW(),
             error_message = $1
         WHERE id = $2
         RETURNING *`,
        [(err as Error).message || 'Unknown error', logId]
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
    tasksSummary: BlueprintTaskSummary | Record<string, unknown>,
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
