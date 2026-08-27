import { Pool } from 'pg';
import { AuditService } from './application/audit.service.js';
import { AuditRetentionService } from './application/audit-retention.service.js';
import { PostgresAuditRepository } from './infrastructure/postgres-audit.repository.js';
import { AuditController } from './api/audit.controller.js';

export function createAuditModule(pool: Pool) {
  const auditRepo = new PostgresAuditRepository(pool);
  const auditService = new AuditService(auditRepo);
  const auditRetentionService = new AuditRetentionService(pool, auditRepo);
  const auditController = new AuditController(auditService);

  return {
    auditRepo,
    auditService,
    auditRetentionService,
    auditController,
  };
}
