import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { Pool } from 'pg';
import { createApp } from '../src/app.js';
import { JWTTokenService } from '../src/modules/auth/services/token.service.js';
import { IndividualCycleCreationService } from '../src/modules/evaluation-cycle/application/individual-cycle-creation.service.js';
import { EvaluationCycleStatus, EvaluationCycleType } from '../src/modules/evaluation-cycle/domain/evaluation-cycle.types.js';

const EMPLOYEE_ID = 'a0000000-0000-4000-8000-00000000000a';
const TEMPLATE_VERSION_ID = '10000000-0000-4000-8000-000000000001';

describe('POST /api/evaluation-cycles/individual — routing, validation, RBAC and contract', () => {
  const jwtConfig = { secret: 'test-secret-individual-cycle' };
  const tokenService = new JWTTokenService(jwtConfig);
  const token = (role: 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE') =>
    tokenService.generateAccessToken({ userId: 'b0000000-0000-4000-8000-0000000000ff', role, employeeId: EMPLOYEE_ID });

  const validBody = {
    evaluation_template_version_id: TEMPLATE_VERSION_ID,
    employee_ids: [EMPLOYEE_ID],
    start_date: '2026-09-24',
    end_date: '2026-10-24',
  };

  let app: ReturnType<typeof createApp>;
  let createSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const mockPool = {
      query: vi.fn(async () => ({ rows: [] })),
      connect: vi.fn(async () => ({ query: vi.fn(async () => ({ rows: [] })), release: vi.fn() })),
    } as unknown as Pool;
    app = createApp({ jwtConfig, dbPool: mockPool });
    createSpy = vi.spyOn(IndividualCycleCreationService.prototype, 'createIndividualCycles');
    createSpy.mockReset();
  });

  it('TC-BE-10b: returns 401 without a token', async () => {
    const res = await request(app).post('/api/evaluation-cycles/individual').send(validBody);
    expect(res.status).toBe(401);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('TC-BE-10: returns 403 FORBIDDEN for an EMPLOYEE', async () => {
    const res = await request(app)
      .post('/api/evaluation-cycles/individual')
      .set('Authorization', `Bearer ${token('EMPLOYEE')}`)
      .send(validBody);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.meta.error.code).toBe('FORBIDDEN');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('TC-BE-14: returns 400 VALIDATION_ERROR with field details for invalid payloads', async () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ ...validBody, employee_ids: [] }, 'employee_ids'],
      [{ ...validBody, employee_ids: ['not-a-uuid'] }, 'employee_ids.0'],
      [{ ...validBody, employee_ids: Array.from({ length: 101 }, () => EMPLOYEE_ID) }, 'employee_ids'],
      [{ ...validBody, start_date: '24/09/2026' }, 'start_date'],
      [{ ...validBody, start_date: '2026-10-25' }, 'end_date'],
      [{ ...validBody, evaluation_template_version_id: 'not-a-uuid' }, 'evaluation_template_version_id'],
    ];

    for (const [body, field] of cases) {
      const res = await request(app)
        .post('/api/evaluation-cycles/individual')
        .set('Authorization', `Bearer ${token('HR_ADMIN')}`)
        .send(body);
      expect(res.status).toBe(400);
      expect(res.body.meta.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.meta.error.details.map((d: { field: string }) => d.field)).toContain(field);
    }
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('returns 201 with snake_case created/skipped/warnings for a MANAGER and passes the actor to the service', async () => {
    createSpy.mockResolvedValue({
      created: [
        {
          cycle: {
            evaluationCycleId: 'cycle-1',
            code: 'IND-E-A-20260924-ABCDEF',
            name: 'Individual Review - E-A',
            cycleType: EvaluationCycleType.INDIVIDUAL_SCHEDULED,
            triggeredByEmployeeId: EMPLOYEE_ID,
            startDate: '2026-09-24',
            endDate: '2026-10-24',
            status: EvaluationCycleStatus.OPEN,
            evaluationTemplateVersionId: TEMPLATE_VERSION_ID,
            applicableTeamIds: [],
            applicableRoleIds: [],
            applicableEmployeeIds: [EMPLOYEE_ID],
            approvedBy: null,
            lockedAt: null,
            createdAt: '2026-09-24T00:00:00.000Z',
            updatedAt: '2026-09-24T00:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
          employeeId: EMPLOYEE_ID,
          evaluationId: 'eval-1',
          evaluationItemCount: 18,
        },
      ],
      skipped: [{ employeeId: 'emp-b', reasonCode: 'EVALUATION_ALREADY_OPEN', existingEvaluationId: 'ev-x', existingEvaluationCycleId: 'cy-x' }],
      warnings: [
        {
          code: 'UPCOMING_BATCH_CYCLE',
          employeeId: EMPLOYEE_ID,
          evaluationCycleId: 'batch-1',
          evaluationCycleCode: 'H2-2026',
          evaluationCycleName: '2026 H2',
          startDate: '2026-10-01',
          message: 'Employee E-A is included in batch cycle H2-2026 scheduled to open on 2026-10-01.',
        },
      ],
    });

    const res = await request(app)
      .post('/api/evaluation-cycles/individual')
      .set('Authorization', `Bearer ${token('MANAGER')}`)
      .send({ ...validBody, employee_ids: [EMPLOYEE_ID, EMPLOYEE_ID], name: 'Probation' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.created[0]).toEqual({
      evaluation_cycle: expect.objectContaining({
        id: 'cycle-1',
        cycle_type: 'INDIVIDUAL_SCHEDULED',
        triggered_by_employee_id: EMPLOYEE_ID,
        status: 'OPEN',
        applicable_employee_ids: [EMPLOYEE_ID],
      }),
      employee_id: EMPLOYEE_ID,
      evaluation_id: 'eval-1',
      evaluation_item_count: 18,
    });
    expect(res.body.data.skipped).toEqual([
      { employee_id: 'emp-b', reason_code: 'EVALUATION_ALREADY_OPEN', existing_evaluation_id: 'ev-x', existing_evaluation_cycle_id: 'cy-x' },
    ]);
    expect(res.body.data.warnings[0]).toMatchObject({ code: 'UPCOMING_BATCH_CYCLE', evaluation_cycle_code: 'H2-2026', start_date: '2026-10-01' });
    expect(res.body.meta.request_id).toBeDefined();

    expect(createSpy).toHaveBeenCalledWith(
      {
        name: 'Probation',
        evaluationTemplateVersionId: TEMPLATE_VERSION_ID,
        employeeIds: [EMPLOYEE_ID, EMPLOYEE_ID],
        startDate: '2026-09-24',
        endDate: '2026-10-24',
      },
      expect.objectContaining({ role: 'MANAGER', employeeId: EMPLOYEE_ID })
    );
  });

  it('maps a service 409 EVALUATION_ALREADY_OPEN to the error envelope with details', async () => {
    const { AppError } = await import('../src/api/app-error.js');
    createSpy.mockRejectedValue(
      new AppError(409, 'EVALUATION_ALREADY_OPEN', 'Every selected employee already has an active evaluation.', 'employee_ids', [
        { field: 'employee_ids', code: 'EVALUATION_ALREADY_OPEN', message: EMPLOYEE_ID },
      ])
    );

    const res = await request(app)
      .post('/api/evaluation-cycles/individual')
      .set('Authorization', `Bearer ${token('HR_ADMIN')}`)
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.meta.error.code).toBe('EVALUATION_ALREADY_OPEN');
    expect(res.body.meta.error.details).toEqual([{ field: 'employee_ids', code: 'EVALUATION_ALREADY_OPEN', message: EMPLOYEE_ID }]);
  });

  it('accepts the Review Due Dashboard request shape (template_version_id alias, optional template)', async () => {
    createSpy.mockResolvedValue({ created: [], skipped: [], warnings: [] });
    const { evaluation_template_version_id: _omitted, ...withoutTemplate } = validBody;

    const aliased = await request(app)
      .post('/api/evaluation-cycles/individual')
      .set('Authorization', `Bearer ${token('HR_ADMIN')}`)
      .send({ ...withoutTemplate, template_version_id: TEMPLATE_VERSION_ID });
    expect(aliased.status).toBe(201);
    expect(createSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ evaluationTemplateVersionId: TEMPLATE_VERSION_ID }),
      expect.anything()
    );

    const defaulted = await request(app)
      .post('/api/evaluation-cycles/individual')
      .set('Authorization', `Bearer ${token('HR_ADMIN')}`)
      .send(withoutTemplate);
    expect(defaulted.status).toBe(201);
    expect(createSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ evaluationTemplateVersionId: undefined }),
      expect.anything()
    );
  });

  it('TC-BE-13: batch open cycle route still requires HR_ADMIN or SYSTEM_ADMIN', async () => {
    const res = await request(app)
      .post('/api/evaluation-cycles/c0000000-0000-4000-8000-000000000001/open')
      .set('Authorization', `Bearer ${token('MANAGER')}`)
      .send({});
    expect(res.status).toBe(403);
  });
});
