import { Pool } from 'pg';
import { PostgresReviewCadenceRepository } from './infrastructure/postgres-review-cadence.repository.js';
import { ReviewCadenceService } from './application/review-cadence.service.js';
import { ReviewCadenceController } from './api/review-cadence.controller.js';
import { ReviewDueService } from './application/review-due.service.js';
import { ReviewDueScheduler } from './application/review-due-scheduler.js';
import { ReviewDueController } from './api/review-due.controller.js';
import { AuditService } from '../audit/application/audit.service.js';
import { ReviewCadenceChangeHandler } from './domain/review-cadence-change-handler.js';

export interface ReviewCadenceModule {
  reviewCadenceRepository: PostgresReviewCadenceRepository;
  reviewCadenceService: ReviewCadenceService;
  reviewCadenceController: ReviewCadenceController;
  reviewDueService: ReviewDueService;
  reviewDueScheduler: ReviewDueScheduler;
  reviewDueController: ReviewDueController;
}

export function createReviewCadenceModule(
  pool: Pool,
  auditService: AuditService,
  changeHandler?: ReviewCadenceChangeHandler
): ReviewCadenceModule {
  const reviewCadenceRepository = new PostgresReviewCadenceRepository(pool);
  const reviewCadenceService = new ReviewCadenceService(reviewCadenceRepository, auditService, pool, changeHandler);
  const reviewCadenceController = new ReviewCadenceController(reviewCadenceService);
  const reviewDueService = new ReviewDueService(pool);
  const reviewDueScheduler = new ReviewDueScheduler(reviewDueService);
  const reviewDueController = new ReviewDueController(reviewDueService);

  // Initialize daily background scheduler
  reviewDueScheduler.start();

  return {
    reviewCadenceRepository,
    reviewCadenceService,
    reviewCadenceController,
    reviewDueService,
    reviewDueScheduler,
    reviewDueController,
  };
}
