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
    authorize(authzService, 'VIEW_REPORT', 'SELF'),
    controller.getEmployeeReport
  );

  // Team Report (Scope: TEAM)
  router.get(
    '/teams/:teamId',
    authorize(authzService, 'VIEW_REPORT', 'TEAM'),
    controller.getTeamReport
  );

  // KPI Team Report (Scope: TEAM)
  router.get(
    '/kpi/team/:teamId',
    authorize(authzService, 'VIEW_REPORT', 'TEAM'),
    controller.getTeamKpiReport
  );

  // KPI Trend Report (Team scope required for MVP, but can be adapted)
  // The query should include teamId if it's a team trend, or employeeId if it's employee trend.
  // For safety, we will restrict it to TEAM scope assuming manager accesses it,
  // or it could be checked dynamically based on query parameters.
  // We'll use TEAM scope as default for team managers accessing trends.
  router.get(
    '/kpi/trend',
    authorize(authzService, 'VIEW_REPORT', 'TEAM'),
    controller.getKpiTrend
  );

  // Organization Report (Scope: ORGANIZATION)
  router.get(
    '/organization',
    authorize(authzService, 'VIEW_REPORT', 'ORGANIZATION'),
    controller.getOrganizationReport
  );

  return router;
}
