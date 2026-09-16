import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { authorize } from '../../iam/presentation/authorize.middleware.js';
import { AuthorizationService } from '../../iam/application/services.js';

export function createReportsRouter(
  controller: ReportsController,
  authzService: AuthorizationService
): Router {
  const router = Router();

  // Employee Report (Scope: SELF)
  router.get(
    '/employees/:employeeId',
    authorize(authzService, 'report:self', 'SELF'),
    controller.getEmployeeReport
  );

  // Team Report (Scope: TEAM)
  router.get(
    '/teams/:teamId',
    authorize(authzService, 'report:team', 'TEAM'),
    controller.getTeamReport
  );

  // KPI Team Report (Scope: TEAM)
  router.get(
    '/kpi/team/:teamId',
    authorize(authzService, 'report:team', 'TEAM'),
    controller.getTeamKpiReport
  );

  // KPI Trend Report (Team scope required for MVP, but can be adapted)
  router.get(
    '/kpi/trend',
    authorize(authzService, 'report:team', 'TEAM'),
    controller.getKpiTrend
  );

  // Organization Report (Scope: ORGANIZATION)
  router.get(
    '/organization',
    authorize(authzService, 'report:organization', 'ORGANIZATION'),
    controller.getOrganizationReport
  );

  // KPI Summary Dashboard (Scope enforced server-side in application service)
  router.get(
    '/employees/:employeeId/kpi-summary',
    controller.getEmployeeKpiSummary
  );

  // KPI Detail Drill-Down (Scope enforced server-side in application service)
  router.get(
    '/employees/:employeeId/kpi-summary/:evaluationItemId',
    controller.getEmployeeKpiDetail
  );

  return router;
}
