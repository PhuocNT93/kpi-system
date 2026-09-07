import { Request, Response } from 'express';
import { CsvTemplateService } from '../application/csv-template.service.js';

export class ImportController {
  constructor(private readonly csvTemplateService: CsvTemplateService) {}

  async downloadCurrentCsvTemplate(request: Request, response: Response) {
    const templateCode = 'EVALUATION_SCORE_IMPORT';
    const result = await this.csvTemplateService.getCurrentCsvTemplateContent(templateCode);

    if (!result) {
      const requestId = request.headers['x-request-id'] || 'unknown';
      return response.status(404).json({
        success: false,
        message: 'CSV template not found.',
        data: null,
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          error: {
            code: 'CSV_TEMPLATE_NOT_FOUND',
            field: null,
            details: []
          }
        }
      });
    }

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return response.status(200).send(result.content);
  }

  async downloadCsvTemplateById(request: Request, response: Response) {
    const csv_template_id = request.params['csv_template_id'] as string;
    const result = await this.csvTemplateService.getCsvTemplateContentById(csv_template_id);

    if (!result) {
      const requestId = request.headers['x-request-id'] || 'unknown';
      return response.status(404).json({
        success: false,
        message: 'CSV template not found.',
        data: null,
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          error: {
            code: 'CSV_TEMPLATE_NOT_FOUND',
            field: null,
            details: []
          }
        }
      });
    }

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return response.status(200).send(result.content);
  }
}
