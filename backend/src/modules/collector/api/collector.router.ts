import { Router, RequestHandler } from 'express';
import { CollectorController } from './collector.controller.js';
import { getActorFromContext } from '../../../shared/auth/index.js';

export function createCollectorRouter(
  controller: CollectorController,
  jwtMiddleware?: RequestHandler
): Router {
  const router = Router();

  type PrivilegedRole = 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER';
  const privilegedRoles = new Set<PrivilegedRole>(['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER']);
  const hasPrivilegedRole = (role: string): role is PrivilegedRole => privilegedRoles.has(role as PrivilegedRole);

  const requireCollectorAccess: RequestHandler = (req, res, next) => {
    const actor = req.actor || getActorFromContext(req);
    if (!actor || !actor.userId) {
      res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để sử dụng tính năng thu thập dữ liệu Blueprint SSO.',
      });
      return;
    }
    if (!hasPrivilegedRole(actor.role)) {
      res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối: Chỉ Quản lý (Manager) hoặc Quản trị viên (Admin) mới có quyền sử dụng tính năng thu thập dữ liệu Blueprint SSO.',
      });
      return;
    }
    next();
  };

  const blueprintGuards: RequestHandler[] = jwtMiddleware
    ? [jwtMiddleware, requireCollectorAccess]
    : [requireCollectorAccess];

  // Sources
  router.get('/sources', controller.listDataSources);
  router.post('/sources', controller.createDataSource);
  router.put('/sources/:id', controller.updateDataSource);
  router.delete('/sources/:id', controller.deleteDataSource);
  router.post('/sources/test', controller.testConnection);

  // Live Blueprint Preview & Direct Sync (Protected by Authentication & Role Guard)
  router.post('/blueprint/preview', ...blueprintGuards, controller.previewBlueprint);
  router.post('/blueprint/sync-attendance', ...blueprintGuards, controller.syncBlueprintAttendance);
  router.post('/blueprint/preview-team-attendance', ...blueprintGuards, controller.previewBlueprintTeamAttendance);
  router.post('/blueprint/sync-team-attendance', ...blueprintGuards, controller.syncBlueprintTeamAttendance);
  router.get('/blueprint/teams', ...blueprintGuards, controller.getBlueprintTeams);
  router.post('/blueprint/preview-tasks', ...blueprintGuards, controller.previewBlueprintTasks);
  router.post('/blueprint/sync-tasks', ...blueprintGuards, controller.syncBlueprintTasks);
  router.post('/blueprint/preview-vacation', ...blueprintGuards, controller.previewBlueprintVacation);
  router.post('/blueprint/sync-vacation', ...blueprintGuards, controller.syncBlueprintVacation);
  router.post('/blueprint/sync-all', ...blueprintGuards, controller.syncAllBlueprint);
  router.get('/blueprint/config', ...blueprintGuards, controller.getBlueprintConfig);
  router.post('/blueprint/config', ...blueprintGuards, controller.saveBlueprintConfig);
  router.get('/blueprint/members', ...blueprintGuards, controller.getBlueprintMembers);

  // Jira PIM Collector
  router.get('/jira/members', ...blueprintGuards, controller.getJiraMembers);
  router.get('/jira/projects', ...blueprintGuards, controller.getJiraProjects);
  router.post('/jira/preview-tasks', ...blueprintGuards, controller.previewJiraTasks);
  router.post('/jira/sync-tasks', ...blueprintGuards, controller.syncJiraTasks);

  // Jobs
  router.get('/jobs', controller.listJobs);
  router.post('/jobs', controller.createJob);
  router.put('/jobs/:id', controller.updateJob);
  router.delete('/jobs/:id', controller.deleteJob);
  router.post('/jobs/:id/run', controller.runJob);

  // Logs
  router.get('/logs', controller.listRunLogs);

  return router;
}

