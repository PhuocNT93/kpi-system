import { Pool } from 'pg';
import { PostgresReviewCadenceRepository } from './infrastructure/postgres-review-cadence.repository.js';
import { ReviewCadenceService } from './application/review-cadence.service.js';
import { ReviewCadenceController } from './api/review-cadence.controller.js';
import { ReviewDueService } from './application/review-due.service.js';
import { ReviewDueScheduler } from './application/review-due-scheduler.js';
import { ReviewScheduleService } from './application/review-schedule.service.js';
import { ReviewDueController } from './api/review-due.controller.js';
import { AuditService } from '../audit/application/audit.service.js';

export interface ReviewCadenceModule {
  reviewCadenceRepository: PostgresReviewCadenceRepository;
  reviewCadenceService: ReviewCadenceService;
  reviewCadenceController: ReviewCadenceController;
  reviewDueService: ReviewDueService;
  reviewDueScheduler: ReviewDueScheduler;
  reviewScheduleService: ReviewScheduleService;
  reviewDueController: ReviewDueController;
}

export function createReviewCadenceModule(
  pool: Pool,
  auditService: AuditService
): ReviewCadenceModule {
  const reviewCadenceRepository = new PostgresReviewCadenceRepository(pool);
  const reviewCadenceService = new ReviewCadenceService(reviewCadenceRepository, auditService, pool);
  const reviewCadenceController = new ReviewCadenceController(reviewCadenceService);
  const reviewScheduleService = new ReviewScheduleService(pool, auditService);
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
    reviewScheduleService,
    reviewDueController,
  };
}
