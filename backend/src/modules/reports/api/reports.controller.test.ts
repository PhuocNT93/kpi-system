import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ReportsController } from './reports.controller.js';
import { createReportsRouter } from './reports.router.js';
import { ReportsQueryService } from '../application/reports-query.service.js';
import { AppError } from '../../../api/app-error.js';

describe('ReportsController API', () => {
  let app: express.Express;
  let queryServiceMock: {
    getEmployeeReport: Mock;
    getTeamReport: Mock;
    getTeamKpiReport: Mock;
    getKpiTrend: Mock;
    getOrganizationReport: Mock;
  };

  beforeEach(() => {
    queryServiceMock = {
      getEmployeeReport: vi.fn(),
      getTeamReport: vi.fn(),
      getTeamKpiReport: vi.fn(),
      getKpiTrend: vi.fn(),
      getOrganizationReport: vi.fn(),
    };

    const authzServiceMock = {
      authorize: vi.fn().mockResolvedValue(true),
    };

    const controller = new ReportsController(queryServiceMock as unknown as ReportsQueryService);
    const router = createReportsRouter(controller, authzServiceMock as unknown as import('../../iam/application/services.js').AuthorizationService);

    app = express();
    app.use(express.json());
    
    // Inject mock context
    app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
      (req as express.Request & { actor: { userId: string; role: string } }).actor = { userId: 'user-1', role: 'SYSTEM_ADMIN' };
      next();
    });

    app.use('/reports', router);
    // basic error handler to avoid console spew
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        res.status(err.status || 400).json({ success: false, message: err.message });
      } else if ((err as Error).name === 'ZodError') {
        res.status(400).json({ success: false, message: 'Validation Error' });
      } else {
        res.status(500).json({ success: false, message: 'Internal error' });
      }
    });
  });

  it('GET /reports/employees/:id should return employee report', async () => {
    queryServiceMock.getEmployeeReport.mockResolvedValue({
      score: { final_score: 95 },
      kpis: [],
    });

    const res = await request(app).get('/reports/employees/123e4567-e89b-12d3-a456-426614174000?cycleId=123e4567-e89b-12d3-a456-426614174001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.score.final_score).toBe(95);
  });

  it('GET /reports/teams/:id should return team report', async () => {
    queryServiceMock.getTeamReport.mockResolvedValue({
      aggregate: { team_average_score: 90 },
      kpis: [],
    });

    const res = await request(app).get('/reports/teams/123e4567-e89b-12d3-a456-426614174002?cycleId=123e4567-e89b-12d3-a456-426614174001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.aggregate.team_average_score).toBe(90);
  });

  it('GET /reports/employees/:id should fail if cycleId is missing', async () => {
    const res = await request(app).get('/reports/employees/123e4567-e89b-12d3-a456-426614174000');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation Error');
  });

  it('GET /reports/kpi/team/:id should return team KPI report', async () => {
    queryServiceMock.getTeamKpiReport.mockResolvedValue([
      { criterion_code: 'KPI01', criterion_name: 'Code Quality', kpi_score: 9.5 }
    ]);

    const res = await request(app).get('/reports/kpi/team/123e4567-e89b-12d3-a456-426614174002?cycleId=123e4567-e89b-12d3-a456-426614174001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data[0].kpi_score).toBe(9.5);
  });

  it('GET /reports/kpi/trend should return cross-cycle KPI trend', async () => {
    queryServiceMock.getKpiTrend.mockResolvedValue([
      { kpi_code: 'KPI01', status: 'MATCHED', previous_score: 8, current_score: 9, delta: 1 }
    ]);

    const res = await request(app).get('/reports/kpi/trend?currentCycleId=123e4567-e89b-12d3-a456-426614174001&previousCycleId=123e4567-e89b-12d3-a456-426614174003&teamId=123e4567-e89b-12d3-a456-426614174002');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data[0].delta).toBe(1);
    expect(res.body.data.data[0].status).toBe('MATCHED');
  });

  it('GET /reports/kpi/trend should fail if required query parameters are missing', async () => {
    const res = await request(app).get('/reports/kpi/trend?currentCycleId=123e4567-e89b-12d3-a456-426614174001');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Validation Error');
  });

  it('GET /reports/organization should return organization aggregate report', async () => {
    queryServiceMock.getOrganizationReport.mockResolvedValue([
      { employee_count: 100, completed_employee_count: 80, completion_rate: 80, average_score: 90 }
    ]);

    const res = await request(app).get('/reports/organization?cycleId=123e4567-e89b-12d3-a456-426614174001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data[0].completion_rate).toBe(80);
  });
});
