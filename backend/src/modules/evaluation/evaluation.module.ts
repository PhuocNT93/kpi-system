import { Pool } from 'pg';
import { PostgresEvaluationRepository } from './infrastructure/persistence/postgres-evaluation.repository.js';
import { PostgresEvaluationItemRepository } from './infrastructure/persistence/postgres-evaluation-item.repository.js';
import { EvaluationService } from './application/services/evaluation.service.js';
import { EvaluationController } from './api/evaluation.controller.js';

export function createEvaluationModule(pool: Pool) {
  const evaluationRepo = new PostgresEvaluationRepository(pool);
  const evaluationItemRepo = new PostgresEvaluationItemRepository(pool);
  
  const evaluationService = new EvaluationService(
    evaluationRepo,
    evaluationItemRepo,
    pool
  );
  
  const evaluationController = new EvaluationController(evaluationService);
  
  return {
    evaluationRepo,
    evaluationItemRepo,
    evaluationService,
    evaluationController,
  };
}
