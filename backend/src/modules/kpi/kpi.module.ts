import { Pool } from 'pg';
import { KpiRelationshipService } from './services/kpi-relationship.service.js';
import { KpiService } from './services/kpi.service.js';
import { PostgresKpiRelationshipRepository } from './infrastructure/postgres-kpi-relationship.repository.js';
import { PostgresKpiRepository } from './infrastructure/postgres-kpi.repository.js';
import { PostgresKpiCriterionRepository } from './infrastructure/postgres-kpi-criterion.repository.js';
import { KpiRelationshipController } from './api/kpi-relationship.controller.js';
import { KpiController } from './api/kpi.controller.js';
import { KpiCriterionService } from './services/kpi-criterion.service.js';

export interface KpiModule {
  relationshipService: KpiRelationshipService;
  relationshipController: KpiRelationshipController;
  kpiService: KpiService;
  kpiController: KpiController;
}

export function createKpiModule(pool: Pool): KpiModule {
  const relationshipRepo = new PostgresKpiRelationshipRepository(pool);
  const kpiRepo = new PostgresKpiRepository(pool);
  const criterionRepo = new PostgresKpiCriterionRepository(pool);

  const relationshipService = new KpiRelationshipService(pool, relationshipRepo);
  const kpiService = new KpiService(kpiRepo);
  const criterionService = new KpiCriterionService(criterionRepo, kpiRepo);

  const relationshipController = new KpiRelationshipController(relationshipService);
  const kpiController = new KpiController(kpiService, criterionService);

  return {
    relationshipService,
    relationshipController,
    kpiService,
    kpiController,
  };
}
