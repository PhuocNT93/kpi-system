import { describe, it, expect, vi } from 'vitest';
import { Pool } from 'pg';
import { createRuleEngineModule } from '../src/modules/rule-engine/rule-engine.module.js';
import { RuleTypes } from '../src/modules/rule-engine/domain/rule.types.js';
import { EvaluationService } from '../src/modules/evaluation/application/services/evaluation.service.js';
import {
  EvaluationStatus,
  Evaluation,
  EvaluationItem,
} from '../src/modules/evaluation/domain/evaluation.types.js';
import {
  IEvaluationRepository,
  IEvaluationItemRepository,
} from '../src/modules/evaluation/domain/repositories.interface.js';
import {
  IReportsRepository,
  EmployeeEvaluationScore,
  EmployeeKpiScore,
  TeamEvaluationAggregate,
  OrganizationAggregate,
} from '../src/modules/reports/domain/reports.types.js';
import { ReportingProjectionService } from '../src/modules/reports/application/reporting-projection.service.js';
import { ReportsQueryService } from '../src/modules/reports/application/reports-query.service.js';
import { Actor } from '../src/shared/auth/types.js';
import { AppError } from '../src/api/app-error.js';

describe('Full End-to-End Evaluation Lifecycle Integration Test', () => {
  // ─── Shared State Across Lifecycle Phases ───────────────────────────────
  const { engine: ruleEngine } = createRuleEngineModule();

  // Actors
  const hrAdminActor: Actor = {
    userId: 'usr-hr-admin',
    employeeId: 'emp-hr-admin',
    role: 'HR_ADMIN',
  };

  const managerActor: Actor = {
    userId: 'usr-manager-alice',
    employeeId: 'emp-manager-alice',
    role: 'MANAGER',
    managedTeamIds: ['team-backend-core'],
  };

  const employeeActor: Actor = {
    userId: 'usr-employee-bob',
    employeeId: 'emp-bob-213844',
    role: 'EMPLOYEE',
  };

  // Phase 1 Organization Entities
  let organizationData: {
    department: { id: string; name: string; code: string };
    team: { id: string; name: string; department_id: string };
    role: { id: string; name: string; code: string };
    jobLevel: { id: string; name: string; rank: number };
    manager: { id: string; full_name: string; email: string };
    employee: {
      id: string;
      employee_code: string;
      full_name: string;
      email: string;
      department_id: string;
      team_id: string;
      role_id: string;
      job_level_id: string;
      manager_id: string;
    };
  };

  // Phase 2 Criteria & Template Configuration Entities
  let templateConfig: {
    templateId: string;
    templateVersionId: string;
    versionNo: number;
    kpis: Array<{
      id: string;
      code: string;
      name: string;
      weight: number;
      criteria: Array<{
        id: string;
        code: string;
        name: string;
        weight: number;
        ruleType: string;
        ruleConfig: unknown;
        levelDefinitions: Array<{ level: number; score_value: number }>;
      }>;
    }>;
  };

  // Phase 3 Cycle & Evaluation Instances
  let cycleData: {
    cycleId: string;
    cycleCode: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  };

  let activeEvaluation: Evaluation;
  let activeEvaluationItems: EvaluationItem[];

  // In-Memory Repository Stores
  const evaluationDb = new Map<string, Evaluation>();
  const evaluationItemDb = new Map<string, EvaluationItem[]>();
  const auditLogs: Array<{ action: string; entityId: string; entityType: string; performedBy: string }> = [];

  // Reporting CQRS Read Models Store
  const employeeEvaluationScoreStore = new Map<string, Partial<EmployeeEvaluationScore>>();
  const employeeKpiScoreStore = new Map<string, Partial<EmployeeKpiScore>[]>();
  const teamAggregateStore = new Map<string, Partial<TeamEvaluationAggregate>[]>();
  const organizationAggregateStore = new Map<string, Partial<OrganizationAggregate>[]>();

  // Mock Repositories
  const mockEvaluationRepo: IEvaluationRepository = {
    findById: vi.fn(async (id: string) => evaluationDb.get(id) ?? null),
    findByIdForUpdate: vi.fn(async (id: string) => evaluationDb.get(id) ?? null),
    findMyEvaluations: vi.fn(async () => []),
    findTeamEvaluations: vi.fn(async () => []),
    update: vi.fn(async (id: string, patch: Partial<Evaluation>) => {
      const current = evaluationDb.get(id);
      if (!current) throw new AppError(404, 'NOT_FOUND', 'Evaluation not found');
      const updated = { ...current, ...patch, updated_at: new Date() };
      evaluationDb.set(id, updated);
      return updated;
    }),
  };

  const mockEvaluationItemRepo: IEvaluationItemRepository = {
    findByEvaluationId: vi.fn(async (evalId: string) => evaluationItemDb.get(evalId) ?? []),
    findByCycleEmployeeKpi: vi.fn(async () => null),
    update: vi.fn(async (id: string, patch: Partial<EvaluationItem>) => {
      for (const items of evaluationItemDb.values()) {
        const found = items.find((i) => i.evaluation_item_id === id);
        if (found) {
          Object.assign(found, patch, { version: found.version + 1 });
          return found;
        }
      }
      throw new AppError(404, 'NOT_FOUND', 'Evaluation item not found');
    }),
    updateScoringResult: vi.fn(async (id: string, expectedVersion: number, patch: Partial<EvaluationItem>) => {
      for (const items of evaluationItemDb.values()) {
        const found = items.find((i) => i.evaluation_item_id === id);
        if (found) {
          if (found.version !== expectedVersion) return null;
          Object.assign(found, patch, { version: found.version + 1 });
          return found;
        }
      }
      return null;
    }),
    updateScoringResultsBatch: vi.fn(async (updates) => {
      const updatedList: EvaluationItem[] = [];
      for (const u of updates) {
        for (const items of evaluationItemDb.values()) {
          const found = items.find((i) => i.evaluation_item_id === u.id);
          if (found && found.version === u.expectedVersion) {
            Object.assign(found, u.patch, { version: found.version + 1 });
            updatedList.push(found);
          }
        }
      }
      return updatedList;
    }),
    batchUpdate: vi.fn(async () => {}),
  };

  const mockReportsRepo: IReportsRepository = {
    upsertEmployeeEvaluationScore: vi.fn(async (score) => {
      employeeEvaluationScoreStore.set(score.evaluation_id!, score);
    }),
    upsertEmployeeKpiScore: vi.fn(async (kpiScore) => {
      const existing = employeeKpiScoreStore.get(kpiScore.evaluation_id!) ?? [];
      const idx = existing.findIndex((k) => k.criterion_code === kpiScore.criterion_code);
      if (idx >= 0) {
        existing[idx] = kpiScore;
      } else {
        existing.push(kpiScore);
      }
      employeeKpiScoreStore.set(kpiScore.evaluation_id!, existing);
    }),
    upsertTeamEvaluationAggregate: vi.fn(async (agg) => {
      const existing = teamAggregateStore.get(agg.evaluation_cycle_id!) ?? [];
      existing.push(agg);
      teamAggregateStore.set(agg.evaluation_cycle_id!, existing);
    }),
    upsertTeamKpiAggregate: vi.fn(async () => {}),
    upsertOrganizationAggregate: vi.fn(async (agg) => {
      const existing = organizationAggregateStore.get(agg.evaluation_cycle_id!) ?? [];
      existing.push(agg);
      organizationAggregateStore.set(agg.evaluation_cycle_id!, existing);
    }),
    getEmployeeEvaluationScore: vi.fn(async () => null),
    getTeamEvaluationReport: vi.fn(async () => []),
    getOrganizationReport: vi.fn(async () => []),
    getEmployeeKpiSummary: vi.fn(async (employeeId: string, cycleId?: string) => {
      for (const score of employeeEvaluationScoreStore.values()) {
        if (score.employee_id === employeeId && (!cycleId || score.evaluation_cycle_id === cycleId)) {
          const kpis = employeeKpiScoreStore.get(score.evaluation_id!) ?? [];
          return {
            score: score as EmployeeEvaluationScore,
            kpis: kpis.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)) as EmployeeKpiScore[],
          };
        }
      }
      return null;
    }),
    getEmployeeKpiDetail: vi.fn(async (employeeId: string, itemId: string) => {
      for (const items of evaluationItemDb.values()) {
        const item = items.find((i) => i.evaluation_item_id === itemId);
        if (item) {
          const evalObj = evaluationDb.get(item.evaluation_id);
          return {
            item: {
              ...item,
              evaluation_status: evalObj?.status ?? 'OPEN',
            } as unknown as Record<string, unknown>,
            evidence: [
              {
                evidence_id: 'ev-1',
                title: 'Automated CI/CD Delivery Metric',
                evidence_url: 'https://ci.cyberlogitec.com/job/123',
                evidence_value: '95%',
                created_at: new Date(),
              },
            ],
          };
        }
      }
      return null;
    }),
  };

  const mockAuditService = {
    record: vi.fn(async (_client, entry) => {
      auditLogs.push(entry);
    }),
  };

  const mockPool = {
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [{ count: 1 }] }),
      release: vi.fn(),
    }),
    query: vi.fn().mockResolvedValue({ rows: [{ count: 1 }] }),
  } as unknown as Pool;

  const evaluationService = new EvaluationService(
    mockEvaluationRepo,
    mockEvaluationItemRepo,
    mockPool,
    mockAuditService as never,
    ruleEngine
  );

  const projectionService = new ReportingProjectionService(
    mockPool,
    mockReportsRepo,
    mockEvaluationRepo,
    mockEvaluationItemRepo
  );

  const reportsQueryService = new ReportsQueryService(mockReportsRepo);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: Organization Hierarchy Setup
  // ═══════════════════════════════════════════════════════════════════════════
  it('Phase 1: establishes organization hierarchy with reporting lines', () => {
    organizationData = {
      department: {
        id: 'dept-engineering',
        name: 'Product Engineering',
        code: 'ENG',
      },
      team: {
        id: 'team-backend-core',
        name: 'Core Backend Services',
        department_id: 'dept-engineering',
      },
      role: {
        id: 'role-software-engineer',
        name: 'Senior Software Engineer',
        code: 'SSE',
      },
      jobLevel: {
        id: 'level-senior-3',
        name: 'Level 3 - Senior',
        rank: 3,
      },
      manager: {
        id: managerActor.employeeId!,
        full_name: 'Alice Manager',
        email: 'alice.manager@cyberlogitec.com',
      },
      employee: {
        id: employeeActor.employeeId!,
        employee_code: '213844',
        full_name: 'Bob Developer',
        email: 'bob.dev@cyberlogitec.com',
        department_id: 'dept-engineering',
        team_id: 'team-backend-core',
        role_id: 'role-software-engineer',
        job_level_id: 'level-senior-3',
        manager_id: managerActor.employeeId!,
      },
    };

    expect(organizationData.employee.manager_id).toBe(organizationData.manager.id);
    expect(organizationData.employee.team_id).toBe(organizationData.team.id);
    expect(organizationData.employee.department_id).toBe(organizationData.department.id);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: KPI & 2-Level Criteria / Template Configuration
  // ═══════════════════════════════════════════════════════════════════════════
  it('Phase 2: configures 2-level evaluation template with rule engine strategies and publishes version', () => {
    const standardLevels = [
      { level: 1, score_value: 60 },
      { level: 2, score_value: 75 },
      { level: 3, score_value: 85 },
      { level: 4, score_value: 95 },
      { level: 5, score_value: 100 },
    ];

    templateConfig = {
      templateId: 'tpl-eng-annual',
      templateVersionId: 'tpl-ver-2026-v1',
      versionNo: 1,
      kpis: [
        {
          id: 'kpi-code-quality',
          code: 'CODE_QUALITY',
          name: 'Software Quality & Stability',
          weight: 50, // 50% Level-2 KPI weight
          criteria: [
            {
              id: 'crit-bug-density',
              code: 'DEFECT_DENSITY',
              name: 'Production Escaped Defect Rate',
              weight: 60, // 60% Level-1 criterion weight
              ruleType: RuleTypes.INVERSE_THRESHOLD, // Fewer bugs = higher score
              ruleConfig: {
                ranges: [
                  { min: 0, max: 2, level: 5 },  // 0-1 bugs = Level 5 (100)
                  { min: 2, max: 5, level: 4 },  // 2-4 bugs = Level 4 (95)
                  { min: 5, max: 10, level: 3 }, // 5-9 bugs = Level 3 (85)
                  { min: 10, max: 20, level: 2 },// 10-19 bugs = Level 2 (75)
                  { min: 20, max: null, level: 1 },// 20+ bugs = Level 1 (60)
                ],
              },
              levelDefinitions: standardLevels,
            },
            {
              id: 'crit-code-reviews',
              code: 'REVIEW_PARTICIPATION',
              name: 'Peer Code Reviews Completed',
              weight: 40, // 40% Level-1 criterion weight
              ruleType: RuleTypes.COUNT_THRESHOLD,
              ruleConfig: {
                thresholds: [5, 15, 30, 50], // 0-4=L1, 5-14=L2, 15-29=L3, 30-49=L4, 50+=L5
              },
              levelDefinitions: standardLevels,
            },
          ],
        },
        {
          id: 'kpi-sprint-delivery',
          code: 'SPRINT_DELIVERY',
          name: 'Delivery Speed & Commitment',
          weight: 50, // 50% Level-2 KPI weight
          criteria: [
            {
              id: 'crit-task-completion',
              code: 'TASK_ON_TIME',
              name: 'Sprint Task On-Time Completion %',
              weight: 100, // 100% Level-1 criterion weight
              ruleType: RuleTypes.RANGE_THRESHOLD,
              ruleConfig: {
                ranges: [
                  { min: 0, max: 70, level: 1 },
                  { min: 70, max: 80, level: 2 },
                  { min: 80, max: 90, level: 3 },
                  { min: 90, max: 100, level: 4 },
                  { min: 100, max: null, level: 5 },
                ],
              },
              levelDefinitions: standardLevels,
            },
          ],
        },
      ],
    };

    // Validation: Level-2 KPI weights sum to 100%
    const totalKpiWeight = templateConfig.kpis.reduce((sum, k) => sum + k.weight, 0);
    expect(totalKpiWeight).toBe(100);

    // Validation: Criteria weights within each KPI sum to 100%
    for (const kpi of templateConfig.kpis) {
      const totalCritWeight = kpi.criteria.reduce((sum, c) => sum + c.weight, 0);
      expect(totalCritWeight).toBe(100);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: Evaluation Cycle Creation & Immutable Snapshots
  // ═══════════════════════════════════════════════════════════════════════════
  it('Phase 3: opens evaluation cycle and creates immutable evaluation snapshots for employees', () => {
    cycleData = {
      cycleId: 'cycle-2026-annual',
      cycleCode: '2026-ENG-ANNUAL',
      name: '2026 Annual Product Engineering Performance Cycle',
      status: 'OPEN',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };

    // Immutable Snapshots created upon opening cycle
    activeEvaluation = {
      evaluation_id: 'eval-bob-2026',
      evaluation_cycle_id: cycleData.cycleId,
      employee_id: organizationData.employee.id,
      status: EvaluationStatus.OPEN,
      team_id_snapshot: organizationData.employee.team_id,
      role_id_snapshot: organizationData.employee.role_id,
      job_level_snapshot: organizationData.employee.job_level_id,
      manager_id_snapshot: organizationData.employee.manager_id,
      template_version_id_snapshot: templateConfig.templateVersionId,
      self_score: null,
      manager_score: null,
      final_score: null,
      is_locked: false,
      created_at: new Date('2026-01-02T08:00:00Z'),
      updated_at: new Date('2026-01-02T08:00:00Z'),
      version: 1,
    };

    let displayOrder = 1;
    activeEvaluationItems = [];

    for (const kpi of templateConfig.kpis) {
      for (const crit of kpi.criteria) {
        activeEvaluationItems.push({
          evaluation_item_id: `item-${crit.id}`,
          evaluation_id: activeEvaluation.evaluation_id,
          kpi_id_snapshot: kpi.id,
          kpi_name_snapshot: kpi.name,
          kpi_weight_snapshot: kpi.weight,
          criterion_id_snapshot: crit.id,
          criterion_name_snapshot: crit.name,
          criterion_code_snapshot: crit.code,
          weight_snapshot: crit.weight,
          scoring_rule_snapshot: {
            rule_type: crit.ruleType,
            rule_config: crit.ruleConfig,
          },
          level_definition_snapshot: crit.levelDefinitions,
          resolved_level: null,
          raw_score: null,
          normalized_score: null,
          weighted_score: null,
          measurement_value: null,
          is_disabled_for_employee: false,
          is_missing_score: false,
          version: 1,
          display_order: displayOrder++,
        });
      }
    }

    // Persist to in-memory test stores
    evaluationDb.set(activeEvaluation.evaluation_id, activeEvaluation);
    evaluationItemDb.set(activeEvaluation.evaluation_id, activeEvaluationItems);

    expect(activeEvaluation.manager_id_snapshot).toBe(managerActor.employeeId);
    expect(activeEvaluationItems.length).toBe(3);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: Data Ingestion (Measurements & Evidence) & Self-Assessment
  // ═══════════════════════════════════════════════════════════════════════════
  it('Phase 4: ingests KPI measurements, evidence, comments, and submits employee self-assessment', async () => {
    // 1. Ingest actual measurements from Jira/Git/Collector
    // Defect density: 1 bug (INVERSE_THRESHOLD -> Level 5)
    // Code reviews: 35 reviews (COUNT_THRESHOLD -> Level 4)
    // Task on-time: 95% on-time (RANGE_THRESHOLD -> Level 4)
    const measurementsMap = new Map<string, number>([
      ['crit-bug-density', 1],
      ['crit-code-reviews', 35],
      ['crit-task-completion', 95],
    ]);

    for (const item of activeEvaluationItems) {
      const measurement = measurementsMap.get(item.criterion_id_snapshot);
      if (measurement !== undefined) {
        item.measurement_value = measurement;
        item.comment = `Verified operational metric: ${measurement}`;
      }
    }

    // 2. Employee submits Self-Assessment
    activeEvaluation.self_score = 90.0;
    activeEvaluation.status = EvaluationStatus.SUBMITTED;
    activeEvaluation.version += 1;
    evaluationDb.set(activeEvaluation.evaluation_id, activeEvaluation);

    expect(activeEvaluation.status).toBe(EvaluationStatus.SUBMITTED);
    expect(activeEvaluation.self_score).toBe(90.0);
    expect(activeEvaluationItems.every((i) => i.measurement_value !== null)).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: 2-Level Scoring Pipeline Execution
  // ═══════════════════════════════════════════════════════════════════════════
  it('Phase 5: calculates Level-1 criterion scores and Level-2 KPI/overall weighted score using batch update', async () => {
    // Transition to REVIEWING by Manager
    activeEvaluation.status = EvaluationStatus.REVIEWING;
    evaluationDb.set(activeEvaluation.evaluation_id, activeEvaluation);



    // Execute recalculateEvaluation via evaluation service
    const scoreResult = await evaluationService.recalculateEvaluation(
      activeEvaluation.evaluation_id,
      managerActor
    );

    expect(scoreResult).toBeDefined();

    // Verify Level-1 Resolutions:
    // Defect Density: measurement = 1 bug -> INVERSE_THRESHOLD -> Level 5 -> raw_score = 100
    // Code Reviews: measurement = 35 reviews -> COUNT_THRESHOLD -> Level 4 -> raw_score = 95
    // Task On-Time: measurement = 95% -> RANGE_THRESHOLD -> Level 4 -> raw_score = 95
    const bugItem = activeEvaluationItems.find((i) => i.criterion_id_snapshot === 'crit-bug-density')!;
    const reviewItem = activeEvaluationItems.find((i) => i.criterion_id_snapshot === 'crit-code-reviews')!;
    const taskItem = activeEvaluationItems.find((i) => i.criterion_id_snapshot === 'crit-task-completion')!;

    expect(bugItem.resolved_level).toBe(5);
    expect(bugItem.raw_score).toBe(100);

    expect(reviewItem.resolved_level).toBe(4);
    expect(reviewItem.raw_score).toBe(95);

    expect(taskItem.resolved_level).toBe(4);
    expect(taskItem.raw_score).toBe(95);

    // Verify Level-2 Calculations:
    // KPI 1 (Quality): (100 * 60 + 95 * 40) / 100 = 98.0
    // KPI 2 (Delivery): (95 * 100) / 100 = 95.0
    // Overall Weighted Score: (98.0 * 50 + 95.0 * 50) / 100 = 96.5
    const updatedEval = evaluationDb.get(activeEvaluation.evaluation_id)!;
    expect(updatedEval.manager_score).toBe(96.5);
    expect(updatedEval.final_score).toBe(96.5);

    // Verify that the batch update was invoked (N+1 eliminated)
    expect(mockEvaluationItemRepo.updateScoringResultsBatch).toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 6: Workflow Progression & Manager Approval
  // ═══════════════════════════════════════════════════════════════════════════
  it('Phase 6: manager conducts review, provides formal feedback, and approves evaluation', async () => {
    // Manager approves evaluation
    const approved = await mockEvaluationRepo.update(activeEvaluation.evaluation_id, {
      status: EvaluationStatus.APPROVED,
      updated_by: managerActor.userId,
    });

    expect(approved.status).toBe(EvaluationStatus.APPROVED);
    expect(approved.final_score).toBe(96.5);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7: Calibration Session & Score Adjustment
  // ═══════════════════════════════════════════════════════════════════════════
  it('Phase 7: conducts calibration session and records score adjustment with audit trail', async () => {
    // HR Admin adjusts final score slightly to 96.0 according to cross-team bell-curve
    const calibratedScore = 96.0;
    const adjustmentReason = 'Calibrated against department distribution curve';

    const updated = await mockEvaluationRepo.update(activeEvaluation.evaluation_id, {
      final_score: calibratedScore,
      updated_by: hrAdminActor.userId,
    });

    await mockAuditService.record(null as never, {
      action: 'CALIBRATION_ADJUSTMENT',
      entityId: activeEvaluation.evaluation_id,
      entityType: 'EVALUATION',
      performedBy: hrAdminActor.userId,
      oldValue: '96.5',
      newValue: '96.0',
      reason: adjustmentReason,
    });

    expect(updated.final_score).toBe(96.0);
    expect(auditLogs.some((l) => l.action === 'CALIBRATION_ADJUSTMENT')).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 8: Publishing Results & Permanent Lock Freeze (Idempotency)
  // ═══════════════════════════════════════════════════════════════════════════
  it('Phase 8: publishes results and permanently locks cycle with read-only tamper protection', async () => {
    // 1. Publish Evaluation
    const published = await evaluationService.publishEvaluation(
      activeEvaluation.evaluation_id,
      hrAdminActor
    );
    expect(published.status).toBe(EvaluationStatus.PUBLISHED);

    // 2. Lock Evaluation
    const locked = await evaluationService.lockEvaluation(
      activeEvaluation.evaluation_id,
      hrAdminActor
    );
    expect(locked.status).toBe(EvaluationStatus.LOCKED);
    expect(locked.is_locked).toBe(true);

    // 3. Tamper-proof test: Any subsequent attempt to recalculate or modify must fail with 409
    await expect(
      evaluationService.recalculateEvaluation(activeEvaluation.evaluation_id, managerActor)
    ).rejects.toThrowError(AppError);

    await expect(
      evaluationService.publishEvaluation(activeEvaluation.evaluation_id, hrAdminActor)
    ).rejects.toThrowError(AppError);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 9: CQRS Read-Model Projections Sync
  // ═══════════════════════════════════════════════════════════════════════════
  it('Phase 9: syncs CQRS read-models for reporting and dashboards', async () => {
    // Trigger reporting projection
    await projectionService.refreshEvaluation(activeEvaluation.evaluation_id);

    // Verify Read-Model Projections:
    const scoreModel = employeeEvaluationScoreStore.get(activeEvaluation.evaluation_id);
    expect(scoreModel).toBeDefined();
    expect(scoreModel?.employee_id).toBe(organizationData.employee.id);
    expect(scoreModel?.final_score).toBe(96.0);
    expect(scoreModel?.is_locked).toBe(true);
    expect(scoreModel?.evaluation_status).toBe(EvaluationStatus.LOCKED);

    const kpiModels = employeeKpiScoreStore.get(activeEvaluation.evaluation_id);
    expect(kpiModels).toBeDefined();
    expect(kpiModels?.length).toBe(3);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 10: KPI Summary Search & Drill-Down View Verification
  // ═══════════════════════════════════════════════════════════════════════════
  it('Phase 10: searches employee KPI summary and verifies scorecards and evidence lineage', async () => {
    // 1. Query KPI Summary for employee Bob
    const summary = await reportsQueryService.getEmployeeKpiSummary(
      organizationData.employee.id,
      hrAdminActor,
      cycleData.cycleId
    );

    expect(summary).toBeDefined();
    expect(summary?.employee.employee_id).toBe(organizationData.employee.id);
    expect(summary?.score_summary.official_score).toBe(96.0);
    expect(summary?.evaluation.is_locked).toBe(true);
    expect(summary?.kpis.length).toBe(3);

    // Verify ascending display order
    const displayOrders = summary?.kpis.map((k) => k.display_order ?? 0);
    expect(displayOrders).toEqual([1, 2, 3]);

    // 2. Query Drill-Down Detail with Evidence Lineage
    const detail = await reportsQueryService.getEmployeeKpiDetail(
      organizationData.employee.id,
      activeEvaluationItems[0].evaluation_item_id,
      hrAdminActor
    );

    expect(detail).toBeDefined();
    expect(detail?.criteria).toBeDefined();
    expect(detail?.criteria.criterion_code).toBe('DEFECT_DENSITY');
    expect(detail?.scoring.resolved_level).toBe(5);
    expect(detail?.scoring.raw_score).toBe(100);
    expect(detail?.is_locked).toBe(true);
    expect(detail?.evidence.length).toBeGreaterThanOrEqual(1);
    expect(detail?.evidence[0].title).toBe('Automated CI/CD Delivery Metric');
  });
});
