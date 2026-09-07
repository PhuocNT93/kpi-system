import { Pool } from 'pg';
import { PostgresCsvTemplateRepository } from './infrastructure/postgres-csv-template.repository.js';
import { CsvTemplateService } from './application/csv-template.service.js';
import { ImportController } from './api/import.controller.js';

export function createImportModule(pool: Pool) {
  const csvTemplateRepo = new PostgresCsvTemplateRepository(pool);
  const csvTemplateService = new CsvTemplateService(csvTemplateRepo);
  const importController = new ImportController(csvTemplateService);

  return {
    importController,
    csvTemplateService,
    csvTemplateRepo,
  };
}
