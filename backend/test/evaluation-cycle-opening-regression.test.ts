import { describe, it, expect, vi } from 'vitest';
import { EvaluationCycleOpeningService } from '../src/modules/evaluation-cycle/application/evaluation-cycle-opening.service.js';
import { EvaluationGenerationService } from '../src/modules/evaluation-cycle/application/evaluation-generation.service.js';
import { EvaluationCycleTransitionService } from '../src/modules/evaluation-cycle/application/evaluation-cycle-transition.service.js';
import { EvaluationCycleStatus } from '../src/modules/evaluation-cycle/domain/evaluation-cycle.types.js';
import type { AuditService } from '../src/modules/audit/application/audit.service.js';
import type { NotificationService } from '../src/modules/notification/index.js';
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

function buildOpeningHarness(fixture: FixtureOptions, cycleOverrides: Parameters<typeof buildCycle>[0] = {}) {
  const db = createFakeDb(fixture);
  const cycles = createRecordingCycleRepo(buildCycle(cycleOverrides));
  const evaluations = createRecordingEvaluationRepo();
  const items = createRecordingItemRepo();
  const audit = { record: vi.fn(async () => undefined) };
  const notifications = { enqueueNotification: vi.fn(async () => undefined) };
  const generation = new EvaluationGenerationService(
    evaluations.repo,
    items.repo,
    notifications as unknown as NotificationService
  );
  const service = new EvaluationCycleOpeningService(
    db.pool,
    cycles.repo,
    generation,
    new EvaluationCycleTransitionService(),
    audit as unknown as AuditService
  );
  return { db, cycles, evaluations, items, audit, notifications, service };
}

const twoEmployees = [
  employeeRow(IDS.empA, 'E-A'),
  employeeRow(IDS.empB, 'E-B', { role_id: IDS.roleQa, team_id: IDS.teamB }),
];

describe('EVAL-02 batch open cycle regression after extracting EvaluationGenerationService', () => {
  it('TC-BE-13: generates the same evaluations, item snapshots, status, audit and notifications as before', async () => {
    const h = buildOpeningHarness({
      batchEmployees: twoEmployees,
      assignments: [
        { employee_id: IDS.empA, team_id: IDS.historicalTeam, role_id: IDS.roleDev, job_level_id: IDS.level, manager_id: IDS.manager },
      ],
    });

    const result = await h.service.openCycle(IDS.batchCycle, IDS.actorEmployee);

    expect(result).toEqual({ id: IDS.batchCycle, status: EvaluationCycleStatus.OPEN, evaluationCount: 2 });

    // Evaluation snapshots: historical assignment at cycle start wins, otherwise current employee context.
    expect(h.evaluations.payloads).toHaveLength(1);
    expect(h.evaluations.payloads[0]).toEqual([
      expect.objectContaining({
        evaluationCycleId: IDS.batchCycle,
        employeeId: IDS.empA,
        teamIdSnapshot: IDS.historicalTeam,
        roleIdSnapshot: IDS.roleDev,
        jobLevelSnapshot: IDS.level,
        managerIdSnapshot: IDS.manager,
        status: 'OPEN',
        isLocked: false,
        createdBy: IDS.actorEmployee,
      }),
      expect.objectContaining({ employeeId: IDS.empB, teamIdSnapshot: IDS.teamB, roleIdSnapshot: IDS.roleQa }),
    ]);

    // Item snapshots: 2 criteria × 2 employees, full snapshot payload.
    const itemPayload = h.items.payloads[0]!;
    expect(itemPayload).toHaveLength(4);
    expect(itemPayload[0]).toEqual({
      evaluationId: expect.stringContaining('-0a'),
      templateCriterionId: IDS.legacyTcCommon,
      criterionCodeSnapshot: 'DELIVERY',
      criterionNameSnapshot: JSON.stringify({ en: 'Delivery', vi: 'Giao hàng' }),
      weightSnapshot: 60,
      kpiIdSnapshot: 'kpi-1',
      kpiCodeSnapshot: 'KPI_ON_TIME',
      kpiNameSnapshot: 'On-time delivery',
      kpiWeightSnapshot: 100,
      scoringRuleSnapshot: { rule_type: 'RANGE_THRESHOLD', rule_config: { thresholds: [50, 80] } },
      levelDefinitionSnapshot: [
        { level_no: 1, label_en: 'Low', label_vn: 'Thấp', score_value: 1 },
        { level_no: 2, label_en: 'High', label_vn: 'Cao', score_value: 5 },
      ],
      resolvedLevel: null,
      rawScore: null,
      weightedScore: null,
      isDisabledForEmployee: false,
      isMissingScore: false,
      comment: null,
      reviewerId: null,
      reviewDate: null,
      createdBy: IDS.actorEmployee,
      updatedBy: IDS.actorEmployee,
    });
    // ROLE-restricted criterion is disabled for the developer and enabled for the QA employee.
    expect(itemPayload[1]).toMatchObject({ criterionCodeSnapshot: 'QUALITY', criterionNameSnapshot: '{"en":"Quality"}', isDisabledForEmployee: true });
    expect(itemPayload[3]).toMatchObject({ criterionCodeSnapshot: 'QUALITY', isDisabledForEmployee: false });

    expect(h.cycles.updated).toEqual([expect.objectContaining({ status: EvaluationCycleStatus.OPEN, updatedBy: IDS.actorEmployee })]);
    expect(h.audit.record).toHaveBeenCalledTimes(1);
    expect(h.audit.record).toHaveBeenCalledWith(h.db.client, expect.objectContaining({
      entityType: 'EVALUATION_CYCLE',
      entityId: IDS.batchCycle,
      action: 'CYCLE_OPENED',
      newValue: JSON.stringify({ status: 'OPEN', evaluation_count: 2, template_version_id: IDS.templateVersion }),
    }));
    expect(h.notifications.enqueueNotification).toHaveBeenCalledTimes(2);
    expect(h.notifications.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ notificationType: 'CYCLE_OPENED', relatedEntityId: IDS.batchCycle, recipientUserAccountId: 'user-0a' }),
      h.db.client
    );
    expect(h.db.queries.at(-1)?.sql).toBe('COMMIT');
  });

  it('TC-BE-13: still resolves employees with the applicable employee/team/role filters', async () => {
    const h = buildOpeningHarness(
      { batchEmployees: twoEmployees },
      { applicableEmployeeIds: [IDS.empA], applicableTeamIds: [IDS.teamA], applicableRoleIds: [IDS.roleDev] }
    );

    await h.service.openCycle(IDS.batchCycle, IDS.actorEmployee);

    const employeeQuery = h.db.queries.find((q) => q.sql.includes('FROM employee WHERE employment_status'));
    expect(employeeQuery?.sql).toContain(
      "WHERE employment_status = 'ACTIVE' AND employee_id = ANY($1::uuid[]) AND team_id = ANY($2::uuid[]) AND role_id = ANY($3::uuid[])"
    );
    expect(employeeQuery?.params).toEqual([[IDS.empA], [IDS.teamA], [IDS.roleDev]]);
  });

  it('TC-BE-13b: rejects a cycle that is not DRAFT with 409 EVALUATION_CYCLE_NOT_EDITABLE', async () => {
    const h = buildOpeningHarness({ batchEmployees: twoEmployees }, { status: EvaluationCycleStatus.OPEN });

    await expect(h.service.openCycle(IDS.batchCycle, IDS.actorEmployee)).rejects.toMatchObject({
      status: 409,
      code: 'EVALUATION_CYCLE_NOT_EDITABLE',
    });
    expect(h.evaluations.repo.batchCreate).not.toHaveBeenCalled();
  });

  it('TC-BE-13b / TC-BE-16: rejects an unpublished template with 422 TEMPLATE_NOT_PUBLISHED', async () => {
    const h = buildOpeningHarness({ batchEmployees: twoEmployees, templateStatus: 'DRAFT' });

    await expect(h.service.openCycle(IDS.batchCycle, IDS.actorEmployee)).rejects.toMatchObject({
      status: 422,
      code: 'TEMPLATE_NOT_PUBLISHED',
    });
  });

  it('TC-BE-13b / TC-BE-16: rejects an effective weight sum different from 100% with 422', async () => {
    const h = buildOpeningHarness({ batchEmployees: twoEmployees, kpiWeights: [100, 50] });

    await expect(h.service.openCycle(IDS.batchCycle, IDS.actorEmployee)).rejects.toMatchObject({
      status: 422,
      code: 'INVALID_TEMPLATE_CONFIGURATION',
    });
    expect(h.db.queries.at(-1)?.sql).toBe('ROLLBACK');
  });

  it('TC-BE-13b: rejects when no eligible employee remains', async () => {
    const h = buildOpeningHarness({ batchEmployees: [employeeRow(IDS.empA, 'E-A', { team_id: null })] });

    await expect(h.service.openCycle(IDS.batchCycle, IDS.actorEmployee)).rejects.toMatchObject({
      status: 422,
      code: 'INVALID_TEMPLATE_CONFIGURATION',
    });
  });
});
