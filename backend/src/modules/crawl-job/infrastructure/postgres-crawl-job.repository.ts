import { Pool } from 'pg';
import { TransactionClient } from '../../../shared/database/transaction.js';
import { CrawlExecutionSnapshot, CrawlExecutionStatus } from '../domain/crawl-job.types.js';

export interface CrawlJobRecord extends Record<string, unknown> {
  crawl_job_definition_id: string;
  code: string;
  name: string;
  source_system: string;
  active: boolean;
}

export interface CrawlExecutionRecord extends Record<string, unknown> {
  crawl_job_execution_id: string;
  crawl_job_definition_id: string;
  evaluation_cycle_id: string;
  status: CrawlExecutionStatus;
  idempotency_key: string;
}

export class PostgresCrawlJobRepository {
  constructor(private readonly pool: Pool) {}

  async listJobs(filters: { source_system?: string; active?: boolean; cycle_id?: string } = {}): Promise<Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT job.crawl_job_definition_id, job.code, job.name, job.source_system, job.active,
              job.default_schedule_cron, job.failure_policy, job.created_at, job.updated_at,
              job.crawl_script_version_id, job.connector_credential_id, job.source_config,
              script.code AS script_code, script.version_no AS script_version,
              script.checksum AS script_checksum, script.published_at,
              credential.code AS credential_code, credential.display_name AS credential_display_name,
              cycle.evaluation_cycle_id, cycle.code AS evaluation_cycle_code, cycle.name AS evaluation_cycle_name,
              COUNT(DISTINCT mapping.criterion_id)::integer AS criteria_count,
              (SELECT COALESCE(jsonb_agg(jsonb_build_object('criterion_id', cr.criterion_id, 'criterion_code', cr.code)), '[]'::jsonb)
               FROM crawl_job_criterion cjc JOIN criterion cr USING (criterion_id)
               WHERE cjc.crawl_job_definition_id = job.crawl_job_definition_id) AS criteria,
              MAX(execution.created_at) AS last_execution_at,
              (SELECT status FROM crawl_job_execution last_execution
               WHERE last_execution.crawl_job_definition_id = job.crawl_job_definition_id
               ORDER BY created_at DESC LIMIT 1) AS last_execution_status
       FROM crawl_job_definition job
       JOIN crawl_script_version script ON script.crawl_script_version_id = job.crawl_script_version_id
       JOIN connector_credential credential ON credential.connector_credential_id = job.connector_credential_id
       LEFT JOIN LATERAL (
         SELECT c.evaluation_cycle_id, c.code, c.name
         FROM evaluation_cycle_crawl_job eccj
         JOIN evaluation_cycle c ON c.evaluation_cycle_id = eccj.evaluation_cycle_id
         WHERE eccj.crawl_job_definition_id = job.crawl_job_definition_id
         ORDER BY (c.status = 'OPEN') DESC, eccj.sequence_order ASC
         LIMIT 1
       ) cycle ON TRUE
       LEFT JOIN crawl_job_criterion mapping ON mapping.crawl_job_definition_id = job.crawl_job_definition_id
       LEFT JOIN crawl_job_execution execution ON execution.crawl_job_definition_id = job.crawl_job_definition_id
       WHERE ($1::varchar IS NULL OR job.source_system = $1)
         AND ($2::boolean IS NULL OR job.active = $2)
         AND ($3::uuid IS NULL OR cycle.evaluation_cycle_id = $3::uuid)
       GROUP BY job.crawl_job_definition_id, job.crawl_script_version_id, job.connector_credential_id, job.source_config,
                script.crawl_script_version_id, credential.connector_credential_id, credential.display_name,
                cycle.evaluation_cycle_id, cycle.code, cycle.name
       ORDER BY job.updated_at DESC
       LIMIT 100`,
      [filters.source_system ?? null, filters.active ?? null, filters.cycle_id ? filters.cycle_id : null]
    );
    return result.rows;
  }

  async getJob(jobId: string, client: Pool | TransactionClient = this.pool): Promise<CrawlJobRecord | null> {
    const result = await client.query(
      `SELECT job.*, script.code AS script_code, script.version_no AS script_version,
              script.checksum AS script_checksum, script.published_at,
              credential.code AS credential_code,
              cycle.evaluation_cycle_id, cycle.code AS evaluation_cycle_code, cycle.name AS evaluation_cycle_name,
              (SELECT COALESCE(jsonb_agg(jsonb_build_object('criterion_id', criterion.criterion_id, 'criterion_code', criterion.code)), '[]'::jsonb)
               FROM crawl_job_criterion mapping JOIN criterion USING (criterion_id)
               WHERE mapping.crawl_job_definition_id = job.crawl_job_definition_id) AS criteria
       FROM crawl_job_definition job
       JOIN crawl_script_version script ON script.crawl_script_version_id = job.crawl_script_version_id
       JOIN connector_credential credential ON credential.connector_credential_id = job.connector_credential_id
       LEFT JOIN LATERAL (
         SELECT c.evaluation_cycle_id, c.code, c.name
         FROM evaluation_cycle_crawl_job eccj
         JOIN evaluation_cycle c ON c.evaluation_cycle_id = eccj.evaluation_cycle_id
         WHERE eccj.crawl_job_definition_id = job.crawl_job_definition_id
         ORDER BY (c.status = 'OPEN') DESC, eccj.sequence_order ASC
         LIMIT 1
       ) cycle ON TRUE
       WHERE job.crawl_job_definition_id = $1`,
      [jobId]
    );
    return (result.rows[0] as CrawlJobRecord | undefined) ?? null;
  }

  async getPublishedScript(scriptVersionId: string, client: TransactionClient): Promise<Record<string, unknown> | null> {
    const result = await client.query(
      `SELECT crawl_script_version_id, code, version_no, source_system, source_code, checksum,
              status, published_by, published_at
       FROM crawl_script_version WHERE crawl_script_version_id = $1`,
      [scriptVersionId]
    );
    return result.rows[0] ?? null;
  }

  async listPublishedScripts(sourceSystem?: string, status?: string): Promise<Record<string, unknown>[]> {
    let statusFilter: string | null = null;
    if (status && status.toUpperCase() !== 'ALL') {
      statusFilter = status.toUpperCase();
    }

    const result = await this.pool.query(
      `SELECT crawl_script_version_id, code, version_no, source_system, checksum,
              scoring_prompt, status, created_at, created_by, published_by, published_at
       FROM crawl_script_version
       WHERE ($1::varchar IS NULL OR source_system = $1)
         AND ($2::varchar IS NULL OR status = $2)
       ORDER BY code, version_no DESC LIMIT 100`,
      [sourceSystem ?? null, statusFilter]
    );
    return result.rows;
  }

  async getScriptVersion(scriptVersionId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT * FROM crawl_script_version WHERE crawl_script_version_id = $1`,
      [scriptVersionId]
    );
    return result.rows[0] ?? null;
  }

  async createScriptVersion(input: {
    id: string;
    code: string;
    sourceSystem: string;
    sourceCode: string;
    checksum: string;
    scoringPrompt?: string | null;
    actorId: string;
  }, client: TransactionClient): Promise<Record<string, unknown>> {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [input.code]);
    const versionResult = await client.query(
      `SELECT COALESCE(MAX(version_no), 0)::integer + 1 AS next_version
       FROM crawl_script_version WHERE code = $1`,
      [input.code]
    );
    const version = Number(versionResult.rows[0]?.next_version ?? 1);
    const result = await client.query(
      `INSERT INTO crawl_script_version (
         crawl_script_version_id, code, version_no, source_system, source_code, checksum, scoring_prompt, status, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8) RETURNING *`,
      [input.id, input.code, version, input.sourceSystem, input.sourceCode, input.checksum, input.scoringPrompt ?? null, input.actorId]
    );
    return result.rows[0] ?? {};
  }

  async publishScriptVersion(scriptVersionId: string, actorId: string, client: TransactionClient): Promise<Record<string, unknown> | null> {
    const result = await client.query(
      `UPDATE crawl_script_version SET status = 'PUBLISHED', published_by = $2, published_at = NOW()
       WHERE crawl_script_version_id = $1 AND status = 'DRAFT' RETURNING *`,
      [scriptVersionId, actorId]
    );
    return result.rows[0] ?? null;
  }

  async updateScriptVersion(
    scriptVersionId: string,
    input: {
      sourceCode?: string;
      checksum?: string;
      scoringPrompt?: string | null;
      sourceSystem?: string;
    },
    client: TransactionClient
  ): Promise<Record<string, unknown> | null> {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (input.sourceCode !== undefined) {
      values.push(input.sourceCode);
      assignments.push(`source_code = $${values.length}`);
    }
    if (input.checksum !== undefined) {
      values.push(input.checksum);
      assignments.push(`checksum = $${values.length}`);
    }
    if (input.scoringPrompt !== undefined) {
      values.push(input.scoringPrompt);
      assignments.push(`scoring_prompt = $${values.length}`);
    }
    if (input.sourceSystem !== undefined) {
      values.push(input.sourceSystem);
      assignments.push(`source_system = $${values.length}`);
    }

    if (assignments.length === 0) {
      const existing = await client.query(`SELECT * FROM crawl_script_version WHERE crawl_script_version_id = $1`, [scriptVersionId]);
      return existing.rows[0] ?? null;
    }

    values.push(scriptVersionId);
    const result = await client.query(
      `UPDATE crawl_script_version
       SET ${assignments.join(', ')}
       WHERE crawl_script_version_id = $${values.length}
       RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async setScriptStatus(
    scriptVersionId: string,
    status: 'PUBLISHED' | 'DISABLED',
    client: TransactionClient
  ): Promise<Record<string, unknown> | null> {
    const result = await client.query(
      `UPDATE crawl_script_version
       SET status = $2
       WHERE crawl_script_version_id = $1
       RETURNING *`,
      [scriptVersionId, status]
    );
    return result.rows[0] ?? null;
  }

  async deleteScriptVersion(scriptVersionId: string, client: TransactionClient): Promise<boolean> {
    const jobRef = await client.query(
      `SELECT job.code, job.name FROM crawl_job_definition job WHERE job.crawl_script_version_id = $1 LIMIT 1`,
      [scriptVersionId]
    );
    const firstInUse = jobRef.rows[0];
    if (firstInUse) {
      throw new Error(`Không thể xóa script vì đang được liên kết với Crawl Job "${firstInUse.name}" (${firstInUse.code}).`);
    }

    const result = await client.query(
      `DELETE FROM crawl_script_version WHERE crawl_script_version_id = $1 RETURNING 1`,
      [scriptVersionId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async createCredentialReference(input: {
    id: string;
    code: string;
    sourceSystem: string;
    displayName: string;
    secretReference: string;
  }, client: TransactionClient): Promise<Record<string, unknown>> {
    const result = await client.query(
      `INSERT INTO connector_credential (
         connector_credential_id, code, source_system, display_name, secret_reference
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING connector_credential_id, code, source_system, display_name, is_active, created_at`,
      [input.id, input.code, input.sourceSystem, input.displayName, input.secretReference]
    );
    return result.rows[0] ?? {};
  }

  async listCredentialReferences(sourceSystem?: string): Promise<Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT connector_credential_id, code, source_system, display_name, is_active
       FROM connector_credential
       WHERE is_active = TRUE AND ($1::varchar IS NULL OR source_system = $1)
       ORDER BY source_system, display_name LIMIT 100`,
      [sourceSystem ?? null]
    );
    return result.rows;
  }

  async getActiveCredential(credentialId: string, sourceSystem: string, client: TransactionClient): Promise<boolean> {
    const result = await client.query(
      `SELECT 1 FROM connector_credential
       WHERE connector_credential_id = $1 AND source_system = $2 AND is_active = TRUE`,
      [credentialId, sourceSystem]
    );
    return result.rows.length > 0;
  }

  async listCriteria(): Promise<Array<{ criterion_id: string; code: string; name: string; category: string; description: string | null; active: boolean }>> {
    const result = await this.pool.query(
      `SELECT criterion_id, code, name, category, description, active
       FROM criterion
       WHERE active = TRUE
       ORDER BY code ASC`
    );
    return result.rows as Array<{ criterion_id: string; code: string; name: string; category: string; description: string | null; active: boolean }>;
  }

  async getCriteria(criterionIds: string[], client: TransactionClient): Promise<Array<{ criterion_id: string; code: string }>> {
    const result = await client.query(
      `SELECT criterion_id, code FROM criterion WHERE criterion_id = ANY($1::uuid[]) AND active = TRUE`,
      [criterionIds]
    );
    return result.rows as Array<{ criterion_id: string; code: string }>;
  }

  async insertJob(
    input: {
      crawl_job_definition_id: string;
      code: string;
      name: string;
      source_system: string;
      crawl_script_version_id: string;
      connector_credential_id: string;
      source_config: Record<string, unknown>;
      default_schedule_cron: string | null;
      failure_policy: string;
      created_by: string;
    },
    client: TransactionClient
  ): Promise<void> {
    await client.query(
      `INSERT INTO crawl_job_definition (
         crawl_job_definition_id, code, name, source_system, crawl_script_version_id,
         connector_credential_id, source_config, default_schedule_cron, failure_policy, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
      [input.crawl_job_definition_id, input.code, input.name, input.source_system,
        input.crawl_script_version_id, input.connector_credential_id, JSON.stringify(input.source_config),
        input.default_schedule_cron, input.failure_policy, input.created_by]
    );
  }

  async insertCriteria(jobId: string, criterionIds: string[], client: TransactionClient): Promise<void> {
    for (const criterionId of criterionIds) {
      await client.query(
        `INSERT INTO crawl_job_criterion (crawl_job_definition_id, criterion_id) VALUES ($1, $2)`,
        [jobId, criterionId]
      );
    }
  }

  async updateJob(
    jobId: string,
    patch: Partial<{
      name: string;
      source_system: string;
      crawl_script_version_id: string;
      connector_credential_id: string;
      source_config: Record<string, unknown>;
      default_schedule_cron: string | null;
      failure_policy: string;
    }>,
    client: TransactionClient
  ): Promise<void> {
    const columns: Array<[keyof typeof patch, string]> = [
      ['name', 'name'],
      ['source_system', 'source_system'],
      ['crawl_script_version_id', 'crawl_script_version_id'],
      ['connector_credential_id', 'connector_credential_id'],
      ['source_config', 'source_config'],
      ['default_schedule_cron', 'default_schedule_cron'],
      ['failure_policy', 'failure_policy'],
    ];
    const assignments: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of columns) {
      if (patch[key] === undefined) continue;
      values.push(key === 'source_config' ? JSON.stringify(patch.source_config) : patch[key]);
      assignments.push(`${column} = $${values.length}${key === 'source_config' ? '::jsonb' : ''}`);
    }
    if (!assignments.length) return;
    values.push(jobId);
    await client.query(
      `UPDATE crawl_job_definition SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE crawl_job_definition_id = $${values.length}`,
      values
    );
  }

  async replaceCriteria(jobId: string, criterionIds: string[], client: TransactionClient): Promise<void> {
    await client.query(`DELETE FROM crawl_job_criterion WHERE crawl_job_definition_id = $1`, [jobId]);
    await this.insertCriteria(jobId, criterionIds, client);
  }

  async setJobActive(jobId: string, active: boolean, client: TransactionClient): Promise<void> {
    await client.query(
      `UPDATE crawl_job_definition SET active = $2, updated_at = NOW() WHERE crawl_job_definition_id = $1`,
      [jobId, active]
    );
  }

  async deleteJob(jobId: string, client: TransactionClient): Promise<void> {
    await client.query(`DELETE FROM crawl_job_criterion WHERE crawl_job_definition_id = $1`, [jobId]);
    await client.query(`DELETE FROM evaluation_cycle_crawl_job WHERE crawl_job_definition_id = $1`, [jobId]);
    await client.query(`DELETE FROM crawl_job_definition WHERE crawl_job_definition_id = $1`, [jobId]);
  }

  async getCycleJob(
    cycleId: string,
    jobId: string,
    client: Pool | TransactionClient = this.pool
  ): Promise<Record<string, unknown> | null> {
    const result = await client.query(
      `SELECT mapping.*, cycle.status AS cycle_status, job.active AS job_active,
              job.source_system, job.crawl_script_version_id, job.connector_credential_id,
              job.source_config, job.failure_policy,
              script.version_no AS script_version, script.checksum AS script_checksum,
              script.status AS script_status, script.source_code,
              jsonb_agg(jsonb_build_object('criterion_id', criterion.criterion_id, 'criterion_code', criterion.code))
                FILTER (WHERE criterion.criterion_id IS NOT NULL) AS criteria
       FROM evaluation_cycle_crawl_job mapping
       JOIN evaluation_cycle cycle USING (evaluation_cycle_id)
       JOIN crawl_job_definition job USING (crawl_job_definition_id)
       JOIN crawl_script_version script USING (crawl_script_version_id)
       LEFT JOIN crawl_job_criterion job_criterion USING (crawl_job_definition_id)
       LEFT JOIN criterion ON criterion.criterion_id = job_criterion.criterion_id
       WHERE mapping.evaluation_cycle_id = $1 AND mapping.crawl_job_definition_id = $2
       GROUP BY mapping.evaluation_cycle_id, mapping.crawl_job_definition_id,
                cycle.evaluation_cycle_id, job.crawl_job_definition_id, script.crawl_script_version_id`,
      [cycleId, jobId]
    );
    return result.rows[0] ?? null;
  }

  async listCycleJobs(cycleId: string): Promise<Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT mapping.evaluation_cycle_id, mapping.crawl_job_definition_id, mapping.enabled,
              mapping.sequence_order, mapping.failure_policy, job.code, job.name, job.source_system,
              job.active, script.version_no AS script_version
       FROM evaluation_cycle_crawl_job mapping
       JOIN crawl_job_definition job USING (crawl_job_definition_id)
       JOIN crawl_script_version script USING (crawl_script_version_id)
       WHERE mapping.evaluation_cycle_id = $1
       ORDER BY mapping.sequence_order, job.code`,
      [cycleId]
    );
    return result.rows;
  }

  async listScheduledAssignments(): Promise<Array<{
    evaluation_cycle_id: string;
    crawl_job_definition_id: string;
    default_schedule_cron: string;
  }>> {
    const result = await this.pool.query(
      `SELECT mapping.evaluation_cycle_id, mapping.crawl_job_definition_id, job.default_schedule_cron
       FROM evaluation_cycle_crawl_job mapping
       JOIN evaluation_cycle cycle USING (evaluation_cycle_id)
       JOIN crawl_job_definition job USING (crawl_job_definition_id)
       WHERE mapping.enabled = TRUE AND job.active = TRUE
         AND cycle.status = 'OPEN' AND job.default_schedule_cron IS NOT NULL
       ORDER BY mapping.sequence_order, mapping.evaluation_cycle_id, job.crawl_job_definition_id`
    );
    return result.rows as Array<{ evaluation_cycle_id: string; crawl_job_definition_id: string; default_schedule_cron: string }>;
  }

  async expireRawPayloads(): Promise<number> {
    const result = await this.pool.query(`DELETE FROM crawl_raw_payload WHERE expires_at <= NOW()`);
    return result.rowCount ?? 0;
  }

  async appendExecutionLog(
    executionId: string,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    context: Record<string, unknown> = {}
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO crawl_job_execution_log (crawl_job_execution_id, level, message, context)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [executionId, level, message.slice(0, 2000), JSON.stringify(context)]
    );
  }

  async listExecutionLogs(
    executionId: string,
    filters: { level?: 'INFO' | 'WARN' | 'ERROR'; search?: string; page: number; limit: number }
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const result = await this.pool.query(
      `SELECT crawl_job_execution_log_id, crawl_job_execution_id, logged_at, level, message, context
       FROM crawl_job_execution_log
       WHERE crawl_job_execution_id = $1
         AND ($2::varchar IS NULL OR level = $2)
         AND ($3::varchar IS NULL OR message ILIKE '%' || $3 || '%')
       ORDER BY logged_at DESC LIMIT $4 OFFSET $5`,
      [executionId, filters.level ?? null, filters.search?.slice(0, 100) ?? null, filters.limit, (filters.page - 1) * filters.limit]
    );
    const count = await this.pool.query(
      `SELECT COUNT(*)::integer AS total FROM crawl_job_execution_log
       WHERE crawl_job_execution_id = $1 AND ($2::varchar IS NULL OR level = $2)
         AND ($3::varchar IS NULL OR message ILIKE '%' || $3 || '%')`,
      [executionId, filters.level ?? null, filters.search?.slice(0, 100) ?? null]
    );
    return { items: result.rows, total: Number(count.rows[0]?.total ?? 0) };
  }

  async upsertCycleJob(
    cycleId: string,
    jobId: string,
    enabled: boolean,
    sequenceOrder: number,
    failurePolicy: string,
    actorId: string,
    client: TransactionClient
  ): Promise<void> {
    await client.query(
      `INSERT INTO evaluation_cycle_crawl_job (
         evaluation_cycle_id, crawl_job_definition_id, enabled, sequence_order,
         failure_policy, enabled_by, enabled_at
       ) VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $3 THEN NOW() ELSE NULL END)
       ON CONFLICT (evaluation_cycle_id, crawl_job_definition_id) DO UPDATE SET
         enabled = EXCLUDED.enabled, sequence_order = EXCLUDED.sequence_order,
         failure_policy = EXCLUDED.failure_policy,
         enabled_by = CASE WHEN EXCLUDED.enabled THEN EXCLUDED.enabled_by ELSE evaluation_cycle_crawl_job.enabled_by END,
         enabled_at = CASE WHEN EXCLUDED.enabled THEN NOW() ELSE evaluation_cycle_crawl_job.enabled_at END`,
      [cycleId, jobId, enabled, sequenceOrder, failurePolicy, actorId]
    );
  }

  async findConflictingEnabledJob(cycleId: string, jobId: string, client: TransactionClient): Promise<string | null> {
    const result = await client.query(
      `SELECT other_job.code FROM evaluation_cycle_crawl_job other_mapping
       JOIN crawl_job_criterion other_criterion USING (crawl_job_definition_id)
       JOIN crawl_job_criterion this_criterion ON this_criterion.criterion_id = other_criterion.criterion_id
       JOIN crawl_job_definition other_job ON other_job.crawl_job_definition_id = other_mapping.crawl_job_definition_id
       WHERE other_mapping.evaluation_cycle_id = $1 AND other_mapping.enabled = TRUE
         AND this_criterion.crawl_job_definition_id = $2
         AND other_mapping.crawl_job_definition_id <> $2
       LIMIT 1`,
      [cycleId, jobId]
    );
    return typeof result.rows[0]?.code === 'string' ? result.rows[0].code : null;
  }

  async listEnabledCycleIds(jobId: string, client: TransactionClient): Promise<string[]> {
    const result = await client.query(
      `SELECT evaluation_cycle_id FROM evaluation_cycle_crawl_job
       WHERE crawl_job_definition_id = $1 AND enabled = TRUE`,
      [jobId]
    );
    return result.rows.map((row) => row.evaluation_cycle_id as string);
  }

  async findConflictingJobForCriteria(
    cycleId: string,
    jobId: string,
    criterionIds: string[],
    client: TransactionClient
  ): Promise<{ jobCode: string; criterionCode?: string; criterionName?: string } | null> {
    const result = await client.query(
      `SELECT other_job.code AS job_code, c.code AS criterion_code, c.name AS criterion_name
       FROM evaluation_cycle_crawl_job mapping
       JOIN crawl_job_criterion mapping_criterion USING (crawl_job_definition_id)
       JOIN crawl_job_definition other_job USING (crawl_job_definition_id)
       LEFT JOIN criterion c ON c.criterion_id = mapping_criterion.criterion_id
       WHERE mapping.evaluation_cycle_id = $1 AND mapping.enabled = TRUE
         AND mapping.crawl_job_definition_id <> $2
         AND mapping_criterion.criterion_id = ANY($3::uuid[])
       LIMIT 1`,
      [cycleId, jobId, criterionIds]
    );
    if (!result.rows[0]?.job_code) return null;
    return {
      jobCode: result.rows[0].job_code as string,
      criterionCode: (result.rows[0].criterion_code as string) || undefined,
      criterionName: (result.rows[0].criterion_name as string) || undefined,
    };
  }

  async createExecution(
    input: {
      id: string;
      jobId: string;
      cycleId: string;
      actorId: string;
      triggerType: string;
      idempotencyKey: string;
      snapshot: CrawlExecutionSnapshot;
      criteriaSnapshot: Array<{ criterion_id: string; criterion_code: string }>;
      retryOfId?: string;
      requestId?: string;
      attemptNo?: number;
      maxAttempts?: number;
      nextRetryAt?: Date;
    },
    client: TransactionClient
  ): Promise<CrawlExecutionRecord> {
    const result = await client.query(
      `INSERT INTO crawl_job_execution (
         crawl_job_execution_id, crawl_job_definition_id, evaluation_cycle_id, status,
         trigger_type, triggered_by, scheduled_at, crawl_script_version_id,
         script_version, script_checksum, source_system, source_config_snapshot,
         criteria_snapshot, connector_credential_id, idempotency_key, retry_of_execution_id, request_id,
         attempt_no, max_attempts, next_retry_at
       ) VALUES (
         $1, $2, $3, 'QUEUED',
         $4::varchar, $5, CASE WHEN $4::varchar = 'SCHEDULED' THEN NOW() ELSE NULL END, $6,
         $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14::uuid, $15,
         COALESCE($16, (SELECT attempt_no + 1 FROM crawl_job_execution WHERE crawl_job_execution_id = $14::uuid), 1),
         COALESCE($17, 3), COALESCE($18, NOW())
       ) RETURNING *`,
      [input.id, input.jobId, input.cycleId, input.triggerType, input.actorId,
        input.snapshot.script_id, input.snapshot.script_version, input.snapshot.script_checksum,
        input.snapshot.source_system, JSON.stringify(input.snapshot.source_config),
        JSON.stringify(input.criteriaSnapshot), input.snapshot.connector_credential_id,
        input.idempotencyKey, input.retryOfId ?? null, input.requestId ?? null,
        input.attemptNo ?? null, input.maxAttempts ?? null, input.nextRetryAt ?? null]
    );
    return result.rows[0] as CrawlExecutionRecord;
  }

  async findNextDueExecution(client: TransactionClient): Promise<string | null> {
    const result = await client.query(
      `SELECT execution.crawl_job_execution_id FROM crawl_job_execution execution
       JOIN evaluation_cycle_crawl_job mapping
         ON mapping.evaluation_cycle_id = execution.evaluation_cycle_id
        AND mapping.crawl_job_definition_id = execution.crawl_job_definition_id
       WHERE execution.status = 'QUEUED' AND execution.next_retry_at <= NOW()
       ORDER BY execution.next_retry_at, execution.scheduled_at NULLS LAST,
                execution.evaluation_cycle_id, mapping.sequence_order, execution.created_at
       LIMIT 1 FOR UPDATE OF execution SKIP LOCKED`,
      []
    );
    return typeof result.rows[0]?.crawl_job_execution_id === 'string'
      ? result.rows[0].crawl_job_execution_id
      : null;
  }

  async getClaimContext(executionId: string, client: TransactionClient): Promise<Record<string, unknown> | null> {
    const result = await client.query(
      `SELECT execution.crawl_job_execution_id, execution.evaluation_cycle_id,
              execution.crawl_job_definition_id, cycle.status AS cycle_status,
              job.active AS job_active, mapping.enabled AS cycle_job_enabled
       FROM crawl_job_execution execution
       JOIN evaluation_cycle cycle USING (evaluation_cycle_id)
       JOIN crawl_job_definition job USING (crawl_job_definition_id)
       JOIN evaluation_cycle_crawl_job mapping
         ON mapping.evaluation_cycle_id = execution.evaluation_cycle_id
        AND mapping.crawl_job_definition_id = execution.crawl_job_definition_id
       WHERE execution.crawl_job_execution_id = $1
       FOR UPDATE OF cycle, job, mapping`,
      [executionId]
    );
    return result.rows[0] ?? null;
  }

  async claimExecution(
    executionId: string,
    workerId: string,
    leaseMs: number,
    client: TransactionClient
  ): Promise<CrawlExecutionRecord | null> {
    const result = await client.query(
      `UPDATE crawl_job_execution SET status = 'RUNNING',
         started_at = COALESCE(started_at, NOW()), claimed_by = $2,
         heartbeat_at = NOW(), lease_expires_at = NOW() + ($3::text || ' milliseconds')::interval,
         updated_at = NOW()
       WHERE crawl_job_execution_id = $1 AND status = 'QUEUED' AND next_retry_at <= NOW()
       RETURNING *`,
      [executionId, workerId, leaseMs]
    );
    return (result.rows[0] as CrawlExecutionRecord | undefined) ?? null;
  }

  async skipClaimedExecution(executionId: string, reason: string, client: TransactionClient): Promise<CrawlExecutionRecord | null> {
    const result = await client.query(
      `UPDATE crawl_job_execution SET status = 'SKIPPED', error_code = 'EXECUTION_NOT_ELIGIBLE',
         error_message = $2, finished_at = NOW(), updated_at = NOW()
       WHERE crawl_job_execution_id = $1 AND status = 'QUEUED' RETURNING *`,
      [executionId, reason]
    );
    return (result.rows[0] as CrawlExecutionRecord | undefined) ?? null;
  }

  async heartbeatExecution(executionId: string, workerId: string, leaseMs: number): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE crawl_job_execution SET heartbeat_at = NOW(),
         lease_expires_at = NOW() + ($3::text || ' milliseconds')::interval, updated_at = NOW()
       WHERE crawl_job_execution_id = $1 AND claimed_by = $2 AND status = 'RUNNING'`,
      [executionId, workerId, leaseMs]
    );
    return (result.rowCount ?? 0) === 1;
  }

  async findExpiredLeases(limit: number, client: TransactionClient): Promise<string[]> {
    const result = await client.query(
      `SELECT crawl_job_execution_id FROM crawl_job_execution
       WHERE status = 'RUNNING' AND lease_expires_at <= NOW()
      ORDER BY lease_expires_at LIMIT $1 FOR UPDATE SKIP LOCKED`,
      [limit]
    );
    return result.rows.map((row) => row.crawl_job_execution_id as string);
  }

  async findExecutionByIdempotencyKey(
    key: string,
    client: Pool | TransactionClient = this.pool
  ): Promise<CrawlExecutionRecord | null> {
    const result = await client.query(
      `SELECT * FROM crawl_job_execution WHERE idempotency_key = $1`,
      [key]
    );
    return (result.rows[0] as CrawlExecutionRecord | undefined) ?? null;
  }

  async listExecutions(jobId: string, filters: { status?: string; cycleId?: string; page: number; limit: number }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const result = await this.pool.query(
      `SELECT execution.*, job.code AS job_code, job.name AS job_name, job.source_system,
              cycle.code AS cycle_code, cycle.name AS cycle_name
       FROM crawl_job_execution execution
       JOIN crawl_job_definition job USING (crawl_job_definition_id)
       JOIN evaluation_cycle cycle USING (evaluation_cycle_id)
       WHERE execution.crawl_job_definition_id = $1
         AND ($2::varchar IS NULL OR execution.status = $2)
         AND ($3::uuid IS NULL OR execution.evaluation_cycle_id = $3)
       ORDER BY execution.created_at DESC LIMIT $4 OFFSET $5`,
      [jobId, filters.status ?? null, filters.cycleId ?? null, filters.limit, (filters.page - 1) * filters.limit]
    );
    const countResult = await this.pool.query(
      `SELECT COUNT(*)::integer AS total FROM crawl_job_execution
       WHERE crawl_job_definition_id = $1 AND ($2::varchar IS NULL OR status = $2)
         AND ($3::uuid IS NULL OR evaluation_cycle_id = $3)`,
      [jobId, filters.status ?? null, filters.cycleId ?? null]
    );
    return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
  }

  async getExecution(executionId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT execution.*, job.code AS job_code, job.name AS job_name,
              cycle.code AS cycle_code, cycle.name AS cycle_name,
              (execution.status IN ('FAILED', 'TIMEOUT')
               AND execution.attempt_no < execution.max_attempts
               AND (execution.error_code IN ('NETWORK_TIMEOUT', 'CONNECTION_RESET', 'UPSTREAM_NETWORK_ERROR', 'TEMPORARY_UNAVAILABLE', 'WORKER_LEASE_EXPIRED')
           OR execution.error_code IN ('UPSTREAM_HTTP_429', 'UPSTREAM_HTTP_500', 'UPSTREAM_HTTP_502', 'UPSTREAM_HTTP_503', 'UPSTREAM_HTTP_504'))
              ) AS can_retry
       FROM crawl_job_execution execution
       JOIN crawl_job_definition job USING (crawl_job_definition_id)
       JOIN evaluation_cycle cycle USING (evaluation_cycle_id)
       WHERE execution.crawl_job_execution_id = $1`,
      [executionId]
    );
    return result.rows[0] ?? null;
  }

  async getExecutionForWorker(executionId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT execution.*, job.active AS job_active,
              mapping.enabled AS cycle_job_enabled, mapping.failure_policy, mapping.sequence_order,
              cycle.status AS cycle_status, cycle.code AS cycle_code, cycle.name AS cycle_name,
              cycle.start_date AS cycle_start_date, cycle.end_date AS cycle_end_date,
              script.source_code, credential.secret_reference
       FROM crawl_job_execution execution
       JOIN crawl_job_definition job ON job.crawl_job_definition_id = execution.crawl_job_definition_id
       JOIN evaluation_cycle_crawl_job mapping
         ON mapping.crawl_job_definition_id = job.crawl_job_definition_id
        AND mapping.evaluation_cycle_id = execution.evaluation_cycle_id
       JOIN evaluation_cycle cycle ON cycle.evaluation_cycle_id = execution.evaluation_cycle_id
       JOIN crawl_script_version script
         ON script.crawl_script_version_id = execution.crawl_script_version_id
       JOIN connector_credential credential
         ON credential.connector_credential_id = execution.connector_credential_id
       WHERE execution.crawl_job_execution_id = $1`,
      [executionId]
    );
    return result.rows[0] ?? null;
  }

  async getExecutionForUpdate(executionId: string, client: TransactionClient): Promise<Record<string, unknown> | null> {
    const result = await client.query(
      `SELECT execution.*, cycle.status AS cycle_status, mapping.failure_policy, mapping.sequence_order
       FROM crawl_job_execution execution
       JOIN evaluation_cycle cycle USING (evaluation_cycle_id)
       JOIN evaluation_cycle_crawl_job mapping
         ON mapping.evaluation_cycle_id = execution.evaluation_cycle_id
        AND mapping.crawl_job_definition_id = execution.crawl_job_definition_id
       WHERE execution.crawl_job_execution_id = $1 FOR UPDATE OF execution, cycle`,
      [executionId]
    );
    return result.rows[0] ?? null;
  }

  async listFollowingScheduledExecutions(executionId: string): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT following.crawl_job_execution_id
       FROM crawl_job_execution failed
       JOIN evaluation_cycle_crawl_job failed_mapping
         ON failed_mapping.evaluation_cycle_id = failed.evaluation_cycle_id
        AND failed_mapping.crawl_job_definition_id = failed.crawl_job_definition_id
       JOIN evaluation_cycle_crawl_job following_mapping
         ON following_mapping.evaluation_cycle_id = failed.evaluation_cycle_id
        AND following_mapping.sequence_order > failed_mapping.sequence_order
        AND following_mapping.enabled = TRUE
       JOIN crawl_job_execution following
         ON following.evaluation_cycle_id = failed.evaluation_cycle_id
        AND following.crawl_job_definition_id = following_mapping.crawl_job_definition_id
       WHERE failed.crawl_job_execution_id = $1
         AND failed.trigger_type = 'SCHEDULED'
         AND following.trigger_type = 'SCHEDULED'
         AND following.status = 'QUEUED'
         AND split_part(following.idempotency_key, ':', 4) = split_part(failed.idempotency_key, ':', 4)`,
      [executionId]
    );
    return result.rows.map((row) => row.crawl_job_execution_id as string);
  }

  async deferFollowingScheduledExecutions(executionId: string, retryAt: Date, client: TransactionClient): Promise<void> {
    await client.query(
      `UPDATE crawl_job_execution following SET
         next_retry_at = GREATEST(following.next_retry_at, $2::timestamptz + INTERVAL '1 second'),
         updated_at = NOW()
       FROM crawl_job_execution failed
       JOIN evaluation_cycle_crawl_job failed_mapping
         ON failed_mapping.evaluation_cycle_id = failed.evaluation_cycle_id
        AND failed_mapping.crawl_job_definition_id = failed.crawl_job_definition_id
       JOIN evaluation_cycle_crawl_job following_mapping
         ON following_mapping.evaluation_cycle_id = failed.evaluation_cycle_id
        AND following_mapping.sequence_order > failed_mapping.sequence_order
        AND following_mapping.enabled = TRUE
       WHERE failed.crawl_job_execution_id = $1
         AND failed.trigger_type = 'SCHEDULED'
         AND following.trigger_type = 'SCHEDULED'
         AND following.status = 'QUEUED'
         AND following.evaluation_cycle_id = failed.evaluation_cycle_id
         AND following.crawl_job_definition_id = following_mapping.crawl_job_definition_id
         AND split_part(following.idempotency_key, ':', 4) = split_part(failed.idempotency_key, ':', 4)`,
      [executionId, retryAt]
    );
  }

  async transitionExecution(
    executionId: string,
    expectedStatus: CrawlExecutionStatus,
    nextStatus: CrawlExecutionStatus,
    fields: { errorCode?: string; errorMessage?: string; importId?: string },
    client: TransactionClient,
    workerId?: string
  ): Promise<CrawlExecutionRecord | null> {
    const result = await client.query(
      `UPDATE crawl_job_execution SET status = $3::varchar,
         started_at = CASE WHEN $3::varchar = 'RUNNING' THEN NOW() ELSE started_at END,
         finished_at = CASE WHEN $3::varchar IN ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED', 'CANCELLED') THEN NOW() ELSE finished_at END,
         duration_ms = CASE WHEN $3::varchar IN ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED', 'CANCELLED') AND started_at IS NOT NULL
           THEN (EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)::bigint ELSE duration_ms END,
         claimed_by = CASE WHEN $3::varchar IN ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED', 'CANCELLED') THEN NULL ELSE claimed_by END,
         lease_expires_at = CASE WHEN $3::varchar IN ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED', 'CANCELLED') THEN NULL ELSE lease_expires_at END,
         error_code = COALESCE($4, error_code), error_message = COALESCE($5, error_message),
         evaluation_data_import_id = COALESCE($6::uuid, evaluation_data_import_id), updated_at = NOW()
       WHERE crawl_job_execution_id = $1 AND status = $2::varchar
         AND ($7::varchar IS NULL OR claimed_by = $7) RETURNING *`,
      [executionId, expectedStatus, nextStatus, fields.errorCode ?? null, fields.errorMessage ?? null, fields.importId ?? null, workerId ?? null]
    );
    return (result.rows[0] as CrawlExecutionRecord | undefined) ?? null;
  }

  async ownsExecutionClaim(executionId: string, workerId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM crawl_job_execution
       WHERE crawl_job_execution_id = $1 AND status = 'RUNNING'
         AND claimed_by = $2 AND lease_expires_at > NOW()`,
      [executionId, workerId]
    );
    return result.rows.length > 0;
  }

  // ── Source Systems ────────────────────────────────────────────────────────
  async listSourceSystems(): Promise<Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT * FROM crawl_source_system ORDER BY code ASC`
    );
    return result.rows;
  }

  async getSourceSystem(idOrCode: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT * FROM crawl_source_system WHERE id::text = $1 OR code = $1`,
      [idOrCode]
    );
    return result.rows[0] ?? null;
  }

  async createSourceSystem(data: {
    code: string;
    name: string;
    description?: string | null;
    type?: string;
    authentication_type?: string;
    allowed_domains?: string[];
    credential_schema?: Record<string, unknown>;
    configuration_schema?: Record<string, unknown>;
    enabled?: boolean;
    created_by?: string;
  }): Promise<Record<string, unknown>> {
    const result = await this.pool.query(
      `INSERT INTO crawl_source_system (
        code, name, description, type, authentication_type, allowed_domains,
        credential_schema, configuration_schema, enabled, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.code.trim().toUpperCase(),
        data.name.trim(),
        data.description ?? null,
        data.type || 'REST_API',
        data.authentication_type || 'NONE',
        data.allowed_domains || [],
        JSON.stringify(data.credential_schema || {}),
        JSON.stringify(data.configuration_schema || {}),
        data.enabled ?? true,
        data.created_by || 'system',
      ]
    );
    return result.rows[0]!;
  }

  async updateSourceSystem(id: string, data: {
    name?: string;
    description?: string | null;
    type?: string;
    authentication_type?: string;
    allowed_domains?: string[];
    credential_schema?: Record<string, unknown>;
    configuration_schema?: Record<string, unknown>;
    enabled?: boolean;
  }): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `UPDATE crawl_source_system
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           type = COALESCE($4, type),
           authentication_type = COALESCE($5, authentication_type),
           allowed_domains = COALESCE($6, allowed_domains),
           credential_schema = COALESCE($7, credential_schema),
           configuration_schema = COALESCE($8, configuration_schema),
           enabled = COALESCE($9, enabled),
           updated_at = NOW()
       WHERE id::text = $1 OR code = $1
       RETURNING *`,
      [
        id,
        data.name,
        data.description,
        data.type,
        data.authentication_type,
        data.allowed_domains,
        data.credential_schema ? JSON.stringify(data.credential_schema) : null,
        data.configuration_schema ? JSON.stringify(data.configuration_schema) : null,
        data.enabled,
      ]
    );
    return result.rows[0] ?? null;
  }

  async deleteSourceSystem(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM crawl_source_system WHERE id::text = $1 OR code = $1`, [id]);
  }

  // ── KPI Scoring Prompts & Versions ─────────────────────────────────────────
  async listPrompts(): Promise<Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT p.*,
              (SELECT prompt_version_id FROM kpi_scoring_prompt_version v
               WHERE v.prompt_id = p.prompt_id AND v.status = 'PUBLISHED'
               ORDER BY version_no DESC LIMIT 1) AS current_published_version_id,
              (SELECT version_no FROM kpi_scoring_prompt_version v
               WHERE v.prompt_id = p.prompt_id AND v.status = 'PUBLISHED'
               ORDER BY version_no DESC LIMIT 1) AS current_version_no,
              (SELECT COUNT(*)::integer FROM kpi_scoring_prompt_version v WHERE v.prompt_id = p.prompt_id) AS version_count
       FROM kpi_scoring_prompt p
       ORDER BY p.code ASC`
    );
    return result.rows;
  }

  async getPrompt(promptId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT p.*,
              (SELECT prompt_version_id FROM kpi_scoring_prompt_version v
               WHERE v.prompt_id = p.prompt_id AND v.status = 'PUBLISHED'
               ORDER BY version_no DESC LIMIT 1) AS current_published_version_id,
              (SELECT version_no FROM kpi_scoring_prompt_version v
               WHERE v.prompt_id = p.prompt_id AND v.status = 'PUBLISHED'
               ORDER BY version_no DESC LIMIT 1) AS current_version_no
       FROM kpi_scoring_prompt p
       WHERE p.prompt_id = $1 OR p.code = $1`,
      [promptId]
    );
    return result.rows[0] ?? null;
  }

  async createPrompt(data: {
    code: string;
    name: string;
    criterion_id?: string | null;
    criterion_code?: string | null;
    description?: string | null;
    created_by?: string;
  }): Promise<Record<string, unknown>> {
    const result = await this.pool.query(
      `INSERT INTO kpi_scoring_prompt (code, name, criterion_id, criterion_code, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.code.trim().toUpperCase(),
        data.name.trim(),
        data.criterion_id || null,
        data.criterion_code || null,
        data.description || null,
        data.created_by || 'system',
      ]
    );
    return result.rows[0]!;
  }

  async updatePrompt(
    promptId: string,
    patch: { name?: string; description?: string; criterion_code?: string; criterion_id?: string | null }
  ): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `UPDATE kpi_scoring_prompt
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           criterion_code = COALESCE($4, criterion_code),
           criterion_id = COALESCE($5, criterion_id),
           updated_at = NOW()
       WHERE prompt_id::text = $1 OR code = $1
       RETURNING *`,
      [promptId, patch.name ?? null, patch.description ?? null, patch.criterion_code ?? null, patch.criterion_id ?? null]
    );
    return result.rows[0] ?? null;
  }

  async deletePrompt(promptId: string): Promise<void> {
    await this.pool.query(`DELETE FROM kpi_scoring_prompt_version WHERE prompt_id::text = $1`, [promptId]);
    await this.pool.query(`DELETE FROM kpi_scoring_prompt WHERE prompt_id::text = $1 OR code = $1`, [promptId]);
  }

  async listPromptVersions(promptId: string): Promise<Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT * FROM kpi_scoring_prompt_version
       WHERE prompt_id = $1
       ORDER BY version_no DESC`,
      [promptId]
    );
    return result.rows;
  }

  async getPromptVersion(versionId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT v.*, p.code AS prompt_code, p.name AS prompt_name, p.criterion_code
       FROM kpi_scoring_prompt_version v
       JOIN kpi_scoring_prompt p ON v.prompt_id = p.prompt_id
       WHERE v.prompt_version_id = $1`,
      [versionId]
    );
    return result.rows[0] ?? null;
  }

  async createPromptVersion(data: {
    prompt_id: string;
    system_prompt: string;
    user_prompt_template: string;
    expected_output_schema?: Record<string, unknown>;
    model?: string;
    temperature?: number;
    checksum: string;
    created_by: string;
    status?: 'DRAFT' | 'PUBLISHED';
  }): Promise<Record<string, unknown>> {
    const nextVerRes = await this.pool.query(
      `SELECT COALESCE(MAX(version_no), 0) + 1 AS next_ver FROM kpi_scoring_prompt_version WHERE prompt_id = $1`,
      [data.prompt_id]
    );
    const versionNo = Number(nextVerRes.rows[0]?.next_ver || 1);
    const isPublished = data.status === 'PUBLISHED';

    const result = await this.pool.query(
      `INSERT INTO kpi_scoring_prompt_version (
        prompt_id, version_no, system_prompt, user_prompt_template, expected_output_schema,
        model, temperature, status, checksum, created_by, published_by, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        data.prompt_id,
        versionNo,
        data.system_prompt,
        data.user_prompt_template,
        JSON.stringify(data.expected_output_schema || {}),
        data.model || 'gemini-2.5-flash',
        data.temperature ?? 0.2,
        data.status || 'DRAFT',
        data.checksum,
        data.created_by,
        isPublished ? data.created_by : null,
        isPublished ? new Date() : null,
      ]
    );
    return result.rows[0]!;
  }

  async publishPromptVersion(versionId: string, actor: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `UPDATE kpi_scoring_prompt_version
       SET status = 'PUBLISHED',
           published_by = $2,
           published_at = NOW()
       WHERE prompt_version_id = $1 AND status = 'DRAFT'
       RETURNING *`,
      [versionId, actor]
    );
    return result.rows[0] ?? null;
  }

  // ── Scoring Executions ─────────────────────────────────────────────────────
  async listScoringExecutions(filters: {
    crawl_execution_id?: string;
    cycle_id?: string;
    status?: string;
    review_status?: string;
    employee_code?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (filters.crawl_execution_id) {
      params.push(filters.crawl_execution_id);
      conditions.push(`s.crawl_execution_id = $${params.length}`);
    }
    if (filters.cycle_id) {
      params.push(filters.cycle_id);
      conditions.push(`s.evaluation_cycle_id = $${params.length}`);
    }
    if (filters.status && filters.status !== 'ALL') {
      params.push(filters.status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (filters.review_status && filters.review_status !== 'ALL') {
      params.push(filters.review_status);
      conditions.push(`s.review_status = $${params.length}`);
    }
    if (filters.employee_code) {
      params.push(`%${filters.employee_code}%`);
      conditions.push(`(s.employee_code ILIKE $${params.length} OR emp.full_name ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.pool.query(
      `SELECT COUNT(*)::integer AS total
       FROM crawl_scoring_execution s
       LEFT JOIN employee emp ON UPPER(emp.employee_code) = UPPER(s.employee_code)
       WHERE ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.total || 0);

    params.push(limit, offset);
    const itemsRes = await this.pool.query(
      `SELECT s.*,
              emp.full_name AS employee_name,
              r.value AS raw_measurement_value,
              r.source_snapshot,
              r.status AS row_staging_status,
              r.comment AS row_comment,
              pv.version_no AS prompt_version_no,
              p.name AS prompt_name
       FROM crawl_scoring_execution s
       JOIN evaluation_data_import_record r ON s.crawl_data_row_id = r.record_id
       LEFT JOIN employee emp ON UPPER(emp.employee_code) = UPPER(s.employee_code)
       LEFT JOIN kpi_scoring_prompt_version pv ON s.prompt_version_id = pv.prompt_version_id
       LEFT JOIN kpi_scoring_prompt p ON pv.prompt_id = p.prompt_id
       WHERE ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { items: itemsRes.rows, total };
  }

  async getScoringExecution(id: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT s.*,
              emp.full_name AS employee_name,
              r.value AS raw_measurement_value,
              r.source_snapshot,
              r.status AS row_staging_status,
              r.comment AS row_comment,
              pv.version_no AS prompt_version_no,
              p.name AS prompt_name
       FROM crawl_scoring_execution s
       JOIN evaluation_data_import_record r ON s.crawl_data_row_id = r.record_id
       LEFT JOIN employee emp ON UPPER(emp.employee_code) = UPPER(s.employee_code)
       LEFT JOIN kpi_scoring_prompt_version pv ON s.prompt_version_id = pv.prompt_version_id
       LEFT JOIN kpi_scoring_prompt p ON pv.prompt_id = p.prompt_id
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async retryScoringExecution(id: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `UPDATE crawl_scoring_execution
       SET status = 'QUEUED',
           next_retry_at = NOW(),
           locked_at = NULL,
           locked_by = NULL,
           error_code = NULL,
           error_message = NULL,
           updated_at = NOW()
       WHERE id = $1 AND status IN ('FAILED', 'CANCELLED')
       RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async rescoreRow(crawlDataRowId: string, promptVersionId?: string): Promise<Record<string, unknown>> {
    const result = await this.pool.query(
      `UPDATE crawl_scoring_execution
       SET status = 'QUEUED',
           prompt_version_id = COALESCE($2, prompt_version_id),
           attempt_no = 1,
           next_retry_at = NOW(),
           locked_at = NULL,
           locked_by = NULL,
           error_code = NULL,
           error_message = NULL,
           updated_at = NOW()
       WHERE crawl_data_row_id = $1
       RETURNING *`,
      [crawlDataRowId, promptVersionId || null]
    );
    if (result.rows.length === 0) {
      throw new Error(`Scoring execution for row ${crawlDataRowId} not found.`);
    }
    return result.rows[0]!;
  }

  async updateReviewStatus(
    id: string,
    reviewStatus: string,
    finalScore: number | null,
    reviewerId: string,
    reviewComment: string | null
  ): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `UPDATE crawl_scoring_execution
       SET review_status = $2,
           final_score = $3,
           reviewer_id = $4,
           review_comment = $5,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, reviewStatus, finalScore, reviewerId, reviewComment]
    );
    return result.rows[0] ?? null;
  }

  async markApplied(id: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `UPDATE crawl_scoring_execution
       SET review_status = 'APPLIED',
           applied_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async getEmployeesForCycle(cycleId: string): Promise<Array<{
    employee_id: string;
    employee_code: string;
    full_name: string;
    email: string;
    last_evaluation_completed_at?: string | null;
    next_review_due_date?: string | null;
    join_date?: string | null;
    review_from: string;
    review_to: string;
    review_from_date: string;
    review_to_date: string;
  }>> {
    const result = await this.pool.query(
      `SELECT 
        e.employee_id, 
        e.employee_code, 
        e.full_name, 
        e.email,
        e.last_evaluation_completed_at,
        e.next_review_due_date,
        e.join_date,
        ec.start_date AS cycle_start_date,
        ec.end_date AS cycle_end_date
       FROM employee e
       JOIN evaluation_cycle ec ON ec.evaluation_cycle_id = $1
       WHERE e.employment_status = 'ACTIVE'
         AND (
           CARDINALITY(ec.applicable_employee_ids) IS NULL 
           OR CARDINALITY(ec.applicable_employee_ids) = 0 
           OR e.employee_id = ANY(ec.applicable_employee_ids)
         )
         AND (
           CARDINALITY(ec.applicable_team_ids) IS NULL 
           OR CARDINALITY(ec.applicable_team_ids) = 0 
           OR e.team_id = ANY(ec.applicable_team_ids)
         )
         AND (
           CARDINALITY(ec.applicable_role_ids) IS NULL 
           OR CARDINALITY(ec.applicable_role_ids) = 0 
           OR e.role_id = ANY(ec.applicable_role_ids)
         )
       ORDER BY e.employee_code ASC`,
      [cycleId]
    );
    return result.rows.map((row) => {
      let fromDate: Date;
      if (row.last_evaluation_completed_at) {
        const last = new Date(row.last_evaluation_completed_at);
        last.setUTCDate(last.getUTCDate() + 1);
        last.setUTCHours(0, 0, 0, 0);
        fromDate = last;
      } else if (row.join_date) {
        fromDate = new Date(row.join_date);
        fromDate.setUTCHours(0, 0, 0, 0);
      } else if (row.cycle_start_date) {
        fromDate = new Date(row.cycle_start_date);
        fromDate.setUTCHours(0, 0, 0, 0);
      } else {
        fromDate = new Date();
      }

      let toDate: Date;
      if (row.next_review_due_date) {
        toDate = new Date(row.next_review_due_date);
        toDate.setUTCHours(23, 59, 59, 999);
      } else if (row.cycle_end_date) {
        toDate = new Date(row.cycle_end_date);
        toDate.setUTCHours(23, 59, 59, 999);
      } else {
        toDate = new Date();
      }

      const formatDateOnly = (d: Date) => d.toISOString().slice(0, 10);

      return {
        employee_id: String(row.employee_id),
        employee_code: String(row.employee_code),
        full_name: String(row.full_name),
        email: String(row.email),
        last_evaluation_completed_at: row.last_evaluation_completed_at ? new Date(row.last_evaluation_completed_at).toISOString() : null,
        next_review_due_date: row.next_review_due_date ? String(row.next_review_due_date) : null,
        join_date: row.join_date ? String(row.join_date) : null,
        review_from: fromDate.toISOString(),
        review_to: toDate.toISOString(),
        review_from_date: formatDateOnly(fromDate),
        review_to_date: formatDateOnly(toDate),
      };
    });
  }

  async listExecutionRecords(executionId: string): Promise<Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT r.record_id,
              r.employee_code,
              emp.full_name AS employee_name,
              r.kpi_code,
              r.value AS raw_measurement_value,
              r.status AS row_staging_status,
              r.comment AS row_comment,
              r.rationale,
              r.source_snapshot,
              r.error_message,
              r.conflicts,
              r.created_at,
              s.id AS scoring_id,
              s.score,
              s.confidence,
              s.reason,
              s.evidence AS ai_evidence,
              s.status AS scoring_status,
              s.review_status,
              s.final_score
       FROM evaluation_data_import_record r
       LEFT JOIN employee emp ON UPPER(emp.employee_code) = UPPER(r.employee_code)
       LEFT JOIN crawl_scoring_execution s ON s.crawl_data_row_id = r.record_id
       WHERE (r.crawl_job_execution_id = $1 OR r.import_id = (SELECT evaluation_data_import_id FROM crawl_job_execution WHERE crawl_job_execution_id = $1))
       ORDER BY r.created_at DESC, r.employee_code ASC`,
      [executionId]
    );
    return result.rows;
  }
}