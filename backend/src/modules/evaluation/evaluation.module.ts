import { Pool } from 'pg';
import { PostgresEvaluationRepository } from './infrastructure/persistence/postgres-evaluation.repository.js';
import { PostgresEvaluationItemRepository } from './infrastructure/persistence/postgres-evaluation-item.repository.js';
import { EvaluationService } from './application/services/evaluation.service.js';
import { EvaluationController } from './api/evaluation.controller.js';
import { AuditService } from '../audit/application/audit.service.js';
import { RuleEngine } from '../rule-engine/domain/rule-engine.js';

import { NotificationService } from '../notification/application/notification.service.js';

export function createEvaluationModule(
  pool: Pool,
  auditService?: AuditService,
  ruleEngine?: RuleEngine,
  notificationService?: NotificationService
) {
  const evaluationRepo = new PostgresEvaluationRepository(pool);
  const evaluationItemRepo = new PostgresEvaluationItemRepository(pool);
  
  const evaluationService = new EvaluationService(
    evaluationRepo,
    evaluationItemRepo,
    pool,
    auditService,
    ruleEngine,
    undefined,
    notificationService
  );
  
  const evaluationController = new EvaluationController(evaluationService);
  
  return {
    evaluationRepo,
    evaluationItemRepo,
    evaluationService,
    evaluationController,
  };
}
