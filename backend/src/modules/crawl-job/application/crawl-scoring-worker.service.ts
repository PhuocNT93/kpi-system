import { Pool } from 'pg';
import { GeminiScoringClient } from './gemini-scoring-client.js';
import { CrawlScoringExecutionRecord } from '../domain/crawl-scoring.types.js';

export interface CrawlScoringWorkerOptions {
  workerId?: string;
  pollIntervalMs?: number;
  leaseMs?: number;
}

export class CrawlScoringWorkerService {
  private readonly workerId: string;
  private readonly leaseMs: number;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly pool: Pool,
    private readonly geminiClient: GeminiScoringClient,
    options: CrawlScoringWorkerOptions = {}
  ) {
    this.workerId = options.workerId || `scoring-worker-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
    this.leaseMs = options.leaseMs || 60_000;
  }

  start(pollIntervalMs = 2000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    void this.runLoop(pollIntervalMs);
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async runLoop(pollIntervalMs: number): Promise<void> {
    while (this.isRunning) {
      try {
        const processed = await this.processNextScoringTask();
        if (!processed) {
          await new Promise((resolve) => {
            this.timer = setTimeout(resolve, pollIntervalMs);
          });
        }
      } catch (err: unknown) {
        console.error('[CrawlScoringWorker] Error in scoring worker loop:', err);
        await new Promise((resolve) => {
          this.timer = setTimeout(resolve, pollIntervalMs);
        });
      }
    }
  }

  /**
   * Process a single queued scoring task.
   * Enforces Rule 5: 1 Crawl Row = 1 AI Scoring Unit.
   */
  async processNextScoringTask(): Promise<boolean> {
    const client = await this.pool.connect();
    let task: CrawlScoringExecutionRecord | null = null;

    try {
      await client.query('BEGIN');

      const claimResult = await client.query(
        `SELECT * FROM crawl_scoring_execution
         WHERE status IN ('QUEUED', 'RETRYING')
           AND next_retry_at <= NOW()
           AND (locked_at IS NULL OR locked_at < NOW() - ($1 || ' milliseconds')::interval)
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
        [this.leaseMs]
      );

      if (claimResult.rows.length === 0) {
        await client.query('COMMIT');
        return false;
      }

      task = claimResult.rows[0] as CrawlScoringExecutionRecord;

      await client.query(
        `UPDATE crawl_scoring_execution
         SET status = 'RUNNING',
             locked_at = NOW(),
             locked_by = $1,
             started_at = COALESCE(started_at, NOW()),
             updated_at = NOW()
         WHERE id = $2`,
        [this.workerId, task.id]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    if (!task) return false;

    // Process the claimed task outside the transaction
    await this.executeTask(task);
    return true;
  }

  private async executeTask(task: CrawlScoringExecutionRecord): Promise<void> {
    try {
      // 1. Load exact raw row from evaluation_data_import_record
      const rowResult = await this.pool.query(
        `SELECT r.record_id, r.employee_code, r.kpi_code, r.value, r.comment, r.rationale, r.source_snapshot,
                i.source_system, c.code AS cycle_code, c.name AS cycle_name
         FROM evaluation_data_import_record r
         JOIN evaluation_data_import i ON r.import_id = i.import_id
         LEFT JOIN evaluation_cycle c ON r.cycle_id = c.evaluation_cycle_id
         WHERE r.record_id = $1`,
        [task.crawl_data_row_id]
      );

      if (rowResult.rows.length === 0) {
        throw new Error(`Raw crawl row ${task.crawl_data_row_id} not found in database.`);
      }

      const rawRow = rowResult.rows[0] as {
        record_id: string;
        employee_code: string;
        kpi_code: string;
        value: number;
        comment: string | null;
        rationale: string;
        source_snapshot: Record<string, unknown>;
        source_system: string;
        cycle_code: string | null;
        cycle_name: string | null;
      };

      // 2. Load prompt version (if specified, or latest published for this criterion)
      let promptVersion: {
        prompt_version_id: string;
        system_prompt: string;
        user_prompt_template: string;
        model: string;
        temperature: number;
      } | null = null;

      if (task.prompt_version_id) {
        const pvRes = await this.pool.query(
          `SELECT prompt_version_id, system_prompt, user_prompt_template, model, temperature
           FROM kpi_scoring_prompt_version WHERE prompt_version_id = $1`,
          [task.prompt_version_id]
        );
        if (pvRes.rows.length > 0) promptVersion = pvRes.rows[0];
      }

      if (!promptVersion) {
        const defaultPvRes = await this.pool.query(
          `SELECT v.prompt_version_id, v.system_prompt, v.user_prompt_template, v.model, v.temperature
           FROM kpi_scoring_prompt_version v
           JOIN kpi_scoring_prompt p ON v.prompt_id = p.prompt_id
           WHERE p.criterion_code = $1 AND v.status = 'PUBLISHED'
           ORDER BY v.version_no DESC LIMIT 1`,
          [task.criterion_code]
        );
        if (defaultPvRes.rows.length > 0) promptVersion = defaultPvRes.rows[0];
      }

      if (!promptVersion) {
        const scriptRes = await this.pool.query(
          `SELECT s.scoring_prompt
           FROM crawl_job_execution e
           JOIN crawl_job_definition j ON e.crawl_job_definition_id = j.crawl_job_definition_id
           JOIN crawl_script_version s ON j.crawl_script_version_id = s.crawl_script_version_id
           WHERE e.crawl_job_execution_id = $1`,
          [task.crawl_execution_id]
        );
        if (scriptRes.rows[0]?.scoring_prompt) {
          promptVersion = {
            prompt_version_id: 'script-embedded-prompt',
            system_prompt: 'You are an expert HR evaluation analyst assessing employee deliverables from crawler data. Provide a numeric score between 1.00 and 5.00, detailed rationale, confidence between 0.0 and 1.0, and evidence citations.',
            user_prompt_template: scriptRes.rows[0].scoring_prompt,
            model: 'gemini-2.5-flash',
            temperature: 0.20,
          };
        }
      }

      // 3. Fallback prompt if none registered
      const systemPrompt = promptVersion?.system_prompt ||
        `You are a strict, objective HR and Technical Performance Evaluation specialist.
You evaluate ONE KPI record at a time. Evaluate ONLY the supplied data facts. Do not infer facts not present.
Return a valid JSON object matching:
{
  "score": <number 1.0 to 5.0>,
  "reason": "<clear explanation referencing the exact data evidence>",
  "confidence": <number 0.0 to 1.0>,
  "evidence": [{"claim": "<specific factual observation>"}]
}`;

      const userTemplate = promptVersion?.user_prompt_template ||
        `Please evaluate this single KPI record:
- Employee: {{employee_code}}
- KPI Criterion: {{criterion_code}}
- Measurement Value: {{measurement_value}}
- Cycle: {{evaluation_cycle}}
- Raw Data: {{raw_data}}
- Source Reference: {{source_reference}}`;

      // 4. Safely render prompt template placeholders
      const rawSnapshot = rawRow.source_snapshot || {};
      const tasksJson = JSON.stringify(rawSnapshot['tasks'] || [], null, 2);
      const renderedUserPrompt = userTemplate
        .replace(/\{\{employee_code\}\}/g, rawRow.employee_code || '')
        .replace(/\{\{employee\}\}/g, rawRow.employee_code || '')
        .replace(/\{\{criterion_code\}\}/g, rawRow.kpi_code || '')
        .replace(/\{\{criterion\}\}/g, rawRow.kpi_code || '')
        .replace(/\{\{measurement_value\}\}/g, String(rawRow.value ?? 0))
        .replace(/\{\{measurement\}\}/g, String(rawRow.value ?? 0))
        .replace(/\{\{evaluation_cycle\}\}/g, rawRow.cycle_name || rawRow.cycle_code || '')
        .replace(/\{\{target_cycle_code\}\}/g, rawRow.cycle_code || '')
        .replace(/\{\{source_reference\}\}/g, String(rawSnapshot['source_reference'] || rawRow.comment || ''))
        .replace(/\{\{source\}\}/g, rawRow.source_system || '')
        .replace(/\{\{source_system\}\}/g, rawRow.source_system || '')
        .replace(/\{\{tasks\}\}/g, tasksJson)
        .replace(/\{\{raw_payload\}\}/g, JSON.stringify(rawSnapshot['raw_payload'] || rawSnapshot, null, 2))
        .replace(/\{\{raw_data\}\}/g, JSON.stringify(rawSnapshot['raw_payload'] || rawSnapshot, null, 2));

      const inputSnapshot = {
        employee_code: rawRow.employee_code,
        criterion_code: rawRow.kpi_code,
        measurement_value: rawRow.value,
        raw_snapshot: rawSnapshot,
        prompt_version_id: promptVersion?.prompt_version_id || null,
        rendered_prompt: renderedUserPrompt,
      };

      // 5. Call Gemini
      const geminiResult = await this.geminiClient.evaluateRow({
        systemPrompt,
        userPrompt: renderedUserPrompt,
        model: promptVersion?.model || 'gemini-2.5-flash',
        temperature: promptVersion?.temperature || 0.2,
      });

      // 6. Validate score constraints (1.0 to 5.0)
      if (geminiResult.score < 1.0 || geminiResult.score > 5.0) {
        throw new Error(`Evaluated score ${geminiResult.score} is outside allowed KPI rubric range [1.0 - 5.0]`);
      }

      // Multi-source scoring check: If another source system scored this employee + criterion in this cycle, average them
      const prevScoreRes = await this.pool.query(
        `SELECT id, score, confidence, reason, crawl_execution_id
         FROM crawl_scoring_execution
         WHERE evaluation_cycle_id = $1
           AND UPPER(employee_code) = UPPER($2)
           AND UPPER(criterion_code) = UPPER($3)
           AND status = 'SUCCESS'
           AND id != $4
         ORDER BY created_at DESC
         LIMIT 1`,
        [task.evaluation_cycle_id, task.employee_code, task.criterion_code, task.id]
      );

      let finalScore = geminiResult.score;
      let finalConfidence = geminiResult.confidence ?? 0.90;
      let finalReason = geminiResult.reason;

      if (prevScoreRes.rows.length > 0 && prevScoreRes.rows[0].score != null) {
        const prev = prevScoreRes.rows[0];
        const prevScoreVal = Number(prev.score);
        finalScore = Math.round(((prevScoreVal + geminiResult.score) / 2) * 100) / 100;
        finalConfidence = Math.round(((Number(prev.confidence ?? 0.90) + finalConfidence) / 2) * 100) / 100;
        finalReason = `[Điểm TB hợp nhất 2 nguồn: Nguồn 1 = ${prevScoreVal.toFixed(2)} | Nguồn 2 = ${geminiResult.score.toFixed(2)} → Điểm TB: ${finalScore.toFixed(2)}/5.0]. ` + geminiResult.reason;

        // Sync previous scoring record so both reflect the averaged score
        const cleanPrevReason = (prev.reason || '').replace(/^\[Điểm TB hợp nhất 2 nguồn:.*?\]\.\s*/, '');
        await this.pool.query(
          `UPDATE crawl_scoring_execution
           SET score = $1,
               confidence = $2,
               reason = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [
            finalScore,
            finalConfidence,
            `[Điểm TB hợp nhất 2 nguồn: Nguồn 1 = ${prevScoreVal.toFixed(2)} | Nguồn 2 = ${geminiResult.score.toFixed(2)} → Điểm TB: ${finalScore.toFixed(2)}/5.0]. ` + cleanPrevReason,
            prev.id,
          ]
        );
      }

      // 7. Persist successful row evaluation with immutable snapshots
      await this.pool.query(
        `UPDATE crawl_scoring_execution
         SET status = 'SUCCESS',
             score = $1,
             reason = $2,
             confidence = $3,
             evidence = $4,
             flags = $5,
             input_snapshot = $6,
             output_snapshot = $7,
             model = $8,
             prompt_version_id = COALESCE($9, prompt_version_id),
             finished_at = NOW(),
             locked_at = NULL,
             locked_by = NULL,
             error_code = NULL,
             error_message = NULL,
             updated_at = NOW()
         WHERE id = $10`,
        [
          finalScore,
          finalReason,
          finalConfidence,
          JSON.stringify(geminiResult.evidence || []),
          JSON.stringify(geminiResult.flags || []),
          JSON.stringify(inputSnapshot),
          JSON.stringify({ ...geminiResult, blended_score: finalScore, is_averaged: prevScoreRes.rows.length > 0 }),
          promptVersion?.model || 'gemini-2.5-flash',
          promptVersion?.prompt_version_id || null,
          task.id,
        ]
      );
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Scoring evaluation failed';
      console.error(`[CrawlScoringWorker] Failed scoring task ${task.id}: ${errorMsg}`);

      const nextAttempt = task.attempt_no + 1;
      const willRetry = nextAttempt <= task.max_attempts;

      await this.pool.query(
        `UPDATE crawl_scoring_execution
         SET status = $1,
             attempt_no = $2,
             next_retry_at = NOW() + ($3 || ' seconds')::interval,
             locked_at = NULL,
             locked_by = NULL,
             error_code = 'SCORING_ERROR',
             error_message = $4,
             finished_at = CASE WHEN $1 = 'FAILED' THEN NOW() ELSE finished_at END,
             updated_at = NOW()
         WHERE id = $5`,
        [
          willRetry ? 'RETRYING' : 'FAILED',
          nextAttempt,
          nextAttempt * 30, // exponential backoff
          errorMsg,
          task.id,
        ]
      );
    }
  }

  /**
   * Enqueue scoring tasks for newly staged rows of a crawl execution.
   * Called by CrawlExecutionWorkerService upon successful raw staging.
   */
  async enqueueTasksForExecution(crawlExecutionId: string): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO crawl_scoring_execution (
        crawl_data_row_id,
        crawl_execution_id,
        employee_code,
        criterion_code,
        evaluation_cycle_id,
        status,
        prompt_version_id,
        created_at,
        updated_at
      )
      SELECT
        r.record_id,
        e.crawl_job_execution_id,
        r.employee_code,
        r.kpi_code,
        e.evaluation_cycle_id,
        'QUEUED',
        COALESCE(cjc.scoring_prompt_version_id, pv.prompt_version_id),
        NOW(),
        NOW()
      FROM evaluation_data_import_record r
      JOIN crawl_job_execution e ON e.crawl_job_execution_id = $1
      LEFT JOIN criterion cr ON UPPER(cr.code) = UPPER(r.kpi_code)
      LEFT JOIN crawl_job_criterion cjc ON cjc.crawl_job_definition_id = e.crawl_job_definition_id AND cjc.criterion_id = cr.criterion_id
      LEFT JOIN kpi_scoring_prompt ksp ON UPPER(ksp.criterion_code) = UPPER(r.kpi_code)
      LEFT JOIN kpi_scoring_prompt_version pv ON pv.prompt_id = ksp.prompt_id AND pv.status = 'PUBLISHED'
      WHERE (r.crawl_job_execution_id = $1 OR r.import_id = e.evaluation_data_import_id)
        AND r.status IN ('PENDING_REVIEW', 'CONFLICT', 'VALID')
      ON CONFLICT (crawl_data_row_id) DO NOTHING
      RETURNING id`,
      [crawlExecutionId]
    );

    return result.rowCount ?? 0;
  }
}
