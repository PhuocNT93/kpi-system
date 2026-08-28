import { Pool } from 'pg';
import {
  PostgresEvaluationCycleRepository,
  PostgresEvaluationRepository,
  PostgresEvaluationItemRepository,
} from './infrastructure/postgres-evaluation-cycle.repository.js';
import { EvaluationCycleTransitionService } from './application/evaluation-cycle-transition.service.js';
import { EvaluationCycleService } from './application/evaluation-cycle.service.js';
import { EvaluationCycleOpeningService } from './application/evaluation-cycle-opening.service.js';
import { EvaluationCycleController } from './api/evaluation-cycle.controller.js';
import { AuditService } from '../audit/application/audit.service.js';

export interface EvaluationCycleModule {
  cycleRepo: PostgresEvaluationCycleRepository;
  evaluationRepo: PostgresEvaluationRepository;
  evaluationItemRepo: PostgresEvaluationItemRepository;
  transitionService: EvaluationCycleTransitionService;
  cycleService: EvaluationCycleService;
  openingService: EvaluationCycleOpeningService;
  cycleController: EvaluationCycleController;
}

export function createEvaluationCycleModule(pool: Pool, auditService?: AuditService): EvaluationCycleModule {
  const cycleRepo = new PostgresEvaluationCycleRepository(pool);
  const evaluationRepo = new PostgresEvaluationRepository(pool);
  const evaluationItemRepo = new PostgresEvaluationItemRepository(pool);

  const transitionService = new EvaluationCycleTransitionService();

  const cycleService = new EvaluationCycleService(
    pool,
    cycleRepo,
    evaluationRepo,
    transitionService,
    auditService
  );

  const openingService = new EvaluationCycleOpeningService(
    pool,
    cycleRepo,
    evaluationRepo,
    evaluationItemRepo,
    transitionService,
    auditService
  );

  const cycleController = new EvaluationCycleController(cycleService, openingService);

  return {
    cycleRepo,
    evaluationRepo,
    evaluationItemRepo,
    transitionService,
    cycleService,
    openingService,
    cycleController,
  };
}
