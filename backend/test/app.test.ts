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
