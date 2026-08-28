import { Pool } from 'pg';
import { KpiRelationshipService } from './services/kpi-relationship.service.js';
import { PostgresKpiRelationshipRepository } from './infrastructure/postgres-kpi-relationship.repository.js';
import { KpiRelationshipController } from './api/kpi-relationship.controller.js';
import { PostgresKpiRepository } from './infrastructure/postgres-kpi.repository.js';
import { KpiService } from './services/kpi.service.js';
import { KpiController } from './api/kpi.controller.js';

export interface KpiModule {
  kpiService: KpiService;
  kpiController: KpiController;
  relationshipService: KpiRelationshipService;
  relationshipController: KpiRelationshipController;
}

export function createKpiModule(pool: Pool): KpiModule {
  const relationshipRepo = new PostgresKpiRelationshipRepository(pool);
  const relationshipService = new KpiRelationshipService(pool, relationshipRepo);
  const relationshipController = new KpiRelationshipController(relationshipService);

  const kpiRepo = new PostgresKpiRepository(pool);
  const kpiService = new KpiService(kpiRepo);
  const kpiController = new KpiController(kpiService);

  return {
    kpiService,
    kpiController,
    relationshipService,
    relationshipController,
  };
}
