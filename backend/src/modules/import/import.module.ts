import { Pool } from 'pg';
import { PostgresCsvTemplateRepository } from './infrastructure/postgres-csv-template.repository.js';
import { PostgresImportRepository } from './infrastructure/postgres-import.repository.js';
import { CsvTemplateService } from './application/csv-template.service.js';
import { CsvImportService } from './application/csv-import.service.js';
import { ImportController } from './api/import.controller.js';

export function createImportModule(pool: Pool) {
  const csvTemplateRepo = new PostgresCsvTemplateRepository(pool);
  const importRepo = new PostgresImportRepository(pool);
  
  const csvTemplateService = new CsvTemplateService(csvTemplateRepo);
  const csvImportService = new CsvImportService(importRepo, pool);
  
  const importController = new ImportController(csvTemplateService, csvImportService);

  return {
    importController,
    csvTemplateService,
    csvImportService,
    csvTemplateRepo,
    importRepo,
  };
}
