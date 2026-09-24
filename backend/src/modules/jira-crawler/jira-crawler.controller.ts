import { Request, Response } from 'express';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ManagedMember } from './config.js';
import { JiraPimClient, MemberJiraMetrics } from './jira-client.js';
import { AiScoringEngine, EvaluatedKpiRecord } from './ai-evaluator.js';
import { CollectorScriptStore, CollectorScriptConfig } from './collector-script.store.js';
import { sendSuccess, sendFailure } from '../../api/http-response.js';
import {
  executeBatchRun,
  getBatchRuns,
  getBatchRunById,
  updateCronExpression,
  getCurrentCronExpression,
  startScheduler,
  getScheduleInfo,
} from './batch-job.scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ManagedMemberWithCadence extends ManagedMember {
  reviewCadence: string;
  reviewCadenceMonths: number;
  blueprintUsername?: string;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  recommendedDateFrom: string;
  recommendedDateTo: string;
  isDueForReview: boolean;
}

export class JiraCrawlerController {
  private jiraClient: JiraPimClient;
  private pool: Pool;
  private scriptStore: CollectorScriptStore;

  constructor(pool: Pool) {
    this.pool = pool;
    this.jiraClient = new JiraPimClient();
    this.scriptStore = new CollectorScriptStore(pool);
  }

  /**
   * GET /api/collector/jira/payload-export
   * Trả về chuỗi JSON pre-scored 57 records của 19 thành viên cho Tab 4 nạp nhanh
   */
  public getPreScoredPayload = async (_req: Request, res: Response): Promise<void> => {
    try {
      const dataDir = path.resolve(__dirname, '../../../../data');
      const filePath = path.join(dataDir, 'pim-scored-payload-H2-2026.json');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(content);
        return;
      }
      sendFailure(res, 404, 'Payload file not found', 'NOT_FOUND');
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * GET /api/collector/jira/script
   * Lấy cấu hình script thu thập động hiện tại
   */
  public getScriptConfig = async (_req: Request, res: Response): Promise<void> => {
    try {
      const config = await this.scriptStore.getScript();
      sendSuccess(res, 200, 'Collector script configuration retrieved successfully', config);
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * PUT /api/collector/jira/script
   * Lưu hoặc cập nhật cấu hình script thu thập động
   */
  public saveScriptConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const patch = req.body as Partial<CollectorScriptConfig>;
      const actor = (req as unknown as { user?: { email?: string; userId?: string } }).user;
      const updatedBy = actor?.email || actor?.userId || 'Manager';
      const updated = await this.scriptStore.saveScript(patch, updatedBy);
      sendSuccess(res, 200, 'Collector script configuration saved successfully', updated);
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * POST /api/collector/jira/script/reset
   * Khôi phục script về mặc định
   */
  public resetScriptConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const actor = (req as unknown as { user?: { email?: string; userId?: string } }).user;
      const updated = await this.scriptStore.resetDefault(actor?.email || 'admin');
      sendSuccess(res, 200, 'Collector script configuration reset to default', updated);
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * POST /api/collector/jira/script/test
   * Chạy thử nghiệm script thu thập với 1 mã nhân sự mà không ghi dữ liệu vào DB
   */
  public testScript = async (req: Request, res: Response): Promise<void> => {
    try {
      const { employeeCode = '213844', fromDate, toDate, scriptConfig } = req.body as {
        employeeCode?: string;
        fromDate?: string;
        toDate?: string;
        scriptConfig?: Partial<CollectorScriptConfig>;
      };

      const activeConfig = scriptConfig
        ? { ...(await this.scriptStore.getScript()), ...scriptConfig }
        : await this.scriptStore.getScript();

      let memberName = `Nhân viên (${employeeCode})`;
      let memberEmail = `${employeeCode}@cyberlogitec.com`;
      try {
        const empRes = await this.pool.query(
          'SELECT full_name, email FROM employee WHERE employee_code = $1',
          [employeeCode]
        );
        if (empRes.rows.length > 0) {
          memberName = empRes.rows[0].full_name;
          memberEmail = empRes.rows[0].email;
        }
      } catch (error) {
        console.error('Error fetching employee name', error);
      }

      const member = {
        code: employeeCode,
        name: memberName,
        email: memberEmail,
        team: 'ALLEGRO' as const,
      };

      const issues = await this.jiraClient.fetchMemberIssues(employeeCode, {
        fromDate,
        toDate,
        maxLimit: 100,
        scriptConfig: activeConfig,
      });

      const metrics = this.jiraClient.aggregateMemberMetrics(member, issues, activeConfig);

      sendSuccess(res, 200, 'Script test executed successfully', {
        employeeCode,
        memberName: member.name,
        totalFound: issues.length,
        metrics,
        sampleIssues: issues.slice(0, 10),
        activeScriptUsed: {
          jqlTemplate: activeConfig.jqlTemplate,
          picCustomField: activeConfig.picCustomField,
          completedStatuses: activeConfig.completedStatuses,
          bugIssueTypes: activeConfig.bugIssueTypes,
        },
      });
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * GET /api/collector/jira/members
   * Return the list of 19 managed members with their Review Cadence & dates
   */
  public getMembers = async (_req: Request, res: Response): Promise<void> => {
    try {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const scriptConfig = await this.scriptStore.getScript();
      const defaultFromDays = scriptConfig.defaultFromDays ?? 180;
      const leadTimeDays = scriptConfig.leadTimeDays ?? 7;
      const defaultFromDate = new Date(now.getTime() - defaultFromDays * 86400000).toISOString().slice(0, 10);

      // Query database for employees and their review cadences
      const empRes = await this.pool.query(
        `SELECT employee_code as code, full_name as name, email, blueprint_username,
                review_cadence, review_cadence_months, last_evaluation_completed_at, next_review_due_date, join_date
         FROM employee
         WHERE manager_id = (SELECT employee_id FROM employee WHERE employee_code = '163188')
            OR (employee_code != '163188' AND manager_id IS NOT NULL)
         ORDER BY full_name ASC`
      );

      const rows = empRes.rows;

      const enrichedMembers: ManagedMemberWithCadence[] = rows.map((row) => {
        const lastReview = row.last_evaluation_completed_at
          ? new Date(row.last_evaluation_completed_at).toISOString().slice(0, 10)
          : null;
        const nextReview = row.next_review_due_date
          ? new Date(row.next_review_due_date).toISOString().slice(0, 10)
          : null;

        const recommendedDateFrom = lastReview || defaultFromDate;
        const recommendedDateTo = today;

        // Due for review if nextReview is null or due within leadTimeDays
        let isDueForReview = true;
        if (nextReview) {
          const dueTime = new Date(nextReview).getTime();
          const thresholdTime = now.getTime() + leadTimeDays * 86400000;
          isDueForReview = dueTime <= thresholdTime;
        }

        return {
          code: row.code,
          name: row.name,
          email: row.email,
          team: 'ALLEGRO' as const,
          blueprintUsername: row.blueprint_username || undefined,
          reviewCadence: row.review_cadence || 'SEMIANNUAL',
          reviewCadenceMonths: row.review_cadence_months || 6,
          lastReviewDate: lastReview,
          nextReviewDate: nextReview,
          recommendedDateFrom,
          recommendedDateTo,
          isDueForReview,
        };
      });

      sendSuccess(res, 200, 'Managed members retrieved successfully with Review Cadence', {
        manager: 'Lương Công Kỳ (ky.luong)',
        total: enrichedMembers.length,
        members: enrichedMembers,
      });
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * POST /api/collector/jira/evaluate
   * Crawl Jira PIM and run Gemini AI evaluation for a single employee
   */
  public evaluateMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        employeeCode,
        cycleCode = 'H2-2026',
        fromDate,
        toDate,
      } = req.body as {
        employeeCode?: string;
        cycleCode?: string;
        fromDate?: string;
        toDate?: string;
      };

      if (!employeeCode) {
        sendFailure(res, 400, 'employeeCode is required', 'VALIDATION_ERROR');
        return;
      }

      const empRes = await this.pool.query(
        'SELECT employee_code as code, full_name as name, email FROM employee WHERE employee_code = $1',
        [employeeCode]
      );
      const member = empRes.rows.length > 0
        ? { code: empRes.rows[0].code, name: empRes.rows[0].name, email: empRes.rows[0].email, team: 'ALLEGRO' as const }
        : null;

      if (!member) {
        sendFailure(
          res,
          404,
          `Employee code '${employeeCode}' is not in managed members list.`,
          'NOT_FOUND'
        );
        return;
      }

      // 1. Get dynamic script config
      const scriptConfig = await this.scriptStore.getScript();

      console.log(
        `[JiraCrawlerController] Crawling Jira PIM for ${member.name} (${member.code}) [Date range: ${fromDate || 'all'} -> ${toDate || 'all'}]...`
      );

      const issues = await this.jiraClient.fetchMemberIssues(member.code, {
        fromDate,
        toDate,
        scriptConfig,
      });

      const metrics: MemberJiraMetrics = this.jiraClient.aggregateMemberMetrics(member, issues, scriptConfig);

      console.log(`[JiraCrawlerController] Evaluating with Gemini (${scriptConfig.geminiModel}) for ${member.name}...`);
      const engine = new AiScoringEngine(
        cycleCode,
        process.env.GEMINI_API_KEY,
        scriptConfig.scoringRubric,
        scriptConfig.geminiModel,
        scriptConfig.aiPromptTemplate,
        scriptConfig.aiTaskPromptTemplate
      );
      const records: EvaluatedKpiRecord[] = await engine.evaluateMember(metrics);

      // Check for existing Blueprint scores to preview potential blending
      const checkRes = await this.pool.query(
        `SELECT ei.evaluation_item_id, ei.criterion_code_snapshot, ei.raw_score, ei.system_source,
                m.measurement_value, m.source_label
         FROM evaluation e
         JOIN employee emp ON e.employee_id = emp.employee_id
         JOIN evaluation_cycle ec ON e.evaluation_cycle_id = ec.evaluation_cycle_id
         JOIN evaluation_item ei ON e.evaluation_id = ei.evaluation_id
         LEFT JOIN LATERAL (
           SELECT measurement_value, source_label FROM measurement
           WHERE evaluation_item_id = ei.evaluation_item_id AND (source_label ILIKE '%Blueprint%' OR source_label ILIKE '%UI_PIM%')
           ORDER BY recorded_at DESC LIMIT 1
         ) m ON true
         WHERE emp.employee_code = $1 AND ec.code = $2`,
        [employeeCode, cycleCode]
      );

      const existingBlueprintScores: Record<string, number> = {};
      for (const row of checkRes.rows) {
        const bpVal = row.measurement_value != null ? Number(row.measurement_value) : (row.system_source?.includes('Blueprint') ? Number(row.raw_score) : null);
        if (bpVal != null && !isNaN(bpVal)) {
          existingBlueprintScores[row.criterion_code_snapshot] = bpVal;
        }
      }

      // Annotate records with blending preview
      const annotatedRecords = records.map((rec) => {
        const bpScore = existingBlueprintScores[rec.kpi_code];
        if (bpScore != null) {
          const normBp = bpScore <= 10 ? bpScore * 10 : bpScore;
          const normJira = rec.value <= 10 ? rec.value * 10 : rec.value;
          const blendedVal = Math.round(((normBp + normJira) / 2) * 10) / 10;
          return {
            ...rec,
            blendingInfo: {
              hasBlueprint: true,
              blueprintScore: normBp,
              jiraScore: normJira,
              blendedScore: blendedVal,
              note: `Tiêu chí này đã có điểm từ Blueprint (${normBp}%). Khi áp dụng, hệ thống sẽ tự động tích hợp điểm trung bình (Blueprint + Jira)/2 = ${blendedVal}%.`,
            },
          };
        }
        return rec;
      });

      sendSuccess(res, 200, `Successfully evaluated ${member.name} with Jira & Gemini AI`, {
        member,
        metrics,
        cycleCode,
        fromDate: fromDate || null,
        toDate: toDate || null,
        evaluatedAt: new Date().toISOString(),
        evaluator: 'Google Gemini 3.5 Flash + Calibrated Rubric v2.0',
        scriptUsed: scriptConfig.name,
        records: annotatedRecords,
      });
    } catch (err) {
      console.error('[JiraCrawlerController] evaluateMember error:', err);
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * POST /api/collector/jira/apply
   * Persist evaluated KPI records with Blueprint Blending & Review Cadence update
   */
  public applyMemberKpis = async (req: Request, res: Response): Promise<void> => {
    const client = await this.pool.connect();
    try {
      const {
        employeeCode,
        cycleCode = 'H2-2026',
        records,
        markReviewed = true,
      } = req.body as {
        employeeCode: string;
        cycleCode?: string;
        records: (EvaluatedKpiRecord & { blendingInfo?: { blueprintScore: number; blendedScore: number } })[];
        markReviewed?: boolean;
      };

      if (!employeeCode || !records || !Array.isArray(records) || records.length === 0) {
        sendFailure(res, 400, 'employeeCode and a non-empty records array are required', 'VALIDATION_ERROR');
        return;
      }

      await client.query('BEGIN');

      // 1. Resolve employee
      const empRes = await client.query(
        'SELECT employee_id, full_name, review_cadence FROM employee WHERE employee_code = $1',
        [employeeCode]
      );
      if (empRes.rows.length === 0) {
        await client.query('ROLLBACK');
        sendFailure(res, 404, `Employee with code '${employeeCode}' not found in database.`, 'NOT_FOUND');
        return;
      }
      const employeeId = empRes.rows[0].employee_id;
      const employeeName = empRes.rows[0].full_name;

      // 2. Resolve evaluation cycle
      const cycleRes = await client.query(
        'SELECT evaluation_cycle_id, status FROM evaluation_cycle WHERE code = $1',
        [cycleCode]
      );
      if (cycleRes.rows.length === 0) {
        await client.query('ROLLBACK');
        sendFailure(res, 404, `Evaluation cycle '${cycleCode}' not found.`, 'NOT_FOUND');
        return;
      }
      if (cycleRes.rows[0].status === 'LOCKED') {
        await client.query('ROLLBACK');
        sendFailure(res, 400, `Evaluation cycle '${cycleCode}' is LOCKED.`, 'CYCLE_LOCKED');
        return;
      }
      const cycleId = cycleRes.rows[0].evaluation_cycle_id;

      // 3. Resolve evaluation
      const evalRes = await client.query(
        'SELECT evaluation_id, status FROM evaluation WHERE evaluation_cycle_id = $1 AND employee_id = $2 FOR UPDATE',
        [cycleId, employeeId]
      );
      if (evalRes.rows.length === 0) {
        await client.query('ROLLBACK');
        sendFailure(
          res,
          404,
          `Evaluation for employee '${employeeName}' (${employeeCode}) not found in cycle '${cycleCode}'.`,
          'NOT_FOUND'
        );
        return;
      }
      const evaluationId = evalRes.rows[0].evaluation_id;

      let appliedCount = 0;
      let blendedCount = 0;

      // 4. Update each KPI record with Blueprint Blending
      for (const rec of records) {
        const itemRes = await client.query(
          `SELECT evaluation_item_id, raw_score, system_source, comment, rationale
           FROM evaluation_item
           WHERE evaluation_id = $1 AND (criterion_code_snapshot = $2 OR kpi_code_snapshot = $2)`,
          [evaluationId, rec.kpi_code]
        );

        if (itemRes.rows.length === 0) {
          console.warn(`[applyMemberKpis] Item '${rec.kpi_code}' not found for evaluation ${evaluationId}`);
          continue;
        }

        const evaluationItemId = itemRes.rows[0].evaluation_item_id;
        const currentItem = itemRes.rows[0];

        // Check if there is an existing Blueprint measurement
        const bpMeasurementRes = await client.query(
          `SELECT measurement_value, source_label FROM measurement
           WHERE evaluation_item_id = $1 AND (source_label ILIKE '%Blueprint%' OR source_label ILIKE '%UI_PIM%')
           ORDER BY recorded_at DESC LIMIT 1`,
          [evaluationItemId]
        );

        let finalValue = rec.value;
        let finalSource = rec.source_snapshot?.source_name || 'CyberLogitec Jira PIM';
        let finalRationale = rec.rationale;
        let finalComment = rec.comment;
        const hasBpMeasurement = bpMeasurementRes.rows.length > 0;
        const hasBpSource = currentItem.system_source && currentItem.system_source.includes('Blueprint');

        if (hasBpMeasurement || hasBpSource) {
          const bpRaw = hasBpMeasurement
            ? Number(bpMeasurementRes.rows[0].measurement_value)
            : Number(currentItem.raw_score);

          if (!isNaN(bpRaw) && bpRaw != null) {
            const normBp = bpRaw <= 10 ? bpRaw * 10 : bpRaw;
            const normJira = rec.value <= 10 ? rec.value * 10 : rec.value;
            finalValue = Math.round(((normBp + normJira) / 2) * 10) / 10;
            finalSource = 'BLENDED (Blueprint + Jira)';
            blendedCount++;

            finalRationale = `[🔀 Điểm kết hợp Blueprint + Jira]: Blueprint: ${normBp}% | Jira: ${normJira}% => Điểm tích hợp: ${finalValue}%. ${rec.rationale}`;
            finalComment = `${rec.comment} (Tích hợp tự động 50% Blueprint + 50% Jira)`;
          }
        }

        // Update evaluation_item
        await client.query(
          `UPDATE evaluation_item
           SET comment = $1,
               rationale = $2,
               source_snapshot = $3,
               resolved_level = $4,
               raw_score = $5,
               system_source = $6,
               updated_at = CURRENT_TIMESTAMP
           WHERE evaluation_item_id = $7`,
          [
            finalComment,
            finalRationale,
            JSON.stringify(rec.source_snapshot),
            rec.resolved_level,
            finalValue,
            finalSource,
            evaluationItemId,
          ]
        );

        // Insert measurement
        await client.query(
          `INSERT INTO measurement (
             measurement_id, evaluation_item_id, measurement_key, measurement_value, recorded_at, source_label
           ) VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP, $4)`,
          [
            evaluationItemId,
            rec.kpi_code,
            finalValue,
            finalSource,
          ]
        );

        // Insert evidences
        if (rec.evidences && rec.evidences.length > 0) {
          for (const ev of rec.evidences) {
            await client.query(
              `INSERT INTO evidence (
                 evidence_id, evaluation_item_id, evidence_type, evidence_value, title,
                 evidence_url, rationale, source, status
               ) VALUES (
                 gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'JIRA', 'ACTIVE'
               )`,
              [
                evaluationItemId,
                ev.evidence_type,
                ev.evidence_url || ev.title,
                ev.title,
                ev.evidence_url || null,
                finalRationale || null,
              ]
            );
          }
        }

        appliedCount++;
      }

      // 5. Update Review Cadence for employee if markReviewed is true
      if (markReviewed) {
        await client.query(
          `UPDATE employee
           SET last_evaluation_completed_at = CURRENT_TIMESTAMP,
               next_review_due_date = CURRENT_TIMESTAMP + (COALESCE(review_cadence_months, 6) || ' months')::INTERVAL
           WHERE employee_id = $1`,
          [employeeId]
        );
      }

      await client.query('COMMIT');

      sendSuccess(res, 200, `Successfully applied ${appliedCount} KPI records for ${employeeName}`, {
        employeeCode,
        employeeName,
        appliedCount,
        blendedCount,
        cycleCode,
        reviewMarked: markReviewed,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[JiraCrawlerController] applyMemberKpis error:', err);
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    } finally {
      client.release();
    }
  };

  // ────────────────────────────────────────────────────────────────
  // BATCH JOB ENDPOINTS
  // ────────────────────────────────────────────────────────────────

  /**
   * POST /api/collector/jira/batch-run
   * Trigger a manual batch run for all managed members
   */
  public triggerBatchRun = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cycleCode = 'H2-2026' } = req.body as { cycleCode?: string };

      // Start batch in background, return immediately with run ID
      const runId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      console.log(`[BatchRun] Manual trigger by user — starting run ${runId}`);

      // Execute in background (don't await)
      executeBatchRun(this.pool, 'MANUAL', cycleCode)
        .then((run) => {
          console.log(`[BatchRun] Completed run ${run.id}: ${run.completedMembers}/${run.totalMembers} succeeded`);
        })
        .catch((err: Error) => {
          console.error(`[BatchRun] Fatal error:`, err.message);
        });

      const managerCode = process.env.JIRA_MANAGER_CODE || '163188';
      const memberCountRes = await this.pool.query(
        `SELECT COUNT(*) as cnt FROM employee WHERE manager_id = (SELECT employee_id FROM employee WHERE employee_code = $1) OR (employee_code != $1 AND manager_id IS NOT NULL)`,
        [managerCode]
      );
      const totalCount = parseInt(memberCountRes.rows[0]?.cnt || '19', 10);

      // Return immediately
      sendSuccess(res, 202, 'Batch run started in background', {
        status: 'STARTED',
        message: `Đang chạy batch cho ${totalCount} thành viên. Tải lại danh sách để xem kết quả.`,
        totalMembers: totalCount,
        cycleCode,
      });
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * GET /api/collector/jira/batch-runs
   * Get all batch run history from database (most recent first)
   */
  public getBatchRuns = async (_req: Request, res: Response): Promise<void> => {
    try {
      const runs = await getBatchRuns(this.pool);
      const summary = runs.map((r) => ({
        id: r.id,
        versionNumber: r.versionNumber,
        versionTag: r.versionTag,
        runAt: r.runAt,
        cycleCode: r.cycleCode,
        triggeredBy: r.triggeredBy,
        status: r.status,
        totalMembers: r.totalMembers,
        completedMembers: r.completedMembers,
        failedMembers: r.failedMembers,
        durationMs: r.durationMs,
        cronExpression: r.cronExpression,
        blueprintMembersCount: r.results.filter((res) => res.blueprintSummary?.hasData).length,
        errorLog: r.errorLog || [],
        // Quick score summary (without full task details)
        scoreSummary: r.results.map((res) => ({
          employeeCode: res.employeeCode,
          memberName: res.memberName,
          team: res.team,
          overallScore: res.overallScore,
          overallLevel: res.overallLevel,
          dateFrom: res.dateFrom,
          dateTo: res.dateTo,
          evaluatedAt: res.evaluatedAt,
          hasBlueprint: Boolean(res.blueprintSummary?.hasData),
          kpiScores: res.records.map((rec) => ({
            kpi_code: rec.kpi_code,
            value: rec.value,
            resolved_level: rec.resolved_level,
          })),
          taskContributionCount: res.taskContributions.length,
          avgTaskContribution:
            res.taskContributions.length > 0
              ? Math.round(
                  (res.taskContributions.reduce((s, t) => s + t.contributionScore, 0) /
                    res.taskContributions.length) *
                    10
                ) / 10
              : null,
        })),
      }));

      sendSuccess(res, 200, `Retrieved ${runs.length} batch run(s)`, {
        total: runs.length,
        currentCron: getCurrentCronExpression(),
        schedule: getScheduleInfo(),
        runs: summary,
      });
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * GET /api/collector/jira/batch-runs/:id
   * Get full detail for a single batch run (includes task contributions and Blueprint summaries)
   */
  public getBatchRunDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const run = await getBatchRunById(this.pool, id);
      if (!run) {
        sendFailure(res, 404, `Batch run '${id}' not found`, 'NOT_FOUND');
        return;
      }
      sendSuccess(res, 200, 'Batch run detail retrieved', run);
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * GET /api/collector/jira/batch-schedule
   * Get current auto-collect schedule metadata
   */
  public getBatchSchedule = async (_req: Request, res: Response): Promise<void> => {
    try {
      const schedule = getScheduleInfo();
      sendSuccess(res, 200, 'Thông tin lịch chạy tự động', schedule);
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * GET /api/collector/jira/batch-runs/:runId/member/:employeeCode
   * Get full detail for a single member within a batch run
   */
  public getMemberRunDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const runId = req.params['runId'] as string;
      const employeeCode = req.params['employeeCode'] as string;
      const run = await getBatchRunById(this.pool, runId);
      if (!run) {
        sendFailure(res, 404, `Batch run '${runId}' not found`, 'NOT_FOUND');
        return;
      }
      const memberResult = run.results.find((r) => r.employeeCode === employeeCode);
      if (!memberResult) {
        sendFailure(res, 404, `Member '${employeeCode}' not found in run '${runId}'`, 'NOT_FOUND');
        return;
      }
      sendSuccess(res, 200, 'Member batch result retrieved', memberResult);
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * PUT /api/collector/jira/batch-cron
   * Update the cron expression for the batch scheduler
   */
  public updateBatchCron = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cronExpression } = req.body as { cronExpression: string };
      if (!cronExpression) {
        sendFailure(res, 400, 'cronExpression is required', 'VALIDATION_ERROR');
        return;
      }
      const success = updateCronExpression(this.pool, cronExpression);
      if (!success) {
        sendFailure(res, 400, `Invalid cron expression: '${cronExpression}'`, 'VALIDATION_ERROR');
        return;
      }
      sendSuccess(res, 200, 'Cron expression updated and scheduler restarted', {
        cronExpression,
        message: `Batch job sẽ chạy theo lịch: ${cronExpression}`,
      });
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * POST /api/collector/jira/members/:code/apply-batch
   * Apply a single member's batch result to the DB
   */
  public applyBatchMemberResult = async (req: Request, res: Response): Promise<void> => {
    try {
      const employeeCode = req.params['code'] as string;
      const { runId, cycleCode = 'H2-2026', markReviewed = false } = req.body as {
        runId: string;
        cycleCode?: string;
        markReviewed?: boolean;
      };

      if (!runId) {
        sendFailure(res, 400, 'runId is required', 'VALIDATION_ERROR');
        return;
      }

      const run = await getBatchRunById(this.pool, runId);
      if (!run) {
        sendFailure(res, 404, `Batch run '${runId}' not found`, 'NOT_FOUND');
        return;
      }

      const memberResult = run.results.find((r) => r.employeeCode === employeeCode);
      if (!memberResult) {
        sendFailure(res, 404, `Member '${employeeCode}' not found in run '${runId}'`, 'NOT_FOUND');
        return;
      }

      // Delegate to existing applyMemberKpis logic by constructing request body
      req.body = {
        employeeCode,
        cycleCode,
        records: memberResult.records,
        markReviewed,
      };

      // Reuse existing apply logic (it manages its own pool connection)
      await this.applyMemberKpis(req, res);
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * PATCH /api/collector/jira/members/:code/cadence
   * Cập nhật chu kỳ đánh giá (review_cadence_months) và ngày đánh giá tiếp theo cho nhân viên
   */
  public updateMemberCadence = async (req: Request, res: Response): Promise<void> => {
    try {
      const employeeCode = req.params['code'] as string;
      const { reviewCadenceMonths, nextReviewDueDate, blueprintUsername } = req.body as {
        reviewCadenceMonths?: number;
        nextReviewDueDate?: string;
        blueprintUsername?: string;
      };

      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (typeof reviewCadenceMonths === 'number' && reviewCadenceMonths > 0) {
        fields.push(`review_cadence_months = $${idx++}`);
        values.push(reviewCadenceMonths);
      }

      if (nextReviewDueDate !== undefined) {
        fields.push(`next_review_due_date = $${idx++}`);
        values.push(nextReviewDueDate ? new Date(nextReviewDueDate) : null);
      }

      if (blueprintUsername !== undefined) {
        fields.push(`blueprint_username = $${idx++}`);
        values.push(blueprintUsername || null);
      }

      if (fields.length === 0) {
        sendFailure(res, 400, 'Không có thông tin nào được truyền để cập nhật', 'VALIDATION_ERROR');
        return;
      }

      values.push(employeeCode);
      const updateRes = await this.pool.query(
        `UPDATE employee SET ${fields.join(', ')} WHERE employee_code = $${idx}
         RETURNING employee_code, full_name, review_cadence_months, next_review_due_date, blueprint_username`,
        values
      );

      if (updateRes.rows.length === 0) {
        sendFailure(res, 404, `Nhân viên với mã ${employeeCode} không tồn tại`, 'NOT_FOUND');
        return;
      }

      sendSuccess(res, 200, `Cập nhật thông tin chu kỳ đánh giá thành công cho ${updateRes.rows[0].full_name}`, updateRes.rows[0]);
    } catch (err) {
      sendFailure(res, 500, (err as Error).message, 'SERVER_ERROR');
    }
  };

  /**
   * Initialize the batch scheduler (call on app startup)
   */
  public initScheduler(cronExpression = '0 0 * * *'): void {
    startScheduler(this.pool, cronExpression);
  }
}

