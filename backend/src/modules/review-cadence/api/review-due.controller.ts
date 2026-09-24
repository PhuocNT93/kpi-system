import { Request, Response, NextFunction } from 'express';
import { ReviewDueService } from '../application/review-due.service.js';
import { sendSuccess } from '../../../api/http-response.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { Unauthenticated } from '../../../api/app-error.js';

export class ReviewDueController {
  constructor(private readonly reviewDueService: ReviewDueService) {}

  getReviewsDue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getActorFromContext(req);
      if (!actor) {
        throw new Unauthenticated('Authentication required');
      }

      const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
      const pageSize = req.query['page_size']
        ? parseInt(req.query['page_size'] as string, 10)
        : req.query['pageSize']
        ? parseInt(req.query['pageSize'] as string, 10)
        : 20;

      const status = req.query['status'] as string | undefined;
      const teamId = (req.query['team_id'] ?? req.query['teamId']) as string | undefined;
      const cadenceId = (req.query['cadence_id'] ?? req.query['cadenceId']) as string | undefined;
      const search = req.query['search'] as string | undefined;

      const result = await this.reviewDueService.getReviewsDue(actor, {
        page,
        pageSize,
        status,
        teamId,
        cadenceId,
        search,
      });

      sendSuccess(res, 200, 'Review due list retrieved successfully.', {
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        last_updated_at: result.last_updated_at,
      });
    } catch (err) {
      next(err);
    }
  };
}
