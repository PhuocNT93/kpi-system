import { Pool } from 'pg';
import { PostgresI18nRepository } from './infrastructure/postgres-i18n.repository.js';
import { I18nService } from './application/i18n.service.js';
import { I18nController } from './api/i18n.controller.js';
import { AuditService } from '../audit/application/audit.service.js';

export interface I18nModule {
  service: I18nService;
  controller: I18nController;
  repository: PostgresI18nRepository;
}

export function createI18nModule(pool: Pool, auditService?: AuditService): I18nModule {
  const repository = new PostgresI18nRepository(pool);
  const service = new I18nService(repository, auditService);
  const controller = new I18nController(service);

  return {
    service,
    controller,
    repository,
  };
}
