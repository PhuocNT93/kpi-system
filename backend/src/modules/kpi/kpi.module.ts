import { Pool } from 'pg';
import { KpiRelationshipService } from './services/kpi-relationship.service.js';
import { PostgresKpiRelationshipRepository } from './infrastructure/postgres-kpi-relationship.repository.js';
import { KpiRelationshipController } from './api/kpi-relationship.controller.js';

export interface KpiModule {
  relationshipService: KpiRelationshipService;
  relationshipController: KpiRelationshipController;
}

export function createKpiModule(pool: Pool): KpiModule {
  const relationshipRepo = new PostgresKpiRelationshipRepository(pool);
  const relationshipService = new KpiRelationshipService(pool, relationshipRepo);
  const relationshipController = new KpiRelationshipController(relationshipService);

  return {
    relationshipService,
    relationshipController,
  };
}
