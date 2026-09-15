import { Request, Response } from 'express';
import { EvaluationDataImportService } from '../application/evaluation-data-import.service.js';
import { RecordStatus } from '../domain/evaluation-data-import.types.js';
import { getActorOrThrow } from '../../../shared/auth/actor-context.js';
import { sendSuccess, sendCollection } from '../../../api/http-response.js';

export class EvaluationDataImportController {
  constructor(private importService: EvaluationDataImportService) {}

  async createImport(req: Request, res: Response): Promise<void> {
    const actor = getActorOrThrow(req);
    const result = await this.importService.createImport(req.body, actor);
    sendSuccess(res, 201, 'Import staged successfully.', result);
  }

  async listImports(req: Request, res: Response): Promise<void> {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const { items, total } = await this.importService.listImports({ page, limit });
    sendCollection(res, 'Imports retrieved successfully.', items, {
      number: page,
      size: limit,
      total_items: total,
      total_pages: Math.ceil(total / limit),
    });
  }

  async getImportById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const result = await this.importService.getImportById(id);
    sendSuccess(res, 200, 'Import details retrieved successfully.', result);
  }

  async previewImport(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const status = req.query.status ? (req.query.status as RecordStatus) : undefined;

    const result = await this.importService.previewImport(id, { page, limit, status });
    sendSuccess(res, 200, 'Import preview retrieved successfully.', result);
  }

  async updateDraft(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { record_id, ...patchData } = req.body;
    const actor = getActorOrThrow(req);

    const targetRecordId = (record_id || req.params.recordId) as string;
    const result = await this.importService.updateDraft(id, targetRecordId, patchData, actor);
    sendSuccess(res, 200, 'Draft record updated successfully.', result);
  }

  async applyImport(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const actor = getActorOrThrow(req);
    const result = await this.importService.applyImport(id, actor);
    sendSuccess(res, 200, result.message, result);
  }
}
