import { Router, RequestHandler } from 'express';
import { OrganizationController } from './organization.controller.js';
import { TeamFormulaController } from './formula.controller.js';

export function createOrganizationRouter(
  controller: OrganizationController,
  jwtMiddleware: RequestHandler,
  formulaController?: TeamFormulaController
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

  // ── Team & Department Evaluation Formula Routes ────────────────────────────
  if (formulaController) {
    router.get('/formula/categories', formulaController.getCategories);
    router.get('/categories', formulaController.getCategories);
    router.get('/formula/summary', formulaController.getAllFormulasSummary);
    router.get('/formula', formulaController.getGlobalFormula);
    router.put('/formula', formulaController.saveGlobalFormula);
    router.post('/formula/simulate', formulaController.simulate);
    router.get('/departments/:departmentId/formula', formulaController.getDepartmentFormula);
    router.put('/departments/:departmentId/formula', formulaController.saveDepartmentFormula);
    router.delete('/departments/:departmentId/formula', formulaController.resetDepartmentFormula);
    router.get('/teams/:teamId/formula', formulaController.getTeamFormula);
    router.put('/teams/:teamId/formula', formulaController.saveTeamFormula);
    router.delete('/teams/:teamId/formula', formulaController.resetTeamFormula);
  }

  return router;
}

