import { createHash } from 'node:crypto';
import { NotFound } from '../../../api/app-error.js';
import { CrawlJobService } from './crawl-job.service.js';
import { CrawlSandboxError, CrawlSandboxService, CrawlSourceFetcher } from './crawl-sandbox.service.js';
import { CrawlSourceClient, CrawlSourceError } from './crawl-source-client.js';
import { CrawlStagingService } from './crawl-staging.service.js';
import { CrawlExecutionSnapshot } from '../domain/crawl-job.types.js';
import { PostgresCrawlJobRepository } from '../infrastructure/postgres-crawl-job.repository.js';
import { PostgresEvaluationDataImportRepository } from '../../evaluation-data-import/infrastructure/postgres-evaluation-data-import.repository.js';

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return (value as T | null | undefined) ?? fallback;
}

import { CrawlScoringWorkerService } from './crawl-scoring-worker.service.js';

export class CrawlExecutionWorkerService {
  constructor(
    private readonly repository: PostgresCrawlJobRepository,
    private readonly crawlJobService: CrawlJobService,
    private readonly stagingService: CrawlStagingService,
    private readonly importRepository: PostgresEvaluationDataImportRepository,
    private readonly sandbox: CrawlSandboxService,
    private readonly sourceClient: CrawlSourceClient,
    private readonly scoringWorker?: CrawlScoringWorkerService
  ) {}

  async execute(executionId: string, workerId: string): Promise<void> {
    const execution = await this.repository.getExecutionForWorker(executionId);
    if (!execution) throw new NotFound(`Crawl Execution ${executionId}`);
    if (execution.status !== 'RUNNING') return;
    if (execution.cycle_status !== 'OPEN') {
      await this.crawlJobService.transitionExecution(executionId, 'RUNNING', 'SKIPPED', null, {
        errorCode: 'CYCLE_NOT_OPEN',
        errorMessage: 'The Evaluation Cycle is no longer OPEN.',
      }, workerId);
      await this.crawlJobService.appendExecutionLog(executionId, 'WARN', 'Execution skipped because its cycle is no longer OPEN.', {
        execution_id: executionId, job_id: execution.crawl_job_definition_id, cycle_id: execution.evaluation_cycle_id,
      });
      return;
    }
    if (!execution.job_active || !execution.cycle_job_enabled) {
      await this.crawlJobService.transitionExecution(executionId, 'RUNNING', 'SKIPPED', null, {
        errorCode: 'JOB_NOT_ENABLED',
        errorMessage: 'The Crawl Job is inactive or disabled for this cycle.',
      }, workerId);
      await this.crawlJobService.appendExecutionLog(executionId, 'WARN', 'Execution skipped because the job is inactive or disabled for this cycle.', {
        execution_id: executionId, job_id: execution.crawl_job_definition_id, cycle_id: execution.evaluation_cycle_id,
      });
      return;
    }

    const snapshot = {
      script_id: String(execution.crawl_script_version_id),
      script_version: Number(execution.script_version),
      script_checksum: String(execution.script_checksum),
      source_system: execution.source_system as CrawlExecutionSnapshot['source_system'],
      source_config: parseJson<Record<string, unknown>>(execution.source_config_snapshot, {}),
      connector_credential_id: String(execution.connector_credential_id),
      criteria: parseJson<Array<{ criterion_id: string; criterion_code: string }>>(execution.criteria_snapshot, []),
    } satisfies CrawlExecutionSnapshot;
    const sourceCode = String(execution.source_code ?? '');
    const actualChecksum = createHash('sha256').update(sourceCode, 'utf8').digest('hex');
    if (!sourceCode || actualChecksum !== snapshot.script_checksum.toLowerCase()) {
      await this.crawlJobService.transitionExecution(executionId, 'RUNNING', 'FAILED', null, {
        errorCode: 'SCRIPT_CHECKSUM_MISMATCH',
        errorMessage: 'Published script integrity verification failed.',
      }, workerId);
      await this.crawlJobService.appendExecutionLog(executionId, 'ERROR', 'Published script integrity verification failed.', {
        execution_id: executionId, job_id: execution.crawl_job_definition_id, cycle_id: execution.evaluation_cycle_id,
      });
      return;
    }

    await this.crawlJobService.appendExecutionLog(executionId, 'INFO', `Crawl worker ${workerId} started job execution.`, {
      execution_id: executionId,
      job_id: execution.crawl_job_definition_id,
      cycle_id: execution.evaluation_cycle_id,
      script_version: snapshot.script_version,
      script_checksum: snapshot.script_checksum,
      request_id: execution.request_id ?? null,
    });
    try {
      const cycleEmployees = await this.repository.getEmployeesForCycle(String(execution.evaluation_cycle_id));
      await this.crawlJobService.appendExecutionLog(
        executionId,
        'INFO',
        `[Target Cycle] Identified OPEN cycle "${execution.cycle_name || execution.cycle_code}". Loaded ${cycleEmployees.length} eligible employee(s) in scope.`,
        { cycle_id: execution.evaluation_cycle_id, employee_count: cycleEmployees.length }
      );

      await this.crawlJobService.appendExecutionLog(
        executionId,
        'INFO',
        `[Source Connect] Connecting to ${snapshot.source_system} data provider. Verifying SSRF domain whitelisting and credentials...`,
        { source_system: snapshot.source_system }
      );

      const cleanStr = (val?: string | null): string => {
        if (!val) return '';
        let s = String(val).trim();
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
          s = s.slice(1, -1).trim();
        }
        return s;
      };

      let fetcher: CrawlSourceFetcher;
      if (snapshot.source_system === 'BLUEPRINT') {
        const { BlueprintCollector } = await import('../../collector/plugins/blueprint.collector.js');

        const secretRef = String(execution.secret_reference || 'BLUEPRINT_PASSWORD');
        let bpUsername = cleanStr(process.env['BLUEPRINT_USERNAME']);
        let bpPassword = cleanStr(process.env['BLUEPRINT_PASSWORD']);

        if (secretRef && process.env[secretRef]) {
          const raw = process.env[secretRef]!;
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              if (parsed.username) bpUsername = cleanStr(String(parsed.username));
              if (parsed.password) bpPassword = cleanStr(String(parsed.password));
            } else {
              bpPassword = cleanStr(String(parsed));
            }
          } catch {
            bpPassword = cleanStr(raw);
          }
        }

        if (!bpUsername || !bpPassword) {
          throw new Error('Blueprint credentials missing. Please configure BLUEPRINT_USERNAME and BLUEPRINT_PASSWORD environment variables.');
        }

        const bpBaseUrl = (snapshot.source_config['base_url'] as string | undefined) || process.env['BLUEPRINT_BASE_URL'] || 'https://blueprint.cyberlogitec.com.vn';
        const collector = BlueprintCollector.getInstance({ username: bpUsername, password: bpPassword, baseUrl: bpBaseUrl });

        await this.crawlJobService.appendExecutionLog(
          executionId,
          'INFO',
          `[Source Connect] Authenticating Blueprint Keycloak SSO for user "${bpUsername}" (credential ref: ${secretRef}, pwd len: ${bpPassword.length})`,
          { source_system: 'BLUEPRINT', username: bpUsername, secret_ref: secretRef }
        );
        await collector.ensureLoggedIn();
        fetcher = async (path, optionsOrQuery) => {
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
          if (!res.ok) throw new Error(`Blueprint API returned ${res.status}`);
          const payload = await res.json() as unknown;
          const rawPayloadReference = await this.stagingService.saveRawPayload(executionId, payload);
          if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
            (payload as Record<string, unknown>)._raw_payload_reference = rawPayloadReference;
          }
          return payload;
        };
      } else {
        const secretRef = String(execution.secret_reference || (snapshot.source_system === 'JIRA' ? 'JIRA_PASSWORD' : 'CRAWL_TEST_SECRET'));
        let enrichedConfig = snapshot.source_config;
        if (snapshot.source_system === 'JIRA') {
          const jiraUser = cleanStr(process.env['JIRA_USERNAME']);
          const jiraPass = cleanStr(process.env[secretRef] || process.env['JIRA_PASSWORD']);
          const jiraBaseUrl = cleanStr(snapshot.source_config['base_url'] as string) || cleanStr(process.env['JIRA_BASE_URL']) || 'https://pim.cyberlogitec.com/jira';
          enrichedConfig = { ...snapshot.source_config, base_url: jiraBaseUrl };

          if (!jiraUser || !jiraPass) {
            throw new Error(`Jira credentials missing. Please configure JIRA_USERNAME and ${secretRef} (or JIRA_PASSWORD) environment variables.`);
          }

          await this.crawlJobService.appendExecutionLog(
            executionId,
            'INFO',
            `[Source Connect] Authenticating Jira REST API for user "${jiraUser}" (credential ref: ${secretRef}, pwd len: ${jiraPass.length}, baseUrl: ${jiraBaseUrl})`,
            { source_system: 'JIRA', username: jiraUser, secret_ref: secretRef, base_url: jiraBaseUrl }
          );
        }
        fetcher = this.sourceClient.createFetcher(
          snapshot.source_system,
          enrichedConfig,
          secretRef,
          (payload) => this.stagingService.saveRawPayload(executionId, payload)
        );
      }
      const cancellableFetcher: CrawlSourceFetcher = async (path, optionsOrQuery) => {
        const latest = await this.repository.getExecution(executionId);
        if (latest?.status === 'CANCELLED' || !(await this.crawlJobService.ownsExecutionClaim(executionId, workerId))) {
          throw new CrawlSourceError('EXECUTION_CANCELLED', false, 'Crawl execution was cancelled or the worker lease was lost.');
        }
        await this.crawlJobService.appendExecutionLog(
          executionId,
          'INFO',
          `[Script Step: Gửi request API] Đang kết nối tới ${snapshot.source_system} (${path})...`
        );
        const res = await fetcher(path, optionsOrQuery);
        const count = Array.isArray(res) ? res.length : (res && typeof res === 'object' ? Object.keys(res).length : 1);
        await this.crawlJobService.appendExecutionLog(
          executionId,
          'INFO',
          `[Script Step: Nhận dữ liệu nguồn] Đã nhận dữ liệu từ ${path} (quy mô payload: ~${count} phần tử).`
        );
        return res;
      };
      const targetCycle = {
        id: execution.evaluation_cycle_id,
        code: execution.cycle_code,
        name: execution.cycle_name,
        start_date: execution.cycle_start_date ? String(execution.cycle_start_date).slice(0, 10) : null,
        end_date: execution.cycle_end_date ? String(execution.cycle_end_date).slice(0, 10) : null,
        startDate: execution.cycle_start_date ? String(execution.cycle_start_date).slice(0, 10) : null,
        endDate: execution.cycle_end_date ? String(execution.cycle_end_date).slice(0, 10) : null,
        employees: cycleEmployees,
      };

      await this.crawlJobService.appendExecutionLog(
        executionId,
        'INFO',
        `[Script Step: Bắt đầu chạy Script] Khởi chạy script v${snapshot.script_version} (SHA: ${snapshot.script_checksum.slice(0, 10)}...) trong môi trường Isolated V8 Sandbox.`,
        { script_id: snapshot.script_id, version: snapshot.script_version }
      );

      const onSandboxLog = async (msg: string) => {
        const prefix = msg.startsWith('[Script Step') ? '' : '[Script Step] ';
        await this.crawlJobService.appendExecutionLog(
          executionId,
          'INFO',
          `${prefix}${msg}`
        );
      };

      const output = await this.sandbox.run<unknown>(sourceCode, {
        execution_id: executionId,
        executionId,
        source_config: snapshot.source_config,
        sourceConfig: snapshot.source_config,
        criteria: snapshot.criteria,
        target_cycle: targetCycle,
        targetCycle,
        employees: cycleEmployees,
        collected_at: new Date().toISOString(),
        collectedAt: new Date().toISOString(),
      }, cancellableFetcher, onSandboxLog);
      const latest = await this.repository.getExecution(executionId);
      if (latest?.status === 'CANCELLED') return;
      if (!Array.isArray(output)) {
        throw new CrawlSandboxError('Crawler output must be an array of normalized rows.', 'SANDBOX_INVALID_OUTPUT');
      }

      await this.crawlJobService.appendExecutionLog(
        executionId,
        'INFO',
        `[Script Step: Trích xuất hoàn tất] Script đã xử lý xong và trả về ${output.length} bản ghi deliverables.`,
        { raw_count: output.length }
      );

      await this.crawlJobService.appendExecutionLog(
        executionId,
        'INFO',
        `[Script Step: Đối chiếu nhân sự & Chuẩn hóa] Chuẩn hóa ${output.length} deliverables đối chiếu với ${cycleEmployees.length} nhân viên trong kỳ đánh giá...`
      );

      const staged = await this.stagingService.stage({
        executionId,
        workerId,
        cycleId: String(execution.evaluation_cycle_id),
        sourceSystem: snapshot.source_system,
        allowedCriteria: snapshot.criteria,
        records: output,
        importRepository: this.importRepository,
      });
      const terminalStatus = staged.records_invalid > 0
        ? staged.records_valid > 0 ? 'PARTIAL_SUCCESS' : 'FAILED'
        : (staged.records_conflict > 0 ? (staged.records_valid > 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS') : 'SUCCESS');
      await this.crawlJobService.transitionExecution(executionId, 'RUNNING', terminalStatus, null, {
        importId: staged.import_id,
        ...(terminalStatus === 'FAILED' ? {
          errorCode: 'NO_VALID_OUTPUT_ROWS',
          errorMessage: 'Crawl completed without any valid rows; review the staged validation errors.',
        } : {}),
      }, workerId);

      // Rule 4 & 5: Persist raw rows FIRST, then asynchronously enqueue row-level scoring tasks
      if ((staged.records_valid > 0 || staged.records_conflict > 0) && this.scoringWorker) {
        try {
          const enqueued = await this.scoringWorker.enqueueTasksForExecution(executionId);
          await this.crawlJobService.appendExecutionLog(executionId, 'INFO', `[AI Scoring Queue] Enqueued ${enqueued} row-level scoring task(s) for Gemini evaluation.`, {
            execution_id: executionId,
            enqueued_count: enqueued,
          });
          // Trigger immediate scoring tasks processing
          for (let i = 0; i < Math.min(enqueued, 10); i++) {
            void this.scoringWorker.processNextScoringTask().catch(() => {});
          }
        } catch (queueErr) {
          console.error('[CrawlExecutionWorker] Error enqueuing scoring tasks:', queueErr);
        }
      }
      await this.crawlJobService.appendExecutionLog(executionId, terminalStatus === 'FAILED' ? 'ERROR' : 'INFO', `[Crawl Complete] Output validated and staged with status ${terminalStatus} (${staged.records_valid} valid, ${staged.records_invalid} invalid).`, {
        execution_id: executionId,
        job_id: execution.crawl_job_definition_id,
        cycle_id: execution.evaluation_cycle_id,
        script_version: snapshot.script_version,
        status: terminalStatus,
        records_fetched: staged.records_fetched,
        records_valid: staged.records_valid,
        records_invalid: staged.records_invalid,
        records_conflict: staged.records_conflict,
        import_id: staged.import_id,
      });
    } catch (error) {
      console.error(`[CrawlExecutionWorker] Execution ${executionId} failed:`, error);
      const sourceError = error instanceof CrawlSourceError ? error : null;
      const sandboxError = error instanceof CrawlSandboxError ? error : null;
      const latest = await this.repository.getExecution(executionId);
      if (latest?.status === 'CANCELLED' || sourceError?.code === 'EXECUTION_CANCELLED') return;
      const errorCode = sourceError?.code ?? sandboxError?.code ?? 'CRAWL_EXECUTION_FAILED';
      const timedOut = errorCode === 'NETWORK_TIMEOUT' || errorCode === 'SANDBOX_TIMEOUT';
      const rawMessage = error instanceof Error ? error.message : String(error);
      const safeMessage = sourceError?.message ?? sandboxError?.message ?? (rawMessage ? `Crawl execution failed: ${rawMessage}` : 'Crawl execution failed. Review the safe execution log for details.');
      await this.crawlJobService.transitionExecution(executionId, 'RUNNING', timedOut ? 'TIMEOUT' : 'FAILED', null, {
        errorCode,
        errorMessage: safeMessage,
      }, workerId);
      await this.crawlJobService.appendExecutionLog(executionId, 'ERROR', safeMessage, {
        execution_id: executionId,
        job_id: execution.crawl_job_definition_id,
        cycle_id: execution.evaluation_cycle_id,
        script_version: snapshot.script_version,
        error_code: errorCode,
      });
          const retry = sourceError?.retryable
            ? await this.crawlJobService.scheduleAutomaticRetry(executionId)
            : null;
          if (!retry) await this.crawlJobService.stopFollowingScheduledExecutions(executionId);
    }
  }
}