import { Pool } from 'pg';
import { PostgresReportsRepository } from './infrastructure/postgres-reports.repository.js';
import { ReportingProjectionService } from './application/reporting-projection.service.js';
import { ReportsQueryService } from './application/reports-query.service.js';
import { ReportsController } from './api/reports.controller.js';
import { IEvaluationRepository, IEvaluationItemRepository } from '../evaluation/domain/repositories.interface.js';

export function createReportsModule(
  pool: Pool,
  evaluationRepo: IEvaluationRepository,
  evaluationItemRepo: IEvaluationItemRepository
) {
  const reportsRepo = new PostgresReportsRepository(pool);
  
  const projectionService = new ReportingProjectionService(
    pool,
    reportsRepo,
    evaluationRepo,
    evaluationItemRepo
  );
  
  // Initialize event listeners
  projectionService.init();

  // Async backfill/sync all existing evaluations into read models on startup
  if (process.env.NODE_ENV !== 'test') {
    projectionService.syncAll().catch((err) => {
      console.error('Failed to sync reporting projections on startup:', err);
    });
  }

  const queryService = new ReportsQueryService(reportsRepo, pool, projectionService);
  const reportsController = new ReportsController(queryService);

  return {
    reportsController,
    projectionService,
  };
}
