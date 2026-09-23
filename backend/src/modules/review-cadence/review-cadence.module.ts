import { Pool } from 'pg';
import { PostgresReviewCadenceRepository } from './infrastructure/postgres-review-cadence.repository.js';
import { ReviewCadenceService } from './application/review-cadence.service.js';
import { ReviewCadenceController } from './api/review-cadence.controller.js';
import { AuditService } from '../audit/application/audit.service.js';

export interface ReviewCadenceModule {
  reviewCadenceRepository: PostgresReviewCadenceRepository;
  reviewCadenceService: ReviewCadenceService;
  reviewCadenceController: ReviewCadenceController;
}

export function createReviewCadenceModule(
  pool: Pool,
  auditService: AuditService
): ReviewCadenceModule {
  const reviewCadenceRepository = new PostgresReviewCadenceRepository(pool);
  const reviewCadenceService = new ReviewCadenceService(reviewCadenceRepository, auditService, pool);
  const reviewCadenceController = new ReviewCadenceController(reviewCadenceService);

  return {
    reviewCadenceRepository,
    reviewCadenceService,
    reviewCadenceController,
  };
}
