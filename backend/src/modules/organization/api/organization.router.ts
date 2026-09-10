import { Router, RequestHandler } from 'express';
import { OrganizationController } from './organization.controller.js';

export function createOrganizationRouter(
  controller: OrganizationController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  // ── Department Routes ──────────────────────────────────────────────────────
  router.get('/departments', controller.getDepartments);
  router.post('/departments', controller.createDepartment);
  router.post('/departments/bulk-status', controller.bulkUpdateDepartmentStatus);
  router.get('/departments/:id', controller.getDepartmentById);
  router.patch('/departments/:id', controller.updateDepartment);

  // ── Role Routes ────────────────────────────────────────────────────────────
  router.get('/roles', controller.getJobRoles);
  router.post('/roles', controller.createJobRole);
  router.post('/roles/bulk-status', controller.bulkUpdateJobRoleStatus);
  router.get('/roles/:id', controller.getJobRoleById);
  router.patch('/roles/:id', controller.updateJobRole);

  // ── Job Level Routes ───────────────────────────────────────────────────────
  router.get('/job-levels', controller.getJobLevels);
  router.post('/job-levels', controller.createJobLevel);
  router.post('/job-levels/bulk-status', controller.bulkUpdateJobLevelStatus);
  router.get('/job-levels/:id', controller.getJobLevelById);
  router.patch('/job-levels/:id', controller.updateJobLevel);

  return router;
}
