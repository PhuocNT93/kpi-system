import { describe, it, expect, vi } from 'vitest';
import { IndividualCycleCreationService } from '../src/modules/evaluation-cycle/application/individual-cycle-creation.service.js';
import { EvaluationGenerationService } from '../src/modules/evaluation-cycle/application/evaluation-generation.service.js';
import { EvaluationCycleOpeningService } from '../src/modules/evaluation-cycle/application/evaluation-cycle-opening.service.js';
import { EvaluationCycleTransitionService } from '../src/modules/evaluation-cycle/application/evaluation-cycle-transition.service.js';
import {
  EvaluationCycleStatus,
  EvaluationCycleType,
  EvaluationCycle,
} from '../src/modules/evaluation-cycle/domain/evaluation-cycle.types.js';
import {
  isEmployeeInApplicableScope,
  buildApplicableEmployeeConditions,
} from '../src/modules/evaluation-cycle/domain/applicable-employee-filter.js';
import type { AuditService } from '../src/modules/audit/application/audit.service.js';
import type { Actor } from '../src/shared/auth/types.js';
import type { BusinessDateWindow } from '../src/config/evaluation-cycle.config.js';
import {
  IDS,
  buildCycle,
  createFakeDb,
  createRecordingCycleRepo,
  createRecordingEvaluationRepo,
  createRecordingItemRepo,
  employeeRow,
  FixtureOptions,
} from './mocks/evaluation-generation-fixture.js';

const hrActor: Actor = { userId: IDS.actorUser, role: 'HR_ADMIN', employeeId: IDS.actorEmployee };
const window: BusinessDateWindow = { fromDate: '2026-09-24', toDate: '2026-10-22' };

const baseCommand = {
  evaluationTemplateVersionId: IDS.templateVersion,
  startDate: '2026-09-24',
  endDate: '2026-10-24',
};

function buildHarness(fixture: FixtureOptions, options: { failItemInsertOnCall?: number } = {}) {
  const db = createFakeDb(fixture);
  const cycles = createRecordingCycleRepo();
  const evaluations = createRecordingEvaluationRepo();
  const items = createRecordingItemRepo({ failOnCall: options.failItemInsertOnCall });
  const audit = { record: vi.fn(async () => undefined) };
  const generation = new EvaluationGenerationService(evaluations.repo, items.repo);
  const prepareSpy = vi.spyOn(generation, 'prepareTemplateSnapshot');
  const service = new IndividualCycleCreationService(
    db.pool,
    cycles.repo,
    evaluations.repo,
    generation,
    audit as unknown as AuditService,
    () => window
  );
  return { db, cycles, evaluations, items, audit, generation, prepareSpy, service };
}

const lockedABC = [
  employeeRow(IDS.empA, 'E-A'),
  employeeRow(IDS.empB, 'E-B', { team_id: IDS.teamB, role_id: IDS.roleQa }),
  employeeRow(IDS.empC, 'E-C'),
];

describe('IndividualCycleCreationService — POST /evaluation-cycles/individual', () => {
  it('TC-BE-01 / TC-BE-17: creates one OPEN INDIVIDUAL_SCHEDULED cycle, evaluation, items and audit for one employee', async () => {
    const h = buildHarness({ lockedEmployees: [lockedABC[0]!] });

    const result = await h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA] }, hrActor);

    expect(h.cycles.created).toHaveLength(1);
    const cycle = h.cycles.created[0]!;
    expect(cycle).toMatchObject({
      cycleType: EvaluationCycleType.INDIVIDUAL_SCHEDULED,
      triggeredByEmployeeId: IDS.empA,
      status: EvaluationCycleStatus.OPEN,
      applicableEmployeeIds: [IDS.empA],
      applicableTeamIds: [],
      applicableRoleIds: [],
      evaluationTemplateVersionId: IDS.templateVersion,
      startDate: '2026-09-24',
      endDate: '2026-10-24',
      name: 'Individual Review - E-A',
      createdBy: IDS.actorEmployee,
    });
    expect(cycle.code).toMatch(/^IND-E-A-20260924-[0-9A-F]{6}$/);

    expect(h.evaluations.payloads).toEqual([[expect.objectContaining({ evaluationCycleId: 'cycle-1', employeeId: IDS.empA, status: 'OPEN' })]]);
    expect(h.items.payloads[0]).toHaveLength(2);

    expect(h.audit.record).toHaveBeenCalledTimes(1);
    expect(h.audit.record).toHaveBeenCalledWith(h.db.client, {
      entityType: 'EVALUATION_CYCLE',
      entityId: 'cycle-1',
      action: 'INDIVIDUAL_CYCLE_CREATED',
      newValue: JSON.stringify({
        cycle_type: 'INDIVIDUAL_SCHEDULED',
        status: 'OPEN',
        triggered_by_employee_id: IDS.empA,
        evaluation_id: result.created[0]!.evaluationId,
        evaluation_item_count: 2,
        template_version_id: IDS.templateVersion,
        start_date: '2026-09-24',
        end_date: '2026-10-24',
      }),
      performedBy: IDS.actorUser,
      source: 'API',
    });

    expect(result.created).toEqual([
      expect.objectContaining({ employeeId: IDS.empA, evaluationItemCount: 2, cycle: expect.objectContaining({ evaluationCycleId: 'cycle-1' }) }),
    ]);
    expect(result.skipped).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(h.db.queries.at(-1)?.sql).toBe('COMMIT');
  });

  it('TC-BE-02: creates one cycle per employee and prepares the template only once', async () => {
    const h = buildHarness({ lockedEmployees: lockedABC });

    const result = await h.service.createIndividualCycles(
      { ...baseCommand, name: 'Probation review', employeeIds: [IDS.empA, IDS.empB, IDS.empC] },
      hrActor
    );

    expect(result.created.map((c) => c.employeeId)).toEqual([IDS.empA, IDS.empB, IDS.empC]);
    expect(h.cycles.created.map((c) => c.triggeredByEmployeeId)).toEqual([IDS.empA, IDS.empB, IDS.empC]);
    expect(h.cycles.created.map((c) => c.name)).toEqual(['Probation review - E-A', 'Probation review - E-B', 'Probation review - E-C']);
    expect(h.evaluations.payloads.map((p) => p.length)).toEqual([1, 1, 1]);
    expect(h.audit.record).toHaveBeenCalledTimes(3);
    expect(h.prepareSpy).toHaveBeenCalledTimes(1);
  });

  it('TC-BE-03a: skips an employee with an active evaluation and still creates the others', async () => {
    const h = buildHarness({
      lockedEmployees: lockedABC.slice(0, 2),
      activeEvaluations: [{ evaluation_id: 'ev-open', evaluation_cycle_id: 'cy-open', employee_id: IDS.empA, status: 'SELF_ASSESSMENT' }],
    });

    const result = await h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA, IDS.empB] }, hrActor);

    expect(result.created.map((c) => c.employeeId)).toEqual([IDS.empB]);
    expect(result.skipped).toEqual([
      { employeeId: IDS.empA, reasonCode: 'EVALUATION_ALREADY_OPEN', existingEvaluationId: 'ev-open', existingEvaluationCycleId: 'cy-open' },
    ]);
    expect(h.cycles.created.map((c) => c.triggeredByEmployeeId)).toEqual([IDS.empB]);
    expect(h.audit.record).toHaveBeenCalledTimes(1);
  });

  it('TC-BE-03b: rejects with 409 EVALUATION_ALREADY_OPEN when every employee is skipped, writing nothing', async () => {
    const h = buildHarness({
      lockedEmployees: lockedABC.slice(0, 2),
      activeEvaluations: [
        { evaluation_id: 'ev-1', evaluation_cycle_id: 'cy-1', employee_id: IDS.empA, status: 'OPEN' },
        { evaluation_id: 'ev-2', evaluation_cycle_id: 'cy-2', employee_id: IDS.empB, status: 'CALIBRATION' },
      ],
    });

    await expect(
      h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA, IDS.empB] }, hrActor)
    ).rejects.toMatchObject({
      status: 409,
      code: 'EVALUATION_ALREADY_OPEN',
      details: [
        { field: 'employee_ids', code: 'EVALUATION_ALREADY_OPEN', message: IDS.empA },
        { field: 'employee_ids', code: 'EVALUATION_ALREADY_OPEN', message: IDS.empB },
      ],
    });
    expect(h.cycles.repo.create).not.toHaveBeenCalled();
    expect(h.evaluations.repo.batchCreate).not.toHaveBeenCalled();
    expect(h.audit.record).not.toHaveBeenCalled();
    expect(h.db.queries.at(-1)?.sql).toBe('ROLLBACK');
  });

  it('TC-BE-04: deduplicates repeated employee ids', async () => {
    const h = buildHarness({ lockedEmployees: lockedABC.slice(0, 2) });

    const result = await h.service.createIndividualCycles(
      { ...baseCommand, employeeIds: [IDS.empA, IDS.empA, IDS.empB] },
      hrActor
    );

    expect(h.evaluations.repo.lockEmployeesForEvaluation).toHaveBeenCalledWith([IDS.empA, IDS.empB], h.db.client);
    expect(h.evaluations.repo.findActiveEvaluationsByEmployees).toHaveBeenCalledWith([IDS.empA, IDS.empB], h.db.client);
    expect(result.created).toHaveLength(2);
    expect(h.cycles.created).toHaveLength(2);
  });

  it('TC-BE-05 / TC-BE-06: returns one non-blocking warning per (employee, upcoming batch cycle)', async () => {
    const upcoming = { evaluationCycleId: IDS.batchCycle, code: 'H2-2026', name: '2026 H2', startDate: '2026-10-04', applicableTeamIds: [IDS.teamA] };
    const h = buildHarness({
      lockedEmployees: lockedABC.slice(0, 2),
      // The same batch cycle reported twice must still yield a single warning.
      upcomingBatchCycles: [upcoming, upcoming],
    });

    const result = await h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA, IDS.empB] }, hrActor);

    expect(result.created).toHaveLength(2);
    expect(result.warnings).toEqual([
      {
        code: 'UPCOMING_BATCH_CYCLE',
        employeeId: IDS.empA,
        evaluationCycleId: IDS.batchCycle,
        evaluationCycleCode: 'H2-2026',
        evaluationCycleName: '2026 H2',
        startDate: '2026-10-04',
        message: 'Employee E-A is included in batch cycle H2-2026 scheduled to open on 2026-10-04.',
      },
    ]);
    expect(h.cycles.repo.findUpcomingBatchCycles).toHaveBeenCalledWith('2026-09-24', '2026-10-22', h.db.client);
  });

  it('TC-BE-05b: no warning when no DRAFT batch cycle falls within the window', async () => {
    const h = buildHarness({ lockedEmployees: [lockedABC[0]!], upcomingBatchCycles: [] });

    const result = await h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA] }, hrActor);

    expect(result.warnings).toEqual([]);
    const upcomingQuery = h.db.queries.find((q) => q.sql.includes('FROM evaluation_cycle WHERE cycle_type = $1'));
    expect(upcomingQuery?.params).toEqual(['BATCH', 'DRAFT', '2026-09-24', '2026-10-22']);
  });

  it('TC-BE-07: individual snapshots are built by the same logic as the batch open cycle', async () => {
    const assignments = [
      { employee_id: IDS.empA, team_id: IDS.historicalTeam, role_id: IDS.roleQa, job_level_id: IDS.level, manager_id: IDS.manager },
    ];
    const individual = buildHarness({ lockedEmployees: [lockedABC[0]!], assignments });
    await individual.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA] }, hrActor);

    const batchDb = createFakeDb({ batchEmployees: [lockedABC[0]!], assignments });
    const batchEvaluations = createRecordingEvaluationRepo();
    const batchItems = createRecordingItemRepo();
    const batch = new EvaluationCycleOpeningService(
      batchDb.pool,
      createRecordingCycleRepo(buildCycle({ startDate: '2026-09-24' })).repo,
      new EvaluationGenerationService(batchEvaluations.repo, batchItems.repo),
      new EvaluationCycleTransitionService()
    );
    await batch.openCycle(IDS.batchCycle, IDS.actorEmployee);

    const withoutIds = <T extends { evaluationId?: string; evaluationCycleId?: string }>(rows: T[]) =>
      rows.map(({ evaluationId: _evaluationId, evaluationCycleId: _evaluationCycleId, ...rest }) => rest);

    expect(withoutIds(individual.evaluations.payloads[0]!)).toEqual(withoutIds(batchEvaluations.payloads[0]!));
    expect(withoutIds(individual.items.payloads[0]!)).toEqual(withoutIds(batchItems.payloads[0]!));
    // Snapshot uses the historical assignment effective at start_date.
    expect(individual.evaluations.payloads[0]![0]).toMatchObject({ teamIdSnapshot: IDS.historicalTeam, roleIdSnapshot: IDS.roleQa });
    const assignmentQuery = individual.db.queries.find((q) => q.sql.includes('FROM employee_assignment'));
    expect(assignmentQuery?.params).toEqual([[IDS.empA], '2026-09-24']);
  });

  it('TC-BE-09: rolls back everything when an evaluation item insert fails part-way', async () => {
    const h = buildHarness({ lockedEmployees: lockedABC.slice(0, 2) }, { failItemInsertOnCall: 2 });

    await expect(
      h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA, IDS.empB] }, hrActor)
    ).rejects.toThrow('simulated evaluation_item insert failure');

    // The first employee's cycle and audit were written inside the transaction that is now rolled back.
    const statements = h.db.queries.map((q) => q.sql);
    expect(statements[0]).toBe('BEGIN');
    expect(statements.at(-1)).toBe('ROLLBACK');
    expect(statements).not.toContain('COMMIT');
    expect(h.audit.record).toHaveBeenCalledTimes(1);
    expect(h.audit.record.mock.calls[0]![0]).toBe(h.db.client);
  });

  it('TC-BE-10: rejects an EMPLOYEE actor with 403 before touching the database', async () => {
    const h = buildHarness({ lockedEmployees: lockedABC });

    await expect(
      h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA] }, { userId: 'u-emp', role: 'EMPLOYEE', employeeId: IDS.empA })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(h.db.queries).toHaveLength(0);
  });

  it('TC-BE-11: rejects a MANAGER targeting an employee outside the managed teams, creating nothing', async () => {
    const h = buildHarness({ lockedEmployees: lockedABC.slice(0, 2) });
    const manager: Actor = { userId: 'u-mgr', role: 'MANAGER', employeeId: IDS.manager, managedTeamIds: [IDS.teamA] };

    await expect(
      h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA, IDS.empB] }, manager)
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(h.cycles.repo.create).not.toHaveBeenCalled();
    expect(h.db.queries.at(-1)?.sql).toBe('ROLLBACK');
  });

  it('TC-BE-11: allows a MANAGER for employees of the managed team', async () => {
    const h = buildHarness({ lockedEmployees: [lockedABC[0]!] });
    const manager: Actor = { userId: 'u-mgr', role: 'MANAGER', employeeId: IDS.manager, managedTeamIds: [IDS.teamA] };

    const result = await h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA] }, manager);

    expect(result.created).toHaveLength(1);
  });

  it('TC-BE-11b: HR_ADMIN and SYSTEM_ADMIN are organisation-wide', async () => {
    for (const role of ['HR_ADMIN', 'SYSTEM_ADMIN'] as const) {
      const h = buildHarness({ lockedEmployees: [lockedABC[1]!] });
      const result = await h.service.createIndividualCycles(
        { ...baseCommand, employeeIds: [IDS.empB] },
        { userId: IDS.actorUser, role, employeeId: IDS.actorEmployee, managedTeamIds: [] }
      );
      expect(result.created).toHaveLength(1);
    }
  });

  it('TC-BE-12: locks employee rows before checking active evaluations and before any insert', async () => {
    const h = buildHarness({ lockedEmployees: lockedABC.slice(0, 2) });

    await h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empB, IDS.empA] }, hrActor);

    const lockOrder = vi.mocked(h.evaluations.repo.lockEmployeesForEvaluation).mock.invocationCallOrder[0]!;
    const activeOrder = vi.mocked(h.evaluations.repo.findActiveEvaluationsByEmployees).mock.invocationCallOrder[0]!;
    const createOrder = vi.mocked(h.cycles.repo.create).mock.invocationCallOrder[0]!;
    expect(lockOrder).toBeLessThan(activeOrder);
    expect(activeOrder).toBeLessThan(createOrder);
    expect(h.db.queries[0]?.sql).toBe('BEGIN');
  });

  it('TC-BE-15: returns 404 for unknown employees and 422 EMPLOYEE_NOT_ELIGIBLE for inactive or unassigned ones', async () => {
    const unknown = buildHarness({ lockedEmployees: [] });
    await expect(
      unknown.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA] }, hrActor)
    ).rejects.toMatchObject({ status: 404, code: 'RESOURCE_NOT_FOUND', details: [expect.objectContaining({ message: IDS.empA })] });

    const ineligible = buildHarness({
      lockedEmployees: [
        employeeRow(IDS.empA, 'E-A', { employment_status: 'INACTIVE' }),
        employeeRow(IDS.empB, 'E-B', { team_id: null }),
      ],
    });
    await expect(
      ineligible.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA, IDS.empB] }, hrActor)
    ).rejects.toMatchObject({
      status: 422,
      code: 'EMPLOYEE_NOT_ELIGIBLE',
      details: [
        { field: 'employee_ids', code: 'EMPLOYEE_NOT_ACTIVE', message: IDS.empA },
        { field: 'employee_ids', code: 'EMPLOYEE_MISSING_TEAM_OR_ROLE', message: IDS.empB },
      ],
    });
    expect(ineligible.cycles.repo.create).not.toHaveBeenCalled();
  });

  it('TC-BE-16: rejects an unpublished template or invalid weights like the batch flow', async () => {
    const draft = buildHarness({ lockedEmployees: [lockedABC[0]!], templateStatus: 'DRAFT' });
    await expect(
      draft.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA] }, hrActor)
    ).rejects.toMatchObject({ status: 422, code: 'TEMPLATE_NOT_PUBLISHED' });

    const weights = buildHarness({ lockedEmployees: [lockedABC[0]!], kpiWeights: [100, 10] });
    await expect(
      weights.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA] }, hrActor)
    ).rejects.toMatchObject({ status: 422, code: 'INVALID_TEMPLATE_CONFIGURATION' });
    expect(weights.cycles.repo.create).not.toHaveBeenCalled();
  });

  it('uses the latest PUBLISHED template version when none is chosen (Review Due Dashboard default)', async () => {
    const h = buildHarness({ lockedEmployees: [lockedABC[0]!] });
    const { evaluationTemplateVersionId: _omitted, ...withoutTemplate } = baseCommand;

    const result = await h.service.createIndividualCycles({ ...withoutTemplate, employeeIds: [IDS.empA] }, hrActor);

    expect(result.created).toHaveLength(1);
    expect(h.cycles.created[0]!.evaluationTemplateVersionId).toBe(IDS.templateVersion);
    expect(h.prepareSpy).toHaveBeenCalledWith(h.db.client, IDS.templateVersion);
  });

  it('rejects with 422 TEMPLATE_NOT_PUBLISHED when no template is chosen and none is published', async () => {
    const h = buildHarness({ lockedEmployees: [lockedABC[0]!], latestPublishedTemplateVersionId: null });
    const { evaluationTemplateVersionId: _omitted, ...withoutTemplate } = baseCommand;

    await expect(
      h.service.createIndividualCycles({ ...withoutTemplate, employeeIds: [IDS.empA] }, hrActor)
    ).rejects.toMatchObject({ status: 422, code: 'TEMPLATE_NOT_PUBLISHED' });
    expect(h.cycles.repo.create).not.toHaveBeenCalled();
  });

  it('keeps generated codes within 50 characters for long employee codes', async () => {
    const longCode = 'X'.repeat(50);
    const h = buildHarness({ lockedEmployees: [employeeRow(IDS.empA, longCode)] });

    await h.service.createIndividualCycles({ ...baseCommand, employeeIds: [IDS.empA] }, hrActor);

    expect(h.cycles.created[0]!.code.length).toBeLessThanOrEqual(50);
    expect(h.cycles.created[0]!.code).toMatch(/^IND-X+-20260924-[0-9A-F]{6}$/);
  });
});

describe('applicable employee scope — shared by batch opening and upcoming batch warnings', () => {
  const scoped = { employeeId: IDS.empA, teamId: IDS.teamA, roleId: IDS.roleDev, employmentStatus: 'ACTIVE' };
  const scope = (overrides: Partial<EvaluationCycle>) => buildCycle(overrides);

  it('treats empty lists as unrestricted and non-empty lists as AND-ed filters', () => {
    expect(isEmployeeInApplicableScope(scope({}), scoped)).toBe(true);
    expect(isEmployeeInApplicableScope(scope({ applicableTeamIds: [IDS.teamA], applicableRoleIds: [IDS.roleDev] }), scoped)).toBe(true);
    expect(isEmployeeInApplicableScope(scope({ applicableTeamIds: [IDS.teamB] }), scoped)).toBe(false);
    expect(isEmployeeInApplicableScope(scope({ applicableRoleIds: [IDS.roleQa] }), scoped)).toBe(false);
    expect(isEmployeeInApplicableScope(scope({ applicableEmployeeIds: [IDS.empB] }), scoped)).toBe(false);
    expect(isEmployeeInApplicableScope(scope({}), { ...scoped, employmentStatus: 'INACTIVE' })).toBe(false);
  });

  it('SQL form applies the same filters', () => {
    expect(buildApplicableEmployeeConditions(scope({ applicableTeamIds: [IDS.teamA] }))).toEqual({
      conditions: ["employment_status = 'ACTIVE'", 'team_id = ANY($1::uuid[])'],
      values: [[IDS.teamA]],
    });
  });
});
