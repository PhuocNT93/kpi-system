import { Request, Response } from 'express';
import { AuditService } from '../application/audit.service.js';
import { sendSuccess } from '../../../api/http-response.js';

export class AuditController {
  constructor(private auditService: AuditService) {}

  getLogs = async (req: Request, res: Response): Promise<void> => {
    const logs = await this.auditService.getLogs(req.query);
    sendSuccess(res, 200, 'Audit logs retrieved successfully', logs);
  };
}
