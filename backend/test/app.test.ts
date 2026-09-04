import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { createApp } from '../src/app.js';

describe('GET /health', () => {
  it('returns the standard success envelope', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeTypeOf('string');
    expect(response.body).toMatchObject({
      success: true,
      message: 'Service is healthy.',
      data: { status: 'healthy' }
    });
    expect(response.body.meta.request_id).toBe(response.headers['x-request-id']);
  });

  it('does not query the database', async () => {
    const query = vi.fn();
    const app = createApp({ dbPool: { query } as unknown as Pool });

    await request(app).get('/health');

    expect(query).not.toHaveBeenCalled();
  });
});

describe('GET /health/db', () => {
  it('returns healthy when the database answers a single probe query', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const app = createApp({ dbPool: { query } as unknown as Pool });

    const response = await request(app).get('/health/db');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeTypeOf('string');
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'healthy', database: 'up' }
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns 503 without leaking driver details when the database fails', async () => {
    const query = vi
      .fn()
      .mockRejectedValue(new Error('connect ECONNREFUSED ep-secret-pooler.aws.neon.tech:5432'));
    const app = createApp({ dbPool: { query } as unknown as Pool });

    const response = await request(app).get('/health/db');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.meta.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('neon.tech');
    expect(JSON.stringify(response.body)).not.toContain('ECONNREFUSED');
  });

  it('returns 503 when the app runs without a database pool', async () => {
    const response = await request(createApp()).get('/health/db');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.meta.error.code).toBe('DATABASE_UNAVAILABLE');
  });

  it('does not require authentication', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const app = createApp({ dbPool: { query } as unknown as Pool });

    const response = await request(app).get('/health/db');

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });

  it('rejects non-GET methods with the standard not-found envelope', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const app = createApp({ dbPool: { query } as unknown as Pool });

    const response = await request(app).post('/health/db').send({});

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it('stays stable across repeated probes', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const app = createApp({ dbPool: { query } as unknown as Pool });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app).get('/health/db');
      expect(response.status).toBe(200);
    }

    expect(query).toHaveBeenCalledTimes(5);
  });
});

describe('Swagger Documentation', () => {
  it('GET /api-docs.json returns valid OpenAPI spec', async () => {
    const response = await request(createApp()).get('/api-docs.json');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('openapi', '3.0.0');
    expect(response.body.info.title).toBe('KPI System API');
    expect(response.body.paths).toHaveProperty('/health');
    expect(response.body.paths).toHaveProperty('/health/db');
    expect(response.body.paths).toHaveProperty('/api/auth/login');
    expect(response.body.paths).toHaveProperty('/api/iam/roles');
    expect(response.body.paths).toHaveProperty('/api/employees');
    expect(response.body.paths).toHaveProperty('/api/departments');
    expect(response.body.paths).toHaveProperty('/api/teams');
    expect(response.body.paths).toHaveProperty('/api/job-levels');
    expect(response.body.paths).toHaveProperty('/api/employee-imports');
    expect(response.body.paths).toHaveProperty('/api/v1/configuration/criteria');
  });

  it('GET /api-docs/ returns Swagger UI page', async () => {
    const response = await request(createApp()).get('/api-docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.text).toContain('swagger-ui');
  });
});
