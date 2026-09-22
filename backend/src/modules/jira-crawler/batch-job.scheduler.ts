import { schedule as cronSchedule, validate as cronValidate, ScheduledTask } from 'node-cron';
import { Pool } from 'pg';
import { ManagedMember } from './config.js';
import { JiraPimClient } from './jira-client.js';
import { AiScoringEngine, MemberBatchResult, BlueprintMemberSummary, BlueprintAttendanceLateRecord } from './ai-evaluator.js';
import { CollectorScriptStore } from './collector-script.store.js';

export interface BatchRunRecord {
  id: string;
  versionNumber: number;
  versionTag: string;
  runAt: string;
  cycleCode: string;
  triggeredBy: 'CRON' | 'MANUAL';
  status: 'RUNNING' | 'DONE' | 'FAILED';
  totalMembers: number;
  completedMembers: number;
  failedMembers: number;
  cronExpression: string;
  results: MemberBatchResult[];
  errorLog: string[];
  durationMs: number;
  createdAt?: string;
}

// In-memory cache for fast UI access
const MAX_STORED_RUNS = 30;
const cachedBatchRuns: BatchRunRecord[] = [];

function generateRunId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

let scheduledTask: ScheduledTask | null = null;
let currentCronExpression = '0 0 * * *'; // Default: midnight daily (00:00 GMT+7)

export interface DbManagedMember extends ManagedMember {
  blueprintUsername?: string;
  lastEvaluationCompletedAt?: string | null;
  nextReviewDueDate?: string | null;
  reviewCadenceMonths?: number;
}

/**
 * Lấy danh sách thành viên được quản lý từ Database
 */
export async function getManagedMembersFromDb(pool: Pool, managerCode = '163188'): Promise<DbManagedMember[]> {
  try {
    const res = await pool.query(
      `SELECT employee_code as code, full_name as name, email, blueprint_username,
              last_evaluation_completed_at, next_review_due_date, review_cadence_months
       FROM employee
       WHERE manager_id = (SELECT employee_id FROM employee WHERE employee_code = $1)
          OR (employee_code != $1 AND manager_id IS NOT NULL)
       ORDER BY employee_code ASC`,
      [managerCode]
    );
    if (res.rows.length > 0) {
      return res.rows.map((r) => ({
        code: r.code,
        name: r.name,
        email: r.email,
        team: 'ALLEGRO' as const,
        blueprintUsername: r.blueprint_username,
        lastEvaluationCompletedAt: r.last_evaluation_completed_at ? new Date(r.last_evaluation_completed_at).toISOString().slice(0, 10) : null,
        nextReviewDueDate: r.next_review_due_date ? new Date(r.next_review_due_date).toISOString().slice(0, 10) : null,
        reviewCadenceMonths: r.review_cadence_months || 6,
      }));
    }
  } catch (err) {
    console.warn('[BatchJob] Error loading members from DB:', (err as Error).message);
  }
  return [];
}

/**
 * Ensure batch_eval_run table exists
 */
export async function ensureBatchEvalTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS batch_eval_run (
      id VARCHAR(100) PRIMARY KEY,
      version_number INT NOT NULL,
      version_tag VARCHAR(100) NOT NULL,
      cycle_code VARCHAR(50) NOT NULL,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      triggered_by VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      cron_expression VARCHAR(50) NOT NULL,
      total_members INT NOT NULL DEFAULT 0,
      completed_members INT NOT NULL DEFAULT 0,
      failed_members INT NOT NULL DEFAULT 0,
      duration_ms INT NOT NULL DEFAULT 0,
      error_log JSONB NOT NULL DEFAULT '[]'::jsonb,
      results JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_batch_eval_run_cycle ON batch_eval_run(cycle_code);
    CREATE INDEX IF NOT EXISTS idx_batch_eval_run_run_at ON batch_eval_run(run_at DESC);
    CREATE INDEX IF NOT EXISTS idx_batch_eval_run_version ON batch_eval_run(version_number DESC);
  `);

  // Auto-heal any zombie runs stuck in RUNNING state older than 15 minutes
  try {
    await pool.query(`
      UPDATE batch_eval_run
      SET status = 'FAILED',
          error_log = COALESCE(error_log, '[]'::jsonb) || '["Tiến trình bị gián đoạn do khởi động lại server"]'::jsonb,
          updated_at = NOW()
      WHERE status = 'RUNNING'
        AND run_at < NOW() - INTERVAL '15 minutes'
    `);
  } catch (error) {
    console.error('Error in batch recovery', error);
  }
}

/**
 * Load Blueprint data from collector_monthly_snapshot and measurement table
 */
async function loadBlueprintSummaries(
  pool: Pool,
  members: ManagedMember[]
): Promise<Map<string, BlueprintMemberSummary>> {
  const blueprintMap = new Map<string, BlueprintMemberSummary>();

  try {
    // 1. Query Attendance snapshots from H2-2026 (July to September 2026)
    const attSnapshots = await pool.query(
      `SELECT year_month, data_json
       FROM collector_monthly_snapshot
       WHERE source_type = 'TEAM_ATTENDANCE'
         AND year_month IN ('2026-07', '2026-08', '2026-09')
       ORDER BY year_month DESC`
    );

    // 2. Query Tasks snapshots from H2-2026
    const taskSnapshots = await pool.query(
      `SELECT target_member, year_month, score10, total_records
       FROM collector_monthly_snapshot
       WHERE source_type = 'TASKS'
         AND year_month IN ('2026-07', '2026-08', '2026-09')
       ORDER BY year_month DESC`
    );

    // Group attendance records by empeNo
    const attByEmp = new Map<string, {
      totalWorkDays: number;
      onTimeDays: number;
      lateDays: number;
      lateMinutes: number;
      leaveDays: number;
      lateRecords: BlueprintAttendanceLateRecord[];
    }>();

    for (const snap of attSnapshots.rows) {
      const records = snap.data_json?.records || [];
      for (const rec of records) {
        const empCode = String(rec.empeNo || '').trim();
        if (!empCode) continue;

        if (!attByEmp.has(empCode)) {
          attByEmp.set(empCode, { totalWorkDays: 0, onTimeDays: 0, lateDays: 0, lateMinutes: 0, leaveDays: 0, lateRecords: [] });
        }
        const stats = attByEmp.get(empCode)!;
        stats.totalWorkDays++;

        if (rec.status === 'ON_TIME') {
          stats.onTimeDays++;
        } else if (rec.status === 'LATE' || (Number(rec.lateMinutes) > 0)) {
          stats.lateDays++;
          stats.lateMinutes += Number(rec.lateMinutes) || 0;
          stats.lateRecords.push({
            date: String(rec.date || ''),
            punchIn: rec.punchIn ? String(rec.punchIn) : null,
            punchOut: rec.punchOut ? String(rec.punchOut) : null,
            lateMinutes: Number(rec.lateMinutes) || 0,
            workShift: rec.workShift ? String(rec.workShift) : undefined,
            reason: rec.reason ? String(rec.reason) : null,
          });
        } else if (rec.status === 'LEAVE') {
          stats.leaveDays++;
        }
      }
    }

    // Group task scores by username
    const tasksByUsername = new Map<string, { totalTasks: number; totalScore: number; count: number }>();
    for (const row of taskSnapshots.rows) {
      const uname = String(row.target_member || '').toLowerCase().trim();
      if (!uname) continue;
      if (!tasksByUsername.has(uname)) {
        tasksByUsername.set(uname, { totalTasks: 0, totalScore: 0, count: 0 });
      }
      const entry = tasksByUsername.get(uname)!;
      entry.totalTasks += Number(row.total_records) || 0;
      entry.totalScore += Number(row.score10) || 0;
      entry.count++;
    }

    // Build BlueprintMemberSummary for each member
    for (const m of members) {
      const attStats = attByEmp.get(m.code);
      const emailPrefix = (m.email || '').split('@')[0] || '';
      const bpUsername = (m as DbManagedMember).blueprintUsername || emailPrefix.replace(/\./g, '');
      const taskStats = tasksByUsername.get(bpUsername);

      const hasAttendance = Boolean(attStats && attStats.totalWorkDays > 0);
      const hasTasks = Boolean(taskStats && taskStats.count > 0);

      if (!hasAttendance && !hasTasks) {
        continue;
      }

      let punctualityRate = 100;
      let attScore10 = 8.0;
      if (attStats && attStats.totalWorkDays > 0) {
        punctualityRate = Math.round((attStats.onTimeDays / (attStats.totalWorkDays - attStats.leaveDays || 1)) * 1000) / 10;
        punctualityRate = Math.min(100, Math.max(0, punctualityRate));
        attScore10 = punctualityRate >= 95 ? 10 : punctualityRate >= 90 ? 9 : punctualityRate >= 85 ? 8 : punctualityRate >= 75 ? 7 : 6;
      }

      const pimScore10 = taskStats && taskStats.count > 0
        ? Math.round((taskStats.totalScore / taskStats.count) * 10) / 10
        : 8.0;

      const summary: BlueprintMemberSummary = {
        hasData: true,
        source: 'Blueprint CLV (UI_TAT_028 & UI_PIM_001)',
        collectedAt: new Date().toISOString(),
        attendance: hasAttendance ? {
          totalWorkDays: attStats!.totalWorkDays,
          onTimeDays: attStats!.onTimeDays,
          lateDays: attStats!.lateDays,
          lateMinutes: attStats!.lateMinutes,
          leaveDays: attStats!.leaveDays,
          punctualityRate,
          score10: attScore10,
          lateRecords: attStats!.lateRecords,
        } : undefined,
        tasks: hasTasks ? {
          totalTasks: taskStats!.totalTasks,
          completedTasks: taskStats!.totalTasks,
          score10: pimScore10,
        } : undefined,
        blendedKpis: [],
      };

      blueprintMap.set(m.code, summary);
    }
  } catch (err) {
    console.warn('[BatchJob] Error loading Blueprint summaries:', (err as Error).message);
  }

  return blueprintMap;
}

/**
 * Execute a full batch run for all managed members with database versioning & Blueprint blending
 */
export async function executeBatchRun(
  pool: Pool,
  triggeredBy: 'CRON' | 'MANUAL' = 'MANUAL',
  cycleCode = 'H2-2026'
): Promise<BatchRunRecord> {
  await ensureBatchEvalTable(pool);

  const runId = generateRunId();
  const startTime = Date.now();

  // 1. Calculate sequential version number
  let versionNumber = 1;
  try {
    const verRes = await pool.query('SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM batch_eval_run');
    versionNumber = Number(verRes.rows[0].next_ver) || 1;
  } catch (e) {
    console.warn('[BatchJob] Error reading next version number, fallback to 1:', (e as Error).message);
  }

  const now = new Date();
  const versionTag = `Phiên bản #${versionNumber} (${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`;

  const members = await getManagedMembersFromDb(pool);

  const run: BatchRunRecord = {
    id: runId,
    versionNumber,
    versionTag,
    runAt: now.toISOString(),
    cycleCode,
    triggeredBy,
    status: 'RUNNING',
    totalMembers: members.length,
    completedMembers: 0,
    failedMembers: 0,
    cronExpression: currentCronExpression,
    results: [],
    errorLog: [],
    durationMs: 0,
    createdAt: now.toISOString(),
  };

  // Cache in memory
  cachedBatchRuns.unshift(run);
  if (cachedBatchRuns.length > MAX_STORED_RUNS) {
    cachedBatchRuns.splice(MAX_STORED_RUNS);
  }

  // Insert initial running record to DB
  try {
    await pool.query(
      `INSERT INTO batch_eval_run (
        id, version_number, version_tag, cycle_code, run_at, triggered_by, status,
        cron_expression, total_members, completed_members, failed_members, duration_ms,
        error_log, results, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
      [
        run.id,
        run.versionNumber,
        run.versionTag,
        run.cycleCode,
        run.runAt,
        run.triggeredBy,
        run.status,
        run.cronExpression,
        run.totalMembers,
        run.completedMembers,
        run.failedMembers,
        run.durationMs,
        JSON.stringify(run.errorLog),
        JSON.stringify(run.results),
      ]
    );
  } catch (dbErr) {
    console.warn('[BatchJob] Error inserting initial batch_eval_run to DB:', (dbErr as Error).message);
  }

  console.log(`\n[BatchJob] 🚀 Bắt đầu thu thập & chấm điểm ${versionTag} (${triggeredBy}) cho ${members.length} nhân sự...`);

  try {
    const jiraClient = new JiraPimClient();
    const scriptStore = new CollectorScriptStore(pool);
    const scriptConfig = await scriptStore.getScript();
    const engine = new AiScoringEngine(
      cycleCode,
      process.env.GEMINI_API_KEY,
      scriptConfig.scoringRubric,
      scriptConfig.geminiModel,
      scriptConfig.aiPromptTemplate,
      scriptConfig.aiTaskPromptTemplate
    );

    // Load real Blueprint summaries for all members
    const blueprintSummaries = await loadBlueprintSummaries(pool, members);
    console.log(`  📊 [Blueprint] Đã nạp dữ liệu Blueprint CLV cho ${blueprintSummaries.size}/${members.length} nhân viên.`);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const defaultFromDays = scriptConfig.defaultFromDays ?? 180;
    const defaultFromDate = new Date(now.getTime() - defaultFromDays * 86400000).toISOString().slice(0, 10);

    for (const member of members) {
      try {
        const dateFrom = member.lastEvaluationCompletedAt || defaultFromDate;
        const dateTo = today;

        console.log(`  [BatchJob] Đang thu thập Jira: ${member.name} (${member.code}) [${dateFrom} → ${dateTo}]...`);

        const issues = await jiraClient.fetchMemberIssues(member.code, {
          fromDate: dateFrom,
          toDate: dateTo,
          scriptConfig,
        });

        const metrics = jiraClient.aggregateMemberMetrics(member, issues, scriptConfig);
        const result = await engine.evaluateMemberFull(metrics, dateFrom, dateTo);

        // ── Blueprint Integration & Blending ─────────────────────────────
        const bpSummary = blueprintSummaries.get(member.code);
        if (bpSummary && bpSummary.hasData) {
          result.blueprintSummary = bpSummary;

          // 1. Blend Task Score (PERF_01) if Blueprint tasks exist
          if (bpSummary.tasks) {
            const bpTaskScore = bpSummary.tasks.score10 * 10; // convert 1-10 to 0-100%
            result.records = result.records.map((rec) => {
              if (rec.kpi_code === 'PERF_01') {
                const normJira = rec.value <= 10 ? rec.value * 10 : rec.value;
                const blended = Math.round(((normJira + bpTaskScore) / 2) * 10) / 10;
                bpSummary.blendedKpis.push({
                  kpiCode: 'PERF_01',
                  kpiName: 'Tiến độ bàn giao nhiệm vụ',
                  jiraScore: normJira,
                  blueprintScore: bpTaskScore,
                  blendedScore: blended,
                  formula: '50% Jira Tasks + 50% Blueprint PIM (UI_PIM_001)',
                });
                return {
                  ...rec,
                  value: blended,
                  rationale: `[🔀 Tích hợp Blueprint + Jira]: Jira=${normJira}% | Blueprint PIM=${bpTaskScore}% → Điểm kết hợp: ${blended}%. ${rec.rationale}`,
                  comment: `${rec.comment} (Tích hợp 50% Blueprint + 50% Jira)`,
                };
              }
              return rec;
            });
          }

          // 2. Add or blend Attendance score if Blueprint attendance exists
          if (bpSummary.attendance) {
            const attScore = bpSummary.attendance.score10 * 10;
            const existingAtt = result.records.find((r) => r.kpi_code === 'ATTENDANCE');
            if (existingAtt) {
              existingAtt.value = attScore;
              existingAtt.rationale = `[Blueprint UI_TAT_028]: Chuyên cần ${bpSummary.attendance.punctualityRate}% (${bpSummary.attendance.onTimeDays}/${bpSummary.attendance.totalWorkDays} ngày đúng giờ, trễ ${bpSummary.attendance.lateDays} ngày).`;
            } else {
              result.records.push({
                employee_code: member.code,
                evaluation_cycle_code: cycleCode,
                kpi_code: 'ATTENDANCE',
                value: attScore,
                resolved_level: Math.round(bpSummary.attendance.score10 / 2),
                comment: `Tỷ lệ đúng giờ đạt ${bpSummary.attendance.punctualityRate}% trên cổng Blueprint UI_TAT_028`,
                rationale: `Được trích xuất từ bảng chấm công CLV Blueprint: ${bpSummary.attendance.onTimeDays} ngày đúng giờ, ${bpSummary.attendance.lateDays} ngày trễ (${bpSummary.attendance.lateMinutes} phút).`,
                source_snapshot: {
                  source_type: 'JIRA',
                  source_name: 'Blueprint CLV UI_TAT_028',
                  source_reference: `ATT-${member.code}-${cycleCode}`,
                  collected_at: new Date().toISOString(),
                  collector_version: '2.0.0',
                  metadata: { ...bpSummary.attendance },
                },
                evidences: [
                  {
                    evidence_type: 'DOCUMENT',
                    title: 'Bảng chấm công Blueprint UI_TAT_028',
                    description: `Punctuality rate: ${bpSummary.attendance.punctualityRate}%`,
                  },
                ],
              });
            }

            bpSummary.blendedKpis.push({
              kpiCode: 'ATTENDANCE',
              kpiName: 'Tuân thủ kỷ luật & Chuyên cần',
              jiraScore: 100,
              blueprintScore: attScore,
              blendedScore: attScore,
              formula: '100% Cổng chấm công Blueprint CLV (UI_TAT_028)',
            });
          }

          // 3. Recalculate overall score with blended KPI scores using dynamic weights
          const perfRec = result.records.find((r) => r.kpi_code === 'PERF_01');
          const qualRec = result.records.find((r) => r.kpi_code === 'CODE_QUALITY');
          const volRec = result.records.find((r) => r.kpi_code === 'TASK_VOLUME');
          const ownerRec = result.records.find((r) => r.kpi_code === 'OWNERSHIP_SCOPE');
          const indepRec = result.records.find((r) => r.kpi_code === 'INDEPENDENCE');

          const pScore = perfRec ? (perfRec.value <= 10 ? perfRec.value * 10 : perfRec.value) : 60;
          const qScore = qualRec ? (qualRec.resolved_level ? (qualRec.resolved_level / 5) * 100 : 60) : 60;
          const vScore = volRec ? (volRec.resolved_level ? (volRec.resolved_level / 5) * 100 : 60) : 60;
          const oScore = ownerRec ? (ownerRec.resolved_level / 5) * 100 : 80;
          const iScore = indepRec ? (indepRec.resolved_level / 5) * 100 : 80;

          const weights = scriptConfig.scoringRubric?.weights || {
            PERF_01: 0.25,
            CODE_QUALITY: 0.20,
            TASK_VOLUME: 0.15,
            OWNERSHIP_SCOPE: 0.20,
            INDEPENDENCE: 0.20,
          };
          const wP = weights.PERF_01 ?? 0.25;
          const wQ = weights.CODE_QUALITY ?? 0.20;
          const wV = weights.TASK_VOLUME ?? 0.15;
          const wO = weights.OWNERSHIP_SCOPE ?? 0.20;
          const wI = weights.INDEPENDENCE ?? 0.20;
          const totalW = (wP + wQ + wV + wO + wI) || 1;

          result.overallScore = Math.round(((pScore * wP + qScore * wQ + vScore * wV + oScore * wO + iScore * wI) / totalW) * 10) / 10;
          if (result.overallScore >= 95) result.overallLevel = 5;
          else if (result.overallScore >= 85) result.overallLevel = 4;
          else if (result.overallScore >= 75) result.overallLevel = 3;
          else if (result.overallScore >= 65) result.overallLevel = 2;
          else result.overallLevel = 1;
        }

        run.results.push(result);
        run.completedMembers++;

        console.log(
          `  ✅ [BatchJob] ${member.name}: Điểm tổng=${result.overallScore} (Level ${result.overallLevel}) | Jira Tasks=${issues.length} | Blueprint=${result.blueprintSummary?.hasData ? 'Có' : 'Không'}`
        );

        // Update database progress
        try {
          await pool.query(
            `UPDATE batch_eval_run
             SET completed_members = $1, results = $2, updated_at = NOW()
             WHERE id = $3`,
            [run.completedMembers, JSON.stringify(run.results), run.id]
          );
        } catch (error) {
          console.error('Error saving batch member result', error);
        }

        // Rate limit pause between members for AI
        if (members.indexOf(member) < members.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3500));
        }
      } catch (memberErr) {
        const errMsg = `${member.name} (${member.code}): ${(memberErr as Error).message}`;
        run.errorLog.push(errMsg);
        run.failedMembers++;
        console.error(`  ❌ [BatchJob] Lỗi khi xử lý ${member.name}:`, (memberErr as Error).message);
      }
    }

    run.status = run.failedMembers === members.length ? 'FAILED' : 'DONE';
    run.durationMs = Date.now() - startTime;

    console.log(
      `\n[BatchJob] 🎉 Hoàn tất ${versionTag}: Thành công ${run.completedMembers}/${run.totalMembers} nhân sự (${(run.durationMs / 1000).toFixed(1)}s)`
    );
  } catch (err) {
    run.status = 'FAILED';
    run.durationMs = Date.now() - startTime;
    run.errorLog.push(`Lỗi nghiêm trọng: ${(err as Error).message}`);
    console.error(`[BatchJob] ❌ Lỗi chạy batch ${runId}:`, err);
  }

  // Persist final status to PostgreSQL
  try {
    await pool.query(
      `UPDATE batch_eval_run
       SET status = $1, completed_members = $2, failed_members = $3,
           duration_ms = $4, error_log = $5, results = $6, updated_at = NOW()
       WHERE id = $7`,
      [
        run.status,
        run.completedMembers,
        run.failedMembers,
        run.durationMs,
        JSON.stringify(run.errorLog),
        JSON.stringify(run.results),
        run.id,
      ]
    );
  } catch (saveErr) {
    console.error('[BatchJob] Lỗi lưu kết quả vào database:', saveErr);
  }

  return run;
}

/**
 * Get all batch run records from database (most recent first)
 */
export async function getBatchRuns(pool?: Pool): Promise<BatchRunRecord[]> {
  if (!pool) return cachedBatchRuns;

  try {
    await ensureBatchEvalTable(pool);
    const res = await pool.query(
      `SELECT id, version_number, version_tag, cycle_code, run_at, triggered_by, status,
              cron_expression, total_members, completed_members, failed_members, duration_ms,
              results, error_log, created_at
       FROM batch_eval_run
       ORDER BY version_number DESC
       LIMIT 30`
    );

    if (res.rows.length === 0) return cachedBatchRuns;

    return res.rows.map((row) => ({
      id: row.id,
      versionNumber: Number(row.version_number) || 1,
      versionTag: row.version_tag || `Phiên bản #${row.version_number}`,
      runAt: row.run_at ? new Date(row.run_at).toISOString() : new Date().toISOString(),
      cycleCode: row.cycle_code || 'H2-2026',
      triggeredBy: row.triggered_by as 'CRON' | 'MANUAL',
      status: row.status as 'RUNNING' | 'DONE' | 'FAILED',
      totalMembers: Number(row.total_members) || 0,
      completedMembers: Number(row.completed_members) || 0,
      failedMembers: Number(row.failed_members) || 0,
      cronExpression: row.cron_expression || currentCronExpression,
      results: (row.results as MemberBatchResult[]) || [],
      errorLog: (row.error_log as string[]) || [],
      durationMs: Number(row.duration_ms) || 0,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    }));
  } catch (err) {
    console.warn('[BatchScheduler] Lỗi truy vấn lịch sử từ database, trả về cache:', (err as Error).message);
    return cachedBatchRuns;
  }
}

/**
 * Get a specific batch run by ID from database
 */
export async function getBatchRunById(pool: Pool, id: string): Promise<BatchRunRecord | undefined> {
  try {
    await ensureBatchEvalTable(pool);
    const res = await pool.query('SELECT * FROM batch_eval_run WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      return cachedBatchRuns.find((r) => r.id === id);
    }
    const row = res.rows[0];
    return {
      id: row.id,
      versionNumber: Number(row.version_number) || 1,
      versionTag: row.version_tag || `Phiên bản #${row.version_number}`,
      runAt: new Date(row.run_at).toISOString(),
      cycleCode: row.cycle_code,
      triggeredBy: row.triggered_by,
      status: row.status,
      totalMembers: Number(row.total_members) || 0,
      completedMembers: Number(row.completed_members) || 0,
      failedMembers: Number(row.failed_members) || 0,
      cronExpression: row.cron_expression,
      results: (row.results as MemberBatchResult[]) || [],
      errorLog: (row.error_log as string[]) || [],
      durationMs: Number(row.duration_ms) || 0,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    };
  } catch (err) {
    console.warn(`[BatchScheduler] Lỗi tìm batch run ${id}:`, (err as Error).message);
    return cachedBatchRuns.find((r) => r.id === id);
  }
}

/**
 * Generate human-friendly Vietnamese description for a cron expression
 */
export function describeCronSchedule(cron: string): { description: string; nextDetail: string } {
  const parts = cron.trim().split(/\s+/);
  if (parts.length === 5) {
    const min = parts[0] ?? '0';
    const hour = parts[1] ?? '0';
    const dom = parts[2] ?? '*';
    const mon = parts[3] ?? '*';
    const dow = parts[4] ?? '*';
    if (dom === '*' && mon === '*' && dow === '*') {
      if (hour.startsWith('*/')) {
        const step = hour.slice(2);
        return {
          description: `Mỗi ${step} tiếng một lần`,
          nextDetail: `Tự động chạy ngầm mỗi ${step} tiếng một lần (vào phút thứ ${min.padStart(2, '0')}) theo giờ Việt Nam (GMT+7)`,
        };
      }
      if (!hour.includes('*') && !hour.includes(',') && !min.includes('*')) {
        const h = parseInt(hour, 10);
        const m = parseInt(min, 10);
        const period = h < 12 ? 'sáng' : h < 18 ? 'chiều' : 'tối';
        const displayH = String(h).padStart(2, '0');
        const displayM = String(m).padStart(2, '0');
        return {
          description: `${displayH}:${displayM} hàng ngày (${period})`,
          nextDetail: `Hệ thống tự động chạy ngầm mỗi ngày vào đúng ${displayH}:${displayM} (${period}, Giờ Việt Nam GMT+7) để thu thập Jira & Blueprint cho toàn bộ 19 nhân viên`,
        };
      }
    }
  }
  return {
    description: `Theo lịch cron: ${cron}`,
    nextDetail: `Hệ thống tự động chạy theo biểu thức cron "${cron}" (Múi giờ Asia/Ho_Chi_Minh GMT+7)`,
  };
}

/**
 * Schedule metadata information
 */
export function getScheduleInfo(): {
  cronExpression: string;
  scheduleDescription: string;
  systemTimezone: string;
  nextRunDescription: string;
  isActive: boolean;
} {
  const desc = describeCronSchedule(currentCronExpression);
  return {
    cronExpression: currentCronExpression,
    scheduleDescription: desc.description,
    systemTimezone: 'Asia/Ho_Chi_Minh (GMT+7)',
    nextRunDescription: desc.nextDetail,
    isActive: scheduledTask !== null,
  };
}

/**
 * Start/restart the cron scheduler with a given expression
 */
export function startScheduler(pool: Pool, cronExpression = '0 0 * * *'): void {
  currentCronExpression = cronExpression;

  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[BatchScheduler] Đã dừng cron task cũ.');
  }

  if (!cronValidate(cronExpression)) {
    console.error(`[BatchScheduler] Cú pháp cron không hợp lệ: "${cronExpression}". Scheduler chưa kích hoạt.`);
    return;
  }

  scheduledTask = cronSchedule(
    cronExpression,
    async () => {
      console.log(`[BatchScheduler] ⏰ Cron kích hoạt (${cronExpression}) — bắt đầu chạy batch tự động...`);
      await executeBatchRun(pool, 'CRON');
    },
    { timezone: 'Asia/Ho_Chi_Minh' }
  );

  const desc = describeCronSchedule(cronExpression);
  console.log(`[BatchScheduler] ✅ Đã kích hoạt lịch chạy tự động: "${cronExpression}" — ${desc.description} (Asia/Ho_Chi_Minh)`);
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[BatchScheduler] Scheduler đã dừng.');
  }
}

/**
 * Get current cron expression
 */
export function getCurrentCronExpression(): string {
  return currentCronExpression;
}

/**
 * Update cron expression and restart scheduler
 */
export function updateCronExpression(pool: Pool, newExpression: string): boolean {
  if (!cronValidate(newExpression)) return false;
  startScheduler(pool, newExpression);
  return true;
}
