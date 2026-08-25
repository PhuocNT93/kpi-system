import request from 'supertest';
import { describe, expect, it } from 'vitest';
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
});

describe('Swagger Documentation', () => {
  it('GET /api-docs.json returns valid OpenAPI spec', async () => {
    const response = await request(createApp()).get('/api-docs.json');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('openapi', '3.0.0');
    expect(response.body.info.title).toBe('KPI System API');
    expect(response.body.paths).toHaveProperty('/health');
    expect(response.body.paths).toHaveProperty('/api/auth/login');
    expect(response.body.paths).toHaveProperty('/api/iam/roles');
  });

  it('GET /api-docs/ returns Swagger UI page', async () => {
    const response = await request(createApp()).get('/api-docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.text).toContain('swagger-ui');
  });
});
