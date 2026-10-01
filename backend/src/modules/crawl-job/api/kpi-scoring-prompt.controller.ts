import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../api/http-response.js';
import { getActorOrThrow } from '../../../shared/auth/actor-context.js';
import { KpiScoringPromptService } from '../application/kpi-scoring-prompt.service.js';
import { CrawlScoringService } from '../application/crawl-scoring.service.js';

export class KpiScoringPromptController {
  constructor(
    private readonly promptService: KpiScoringPromptService,
    private readonly scoringService: CrawlScoringService
  ) {}

  async listPrompts(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const items = await this.promptService.listPrompts(actor);
    sendSuccess(res, 200, 'KPI scoring prompts retrieved successfully.', items);
  }

  async getPrompt(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const promptId = req.params.promptId as string;
    const item = await this.promptService.getPrompt(actor, promptId);
    sendSuccess(res, 200, 'KPI scoring prompt retrieved successfully.', item);
  }

  async createPrompt(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const item = await this.promptService.createPrompt(actor, req.body);
    sendCreated(res, 'KPI scoring prompt created successfully.', item, `/api/kpi-scoring-prompts/${item.prompt_id}`);
  }

  async updatePrompt(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const promptId = req.params.promptId as string;
    const item = await this.promptService.updatePrompt(actor, promptId, req.body);
    sendSuccess(res, 200, 'KPI scoring prompt updated successfully.', item);
  }

  async deletePrompt(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const promptId = req.params.promptId as string;
    const result = await this.promptService.deletePrompt(actor, promptId);
    sendSuccess(res, 200, result.message, result);
  }

  async listPromptVersions(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const promptId = req.params.promptId as string;
    const items = await this.promptService.listPromptVersions(actor, promptId);
    sendSuccess(res, 200, 'Prompt versions retrieved successfully.', items);
  }

  async createPromptVersion(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const promptId = req.params.promptId as string;
    const item = await this.promptService.createPromptVersion(actor, promptId, req.body);
    sendCreated(res, 'Prompt draft version created successfully.', item, `/api/kpi-scoring-prompts/${promptId}/versions/${item.prompt_version_id}`);
  }

  async publishPromptVersion(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const versionId = req.params.versionId as string;
    const item = await this.promptService.publishPromptVersion(actor, versionId);
    sendSuccess(res, 200, 'Prompt version published successfully.', item);
  }

  async testDryRun(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const result = await this.scoringService.testPrompt(actor, req.body);
    sendSuccess(res, 200, 'Dry-run prompt test evaluated successfully.', result);
  }
}
