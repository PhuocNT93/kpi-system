import { Request, Response } from 'express';
import { CsvTemplateService } from '../application/csv-template.service.js';
import { CsvImportService } from '../application/csv-import.service.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';

export class ImportController {
  constructor(
    private readonly csvTemplateService: CsvTemplateService,
    private readonly csvImportService: CsvImportService
  ) {}

  async getCurrentCsvTemplate(request: Request, response: Response) {
    const templateCode = 'EVALUATION_SCORE_IMPORT';
    const result = await this.csvTemplateService.getCurrentCsvTemplateMeta(templateCode);

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

    return response.status(200).json({
      success: true,
      message: 'CSV template retrieved successfully.',
      data: result,
      meta: {
        request_id: request.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }

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

  async uploadCsv(request: Request, response: Response) {
    const requestId = request.headers['x-request-id'] as string || 'unknown';
    const actor = getActorFromContext(request);
    if (!actor) {
      return response.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
    const file = request.file;
    const cycleId = request.body.cycle_id;

    if (!file) {
      return response.status(400).json({
        success: false,
        message: 'No CSV file provided.',
        data: null,
        meta: { request_id: requestId }
      });
    }

    if (!cycleId) {
      return response.status(400).json({
        success: false,
        message: 'cycle_id is required.',
        data: null,
        meta: { request_id: requestId }
      });
    }

    try {
      const job = await this.csvImportService.processUpload(
        cycleId,
        file.buffer,
        file.originalname,
        actor.employeeId!,
        idempotencyKey || ''
      );

      // We separate row errors to meta
      // Need to fetch errors from DB or pass them back. 
      // Wait, processUpload currently only returns job, it doesn't return the row errors directly in the job object.
      // We need to fetch invalid rows to format the response properly.
      // Let's modify processUpload to return { job, rowErrors } or do it here.
      // Actually, processUpload could just attach row_errors to the returned object as a transient property for preview.
      return response.status(200).json({
        success: true,
        message: 'CSV uploaded and validated successfully.',
        data: {
          import_job_id: job.import_job_id,
          status: job.status,
          file_name: job.file_name,
          file_hash: job.file_hash,
          csv_template_id: job.csv_template_id,
          evaluation_cycle_id: job.evaluation_cycle_id,
          total_rows: job.total_rows,
          success_rows: job.success_rows,
          error_rows: job.error_rows
        },
        meta: {
          request_id: requestId,
          row_errors: (job as unknown as { transient_row_errors?: unknown[] }).transient_row_errors || []
        }
      });
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (error.code === 'DUPLICATE_IMPORT') {
        return response.status(409).json({
          success: false,
          message: error.message,
          data: null,
          meta: {
            request_id: requestId,
            error: { code: 'DUPLICATE_IMPORT', field: 'file', details: [] }
          }
        });
      }

      if (error.code === 'CYCLE_NOT_FOUND') {
        return response.status(404).json({
          success: false,
          message: error.message,
          data: null,
          meta: {
            request_id: requestId,
            error: { code: 'CYCLE_NOT_FOUND', field: 'cycle_id', details: [] }
          }
        });
      }

      console.error(err);
      return response.status(500).json({
        success: false,
        message: 'Internal server error during upload.',
        data: null,
        meta: { request_id: requestId }
      });
    }
  }
}
