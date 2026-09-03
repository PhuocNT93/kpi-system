import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { KpiService } from '../services/kpi.service.js';
import { sendSuccess } from '../../../api/http-response.js';

const createKpiSchema = z.object({
  code: z.string().min(1).max(100).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with underscores/hyphens'),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
});

const updateKpiSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
});

const listKpiSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  size: z.coerce.number().int().positive().max(100).optional(),
});

export class KpiController {
  constructor(private service: KpiService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createKpiSchema.parse(req.body);
      const result = await this.service.createKpi(data);
      sendSuccess(res, 201, 'KPI created successfully', result);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter = listKpiSchema.parse(req.query);
      const result = await this.service.listKpis(filter);
      sendSuccess(res, 200, 'KPIs retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await this.service.getKpi(id);
      sendSuccess(res, 200, 'KPI retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const data = updateKpiSchema.parse(req.body);
      const result = await this.service.updateKpi(id, data);
      sendSuccess(res, 200, 'KPI updated successfully', result);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await this.service.deleteKpi(id);
      sendSuccess(res, 200, 'KPI deleted successfully', null);
    } catch (error) {
      next(error);
    }
  };
}
