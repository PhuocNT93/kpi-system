import { Request, Response, NextFunction } from 'express';
import { ReportsQueryService } from '../application/reports-query.service.js';
import { sendSuccess, sendFailure } from '../../../api/http-response.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { getReportQuerySchema, getEmployeeKpiSummaryQuerySchema } from './reports.dto.js';
import { z } from 'zod';

export class ReportsController {
  constructor(private queryService: ReportsQueryService) {}

  public getEmployeeReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let employeeId = req.params.employeeId as string;
      const { cycleId } = getReportQuerySchema.parse(req.query);
      const actor = req.actor || getActorFromContext(req);

      if (employeeId === 'me') {
        employeeId = actor?.employeeId || '';
      }

      if (!employeeId) {
        sendFailure(res, 400, 'Employee ID is required.', 'INVALID_EMPLOYEE_ID');
        return;
      }

      if (actor?.role === 'EMPLOYEE' && actor.employeeId && employeeId !== actor.employeeId) {
        sendFailure(res, 403, 'You do not have permission to view this report.', 'FORBIDDEN');
        return;
      }

      const report = await this.queryService.getEmployeeReport(employeeId, cycleId);
      if (!report) {
        sendSuccess(res, 200, 'No report found for this employee and cycle.', null);
        return;
      }
      
      const dataAsOf = report.score.last_refreshed_at;
      sendSuccess(res, 200, 'Employee report retrieved successfully.', { ...report, data_as_of: dataAsOf });
    } catch (err) {
      next(err);
    }
  };

  public getTeamReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.params.teamId as string;
      const { cycleId } = getReportQuerySchema.parse(req.query);

      const report = await this.queryService.getTeamReport(teamId, cycleId);
      
      const dataAsOf = report.aggregate.last_refreshed_at;
      sendSuccess(res, 200, 'Team report retrieved successfully.', { ...report, data_as_of: dataAsOf });
    } catch (err) {
      next(err);
    }
  };

  public getOrganizationReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cycleId } = getReportQuerySchema.parse(req.query);

      const report = await this.queryService.getOrganizationReport(cycleId);
      
      const dataAsOf = report.length > 0 ? report[0]?.last_refreshed_at : null;
      sendSuccess(res, 200, 'Organization report retrieved successfully.', { data: report, data_as_of: dataAsOf });
    } catch (err) {
      next(err);
    }
  };

  public getTeamKpiReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.params.teamId as string;
      const { cycleId } = getReportQuerySchema.parse(req.query);

      const report = await this.queryService.getTeamKpiReport(teamId, cycleId);
      
      const dataAsOf = report.length > 0 ? report[0]?.last_refreshed_at : null;
      sendSuccess(res, 200, 'Team KPI report retrieved successfully.', { data: report, data_as_of: dataAsOf });
    } catch (err) {
      next(err);
    }
  };

  public getKpiTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // For KPI trend, we need base cycle and previous cycle, and scope ID (team/employee)
      const trendQuerySchema = z.object({
        currentCycleId: z.string().uuid(),
        previousCycleId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
        employeeId: z.string().uuid().optional(),
      }).refine(data => data.teamId || data.employeeId, {
        message: "Either teamId or employeeId must be provided for trend scope",
        path: ["teamId"]
      });

      const query = trendQuerySchema.parse(req.query);

      const trend = await this.queryService.getKpiTrend(
        query.currentCycleId, 
        query.previousCycleId, 
        query.teamId, 
        query.employeeId
      );
      
      sendSuccess(res, 200, 'KPI Trend retrieved successfully.', { data: trend });
    } catch (err) {
      next(err);
    }
  };

  public getEmployeeKpiSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let employeeId = req.params.employeeId as string;
      const parsedQuery = getEmployeeKpiSummaryQuerySchema.parse(req.query);
      const cycleId = parsedQuery.evaluation_cycle_id || parsedQuery.evaluationCycleId;
      const status = parsedQuery.evaluation_status || parsedQuery.evaluationStatus;
      const actor = req.actor || getActorFromContext(req);

      if (!actor) {
        sendFailure(res, 401, 'Authentication required.', 'UNAUTHENTICATED');
        return;
      }

      if (employeeId === 'me') {
        employeeId = actor.employeeId || actor.userId;
      }

      if (!employeeId) {
        sendFailure(res, 400, 'Employee ID is required.', 'INVALID_EMPLOYEE_ID');
        return;
      }

      const summary = await this.queryService.getEmployeeKpiSummary(employeeId, actor, cycleId, status);
      sendSuccess(res, 200, 'Employee KPI summary retrieved successfully.', summary);
    } catch (err) {
      next(err);
    }
  };

  public getEmployeeKpiDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let employeeId = req.params.employeeId as string;
      const evaluationItemId = req.params.evaluationItemId as string;
      const actor = req.actor || getActorFromContext(req);

      if (!actor) {
        sendFailure(res, 401, 'Authentication required.', 'UNAUTHENTICATED');
        return;
      }

      if (employeeId === 'me') {
        employeeId = actor.employeeId || actor.userId;
      }

      if (!employeeId) {
        sendFailure(res, 400, 'Employee ID is required.', 'INVALID_EMPLOYEE_ID');
        return;
      }

      if (!evaluationItemId) {
        sendFailure(res, 400, 'Evaluation Item ID is required.', 'INVALID_EVALUATION_ITEM_ID');
        return;
      }

      const detail = await this.queryService.getEmployeeKpiDetail(employeeId, evaluationItemId, actor);
      sendSuccess(res, 200, 'Employee KPI detail retrieved successfully.', detail);
    } catch (err) {
      next(err);
    }
  };
}
