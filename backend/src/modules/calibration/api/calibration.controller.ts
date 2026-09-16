import { Request, Response, NextFunction } from 'express';
import { CalibrationService } from '../application/calibration.service.js';
import { sendSuccess } from '../../../api/http-response.js';
import { getActorOrThrow } from '../../../shared/auth/actor-context.js';
import { Actor } from '../../../shared/auth/types.js';

export class CalibrationController {
  constructor(private calibrationService: CalibrationService) {}

  private getActor(req: Request): Actor {
    try {
      return getActorOrThrow(req);
    } catch {
      const user = (req as unknown as { user?: { id?: string; userId?: string; role?: string; employeeId?: string; managedTeamIds?: string[] } }).user;
      if (!user) throw new Error('Unauthorized');
      const userId = user.id ?? user.userId;
      if (!userId) throw new Error('Unauthorized: no user id');
      const rawRole = user.role ?? 'EMPLOYEE';
      const validRoles: string[] = ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'];
      return {
        userId,
        role: (validRoles.includes(rawRole) ? rawRole : 'EMPLOYEE') as import('../../../shared/auth/types.js').UserRole,
        employeeId: user.employeeId ?? user.id,
        managedTeamIds: user.managedTeamIds ?? [],
      };
    }
  }

  createSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const session = await this.calibrationService.createSession(req.body, actor);
      sendSuccess(res, 201, 'Phiên hiệu chuẩn điểm (Calibration) đã được khởi tạo thành công.', session);
    } catch (err) {
      next(err);
    }
  };

  getSessionDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const sessionId = req.params.id as string;
      const detail = await this.calibrationService.getSessionDetail(sessionId, actor);
      sendSuccess(res, 200, 'Thông tin phiên hiệu chuẩn điểm được tải thành công.', detail);
    } catch (err) {
      next(err);
    }
  };

  listSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const cycleId = (req.query.cycle_id || req.query.cycleId) as string;
      if (!cycleId) {
        sendSuccess(res, 200, 'Danh sách phiên hiệu chuẩn điểm.', []);
        return;
      }
      const sessions = await this.calibrationService.listSessions(cycleId, actor);
      sendSuccess(res, 200, 'Danh sách phiên hiệu chuẩn điểm tải thành công.', sessions);
    } catch (err) {
      next(err);
    }
  };

  adjustScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const sessionId = req.params.id as string;
      const result = await this.calibrationService.adjustScore(sessionId, req.body, actor);
      sendSuccess(res, 200, 'Điểm số nhân viên đã được hiệu chuẩn thành công.', result);
    } catch (err) {
      next(err);
    }
  };

  finalizeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.getActor(req);
      const sessionId = req.params.id as string;
      const result = await this.calibrationService.finalizeSession(sessionId, actor);
      sendSuccess(res, 200, 'Phiên hiệu chuẩn điểm đã được chốt hoàn tất thành công.', result);
    } catch (err) {
      next(err);
    }
  };
}
