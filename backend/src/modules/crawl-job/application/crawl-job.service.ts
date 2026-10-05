import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import { AppError, NotFound } from '../../../api/app-error.js';
import { Actor } from '../../../shared/auth/types.js';
import { withAuditedTransaction } from '../../audit/application/audit-transaction.js';
import { AuditService } from '../../audit/application/audit.service.js';
import {
  AssignCrawlJobToCycleRequest,
  CreateCrawlExecutionRequest,
  CreateCrawlJobRequest,
  CreateCrawlScriptRequest,
  CreateCredentialReferenceRequest,
  UpdateCrawlJobRequest,
  UpdateCrawlScriptRequest,
} from '../domain/crawl-job.schemas.js';
import {
  assertExecutionTransition,
  CrawlExecutionSnapshot,
  CrawlExecutionStatus,
  isRetryableCrawlFailure,
} from '../domain/crawl-job.types.js';
import { CrawlExecutionRecord, CrawlJobRecord, PostgresCrawlJobRepository } from '../infrastructure/postgres-crawl-job.repository.js';
import { CrawlSandboxService, CrawlSourceFetcher } from './crawl-sandbox.service.js';
import { CrawlSourceClient } from './crawl-source-client.js';

const CRAWL_ADMIN_ROLES = new Set(['HR_ADMIN', 'SYSTEM_ADMIN']);

function requireCrawlAdmin(actor: Actor): void {
  if (!CRAWL_ADMIN_ROLES.has(actor.role)) {
    throw new AppError(403, 'FORBIDDEN', 'Only HR Admin can manage Crawl Jobs.');
  }
  if (actor.role === 'SYSTEM_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'System Admin is read-only for business data.');
  }
}

function parseSnapshotValue<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return (value as T | null | undefined) ?? fallback;
}

function toExecutionSnapshot(job: Record<string, unknown>): CrawlExecutionSnapshot {
  const criteria = parseSnapshotValue<Array<{ criterion_id: string; criterion_code: string }>>(job.criteria, []);
  return {
    script_id: String(job.crawl_script_version_id),
    script_version: Number(job.script_version),
    script_checksum: String(job.script_checksum),
    source_system: job.source_system as CrawlExecutionSnapshot['source_system'],
    source_config: parseSnapshotValue<Record<string, unknown>>(job.source_config, {}),
    connector_credential_id: String(job.connector_credential_id),
    criteria,
  };
}

export class CrawlJobService {
  private refreshSchedule?: () => void;

  constructor(
    private readonly pool: Pool,
    private readonly repository: PostgresCrawlJobRepository,
    private readonly auditService: AuditService
  ) { }

  attachScheduleRefresh(refresh: () => void): void {
    this.refreshSchedule = refresh;
  }

  async listJobs(actor: Actor, filters: { source_system?: string; active?: boolean; cycle_id?: string } = {}): Promise<Record<string, unknown>[]> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Crawl Job access is restricted.');
    return this.repository.listJobs(filters);
  }

  async getJob(actor: Actor, jobId: string): Promise<CrawlJobRecord> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Crawl Job access is restricted.');
    const job = await this.repository.getJob(jobId);
    if (!job) throw new NotFound(`Crawl Job ${jobId}`);
    return job;
  }

  async createJob(actor: Actor, request: CreateCrawlJobRequest): Promise<CrawlJobRecord> {
    requireCrawlAdmin(actor);
    const jobId = crypto.randomUUID();
    const criterionIds = [...new Set(request.criterion_ids)];
    if (criterionIds.length !== request.criterion_ids.length) {
      throw new AppError(422, 'DUPLICATE_CRITERION', 'A criterion can only be mapped once to a Crawl Job.');
    }

    const created = await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const script = await this.repository.getPublishedScript(request.crawl_script_version_id, client);
      if (!script || script.status !== 'PUBLISHED') {
        throw new AppError(422, 'SCRIPT_NOT_PUBLISHED', 'Only published crawl scripts can be assigned to a job.');
      }
      if (script.source_system !== request.source_system) {
        throw new AppError(422, 'SOURCE_SYSTEM_MISMATCH', 'The selected script does not support this source system.');
      }
      if (!(await this.repository.getActiveCredential(request.connector_credential_id, request.source_system, client))) {
        throw new AppError(422, 'CREDENTIAL_INVALID', 'Select an active credential reference for this source.');
      }
      if (request.evaluation_cycle_id) {
        const cycleResult = await client.query(
          `SELECT status FROM evaluation_cycle WHERE evaluation_cycle_id = $1`,
          [request.evaluation_cycle_id]
        );
        const cycleRow = cycleResult.rows[0];
        if (!cycleRow) throw new NotFound(`Evaluation Cycle ${request.evaluation_cycle_id}`);
        if (cycleRow.status !== 'OPEN') {
          throw new AppError(400, 'CYCLE_NOT_OPEN', 'Only an OPEN evaluation cycle can be assigned to a Crawl Job.');
        }
      }
      const criteria = await this.repository.getCriteria(criterionIds, client);
      if (criteria.length !== criterionIds.length) {
        throw new AppError(422, 'INVALID_CRITERION', 'One or more selected criteria are unavailable.');
      }

      await this.repository.insertJob({
        crawl_job_definition_id: jobId,
        code: request.code,
        name: request.name,
        source_system: request.source_system,
        crawl_script_version_id: request.crawl_script_version_id,
        connector_credential_id: request.connector_credential_id,
        source_config: request.source_config,
        default_schedule_cron: request.default_schedule_cron ?? null,
        failure_policy: request.failure_policy,
        created_by: actor.userId,
      }, client);
      await this.repository.insertCriteria(jobId, criterionIds, client);
      if (request.evaluation_cycle_id) {
        await this.repository.upsertCycleJob(
          request.evaluation_cycle_id,
          jobId,
          true,
          0,
          request.failure_policy,
          actor.userId,
          client
        );
      }
      audit.record({
        entityType: 'CRAWL_JOB',
        entityId: jobId,
        action: 'CRAWL_JOB_CREATED',
        newValue: JSON.stringify({ code: request.code, source_system: request.source_system, criterion_ids: criterionIds }),
      });
      const created = await this.repository.getJob(jobId, client);
      if (!created) throw new Error('Created Crawl Job could not be read back.');
      return created;
    }, actor.userId);
    this.refreshSchedule?.();
    return created;
  }

  async listPublishedScripts(actor: Actor, sourceSystem?: string, status?: string): Promise<Record<string, unknown>[]> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Published script access is restricted.');
    return this.repository.listPublishedScripts(sourceSystem, status);
  }

  async listCredentialReferences(actor: Actor, sourceSystem?: string): Promise<Record<string, unknown>[]> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Connector credential metadata access is restricted.');
    return this.repository.listCredentialReferences(sourceSystem);
  }

  async createScriptVersion(actor: Actor, request: CreateCrawlScriptRequest): Promise<Record<string, unknown>> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Only HR Admin and System Admin can create crawler scripts.');
    if (request.evaluation_cycle_id) {
      const cycleResult = await this.pool.query(
        `SELECT status FROM evaluation_cycle WHERE evaluation_cycle_id = $1`,
        [request.evaluation_cycle_id]
      );
      const cycleRow = cycleResult.rows[0];
      if (!cycleRow) throw new NotFound(`Evaluation Cycle ${request.evaluation_cycle_id}`);
      if (cycleRow.status !== 'OPEN') {
        throw new AppError(400, 'CYCLE_NOT_OPEN', 'Only an OPEN evaluation cycle can be used for Crawl Script creation.');
      }
    }
    const id = crypto.randomUUID();
    const checksum = createHash('sha256').update(request.source_code, 'utf8').digest('hex');
    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const scoringPromptContent = request.user_prompt_template || request.scoring_prompt || null;
      const script = await this.repository.createScriptVersion({
        id, code: request.code, sourceSystem: request.source_system,
        sourceCode: request.source_code, checksum, scoringPrompt: scoringPromptContent, actorId: actor.userId,
      }, client);

      // Automatically create and publish linked AI scoring prompt
      const promptCode = (request.prompt_code || `PROMPT_${request.code}`).trim().toUpperCase();
      const promptName = request.prompt_name?.trim() || `Scoring Prompt for ${request.code}`;
      const systemPrompt = request.system_prompt?.trim() ||
        'You are an expert HR evaluation analyst assessing employee deliverables from crawler data. Provide a numeric score between 1.00 and 5.00, detailed rationale, confidence between 0.0 and 1.0, and evidence citations.';
      const userPromptTemplate = request.user_prompt_template?.trim() || request.scoring_prompt?.trim() ||
        `Evaluate {{source_system}} output for employee {{employee_code}} on criterion {{criterion_code}}.\nMeasured Value: {{measurement_value}}%\nRaw Details: {{raw_payload}}\nReturn JSON: {"score": <number 1.00-5.00>, "reason": "<string>", "confidence": <0.0-1.0>, "evidence": [<string>]}`;
      const model = request.model?.trim() || 'gemini-2.5-flash';
      const temperature = request.temperature ?? 0.20;

      const promptRes = await client.query(
        `INSERT INTO kpi_scoring_prompt (code, name, criterion_code, description, created_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           criterion_code = COALESCE(EXCLUDED.criterion_code, kpi_scoring_prompt.criterion_code),
           description = EXCLUDED.description,
           updated_at = NOW()
         RETURNING prompt_id`,
        [
          promptCode,
          promptName,
          request.criteria_ids?.[0] || request.code,
          request.description || `Auto-created scoring prompt for script ${request.code}`,
          actor.userId,
        ]
      );
      const promptId = promptRes.rows[0]?.prompt_id;

      if (promptId) {
        const verRes = await client.query(
          `SELECT COALESCE(MAX(version_no), 0) + 1 AS next_ver FROM kpi_scoring_prompt_version WHERE prompt_id = $1`,
          [promptId]
        );
        const nextVer = Number(verRes.rows[0]?.next_ver ?? 1);
        const promptChecksum = createHash('sha256').update(systemPrompt + userPromptTemplate, 'utf8').digest('hex');

        await client.query(
          `INSERT INTO kpi_scoring_prompt_version (
             prompt_id, version_no, system_prompt, user_prompt_template, model, temperature,
             status, checksum, created_by, published_by, published_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'PUBLISHED', $7, $8, $8, NOW())
           ON CONFLICT (prompt_id, version_no) DO NOTHING`,
          [
            promptId, nextVer, systemPrompt, userPromptTemplate, model, temperature,
            promptChecksum, actor.userId,
          ]
        );
      }

      audit.record({ entityType: 'CRAWL_SCRIPT_VERSION', entityId: id, action: 'CRAWL_SCRIPT_CREATED', newValue: checksum });
      return script;
    }, actor.userId);
  }

  async testRunScript(actor: Actor, request: {
    scriptId?: string;
    sourceCode?: string;
    sourceSystem: string;
    sourceConfig?: Record<string, unknown>;
    mockInput?: Record<string, unknown>;
    evaluation_cycle_id?: string;
  }): Promise<{
    success: boolean;
    executionTimeMs: number;
    recordCount: number;
    records: unknown[];
    logs?: string[];
    error?: string;
  }> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Only HR Admin and System Admin can test run crawler scripts.');
    }
    if (request.evaluation_cycle_id) {
      const cycleResult = await this.pool.query(
        `SELECT status FROM evaluation_cycle WHERE evaluation_cycle_id = $1`,
        [request.evaluation_cycle_id]
      );
      const cycleRow = cycleResult.rows[0];
      if (!cycleRow) throw new NotFound(`Evaluation Cycle ${request.evaluation_cycle_id}`);
      if (cycleRow.status !== 'OPEN') {
        throw new AppError(400, 'CYCLE_NOT_OPEN', 'Evaluation cycle must be OPEN for test execution.');
      }
    }
    const startTime = Date.now();
    const scriptLogs: string[] = [];
    try {
      let sourceCode = request.sourceCode;
      if (!sourceCode && request.scriptId) {
        const script = await this.repository.getScriptVersion(request.scriptId);
        if (!script) throw new AppError(404, 'NOT_FOUND', 'Script not found.');
        sourceCode = String(script.source_code);
      }
      if (!sourceCode) throw new AppError(400, 'BAD_REQUEST', 'Source code is required.');

      const sandbox = new CrawlSandboxService({ timeoutMs: 30000, memoryLimitMb: 64 });
      const now = new Date().toISOString();

      // Resolve the secret reference and base_url for the source system from env vars
      const sourceSystem = request.sourceSystem as 'JIRA' | 'BLUEPRINT' | string;
      let secretReference: string;
      let sourceConfig = request.sourceConfig || {};

      if (sourceSystem === 'JIRA') {
        secretReference = 'JIRA_PASSWORD';
        if (!sourceConfig['base_url']) {
          sourceConfig = { base_url: process.env['JIRA_BASE_URL'] || 'https://pim.cyberlogitec.com/jira', ...sourceConfig };
        }
      } else if (sourceSystem === 'BLUEPRINT') {
        secretReference = 'BLUEPRINT_PASSWORD';
        if (!sourceConfig['base_url']) {
          sourceConfig = { base_url: process.env['BLUEPRINT_BASE_URL'] || 'https://blueprint.cyberlogitec.com.vn', ...sourceConfig };
        }
      } else {
        secretReference = 'CRAWL_TEST_SECRET';
      }

      const sourceClient = new CrawlSourceClient({ timeoutMs: 25000 });
      let realFetchSource: CrawlSourceFetcher;

      if (sourceSystem === 'BLUEPRINT') {
        // Blueprint uses Keycloak SSO (cookie-based) — CrawlSourceClient cannot handle redirects.
        // Use BlueprintCollector directly which manages the full SSO cookie session.
        const { BlueprintCollector } = await import('../../collector/plugins/blueprint.collector.js');
        const bpUsername = process.env['BLUEPRINT_USERNAME'] || '';
        const bpPassword = process.env['BLUEPRINT_PASSWORD'] || '';
        const bpBaseUrl = (sourceConfig['base_url'] as string | undefined) || process.env['BLUEPRINT_BASE_URL'] || 'https://blueprint.cyberlogitec.com.vn';
        const collector = BlueprintCollector.getInstance({ username: bpUsername, password: bpPassword, baseUrl: bpBaseUrl });
        await collector.ensureLoggedIn();
        realFetchSource = async (path, optionsOrQuery) => {
          const url = path.startsWith('http') ? path : `${bpBaseUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
          let fetchOptions: RequestInit = {};
          if (optionsOrQuery && ('method' in optionsOrQuery || 'body' in optionsOrQuery)) {
            const opts = optionsOrQuery as { method?: string; body?: unknown; headers?: Record<string, string> };
            fetchOptions = {
              method: opts.method || 'GET',
              headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
              ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
            };
          }
          const res = await collector.ensureLoggedIn().then(() =>
            (collector as unknown as { fetchWithCookies(url: string, opts?: RequestInit): Promise<Response> }).fetchWithCookies(url, fetchOptions)
          );
          if (!res.ok) {
            throw new Error(`Blueprint API returned ${res.status}`);
          }
          return res.json() as Promise<unknown>;
        };
      } else {
        realFetchSource = sourceClient.createFetcher(
          sourceSystem as Parameters<typeof sourceClient.createFetcher>[0],
          sourceConfig,
          secretReference
        );
      }

      // Default input targetCycle is the currently OPEN evaluation cycle received from crawl job
      const openCycleResult = await this.pool.query<{ id: string; code: string; name: string }>(
        `SELECT evaluation_cycle_id as id, code, name FROM evaluation_cycle WHERE status = 'OPEN' ORDER BY start_date DESC LIMIT 1`
      ).catch(() => ({ rows: [] }));
      const openCycle = openCycleResult.rows[0] || { id: '00000000-0000-0000-0000-000000000001', code: 'CYCLE_OPEN', name: 'Default Open Cycle' };

      const input = {
        sourceConfig,
        source_config: sourceConfig,
        credentials: {},
        criteria: [],
        targetCycle: openCycle,
        target_cycle: openCycle,
        executionId: 'dry-run-' + Date.now(),
        execution_id: 'dry-run-' + Date.now(),
        collectedAt: now,
        collected_at: now,
        ...(request.mockInput || {}),
      };

      const loggedFetcher: CrawlSourceFetcher = async (path, optionsOrQuery) => {
        scriptLogs.push(`[Script Step: Gửi request API] Đang kết nối tới ${sourceSystem} (${path})...`);
        const res = await realFetchSource(path, optionsOrQuery);
        const count = Array.isArray(res) ? res.length : (res && typeof res === 'object' ? Object.keys(res).length : 1);
        scriptLogs.push(`[Script Step: Nhận dữ liệu nguồn] Nhận thành công phản hồi từ ${path} (quy mô payload: ~${count} phần tử).`);
        return res;
      };

      const output = await sandbox.run<unknown[]>(
        sourceCode,
        input,
        loggedFetcher,
        (msg) => {
          scriptLogs.push(msg.startsWith('[Script Step') ? msg : `[Script Step] ${msg}`);
        }
      );
      const executionTimeMs = Date.now() - startTime;

      if (!Array.isArray(output)) {
        return {
          success: false,
          executionTimeMs,
          recordCount: 0,
          records: [],
          logs: scriptLogs,
          error: 'Script must return an array of normalized crawl output records.',
        };
      }

      return {
        success: true,
        executionTimeMs,
        recordCount: output.length,
        records: output,
        logs: scriptLogs,
      };
    } catch (err: unknown) {
      return {
        success: false,
        executionTimeMs: Date.now() - startTime,
        recordCount: 0,
        records: [],
        logs: scriptLogs,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async getScriptVersionDetails(actor: Actor, scriptVersionId: string): Promise<Record<string, unknown>> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Access to crawler scripts is restricted.');
    const script = await this.repository.getScriptVersion(scriptVersionId);
    if (!script) throw new NotFound(`Crawl script version ${scriptVersionId}`);
    return script;
  }

  async updateScriptVersion(actor: Actor, scriptVersionId: string, patch: UpdateCrawlScriptRequest): Promise<Record<string, unknown>> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Only HR Admin and System Admin can update crawler scripts.');
    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const existing = await this.repository.getScriptVersion(scriptVersionId);
      if (!existing) throw new NotFound(`Crawl script version ${scriptVersionId}`);
      const checksum = patch.source_code ? createHash('sha256').update(patch.source_code).digest('hex') : undefined;
      const updated = await this.repository.updateScriptVersion(scriptVersionId, {
        sourceCode: patch.source_code,
        checksum,
        scoringPrompt: patch.scoring_prompt,
        sourceSystem: patch.source_system,
      }, client);
      if (!updated) throw new AppError(500, 'SCRIPT_UPDATE_FAILED', 'Failed to update script.');
      audit.record({
        entityType: 'CRAWL_SCRIPT_VERSION',
        entityId: scriptVersionId,
        action: 'CRAWL_SCRIPT_UPDATED',
        newValue: JSON.stringify({ checksum, source_system: patch.source_system }),
      });
      return updated;
    }, actor.userId);
  }

  async deleteScriptVersion(actor: Actor, scriptVersionId: string): Promise<{ success: boolean; message: string }> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Only HR Admin and System Admin can delete crawler scripts.');
    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const existing = await this.repository.getScriptVersion(scriptVersionId);
      if (!existing) throw new NotFound(`Crawl script version ${scriptVersionId}`);

      const inUse = await client.query(
        `SELECT job.code, job.name FROM crawl_job_definition job WHERE job.crawl_script_version_id = $1 LIMIT 1`,
        [scriptVersionId]
      );
      const firstInUse = inUse.rows[0];
      if (firstInUse) {
        throw new AppError(409, 'CANNOT_DELETE_SCRIPT_IN_USE', `Không thể xóa script vì đang được liên kết với Crawl Job "${firstInUse.name}" (${firstInUse.code}). Hãy gán Crawl Job sang script khác hoặc chọn Vô hiệu hóa (Disable).`);
      }

      const deleted = await this.repository.deleteScriptVersion(scriptVersionId, client);
      if (!deleted) throw new AppError(500, 'SCRIPT_DELETE_FAILED', 'Không thể xóa script.');
      audit.record({
        entityType: 'CRAWL_SCRIPT_VERSION',
        entityId: scriptVersionId,
        action: 'CRAWL_SCRIPT_DELETED',
        oldValue: String(existing.code),
      });
      return { success: true, message: `Đã xóa thành công script ${existing.code} (v${existing.version_no})` };
    }, actor.userId);
  }

  async disableScriptVersion(actor: Actor, scriptVersionId: string): Promise<Record<string, unknown>> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Only HR Admin and System Admin can disable crawler scripts.');
    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const existing = await this.repository.getScriptVersion(scriptVersionId);
      if (!existing) throw new NotFound(`Crawl script version ${scriptVersionId}`);
      if (existing.status !== 'PUBLISHED') {
        throw new AppError(400, 'SCRIPT_NOT_PUBLISHED', 'Chỉ có thể vô hiệu hóa script đang ở trạng thái Đã xuất bản (PUBLISHED).');
      }
      const updated = await this.repository.setScriptStatus(scriptVersionId, 'DISABLED', client);
      if (!updated) throw new AppError(500, 'SCRIPT_DISABLE_FAILED', 'Không thể vô hiệu hóa script.');
      audit.record({
        entityType: 'CRAWL_SCRIPT_VERSION',
        entityId: scriptVersionId,
        action: 'CRAWL_SCRIPT_DISABLED',
        oldValue: 'PUBLISHED',
        newValue: 'DISABLED',
      });
      return updated;
    }, actor.userId);
  }

  async enableScriptVersion(actor: Actor, scriptVersionId: string): Promise<Record<string, unknown>> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Only HR Admin and System Admin can enable crawler scripts.');
    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const existing = await this.repository.getScriptVersion(scriptVersionId);
      if (!existing) throw new NotFound(`Crawl script version ${scriptVersionId}`);
      if (existing.status !== 'DISABLED') {
        throw new AppError(400, 'SCRIPT_NOT_DISABLED', 'Chỉ có thể kích hoạt lại script đang ở trạng thái Vô hiệu hóa (DISABLED).');
      }
      const updated = await this.repository.setScriptStatus(scriptVersionId, 'PUBLISHED', client);
      if (!updated) throw new AppError(500, 'SCRIPT_ENABLE_FAILED', 'Không thể kích hoạt lại script.');
      audit.record({
        entityType: 'CRAWL_SCRIPT_VERSION',
        entityId: scriptVersionId,
        action: 'CRAWL_SCRIPT_ENABLED',
        oldValue: 'DISABLED',
        newValue: 'PUBLISHED',
      });
      return updated;
    }, actor.userId);
  }

  async publishScriptVersion(actor: Actor, scriptVersionId: string): Promise<Record<string, unknown>> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Only HR Admin and System Admin can publish crawler scripts.');
    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const script = await this.repository.publishScriptVersion(scriptVersionId, actor.userId, client);
      if (!script) throw new AppError(409, 'SCRIPT_NOT_DRAFT', 'Only a draft script version can be published.');
      audit.record({
        entityType: 'CRAWL_SCRIPT_VERSION', entityId: scriptVersionId,
        action: 'CRAWL_SCRIPT_PUBLISHED', newValue: String(script.checksum),
      });
      return script;
    }, actor.userId);
  }

  async createCredentialReference(actor: Actor, request: CreateCredentialReferenceRequest): Promise<Record<string, unknown>> {
    if (actor.role !== 'SYSTEM_ADMIN') throw new AppError(403, 'FORBIDDEN', 'Only System Admin can register connector credentials.');
    const id = crypto.randomUUID();
    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const credential = await this.repository.createCredentialReference({
        id, code: request.code, sourceSystem: request.source_system,
        displayName: request.display_name, secretReference: request.secret_reference,
      }, client);
      audit.record({ entityType: 'CONNECTOR_CREDENTIAL', entityId: id, action: 'CRAWL_CREDENTIAL_CREATED', newValue: request.code });
      return credential;
    }, actor.userId);
  }

  async updateJob(actor: Actor, jobId: string, patch: UpdateCrawlJobRequest): Promise<CrawlJobRecord> {
    requireCrawlAdmin(actor);
    const updated = await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const current = await this.repository.getJob(jobId, client);
      if (!current) throw new NotFound(`Crawl Job ${jobId}`);
      const { criterion_ids: criterionIds, evaluation_cycle_id: evaluationCycleId, ...jobPatch } = patch;
      if (jobPatch.crawl_script_version_id || jobPatch.source_system) {
        const scriptId = jobPatch.crawl_script_version_id ?? String(current.crawl_script_version_id);
        const script = await this.repository.getPublishedScript(scriptId, client);
        if (!script || script.status !== 'PUBLISHED') {
          throw new AppError(422, 'SCRIPT_NOT_PUBLISHED', 'Only published crawl scripts can be assigned to a job.');
        }
        if (script.source_system !== (jobPatch.source_system ?? current.source_system)) {
          throw new AppError(422, 'SOURCE_SYSTEM_MISMATCH', 'The selected script does not support this source system.');
        }
      }
      const sourceSystem = jobPatch.source_system ?? String(current.source_system);
      const credentialId = jobPatch.connector_credential_id ?? String(current.connector_credential_id);
      if ((jobPatch.source_system || jobPatch.connector_credential_id)
        && !(await this.repository.getActiveCredential(credentialId, sourceSystem, client))) {
        throw new AppError(422, 'CREDENTIAL_INVALID', 'Select an active credential reference for this source.');
      }
      if (criterionIds) {
        const uniqueIds = [...new Set(criterionIds)];
        const criteria = await this.repository.getCriteria(uniqueIds, client);
        if (uniqueIds.length !== criterionIds.length || criteria.length !== uniqueIds.length) {
          throw new AppError(422, 'INVALID_CRITERION', 'Selected criteria must be unique and active.');
        }
        const enabledCycleIds = await this.repository.listEnabledCycleIds(jobId, client);
        for (const cycleId of enabledCycleIds) {
          const conflictCode = await this.repository.findConflictingJobForCriteria(cycleId, jobId, uniqueIds, client);
          if (conflictCode) {
            throw new AppError(409, 'CRITERION_ALREADY_ASSIGNED', `Updated KPI coverage conflicts with enabled job ${conflictCode}.`);
          }
        }
        await this.repository.replaceCriteria(jobId, uniqueIds, client);
      }
      if (evaluationCycleId !== undefined) {
        if (evaluationCycleId) {
          const cycleResult = await client.query(
            `SELECT status FROM evaluation_cycle WHERE evaluation_cycle_id = $1`,
            [evaluationCycleId]
          );
          const cycleRow = cycleResult.rows[0];
          if (!cycleRow) throw new NotFound(`Evaluation Cycle ${evaluationCycleId}`);
          if (cycleRow.status !== 'OPEN') {
            throw new AppError(400, 'CYCLE_NOT_OPEN', 'Only an OPEN evaluation cycle can be assigned to a Crawl Job.');
          }
          const currentCriteria = (current as unknown as { criteria?: Array<{ criterion_id: string }> }).criteria ?? [];
          const activeCriteria = criterionIds ? [...new Set(criterionIds)] : currentCriteria.map((c) => c.criterion_id);
          if (activeCriteria.length > 0) {
            const conflictCode = await this.repository.findConflictingJobForCriteria(evaluationCycleId, jobId, activeCriteria, client);
            if (conflictCode) {
              throw new AppError(409, 'CRITERION_ALREADY_ASSIGNED', `Updated KPI coverage conflicts with enabled job ${conflictCode} in cycle.`);
            }
          }
          await this.repository.upsertCycleJob(
            evaluationCycleId,
            jobId,
            true,
            0,
            jobPatch.failure_policy ?? String(current.failure_policy),
            actor.userId,
            client
          );
        } else {
          await client.query(
            `DELETE FROM evaluation_cycle_crawl_job WHERE crawl_job_definition_id = $1`,
            [jobId]
          );
        }
      }
      await this.repository.updateJob(jobId, jobPatch, client);
      audit.record({
        entityType: 'CRAWL_JOB', entityId: jobId, action: 'CRAWL_JOB_UPDATED',
        oldValue: JSON.stringify({ name: current.name, source_system: current.source_system }),
        newValue: JSON.stringify(patch),
      });
      const updated = await this.repository.getJob(jobId, client);
      if (!updated) throw new NotFound(`Crawl Job ${jobId}`);
      return updated;
    }, actor.userId);
    this.refreshSchedule?.();
    return updated;
  }

  async setJobActive(actor: Actor, jobId: string, active: boolean): Promise<CrawlJobRecord> {
    requireCrawlAdmin(actor);
    const updated = await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const current = await this.repository.getJob(jobId, client);
      if (!current) throw new NotFound(`Crawl Job ${jobId}`);
      await this.repository.setJobActive(jobId, active, client);
      audit.record({
        entityType: 'CRAWL_JOB', entityId: jobId,
        action: active ? 'CRAWL_JOB_ENABLED' : 'CRAWL_JOB_DISABLED',
        oldValue: String(current.active), newValue: String(active),
      });
      const updated = await this.repository.getJob(jobId, client);
      if (!updated) throw new NotFound(`Crawl Job ${jobId}`);
      return updated;
    }, actor.userId);
    this.refreshSchedule?.();
    return updated;
  }

  async deleteJob(actor: Actor, jobId: string): Promise<{ success: boolean; message: string }> {
    requireCrawlAdmin(actor);
    const job = await this.repository.getJob(jobId);
    if (!job) throw new NotFound(`Crawl Job ${jobId}`);

    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      await this.repository.deleteJob(jobId, client);
      audit.record({
        entityType: 'CRAWL_JOB',
        entityId: jobId,
        action: 'CRAWL_JOB_DELETED',
        oldValue: job.code,
      });
      return { success: true, message: `Crawl Job ${job.code} deleted successfully.` };
    }, actor.userId);
  }

  async assignJobToCycle(
    actor: Actor,
    cycleId: string,
    jobId: string,
    request: AssignCrawlJobToCycleRequest
  ): Promise<void> {
    requireCrawlAdmin(actor);
    await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const cycleResult = await client.query(
        `SELECT status FROM evaluation_cycle WHERE evaluation_cycle_id = $1 FOR UPDATE`,
        [cycleId]
      );
      const cycleRow = cycleResult.rows[0];
      if (!cycleRow) throw new NotFound(`Evaluation Cycle ${cycleId}`);
      if (request.enabled && cycleRow.status !== 'OPEN') {
        throw new AppError(400, 'CYCLE_NOT_OPEN', 'Only an OPEN evaluation cycle can have enabled Crawl Jobs.');
      }
      const job = await this.repository.getJob(jobId, client);
      if (!job) throw new NotFound(`Crawl Job ${jobId}`);
      if (request.enabled && !job.active) {
        throw new AppError(422, 'JOB_NOT_ACTIVE', 'An inactive Crawl Job cannot be enabled for a cycle.');
      }
      if (request.enabled) {
        const conflictCode = await this.repository.findConflictingEnabledJob(cycleId, jobId, client);
        if (conflictCode) {
          throw new AppError(409, 'CRITERION_ALREADY_ASSIGNED', `Criterion coverage conflicts with enabled job ${conflictCode}.`);
        }
      }
      await this.repository.upsertCycleJob(
        cycleId,
        jobId,
        request.enabled,
        request.sequence_order,
        request.failure_policy ?? String(job.failure_policy),
        actor.userId,
        client
      );
      audit.record({
        entityType: 'CRAWL_JOB',
        entityId: jobId,
        action: request.enabled ? 'CRAWL_JOB_ENABLED' : 'CRAWL_JOB_DISABLED',
        newValue: JSON.stringify({ evaluation_cycle_id: cycleId, enabled: request.enabled, sequence_order: request.sequence_order }),
      });
    }, actor.userId);
    this.refreshSchedule?.();
  }

  async listCycleJobs(actor: Actor, cycleId: string): Promise<Record<string, unknown>[]> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Crawl Job access is restricted.');
    }
    return this.repository.listCycleJobs(cycleId);
  }

  async createManualExecution(
    actor: Actor,
    jobId: string,
    request: CreateCrawlExecutionRequest,
    requestIdempotencyKey: string,
    requestId?: string
  ): Promise<CrawlExecutionRecord> {
    requireCrawlAdmin(actor);
    if (!requestIdempotencyKey.trim()) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'An idempotency key is required.');
    const idempotencyKey = `manual:${actor.userId}:${request.evaluation_cycle_id}:${jobId}:${requestIdempotencyKey}`;
    let execution: CrawlExecutionRecord;

    try {
      execution = await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
        const existing = await this.repository.findExecutionByIdempotencyKey(idempotencyKey, client);
        if (existing) return existing;

        const cycleJob = await this.repository.getCycleJob(request.evaluation_cycle_id, jobId, client);
        if (!cycleJob) throw new NotFound(`Crawl Job ${jobId} assignment for cycle ${request.evaluation_cycle_id}`);
        if (cycleJob.cycle_status !== 'OPEN') {
          throw new AppError(422, 'CYCLE_NOT_OPEN', 'Crawl executions can only be created for an OPEN Evaluation Cycle.');
        }
        if (!cycleJob.job_active) throw new AppError(422, 'JOB_NOT_ACTIVE', 'This Crawl Job is inactive.');
        if (!cycleJob.enabled) throw new AppError(422, 'JOB_NOT_ENABLED_FOR_CYCLE', 'This Crawl Job is not enabled for the selected cycle.');
        if (cycleJob.script_status !== 'PUBLISHED') {
          throw new AppError(422, 'SCRIPT_NOT_PUBLISHED', 'The job script is no longer published.');
        }
        const snapshot = toExecutionSnapshot(cycleJob);
        const executionId = crypto.randomUUID();
        const created = await this.repository.createExecution({
          id: executionId,
          jobId,
          cycleId: request.evaluation_cycle_id,
          actorId: actor.userId,
          triggerType: 'MANUAL',
          idempotencyKey,
          snapshot,
          criteriaSnapshot: snapshot.criteria,
          requestId,
        }, client);
        audit.record({
          entityType: 'CRAWL_EXECUTION',
          entityId: executionId,
          action: 'CRAWL_EXECUTION_QUEUED',
          newValue: JSON.stringify({ crawl_job_definition_id: jobId, evaluation_cycle_id: request.evaluation_cycle_id, script_version: snapshot.script_version, script_checksum: snapshot.script_checksum }),
        });
        return created;
      }, actor.userId);
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error;
      const existing = await this.repository.findExecutionByIdempotencyKey(idempotencyKey);
      if (!existing) throw error;
      execution = existing;
    }

    return execution;
  }

  async createScheduledExecution(jobId: string, cycleId: string, windowKey: string): Promise<CrawlExecutionRecord | null> {
    const idempotencyKey = `scheduled:${cycleId}:${jobId}:${windowKey}`;
    let execution: CrawlExecutionRecord | null;
    try {
      execution = await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
        const existing = await this.repository.findExecutionByIdempotencyKey(idempotencyKey, client);
        if (existing) return existing;
        const cycleJob = await this.repository.getCycleJob(cycleId, jobId, client);
        if (!cycleJob || cycleJob.cycle_status !== 'OPEN' || !cycleJob.enabled || !cycleJob.job_active || cycleJob.script_status !== 'PUBLISHED') {
          return null;
        }
        const snapshot = toExecutionSnapshot(cycleJob);
        const executionId = crypto.randomUUID();
        const created = await this.repository.createExecution({
          id: executionId,
          jobId,
          cycleId,
          actorId: 'SYSTEM_SCHEDULER',
          triggerType: 'SCHEDULED',
          idempotencyKey,
          snapshot,
          criteriaSnapshot: snapshot.criteria,
        }, client);
        audit.record({
          entityType: 'CRAWL_EXECUTION', entityId: executionId, action: 'CRAWL_EXECUTION_QUEUED',
          newValue: JSON.stringify({ crawl_job_definition_id: jobId, evaluation_cycle_id: cycleId, script_version: snapshot.script_version, script_checksum: snapshot.script_checksum }),
        });
        return created;
      }, null);
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error;
      execution = await this.repository.findExecutionByIdempotencyKey(idempotencyKey);
      if (!execution) throw error;
    }
    return execution;
  }

  async transitionExecution(
    executionId: string,
    expectedStatus: CrawlExecutionStatus,
    nextStatus: CrawlExecutionStatus,
    actorId: string | null,
    fields: { errorCode?: string; errorMessage?: string; importId?: string } = {},
    workerId?: string
  ): Promise<CrawlExecutionRecord> {
    assertExecutionTransition(expectedStatus, nextStatus);
    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const updated = await this.repository.transitionExecution(executionId, expectedStatus, nextStatus, fields, client, workerId);
      if (!updated) throw new AppError(409, 'EXECUTION_STATE_CONFLICT', 'The execution state has changed. Refresh and retry.');
      const eventAction = nextStatus === 'RUNNING' ? 'CRAWL_EXECUTION_STARTED'
        : nextStatus === 'SUCCESS' ? 'CRAWL_EXECUTION_SUCCEEDED'
          : nextStatus === 'PARTIAL_SUCCESS' ? 'CRAWL_EXECUTION_PARTIAL_SUCCESS'
            : nextStatus === 'FAILED' || nextStatus === 'TIMEOUT' ? 'CRAWL_EXECUTION_FAILED'
              : nextStatus === 'CANCELLED' ? 'CRAWL_EXECUTION_CANCELLED'
                : nextStatus === 'SKIPPED' ? 'CRAWL_EXECUTION_SKIPPED' : 'CRAWL_EXECUTION_FAILED';
      audit.record({
        entityType: 'CRAWL_EXECUTION',
        entityId: executionId,
        action: eventAction,
        oldValue: expectedStatus,
        newValue: nextStatus,
        performedBy: actorId,
      });
      return updated;
    }, actorId);
  }

  async ownsExecutionClaim(executionId: string, workerId: string): Promise<boolean> {
    return this.repository.ownsExecutionClaim(executionId, workerId);
  }

  async appendExecutionLog(
    executionId: string,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    context: Record<string, unknown> = {}
  ): Promise<void> {
    const safeMessage = message
      .replace(/\b(Bearer|Basic)\s+[^\s"']+/gi, '$1 [REDACTED]')
      .replace(/(password|token|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
    await this.repository.appendExecutionLog(executionId, level, safeMessage, context);
  }

  async listExecutionLogs(
    actor: Actor,
    executionId: string,
    filters: { level?: 'INFO' | 'WARN' | 'ERROR'; search?: string; page: number; limit: number }
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.getExecution(actor, executionId);
    return this.repository.listExecutionLogs(executionId, filters);
  }

  async getExecution(actor: Actor, executionId: string): Promise<Record<string, unknown>> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Crawl Execution access is restricted.');
    }
    const execution = await this.repository.getExecution(executionId);
    if (!execution) throw new NotFound(`Crawl Execution ${executionId}`);
    return execution;
  }

  async retryExecution(actor: Actor, executionId: string, idempotencyKey: string): Promise<CrawlExecutionRecord> {
    requireCrawlAdmin(actor);
    if (!idempotencyKey.trim()) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'An idempotency key is required.');
    const retryKey = `retry:${executionId}:${idempotencyKey}`;
    const created = await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const existing = await this.repository.findExecutionByIdempotencyKey(retryKey, client);
      if (existing) return existing;
      const previous = await this.repository.getExecutionForUpdate(executionId, client);
      if (!previous) throw new NotFound(`Crawl Execution ${executionId}`);
      if (previous.status !== 'FAILED' && previous.status !== 'TIMEOUT') {
        throw new AppError(409, 'EXECUTION_NOT_RETRYABLE', 'Only failed or timed out executions can be retried.');
      }
      const maxAttempts = Number(previous.max_attempts) || Math.min(Math.max(Number(process.env.CRAWL_MAX_ATTEMPTS ?? 3), 1), 5);
      const previousAttemptNo = Number(previous.attempt_no);
      if (previousAttemptNo >= maxAttempts) {
        throw new AppError(422, 'EXECUTION_NOT_RETRYABLE', 'The configured maximum number of attempts has been reached.');
      }
      const errorCode = String(previous.error_code ?? '');
      const retryable = errorCode.startsWith('UPSTREAM_HTTP_')
        ? isRetryableCrawlFailure({ kind: 'HTTP', statusCode: Number(errorCode.slice('UPSTREAM_HTTP_'.length)) })
        : ['NETWORK_TIMEOUT', 'CONNECTION_RESET', 'UPSTREAM_NETWORK_ERROR', 'TEMPORARY_UNAVAILABLE', 'WORKER_LEASE_EXPIRED'].includes(errorCode);
      if (!retryable) throw new AppError(422, 'EXECUTION_NOT_RETRYABLE', 'This execution failed because of a non-retryable error.');
      if (previous.cycle_status !== 'OPEN') throw new AppError(422, 'CYCLE_NOT_OPEN', 'Retry requires an OPEN Evaluation Cycle.');
      const snapshot: CrawlExecutionSnapshot = {
        script_id: String(previous.crawl_script_version_id),
        script_version: Number(previous.script_version),
        script_checksum: String(previous.script_checksum),
        source_system: previous.source_system as CrawlExecutionSnapshot['source_system'],
        source_config: parseSnapshotValue<Record<string, unknown>>(previous.source_config_snapshot, {}),
        connector_credential_id: String(previous.connector_credential_id),
        criteria: parseSnapshotValue<Array<{ criterion_id: string; criterion_code: string }>>(previous.criteria_snapshot, []),
      };
      const retryId = crypto.randomUUID();
      const execution = await this.repository.createExecution({
        id: retryId,
        jobId: String(previous.crawl_job_definition_id),
        cycleId: String(previous.evaluation_cycle_id),
        actorId: actor.userId,
        triggerType: 'RETRY',
        idempotencyKey: retryKey,
        snapshot,
        criteriaSnapshot: snapshot.criteria,
        retryOfId: executionId,
        attemptNo: previousAttemptNo + 1,
        maxAttempts,
        nextRetryAt: new Date(),
      }, client);
      audit.record({
        entityType: 'CRAWL_EXECUTION', entityId: retryId, action: 'CRAWL_EXECUTION_RETRIED',
        oldValue: executionId, newValue: JSON.stringify({ script_version: snapshot.script_version, script_checksum: snapshot.script_checksum }),
      });
      audit.record({ entityType: 'CRAWL_EXECUTION', entityId: retryId, action: 'CRAWL_EXECUTION_QUEUED' });
      return execution;
    }, actor.userId);
    return created;
  }

  async scheduleAutomaticRetry(executionId: string): Promise<CrawlExecutionRecord | null> {
    const maxAttempts = Math.min(Math.max(Number(process.env.CRAWL_MAX_ATTEMPTS ?? 3), 1), 5);
    const delaySchedule = [30_000, 120_000, 600_000];
    const retryKey = `automatic-retry:${executionId}`;
    const retry = await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const existing = await this.repository.findExecutionByIdempotencyKey(retryKey, client);
      if (existing) return existing;
      const previous = await this.repository.getExecutionForUpdate(executionId, client);
      if (!previous || (previous.status !== 'FAILED' && previous.status !== 'TIMEOUT')) return null;
      if (!String(previous.failure_policy).startsWith('RETRY_THEN_')) return null;
      const attemptNo = Number(previous.attempt_no);
      if (attemptNo >= Math.min(Number(previous.max_attempts) || maxAttempts, maxAttempts) || previous.cycle_status !== 'OPEN') return null;
      const errorCode = String(previous.error_code ?? '');
      const retryable = errorCode.startsWith('UPSTREAM_HTTP_')
        ? isRetryableCrawlFailure({ kind: 'HTTP', statusCode: Number(errorCode.slice('UPSTREAM_HTTP_'.length)) })
        : ['NETWORK_TIMEOUT', 'CONNECTION_RESET', 'UPSTREAM_NETWORK_ERROR', 'TEMPORARY_UNAVAILABLE', 'WORKER_LEASE_EXPIRED'].includes(errorCode);
      if (!retryable) return null;
      const snapshot: CrawlExecutionSnapshot = {
        script_id: String(previous.crawl_script_version_id),
        script_version: Number(previous.script_version),
        script_checksum: String(previous.script_checksum),
        source_system: previous.source_system as CrawlExecutionSnapshot['source_system'],
        source_config: parseSnapshotValue<Record<string, unknown>>(previous.source_config_snapshot, {}),
        connector_credential_id: String(previous.connector_credential_id),
        criteria: parseSnapshotValue<Array<{ criterion_id: string; criterion_code: string }>>(previous.criteria_snapshot, []),
      };
      const retryId = crypto.randomUUID();
      const backoff = delaySchedule[Math.min(Math.max(attemptNo - 1, 0), delaySchedule.length - 1)]!;
      const jitter = Math.floor(Math.random() * Math.min(backoff * 0.2, 30_000));
      const created = await this.repository.createExecution({
        id: retryId,
        jobId: String(previous.crawl_job_definition_id),
        cycleId: String(previous.evaluation_cycle_id),
        actorId: 'SYSTEM_SCHEDULER',
        triggerType: 'RETRY',
        idempotencyKey: retryKey,
        snapshot,
        criteriaSnapshot: snapshot.criteria,
        retryOfId: executionId,
        attemptNo: attemptNo + 1,
        maxAttempts: Number(previous.max_attempts) || maxAttempts,
        nextRetryAt: new Date(Date.now() + backoff + jitter),
      }, client);
      if (created.next_retry_at instanceof Date) {
        await this.repository.deferFollowingScheduledExecutions(executionId, created.next_retry_at, client);
      }
      audit.record({
        entityType: 'CRAWL_EXECUTION', entityId: retryId, action: 'CRAWL_EXECUTION_RETRIED',
        oldValue: executionId, newValue: JSON.stringify({ attempt_no: attemptNo + 1 }),
      });
      audit.record({ entityType: 'CRAWL_EXECUTION', entityId: retryId, action: 'CRAWL_EXECUTION_QUEUED' });
      return created;
    }, null);
    if (!retry) return null;
    return retry;
  }

  async claimNextExecution(workerId: string, leaseMs = 60_000): Promise<CrawlExecutionRecord | null> {
    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const executionId = await this.repository.findNextDueExecution(client);
      if (!executionId) return null;
      const context = await this.repository.getClaimContext(executionId, client);
      if (!context || context.cycle_status !== 'OPEN' || !context.job_active || !context.cycle_job_enabled) {
        const skipped = await this.repository.skipClaimedExecution(
          executionId,
          !context ? 'Execution assignment no longer exists.' : 'Cycle or Crawl Job is no longer eligible for execution.',
          client
        );
        if (skipped) {
          audit.record({ entityType: 'CRAWL_EXECUTION', entityId: executionId, action: 'CRAWL_EXECUTION_SKIPPED', oldValue: 'QUEUED', newValue: 'SKIPPED' });
        }
        return null;
      }
      const claimed = await this.repository.claimExecution(executionId, workerId, leaseMs, client);
      if (!claimed) return null;
      assertExecutionTransition('QUEUED', 'RUNNING');
      audit.record({
        entityType: 'CRAWL_EXECUTION', entityId: executionId,
        action: 'CRAWL_EXECUTION_STARTED', oldValue: 'QUEUED', newValue: 'RUNNING',
      });
      return claimed;
    }, workerId || 'system');
  }

  async heartbeatExecution(executionId: string, workerId: string, leaseMs = 60_000): Promise<boolean> {
    return this.repository.heartbeatExecution(executionId, workerId, leaseMs);
  }

  async recoverExpiredLeases(limit = 20): Promise<number> {
    const expired = await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const executionIds = await this.repository.findExpiredLeases(limit, client);
      for (const executionId of executionIds) {
        const updated = await this.repository.transitionExecution(executionId, 'RUNNING', 'TIMEOUT', {
          errorCode: 'WORKER_LEASE_EXPIRED',
          errorMessage: 'Worker lease expired before execution completed.',
        }, client);
        if (updated) {
          audit.record({ entityType: 'CRAWL_EXECUTION', entityId: executionId, action: 'CRAWL_EXECUTION_FAILED', oldValue: 'RUNNING', newValue: 'TIMEOUT' });
        }
      }
      return executionIds;
    }, 'system');
    for (const executionId of expired) await this.scheduleAutomaticRetry(executionId);
    return expired.length;
  }

  async stopFollowingScheduledExecutions(executionId: string): Promise<void> {
    const failed = await this.repository.getExecutionForWorker(executionId);
    if (!failed || !['STOP_CYCLE', 'RETRY_THEN_STOP'].includes(String(failed.failure_policy))) return;
    const followingIds = await this.repository.listFollowingScheduledExecutions(executionId);
    for (const followingId of followingIds) {
      try {
        await this.transitionExecution(followingId, 'QUEUED', 'SKIPPED', null, {
          errorCode: 'STOPPED_BY_FAILURE_POLICY',
          errorMessage: 'A preceding Crawl Job failed and the configured failure policy stopped this cycle.',
        });
        await this.appendExecutionLog(followingId, 'WARN', 'Execution skipped by a preceding job failure policy.', {
          execution_id: followingId,
          cycle_id: failed.evaluation_cycle_id,
          preceding_execution_id: executionId,
        });
      } catch (error) {
        if ((error as { code?: string }).code !== 'EXECUTION_STATE_CONFLICT') throw error;
      }
    }
  }

  async cancelExecution(actor: Actor, executionId: string): Promise<CrawlExecutionRecord> {
    requireCrawlAdmin(actor);
    const execution = await this.repository.getExecution(executionId);
    if (!execution) throw new NotFound(`Crawl Execution ${executionId}`);
    const status = execution.status as CrawlExecutionStatus;
    if (status !== 'QUEUED' && status !== 'RUNNING') {
      throw new AppError(409, 'EXECUTION_NOT_CANCELLABLE', 'Only queued or running executions can be cancelled.');
    }
    return this.transitionExecution(executionId, status, 'CANCELLED', actor.userId);
  }

  async listExecutions(
    actor: Actor,
    jobId: string,
    filters: { status?: string; cycleId?: string; page: number; limit: number }
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Crawl Execution access is restricted.');
    }
    const job = await this.repository.getJob(jobId);
    if (!job) throw new NotFound(`Crawl Job ${jobId}`);
    return this.repository.listExecutions(jobId, filters);
  }

  async listExecutionRecords(actor: Actor, executionId: string): Promise<Record<string, unknown>[]> {
    if (!CRAWL_ADMIN_ROLES.has(actor.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Crawl Execution access is restricted.');
    }
    const execution = await this.repository.getExecution(executionId);
    if (!execution) throw new NotFound(`Crawl Execution ${executionId}`);
    return this.repository.listExecutionRecords(executionId);
  }
}