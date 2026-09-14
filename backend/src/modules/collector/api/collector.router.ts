import { Router } from 'express';
import { CollectorController } from './collector.controller.js';

export function createCollectorRouter(controller: CollectorController): Router {
  const router = Router();

  // Sources
  router.get('/sources', controller.listDataSources);
  router.post('/sources', controller.createDataSource);
  router.put('/sources/:id', controller.updateDataSource);
  router.delete('/sources/:id', controller.deleteDataSource);
  router.post('/sources/test', controller.testConnection);

  // Live Blueprint Preview & Direct Sync
  router.post('/blueprint/preview', controller.previewBlueprint);
  router.post('/blueprint/sync-attendance', controller.syncBlueprintAttendance);
  router.post('/blueprint/preview-team-attendance', controller.previewBlueprintTeamAttendance);
  router.post('/blueprint/sync-team-attendance', controller.syncBlueprintTeamAttendance);
  router.get('/blueprint/teams', controller.getBlueprintTeams);
  router.post('/blueprint/preview-tasks', controller.previewBlueprintTasks);
  router.post('/blueprint/sync-tasks', controller.syncBlueprintTasks);
  router.post('/blueprint/preview-vacation', controller.previewBlueprintVacation);
  router.post('/blueprint/sync-vacation', controller.syncBlueprintVacation);
  router.post('/blueprint/sync-all', controller.syncAllBlueprint);
  router.get('/blueprint/config', controller.getBlueprintConfig);
  router.post('/blueprint/config', controller.saveBlueprintConfig);
  router.get('/blueprint/members', controller.getBlueprintMembers);

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
