import { Request, Response } from 'express';
import { AuditService } from '../application/audit.service.js';
import { sendSuccess } from '../../../api/http-response.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';

export class AuditController {
  constructor(private auditService: AuditService) {}

  getLogs = async (req: Request, res: Response): Promise<void> => {
    const actor = getActorFromContext(req);
    const logs = await this.auditService.getLogs(req.query, actor);
    sendSuccess(res, 200, 'Audit logs retrieved successfully', logs);
  };
}
