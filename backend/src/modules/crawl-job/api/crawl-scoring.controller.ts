import { Request, Response } from 'express';
import { sendCollection, sendSuccess } from '../../../api/http-response.js';
import { getActorOrThrow } from '../../../shared/auth/actor-context.js';
import { CrawlScoringService } from '../application/crawl-scoring.service.js';

export class CrawlScoringController {
  constructor(private readonly service: CrawlScoringService) {}

  async listScoringExecutions(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const crawlExecutionId = typeof req.query.crawl_execution_id === 'string' ? req.query.crawl_execution_id : undefined;
    const cycleId = typeof req.query.cycle_id === 'string' ? req.query.cycle_id : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const reviewStatus = typeof req.query.review_status === 'string' ? req.query.review_status : undefined;
    const employeeCode = typeof req.query.employee_code === 'string' ? req.query.employee_code : undefined;
    const page = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;

    const result = await this.service.listScoringExecutions(actor, {
      crawl_execution_id: crawlExecutionId,
      cycle_id: cycleId,
      status,
      page,
      limit,
      ...({ review_status: reviewStatus, employee_code: employeeCode }),
    });

    sendCollection(res, 'Scoring executions retrieved successfully.', result.items, {
      number: page,
      size: limit,
      total_items: result.total,
      total_pages: Math.ceil(result.total / limit) || 1,
    });
  }

  async getScoringExecution(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const id = req.params.id as string;
    const item = await this.service.getScoringExecution(actor, id);
    sendSuccess(res, 200, 'Scoring execution retrieved successfully.', item);
  }

  async retryScoringExecution(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const id = req.params.id as string;
    const item = await this.service.retryScoringExecution(actor, id);
    sendSuccess(res, 200, 'Scoring execution retry queued.', item);
  }

  async rescoreRow(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const crawlDataRowId = req.params.rowId as string;
    const promptVersionId = req.body?.prompt_version_id as string | undefined;
    const item = await this.service.rescoreRow(actor, crawlDataRowId, promptVersionId);
    sendSuccess(res, 200, 'Row rescoring queued.', item);
  }

  async reviewExecution(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const id = req.params.id as string;
    const payload = req.body;
    const item = await this.service.reviewExecution(actor, id, payload);
    sendSuccess(res, 200, 'Human review recorded successfully.', item);
  }

  async applyToEvaluation(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const id = req.params.id as string;
    const item = await this.service.applyToEvaluation(actor, id);
    sendSuccess(res, 200, 'Scored measurement applied to evaluation successfully.', item);
  }
}
