import { Pool } from 'pg';
import { PostgresAuditRepository } from './infrastructure/postgres-audit.repository.js';
import { AuditService } from './application/audit.service.js';
import { AuditRetentionService } from './application/audit-retention.service.js';

export function createAuditModule(pool: Pool) {
  const auditRepo = new PostgresAuditRepository();
  const auditService = new AuditService(auditRepo);
  const auditRetentionService = new AuditRetentionService(pool, auditRepo);

  return {
    auditRepo,
    auditService,
    auditRetentionService,
  };
}
