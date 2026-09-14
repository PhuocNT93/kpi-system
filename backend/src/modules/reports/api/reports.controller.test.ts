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
    getOrganizationReport: Mock;
  };

  beforeEach(() => {
    queryServiceMock = {
      getEmployeeReport: vi.fn(),
      getTeamReport: vi.fn(),
      getOrganizationReport: vi.fn(),
    };

    const controller = new ReportsController(queryServiceMock as unknown as ReportsQueryService);
    const router = createReportsRouter(controller);

    app = express();
    app.use(express.json());
    app.use('/reports', router);
    // basic error handler to avoid console spew
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        res.status(err.status || 400).json({ success: false, message: err.message });
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

    const res = await request(app).get('/reports/employees/emp-1?cycleId=cycle-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.score.final_score).toBe(95);
  });

  it('GET /reports/teams/:id should return team report', async () => {
    queryServiceMock.getTeamReport.mockResolvedValue({
      aggregate: { team_average_score: 90 },
      kpis: [],
    });

    const res = await request(app).get('/reports/teams/team-1?cycleId=cycle-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.aggregate.team_average_score).toBe(90);
  });

  it('GET /reports/employees/:id should fail if cycleId is missing', async () => {
    const res = await request(app).get('/reports/employees/emp-1');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('cycleId is required');
  });
});
