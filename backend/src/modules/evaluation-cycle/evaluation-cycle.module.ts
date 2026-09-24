import { Pool } from 'pg';
import {
  PostgresEvaluationCycleRepository,
  PostgresEvaluationRepository,
  PostgresEvaluationItemRepository,
} from './infrastructure/postgres-evaluation-cycle.repository.js';
import { EvaluationCycleTransitionService } from './application/evaluation-cycle-transition.service.js';
import { EvaluationCycleService } from './application/evaluation-cycle.service.js';
import { EvaluationCycleOpeningService } from './application/evaluation-cycle-opening.service.js';
import { EvaluationGenerationService } from './application/evaluation-generation.service.js';
import { IndividualCycleCreationService } from './application/individual-cycle-creation.service.js';
import { EvaluationCycleController } from './api/evaluation-cycle.controller.js';
import { AuditService } from '../audit/application/audit.service.js';

export interface EvaluationCycleModule {
  cycleRepo: PostgresEvaluationCycleRepository;
  evaluationRepo: PostgresEvaluationRepository;
  evaluationItemRepo: PostgresEvaluationItemRepository;
  transitionService: EvaluationCycleTransitionService;
  cycleService: EvaluationCycleService;
  openingService: EvaluationCycleOpeningService;
  generationService: EvaluationGenerationService;
  individualCreationService: IndividualCycleCreationService;
  cycleController: EvaluationCycleController;
}

import { NotificationService } from '../notification/application/notification.service.js';

export function createEvaluationCycleModule(
  pool: Pool,
  auditService?: AuditService,
  notificationService?: NotificationService
): EvaluationCycleModule {
  const cycleRepo = new PostgresEvaluationCycleRepository(pool);
  const evaluationRepo = new PostgresEvaluationRepository(pool);
  const evaluationItemRepo = new PostgresEvaluationItemRepository(pool);

  const transitionService = new EvaluationCycleTransitionService();

  const cycleService = new EvaluationCycleService(
    pool,
    cycleRepo,
    evaluationRepo,
    transitionService,
    auditService,
    notificationService
  );

  const generationService = new EvaluationGenerationService(evaluationRepo, evaluationItemRepo, notificationService);

  const openingService = new EvaluationCycleOpeningService(
    pool,
    cycleRepo,
    generationService,
    transitionService,
    auditService
  );

  const individualCreationService = new IndividualCycleCreationService(
    pool,
    cycleRepo,
    evaluationRepo,
    generationService,
    auditService
  );

  const cycleController = new EvaluationCycleController(cycleService, openingService, individualCreationService);

  return {
    cycleRepo,
    evaluationRepo,
    evaluationItemRepo,
    transitionService,
    cycleService,
    openingService,
    generationService,
    individualCreationService,
    cycleController,
  };
}
