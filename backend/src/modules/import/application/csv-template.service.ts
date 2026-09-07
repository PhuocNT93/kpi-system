import { ICsvTemplateRepository } from '../domain/csv-template.types.js';

export class CsvTemplateService {
  constructor(private readonly csvTemplateRepo: ICsvTemplateRepository) {}

  async getCurrentCsvTemplateContent(code: string): Promise<{ filename: string, content: string } | null> {
    const template = await this.csvTemplateRepo.findActiveTemplateByCode(code);
    if (!template) {
      return null;
    }

    const columns = await this.csvTemplateRepo.findColumnsByTemplateId(template.csv_template_id);
    
    // Build CSV content
    const headers = columns.map(c => c.column_name).join(',');
    const content = headers + '\\n'; // Just the headers for an empty template

    return {
      filename: `${code.toLowerCase()}_template_v${template.version_no}.csv`,
      content
    };
  }

  async getCsvTemplateContentById(id: string): Promise<{ filename: string, content: string } | null> {
    const template = await this.csvTemplateRepo.findById(id);
    if (!template) {
      return null;
    }

    const columns = await this.csvTemplateRepo.findColumnsByTemplateId(template.csv_template_id);
    
    const headers = columns.map(c => c.column_name).join(',');
    const content = headers + '\\n';

    return {
      filename: `${template.code.toLowerCase()}_template_v${template.version_no}.csv`,
      content
    };
  }
}
