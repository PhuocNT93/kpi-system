import { Router } from 'express';
import { ReportsController } from './reports.controller.js';

export function createReportsRouter(controller: ReportsController): Router {
  const router = Router();

  // Scope checking should be implemented in middlewares or inside the controller
  // Since we require strict backend scope verification, we assume the JWT auth middleware
  // already populates req.user. We will add a simple placeholder scope middleware if needed.

  router.get('/employees/:employeeId', controller.getEmployeeReport);
  router.get('/teams/:teamId', controller.getTeamReport);
  router.get('/organization', controller.getOrganizationReport);

  return router;
}
