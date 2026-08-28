import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { KpiRelationshipService } from '../services/kpi-relationship.service.js';
import { sendSuccess } from '../../../api/http-response.js';

const createRelationshipSchema = z.object({
  sourceKpiId: z.string().uuid(),
  targetKpiId: z.string().uuid(),
  relationshipType: z.enum(['DEPENDS_ON', 'SUPPORTS', 'INFLUENCES', 'BLOCKS', 'PREREQUISITE_FOR']),
});

export class KpiRelationshipController {
  constructor(private service: KpiRelationshipService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createRelationshipSchema.parse(req.body);
      const result = await this.service.createRelationship(data);
      sendSuccess(res, 201, 'KPI Relationship created successfully', result);
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getAllRelationships();
      sendSuccess(res, 200, 'KPI Relationships retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) throw new Error('Missing relationship ID');
      await this.service.deleteRelationship(id);
      sendSuccess(res, 200, 'KPI Relationship deleted successfully', null);
    } catch (error) {
      next(error);
    }
  };
}
