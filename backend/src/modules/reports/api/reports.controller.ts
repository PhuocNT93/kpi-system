import { Request, Response, NextFunction } from 'express';
import { ReportsQueryService } from '../application/reports-query.service.js';
import { sendSuccess } from '../../../api/http-response.js';
import { AppError } from '../../../api/app-error.js';

export class ReportsController {
  constructor(private queryService: ReportsQueryService) {}

  public getEmployeeReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const employeeId = req.params.employeeId as string;
      const cycleId = req.query.cycleId as string | undefined;

      if (!cycleId) {
        throw new AppError(400, 'BAD_REQUEST', 'cycleId is required');
      }

      const report = await this.queryService.getEmployeeReport(employeeId, cycleId as string);
      sendSuccess(res, 200, 'Report retrieved successfully.', report);
    } catch (err) {
      next(err);
    }
  };

  public getTeamReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.params.teamId as string;
      const cycleId = req.query.cycleId as string | undefined;

      if (!cycleId) {
        throw new AppError(400, 'BAD_REQUEST', 'cycleId is required');
      }

      const report = await this.queryService.getTeamReport(teamId, cycleId as string);
      sendSuccess(res, 200, 'Report retrieved successfully.', report);
    } catch (err) {
      next(err);
    }
  };

  public getOrganizationReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycleId = req.query.cycleId as string | undefined;

      if (!cycleId) {
        throw new AppError(400, 'BAD_REQUEST', 'cycleId is required');
      }

      const report = await this.queryService.getOrganizationReport(cycleId as string);
      sendSuccess(res, 200, 'Report retrieved successfully.', report);
    } catch (err) {
      next(err);
    }
  };
}
