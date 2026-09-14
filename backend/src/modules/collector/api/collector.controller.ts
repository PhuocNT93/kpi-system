import { Request, Response } from 'express';
import { CollectorService } from '../application/collector.service.js';
import { CollectorSchedulerService } from '../application/collector-scheduler.service.js';
import { sendSuccess, sendCreated, sendDeleted, sendFailure } from '../../../api/http-response.js';

export class CollectorController {
  constructor(
    private collectorService: CollectorService,
    private schedulerService?: CollectorSchedulerService
  ) {}

  // ──────────────────────────── Data Sources ────────────────────────────

  listDataSources = async (_req: Request, res: Response): Promise<void> => {
    try {
      const sources = await this.collectorService.listDataSources();
      sendSuccess(res, 200, 'Data sources retrieved successfully', sources);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  createDataSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, source_type, auth_config } = req.body;
      if (!name || !source_type) {
        sendFailure(res, 400, 'Name and source_type are required', 'BAD_REQUEST');
        return;
      }
      const source = await this.collectorService.createDataSource({
        name,
        source_type,
        auth_config: auth_config || {},
      });
      sendSuccess(res, 201, 'Data source created successfully', source);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  updateDataSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.collectorService.updateDataSource(id, req.body);
      sendSuccess(res, 200, 'Data source updated successfully', updated);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  deleteDataSource = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.collectorService.deleteDataSource(id);
      sendDeleted(res, 'Data source deleted successfully');
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  testConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { source_id, username, password, baseUrl } = req.body;
      const overrideCreds = username && password ? { username, password, baseUrl } : undefined;
      const result = await this.collectorService.testConnection(source_id, overrideCreds);
      sendSuccess(res, 200, result.message, result);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  // ──────────────────────────── Live Blueprint Preview & Direct Sync ────────────────────────────

  previewBlueprint = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password, baseUrl, month } = req.body;
      if (!username || !password) {
        sendFailure(res, 400, 'Username and password are required', 'BAD_REQUEST');
        return;
      }
      const summary = await this.collectorService.previewBlueprint(
        { username, password, baseUrl },
        month || '2026-09'
      );
      sendSuccess(res, 200, 'Blueprint attendance retrieved successfully', summary);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  previewBlueprintTeamAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
      let { username, password, baseUrl, teamId, fromDate, toDate, employeeName } = req.body;
      if (!username || !password) {
        const saved = await this.collectorService.getBlueprintConfig();
        username = username || saved?.username || 'kyluong';
        password = password || saved?.password || '19901991';
        baseUrl = baseUrl || saved?.baseUrl;
      }
      if (!username || !password) {
        sendFailure(res, 400, 'Username and password are required', 'BAD_REQUEST');
        return;
      }
      const summary = await this.collectorService.previewBlueprintTeamAttendance(
        { username, password, baseUrl },
        teamId,
        fromDate,
        toDate,
        employeeName
      );
      sendSuccess(res, 200, 'Blueprint team attendance retrieved successfully', summary);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  syncBlueprintTeamAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.collectorService.syncBlueprintTeamAttendance(req.body);
      sendSuccess(res, 200, 'Team attendance synchronized to KPI #18 successfully', result);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  getBlueprintTeams = async (_req: Request, res: Response): Promise<void> => {
    try {
      const teams = await this.collectorService.getBlueprintTeams();
      sendSuccess(res, 200, 'Danh sách Team quản lý tải thành công', teams);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  previewBlueprintTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      let { username, password, baseUrl, projectFilter, member, fromDate, toDate, filterRole, dateType } = req.body;
      if (!username || !password) {
        const saved = await this.collectorService.getBlueprintConfig();
        username = username || saved?.username || 'khoadang';
        password = password || saved?.password || 'Khoa@69';
        baseUrl = baseUrl || saved?.baseUrl;
      }
      if (!username || !password) {
        sendFailure(res, 400, 'Username and password are required', 'BAD_REQUEST');
        return;
      }
      const tasksSummary = await this.collectorService.previewBlueprintTasks(
        { username, password, baseUrl },
        projectFilter || 'Allegro NX',
        member,
        fromDate,
        toDate,
        filterRole || 'requester',
        dateType
      );
      sendSuccess(res, 200, 'Blueprint tasks retrieved successfully', tasksSummary);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  getBlueprintMembers = async (_req: Request, res: Response): Promise<void> => {
    try {
      const members = await this.collectorService.getBlueprintMembers();
      sendSuccess(res, 200, 'Danh sách thành viên Blueprint tải thành công', members);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  syncBlueprintAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.collectorService.syncBlueprintAttendance(req.body);
      sendSuccess(res, 200, 'Attendance synchronized to KPI #18 successfully', result);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  syncBlueprintTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.collectorService.syncBlueprintTasks(req.body);
      sendSuccess(res, 200, 'Tasks synchronized to KPI #1 successfully', result);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  previewBlueprintVacation = async (req: Request, res: Response): Promise<void> => {
    try {
      let { username, password, baseUrl, year, member } = req.body;
      if (!username || !password) {
        const saved = await this.collectorService.getBlueprintConfig();
        username = username || saved?.username || 'khoadang';
        password = password || saved?.password || 'Khoa@69';
        baseUrl = baseUrl || saved?.baseUrl;
      }
      if (!username || !password) {
        sendFailure(res, 400, 'Username and password are required', 'BAD_REQUEST');
        return;
      }
      const summary = await this.collectorService.previewBlueprintVacation(
        { username, password, baseUrl },
        year || '2026',
        member
      );
      sendSuccess(res, 200, 'Blueprint vacation & discipline retrieved successfully', summary);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  syncBlueprintVacation = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.collectorService.syncBlueprintVacation(req.body);
      sendSuccess(res, 200, 'Vacation & discipline synchronized to KPI successfully', result);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  syncAllBlueprint = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.collectorService.syncAllBlueprint(req.body);
      sendSuccess(res, 200, 'Tất cả KPI (Điểm danh & Task) đã được đồng bộ thành công', result);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  getBlueprintConfig = async (_req: Request, res: Response): Promise<void> => {
    try {
      const config = await this.collectorService.getBlueprintConfig();
      sendSuccess(res, 200, 'Cấu hình Blueprint đã tải thành công', config);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  saveBlueprintConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const config = await this.collectorService.saveBlueprintConfig(req.body);
      sendSuccess(res, 200, 'Cấu hình Blueprint đã lưu thành công', config);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  // ──────────────────────────── Jobs ────────────────────────────

  listJobs = async (_req: Request, res: Response): Promise<void> => {
    try {
      const jobs = await this.collectorService.listJobs();
      sendSuccess(res, 200, 'Collector jobs retrieved successfully', jobs);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  createJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const job = await this.collectorService.createJob(req.body);
      if (this.schedulerService) {
        await this.schedulerService.reloadJobs();
      }
      sendSuccess(res, 201, 'Collector job created successfully', job);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  updateJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.collectorService.updateJob(id, req.body);
      if (this.schedulerService) {
        await this.schedulerService.reloadJobs();
      }
      sendSuccess(res, 200, 'Collector job updated successfully', updated);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  deleteJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.collectorService.deleteJob(id);
      if (this.schedulerService) {
        await this.schedulerService.reloadJobs();
      }
      sendDeleted(res, 'Collector job deleted successfully');
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  runJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.collectorService.runJob(id);
      sendSuccess(res, 200, 'Job executed successfully', result);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };

  // ──────────────────────────── Run Logs ────────────────────────────

  listRunLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 30;
      const logs = await this.collectorService.listRunLogs(limit);
      sendSuccess(res, 200, 'Run logs retrieved successfully', logs);
    } catch (err: any) {
      sendFailure(res, 500, err.message, 'INTERNAL_ERROR');
    }
  };
}
