import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { ReviewCadenceController } from '../src/modules/review-cadence/api/review-cadence.controller.js';
import { ReviewCadenceService } from '../src/modules/review-cadence/application/review-cadence.service.js';
import { ReviewCadence } from '../src/modules/review-cadence/domain/review-cadence.types.js';

const cadence: ReviewCadence = {
  id: '00000000-0000-4000-8000-000000000003',
  code: 'QUARTERLY',
  name: 'Quarterly (3 months)',
  intervalMonths: 3,
  isSystemDefault: false,
  active: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
};

describe('ReviewCadenceController response contract (snake_case)', () => {
  it('GET /review-cadences returns interval_months / is_system_default / active', async () => {
    const service = { listCadences: vi.fn(async () => [[cadence], 1]) } as unknown as ReviewCadenceService;
    const controller = new ReviewCadenceController(service);
    const res = { status: vi.fn(), json: vi.fn(), locals: {} };
    res.status.mockReturnValue(res);
    const next = vi.fn();

    await controller.listCadences({ query: {} } as unknown as Request, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    const body = res.json.mock.calls[0]?.[0] as { data: Array<Record<string, unknown>> };
    expect(body.data[0]).toEqual({
      id: cadence.id,
      code: 'QUARTERLY',
      name: 'Quarterly (3 months)',
      interval_months: 3,
      is_system_default: false,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });
    expect(body.data[0]).not.toHaveProperty('intervalMonths');
  });
});
