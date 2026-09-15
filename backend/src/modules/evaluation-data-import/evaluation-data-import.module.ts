import { Pool } from 'pg';
import { PostgresEvaluationDataImportRepository } from './infrastructure/postgres-evaluation-data-import.repository.js';
import { EvaluationDataImportService } from './application/evaluation-data-import.service.js';
import { EvaluationDataImportController } from './api/evaluation-data-import.controller.js';
import { EvaluationService } from '../evaluation/application/services/evaluation.service.js';

export function createEvaluationDataImportModule(
  pool: Pool,
  evaluationService: EvaluationService
) {
  const importRepo = new PostgresEvaluationDataImportRepository(pool);
  const importService = new EvaluationDataImportService(importRepo, evaluationService, pool);
  const importController = new EvaluationDataImportController(importService);

  return {
    importRepo,
    importService,
    importController,
  };
}
