import { Request, Response } from 'express';
import { sendAccepted, sendCollection, sendCreated, sendSuccess } from '../../../api/http-response.js';
import { getActorOrThrow } from '../../../shared/auth/actor-context.js';
import {
  AssignCrawlJobToCycleSchema,
  CreateCrawlScriptSchema,
  CreateCrawlExecutionSchema,
  CreateCrawlJobSchema,
  CreateCredentialReferenceSchema,
  TestRunCrawlScriptSchema,
  UpdateCrawlJobSchema,
  UpdateCrawlScriptSchema,
} from '../domain/crawl-job.schemas.js';
import { CrawlJobService } from '../application/crawl-job.service.js';
import { parseCrawlRequest } from './crawl-job.request.js';

export class CrawlJobController {
  constructor(private readonly service: CrawlJobService) {}

  async listJobs(req: Request, res: Response): Promise<void> {
    const sourceSystem = typeof req.query.source_system === 'string' ? req.query.source_system : undefined;
    const active = typeof req.query.active === 'string' ? req.query.active === 'true' : undefined;
    const rawCycleId = typeof req.query.cycle_id === 'string'
      ? req.query.cycle_id
      : typeof req.query.cycleId === 'string'
        ? req.query.cycleId
        : undefined;
    const cycleId = rawCycleId && rawCycleId !== 'ALL' && rawCycleId.trim() !== '' ? rawCycleId : undefined;
    const items = await this.service.listJobs(getActorOrThrow(req), { source_system: sourceSystem, active, cycle_id: cycleId });
    sendCollection(res, 'Crawl Jobs retrieved successfully.', items, {
      number: 1, size: items.length, total_items: items.length, total_pages: 1,
    });
  }

  async listPublishedScripts(req: Request, res: Response): Promise<void> {
    const sourceSystem = typeof req.query.source_system === 'string' ? req.query.source_system : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const items = await this.service.listPublishedScripts(getActorOrThrow(req), sourceSystem, status);
    sendCollection(res, 'Published crawl scripts retrieved successfully.', items, {
      number: 1, size: items.length, total_items: items.length, total_pages: 1,
    });
  }

  async listCredentialReferences(req: Request, res: Response): Promise<void> {
    const sourceSystem = typeof req.query.source_system === 'string' ? req.query.source_system : undefined;
    const items = await this.service.listCredentialReferences(getActorOrThrow(req), sourceSystem);
    sendCollection(res, 'Connector credential references retrieved successfully.', items, {
      number: 1, size: items.length, total_items: items.length, total_pages: 1,
    });
  }

  async createCrawlScript(req: Request, res: Response): Promise<void> {
    const payload = parseCrawlRequest(CreateCrawlScriptSchema, req.body);
    const result = await this.service.createScriptVersion(getActorOrThrow(req), payload);
    sendCreated(res, 'Crawl script draft created.', result, `/api/crawl-scripts/${result.crawl_script_version_id}`);
  }

  async testRunScript(req: Request, res: Response): Promise<void> {
    const payload = parseCrawlRequest(TestRunCrawlScriptSchema, req.body);
    const result = await this.service.testRunScript(getActorOrThrow(req), {
      scriptId: typeof req.params.scriptVersionId === 'string' ? req.params.scriptVersionId : payload.script_id,
      sourceCode: payload.source_code,
      sourceSystem: payload.source_system,
      sourceConfig: payload.source_config,
      mockInput: payload.mock_input,
      evaluation_cycle_id: payload.evaluation_cycle_id ?? undefined,
    });
    sendSuccess(res, 200, 'Crawl script test run completed.', result);
  }

  async getCrawlScript(req: Request, res: Response): Promise<void> {
    const result = await this.service.getScriptVersionDetails(getActorOrThrow(req), req.params.scriptVersionId as string);
    sendSuccess(res, 200, 'Crawl script retrieved.', result);
  }

  async updateCrawlScript(req: Request, res: Response): Promise<void> {
    const payload = parseCrawlRequest(UpdateCrawlScriptSchema, req.body);
    const result = await this.service.updateScriptVersion(getActorOrThrow(req), req.params.scriptVersionId as string, payload);
    sendSuccess(res, 200, 'Crawl script updated.', result);
  }

  async deleteCrawlScript(req: Request, res: Response): Promise<void> {
    const result = await this.service.deleteScriptVersion(getActorOrThrow(req), req.params.scriptVersionId as string);
    sendSuccess(res, 200, result.message, result);
  }

  async publishCrawlScript(req: Request, res: Response): Promise<void> {
    const result = await this.service.publishScriptVersion(getActorOrThrow(req), req.params.scriptVersionId as string);
    sendSuccess(res, 200, 'Crawl script published.', result);
  }

  async disableCrawlScript(req: Request, res: Response): Promise<void> {
    const result = await this.service.disableScriptVersion(getActorOrThrow(req), req.params.scriptVersionId as string);
    sendSuccess(res, 200, 'Crawl script đã được vô hiệu hóa thành công.', result);
  }

  async enableCrawlScript(req: Request, res: Response): Promise<void> {
    const result = await this.service.enableScriptVersion(getActorOrThrow(req), req.params.scriptVersionId as string);
    sendSuccess(res, 200, 'Crawl script đã được kích hoạt lại thành công.', result);
  }

  async createCredentialReference(req: Request, res: Response): Promise<void> {
    const payload = parseCrawlRequest(CreateCredentialReferenceSchema, req.body);
    const result = await this.service.createCredentialReference(getActorOrThrow(req), payload);
    sendCreated(res, 'Connector credential reference registered.', result, `/api/connector-credentials/${result.connector_credential_id}`);
  }

  async createJob(req: Request, res: Response): Promise<void> {
    const payload = parseCrawlRequest(CreateCrawlJobSchema, req.body);
    const created = await this.service.createJob(getActorOrThrow(req), payload);
    sendCreated(res, 'Crawl Job created successfully.', created, `/api/crawl-jobs/${created.crawl_job_definition_id}`);
  }

  async getJob(req: Request, res: Response): Promise<void> {
    const result = await this.service.getJob(getActorOrThrow(req), req.params.id as string);
    sendSuccess(res, 200, 'Crawl Job retrieved successfully.', result);
  }

  async updateJob(req: Request, res: Response): Promise<void> {
    const payload = parseCrawlRequest(UpdateCrawlJobSchema, req.body);
    const result = await this.service.updateJob(getActorOrThrow(req), req.params.id as string, payload);
    sendSuccess(res, 200, 'Crawl Job updated successfully.', result);
  }

  async setEnabled(req: Request, res: Response, enabled: boolean): Promise<void> {
    const result = await this.service.setJobActive(getActorOrThrow(req), req.params.id as string, enabled);
    sendSuccess(res, 200, enabled ? 'Crawl Job enabled.' : 'Crawl Job disabled.', result);
  }

  async deleteJob(req: Request, res: Response): Promise<void> {
    const result = await this.service.deleteJob(getActorOrThrow(req), req.params.id as string);
    sendSuccess(res, 200, result.message, result);
  }

  async listCycleJobs(req: Request, res: Response): Promise<void> {
    const items = await this.service.listCycleJobs(getActorOrThrow(req), req.params.cycleId as string);
    sendCollection(res, 'Cycle Crawl Jobs retrieved successfully.', items, {
      number: 1, size: items.length, total_items: items.length, total_pages: 1,
    });
  }

  async assignJobToCycle(req: Request, res: Response): Promise<void> {
    const payload = parseCrawlRequest(AssignCrawlJobToCycleSchema, req.body);
    await this.service.assignJobToCycle(
      getActorOrThrow(req),
      req.params.cycleId as string,
      req.params.jobId as string,
      payload
    );
    sendSuccess(res, 200, 'Crawl Job cycle assignment updated successfully.', null);
  }

  async createExecution(req: Request, res: Response): Promise<void> {
    const payload = parseCrawlRequest(CreateCrawlExecutionSchema, req.body);
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const execution = await this.service.createManualExecution(
      getActorOrThrow(req),
      req.params.id as string,
      payload,
      idempotencyKey,
      typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined
    );
    sendAccepted(res, 'Crawl execution queued.', execution);
  }

  async listExecutions(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const { items, total } = await this.service.listExecutions(getActorOrThrow(req), req.params.id as string, {
      page, limit,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      cycleId: typeof req.query.evaluation_cycle_id === 'string' ? req.query.evaluation_cycle_id : undefined,
    });
    sendCollection(res, 'Crawl Executions retrieved successfully.', items, {
      number: page, size: limit, total_items: total, total_pages: Math.ceil(total / limit),
    });
  }

  async getExecution(req: Request, res: Response): Promise<void> {
    const result = await this.service.getExecution(getActorOrThrow(req), req.params.executionId as string);
    sendSuccess(res, 200, 'Crawl Execution retrieved successfully.', result);
  }

  async listExecutionLogs(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50));
    const level = req.query.level === 'INFO' || req.query.level === 'WARN' || req.query.level === 'ERROR'
      ? req.query.level
      : undefined;
    const { items, total } = await this.service.listExecutionLogs(getActorOrThrow(req), req.params.executionId as string, {
      page,
      limit,
      level,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    sendCollection(res, 'Crawl Execution logs retrieved successfully.', items, {
      number: page, size: limit, total_items: total, total_pages: Math.ceil(total / limit),
    });
  }

  async retryExecution(req: Request, res: Response): Promise<void> {
    const result = await this.service.retryExecution(
      getActorOrThrow(req),
      req.params.executionId as string,
      req.header('Idempotency-Key') ?? ''
    );
    sendAccepted(res, 'Crawl execution retry queued.', result);
  }

  async cancelExecution(req: Request, res: Response): Promise<void> {
    const result = await this.service.cancelExecution(getActorOrThrow(req), req.params.executionId as string);
    sendSuccess(res, 200, 'Crawl execution cancelled.', result);
  }

  async listExecutionRecords(req: Request, res: Response): Promise<void> {
    const items = await this.service.listExecutionRecords(getActorOrThrow(req), req.params.executionId as string);
    sendSuccess(res, 200, 'Crawl Execution records retrieved successfully.', items);
  }
}