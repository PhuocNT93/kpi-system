import { Pool } from 'pg';
import { AppError, NotFound } from '../../../api/app-error.js';
import { Actor } from '../../../shared/auth/types.js';
import { withAuditedTransaction } from '../../audit/application/audit-transaction.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { PostgresCrawlJobRepository } from '../infrastructure/postgres-crawl-job.repository.js';
import { GeminiScoringClient } from './gemini-scoring-client.js';
import { CrawlScoringExecutionRecord, GeminiScoringOutput } from '../domain/crawl-scoring.types.js';

function toValidUuid(val?: string | null): string | null {
  return val && /^[0-9a-fA-F-]{36}$/.test(val) ? val : null;
}

export class CrawlScoringService {
  constructor(
    private readonly pool: Pool,
    private readonly repository: PostgresCrawlJobRepository,
    private readonly geminiClient: GeminiScoringClient,
    private readonly auditService: AuditService
  ) {}

  async listScoringExecutions(
    _actor: Actor,
    filters: {
      crawl_execution_id?: string;
      cycle_id?: string;
      status?: string;
      review_status?: string;
      employee_code?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: CrawlScoringExecutionRecord[]; total: number }> {
    const result = await this.repository.listScoringExecutions(filters);
    return {
      items: result.items as unknown as CrawlScoringExecutionRecord[],
      total: result.total,
    };
  }

  async getScoringExecution(_actor: Actor, id: string): Promise<CrawlScoringExecutionRecord> {
    const record = await this.repository.getScoringExecution(id);
    if (!record) {
      throw new NotFound(`Crawl scoring execution ${id}`);
    }
    return record as unknown as CrawlScoringExecutionRecord;
  }

  /**
   * Retry a failed row scoring execution.
   * Rule 8 & 63: Does NOT recrawl the external source.
   */
  async retryScoringExecution(actor: Actor, id: string): Promise<CrawlScoringExecutionRecord> {
    const existing = await this.repository.getScoringExecution(id);
    if (!existing) {
      throw new NotFound(`Crawl scoring execution ${id}`);
    }

    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      const retried = await this.repository.retryScoringExecution(id);
      if (!retried) {
        throw new AppError(422, 'CANNOT_RETRY_SCORING', 'Only FAILED or CANCELLED scoring executions can be retried.');
      }

      audit.record({
        entityType: 'CRAWL_EXECUTION',
        entityId: id,
        action: 'CRAWL_EXECUTION_RETRIED',
        newValue: JSON.stringify({
          scoring_execution_id: id,
          crawl_data_row_id: existing.crawl_data_row_id,
          crawl_execution_id: existing.crawl_execution_id,
        }),
      });

      return retried as unknown as CrawlScoringExecutionRecord;
    }, toValidUuid(actor.userId));
  }

  /**
   * Rescore a crawl data row (e.g. after prompt update or for re-evaluation).
   * Rule 64: Evaluates existing stored raw row without recrawling.
   */
  async rescoreRow(actor: Actor, crawlDataRowId: string, promptVersionId?: string): Promise<CrawlScoringExecutionRecord> {
    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      const updated = await this.repository.rescoreRow(crawlDataRowId, promptVersionId);

      audit.record({
        entityType: 'CRAWL_EXECUTION',
        entityId: String(updated.id),
        action: 'CRAWL_EXECUTION_QUEUED',
        newValue: JSON.stringify({
          action: 'RESCORE',
          crawl_data_row_id: crawlDataRowId,
          prompt_version_id: promptVersionId || null,
        }),
      });

      return updated as unknown as CrawlScoringExecutionRecord;
    }, toValidUuid(actor.userId));
  }

  /**
   * Human Review Gate (Rules 10, 11, 12, 35-43)
   * Actions: APPROVE, ADJUST, REJECT
   */
  async reviewExecution(
    actor: Actor,
    id: string,
    payload: {
      action: 'APPROVE' | 'ADJUST' | 'REJECT';
      final_score?: number;
      comment?: string;
    }
  ): Promise<CrawlScoringExecutionRecord> {
    const existing = await this.repository.getScoringExecution(id);
    if (!existing) {
      throw new NotFound(`Crawl scoring execution ${id}`);
    }

    if (existing.status !== 'SUCCESS') {
      throw new AppError(422, 'CANNOT_REVIEW', 'Cannot review a scoring execution that is not in SUCCESS status.');
    }

    let reviewStatus: 'APPROVED' | 'ADJUSTED' | 'REJECTED';
    let finalScore: number | null = null;
    const comment = payload.comment?.trim() || null;

    if (payload.action === 'APPROVE') {
      reviewStatus = 'APPROVED';
      finalScore = Number(existing.score);
    } else if (payload.action === 'ADJUST') {
      if (payload.final_score === undefined || payload.final_score === null || isNaN(Number(payload.final_score))) {
        throw new AppError(400, 'INVALID_SCORE', 'Adjusting score requires a valid numeric final_score.');
      }
      if (!comment || comment.length < 20) {
        throw new AppError(400, 'COMMENT_TOO_SHORT', 'Adjusting an AI score requires a justification comment of at least 20 characters.');
      }
      reviewStatus = 'ADJUSTED';
      finalScore = Number(payload.final_score);
    } else if (payload.action === 'REJECT') {
      if (!comment || comment.length < 20) {
        throw new AppError(400, 'COMMENT_TOO_SHORT', 'Rejecting an AI score requires an explanation comment of at least 20 characters.');
      }
      reviewStatus = 'REJECTED';
      finalScore = null;
    } else {
      throw new AppError(400, 'INVALID_ACTION', 'Action must be APPROVE, ADJUST, or REJECT.');
    }

    const reviewerId = actor.employeeId || actor.userId || 'reviewer';

    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      const updated = await this.repository.updateReviewStatus(id, reviewStatus, finalScore, reviewerId, comment);

      audit.record({
        entityType: 'CRAWL_EXECUTION',
        entityId: id,
        action: 'CRAWL_REVIEWED',
        reason: comment,
        newValue: JSON.stringify({
          action: payload.action,
          review_status: reviewStatus,
          previous_score: existing.score,
          final_score: finalScore,
        }),
      });

      return updated as unknown as CrawlScoringExecutionRecord;
    }, toValidUuid(actor.userId));
  }

  /**
   * Apply approved/adjusted score to the evaluation cycle/record.
   */
  async applyToEvaluation(actor: Actor, id: string): Promise<CrawlScoringExecutionRecord> {
    const existing = await this.repository.getScoringExecution(id);
    if (!existing) {
      throw new NotFound(`Crawl scoring execution ${id}`);
    }

    if (existing.review_status !== 'APPROVED' && existing.review_status !== 'ADJUSTED') {
      throw new AppError(422, 'NOT_READY_TO_APPLY', 'Scoring execution must be APPROVED or ADJUSTED before applying.');
    }

    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      // Update raw staging record to APPLIED
      await client.query(
        `UPDATE evaluation_data_import_record
         SET status = 'APPLIED',
             reviewer_comment = $1,
             updated_at = NOW()
         WHERE record_id = $2`,
        [existing.review_comment, existing.crawl_data_row_id]
      );

      const updated = await this.repository.markApplied(id);

      audit.record({
        entityType: 'CRAWL_EXECUTION',
        entityId: id,
        action: 'CRAWL_APPLIED',
        newValue: JSON.stringify({
          crawl_data_row_id: existing.crawl_data_row_id,
          final_score: existing.final_score,
        }),
      });

      return updated as unknown as CrawlScoringExecutionRecord;
    }, toValidUuid(actor.userId));
  }

  /**
   * Interactive Prompt Test / Dry-Run (Rule 45)
   * Tests a draft or published prompt against a real raw crawl row without modifying production evaluation.
   */
  async testPrompt(_actor: Actor, payload: {
    system_prompt: string;
    user_prompt_template: string;
    model?: string;
    temperature?: number;
    crawl_data_row_id?: string;
    sample_row_data?: Record<string, unknown>;
  }): Promise<{
    score: number;
    reason: string;
    confidence?: number;
    evidence?: Array<{ source_reference?: string; claim: string }>;
    rendered_prompt: string;
    execution_time_ms: number;
  }> {
    const startTime = Date.now();
    let rowData = payload.sample_row_data;

    if (payload.crawl_data_row_id) {
      const rowRes = await this.pool.query(
        `SELECT r.record_id, r.employee_code, r.kpi_code, r.value, r.source_snapshot,
                i.source_system, c.code AS cycle_code, c.name AS cycle_name
         FROM evaluation_data_import_record r
         JOIN evaluation_data_import i ON r.import_id = i.import_id
         LEFT JOIN evaluation_cycle c ON r.cycle_id = c.evaluation_cycle_id
         WHERE r.record_id = $1`,
        [payload.crawl_data_row_id]
      );
      if (rowRes.rows.length > 0) {
        const row = rowRes.rows[0];
        rowData = {
          employee_code: row.employee_code,
          criterion_code: row.kpi_code,
          measurement_value: row.value,
          evaluation_cycle: row.cycle_name || row.cycle_code,
          source: row.source_system,
          source_reference: row.source_snapshot?.source_reference || '',
          raw_data: row.source_snapshot?.raw_payload || row.source_snapshot,
        };
      }
    }

    if (!rowData) {
      rowData = {
        employee_code: 'EMP001',
        criterion_code: 'CRIT_TASK_COMPLETION',
        measurement_value: 85,
        evaluation_cycle: 'Q3 2026',
        source: 'JIRA',
        source_reference: 'PROJ-101',
        raw_data: { completed: 17, assigned: 20, onTimeRate: 85.0 },
      };
    }

    // Render template safely
    const rendered = payload.user_prompt_template
      .replace(/\{\{employee_code\}\}/g, String(rowData.employee_code || ''))
      .replace(/\{\{employee\}\}/g, String(rowData.employee_code || ''))
      .replace(/\{\{criterion_code\}\}/g, String(rowData.criterion_code || ''))
      .replace(/\{\{criterion\}\}/g, String(rowData.criterion_code || ''))
      .replace(/\{\{measurement_value\}\}/g, String(rowData.measurement_value ?? ''))
      .replace(/\{\{measurement\}\}/g, String(rowData.measurement_value ?? ''))
      .replace(/\{\{evaluation_cycle\}\}/g, String(rowData.evaluation_cycle || ''))
      .replace(/\{\{source_reference\}\}/g, String(rowData.source_reference || ''))
      .replace(/\{\{source\}\}/g, String(rowData.source || ''))
      .replace(/\{\{raw_data\}\}/g, JSON.stringify(rowData.raw_data || {}, null, 2));

    const result: GeminiScoringOutput = await this.geminiClient.evaluateRow({
      systemPrompt: payload.system_prompt,
      userPrompt: rendered,
      model: payload.model || 'gemini-2.5-flash',
      temperature: payload.temperature ?? 0.2,
    });

    const executionTimeMs = Date.now() - startTime;

    return {
      score: result.score,
      reason: result.reason,
      confidence: result.confidence,
      evidence: result.evidence,
      rendered_prompt: rendered,
      execution_time_ms: executionTimeMs,
    };
  }
}
