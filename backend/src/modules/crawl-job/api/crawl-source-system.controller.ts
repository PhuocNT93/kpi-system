import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../api/http-response.js';
import { getActorOrThrow } from '../../../shared/auth/actor-context.js';
import { CrawlSourceSystemService } from '../application/crawl-source-system.service.js';

export class CrawlSourceSystemController {
  constructor(private readonly service: CrawlSourceSystemService) {}

  async listSourceSystems(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const items = await this.service.listSourceSystems(actor);
    sendSuccess(res, 200, 'Source systems retrieved successfully.', items);
  }

  async getSourceSystem(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const id = req.params.id as string;
    const item = await this.service.getSourceSystem(actor, id);
    sendSuccess(res, 200, 'Source system retrieved successfully.', item);
  }

  async createSourceSystem(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const item = await this.service.createSourceSystem(actor, req.body);
    sendCreated(res, 'Source system registered successfully.', item, `/api/crawl-source-systems/${item.id}`);
  }

  async updateSourceSystem(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const id = req.params.id as string;
    const item = await this.service.updateSourceSystem(actor, id, req.body);
    sendSuccess(res, 200, 'Source system updated successfully.', item);
  }

  async deleteSourceSystem(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const id = req.params.id as string;
    const result = await this.service.deleteSourceSystem(actor, id);
    sendSuccess(res, 200, result.message, result);
  }

  async testConnection(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const id = req.params.id as string;
    const result = await this.service.testConnection(actor, id);
    sendSuccess(res, 200, 'Source system connection tested successfully.', result);
  }
}
