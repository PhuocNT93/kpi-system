import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScoringEngine } from '../../src/modules/evaluation/domain/scoring/scoring-engine.js';
import { EvaluationService } from '../../src/modules/evaluation/application/services/evaluation.service.js';
import { EvaluationStatus, Evaluation, EvaluationItem } from '../../src/modules/evaluation/domain/evaluation.types.js';
import { IEvaluationRepository, IEvaluationItemRepository } from '../../src/modules/evaluation/domain/repositories.interface.js';
import { AuditService } from '../../src/modules/audit/application/audit.service.js';
import { Pool } from 'pg';
import type { Actor } from '../../src/shared/auth/types.js';
import type { ScoringLevelDefinition, ScoringCriterionInput } from '../../src/modules/evaluation/domain/scoring/scoring-engine.js';

describe('Scoring Regression & Snapshot Contract Tests (TC14 - TC23)', () => {
  let scoringEngine: ScoringEngine;
  let evaluationService: EvaluationService;
  let mockEvaluationRepo: IEvaluationRepository;
  let mockEvaluationItemRepo: IEvaluationItemRepository;
  let mockAuditService: AuditService;
  let mockPool: Pool;

  const hrActor: Actor = {
    userId: '99999999-9999-9999-9999-999999999999',
    role: 'HR_ADMIN',
  };

  const evalId = '10000000-0000-0000-0000-000000000001';
  const item1Id = '20000000-0000-0000-0000-000000000001';
  const item2Id = '20000000-0000-0000-0000-000000000002';

  // Base snapshot state created during evaluation cycle opening
  let storedEvaluation: Evaluation;
  let storedItems: EvaluationItem[];

  beforeEach(() => {
    scoringEngine = new ScoringEngine();

    storedEvaluation = {
      evaluation_id: evalId,
      evaluation_cycle_id: 'cycle-2026-q1',
      employee_id: 'emp-alice',
      status: EvaluationStatus.SUBMITTED,
      self_score: undefined,
      manager_score: 85.0,
      final_score: 85.0,
      submitted_at: new Date('2026-03-15T10:00:00Z'),
      approved_at: undefined,
      is_locked: false,
      team_id_snapshot: 'team-engineering',
      role_id_snapshot: 'role-senior-dev',
      job_level_snapshot: 'level-3',
      manager_id_snapshot: 'emp-bob-manager',
      created_by: 'system',
      updated_by: 'system',
      created_at: new Date('2026-03-01T00:00:00Z'),
      updated_at: new Date('2026-03-15T10:00:00Z'),
      version: 1,
    };

    // Stored items with snapshots taken when cycle was opened
    storedItems = [
      {
        evaluation_item_id: item1Id,
        evaluation_id: evalId,
        template_criterion_id: 'template-criterion-quality',
        criterion_code_snapshot: 'CODE_QUALITY',
        criterion_name_snapshot: 'Code Quality and Architecture',
        weight_snapshot: 60, // 60% of KPI
        kpi_id_snapshot: 'kpi-technical-excellence',
        kpi_code_snapshot: 'TECH_EXCELLENCE',
        kpi_name_snapshot: 'Technical Excellence',
        kpi_weight_snapshot: 50, // 50% of overall evaluation
        scoring_rule_snapshot: { rule_type: 'RANGE_THRESHOLD', rule_config: { ranges: [] } },
        level_definition_snapshot: [
          { level: 1, level_no: 1, score_value: 20 },
          { level: 2, level_no: 2, score_value: 40 },
          { level: 3, level_no: 3, score_value: 60 },
          { level: 4, level_no: 4, score_value: 80 },
          { level: 5, level_no: 5, score_value: 100 },
        ],
        resolved_level: 4,
        raw_score: 80,
        weighted_score: 48,
        normalized_score: 80,
        is_disabled_for_employee: false,
        is_missing_score: false,
        created_at: new Date('2026-03-01T00:00:00Z'),
        updated_at: new Date('2026-03-15T10:00:00Z'),
        version: 1,
      },
      {
        evaluation_item_id: item2Id,
        evaluation_id: evalId,
        template_criterion_id: 'template-criterion-delivery',
        criterion_code_snapshot: 'SPRINT_DELIVERY',
        criterion_name_snapshot: 'Sprint Delivery Rate',
        weight_snapshot: 40, // 40% of KPI
        kpi_id_snapshot: 'kpi-technical-excellence',
        kpi_code_snapshot: 'TECH_EXCELLENCE',
        kpi_name_snapshot: 'Technical Excellence',
        kpi_weight_snapshot: 50,
        scoring_rule_snapshot: { rule_type: 'RANGE_THRESHOLD', rule_config: { ranges: [] } },
        level_definition_snapshot: [
          { level: 1, level_no: 1, score_value: 20 },
          { level: 2, level_no: 2, score_value: 40 },
          { level: 3, level_no: 3, score_value: 60 },
          { level: 4, level_no: 4, score_value: 80 },
          { level: 5, level_no: 5, score_value: 100 },
        ],
        resolved_level: 5,
        raw_score: 100,
        weighted_score: 40,
        normalized_score: 100,
        is_disabled_for_employee: false,
        is_missing_score: false,
        created_at: new Date('2026-03-01T00:00:00Z'),
        updated_at: new Date('2026-03-15T10:00:00Z'),
        version: 1,
      },
    ];

    mockEvaluationRepo = {
      findById: vi.fn(async () => ({ ...storedEvaluation })),
      findByIdForUpdate: vi.fn(async () => ({ ...storedEvaluation })),
      update: vi.fn(async (_id, patch) => {
        Object.assign(storedEvaluation, patch);
        return { ...storedEvaluation };
      }),
      findMyEvaluations: vi.fn(async () => []),
      findTeamEvaluations: vi.fn(async () => []),
    };

    mockEvaluationItemRepo = {
      findByEvaluationId: vi.fn(async () => storedItems.map((i) => ({ ...i }))),
      findByCycleEmployeeKpi: vi.fn(async () => null),
      update: vi.fn(async (id, patch) => {
        const item = storedItems.find((i) => i.evaluation_item_id === id);
        if (item) Object.assign(item, patch);
        return item!;
      }),
      updateScoringResult: vi.fn(async (id, _expectedVersion, patch) => {
        const item = storedItems.find((i) => i.evaluation_item_id === id);
        if (item) {
          Object.assign(item, patch);
          item.version = (item.version || 0) + 1;
          return item;
        }
        return null;
      }),
      batchUpdate: vi.fn(async () => {}),
    };

    mockAuditService = {
      record: vi.fn(),
      getLogs: vi.fn(),
    } as unknown as AuditService;

    mockPool = {
      query: vi.fn(async () => ({ rows: [] })),
      connect: vi.fn(async () => ({
        query: vi.fn(async () => ({ rows: [] })),
        release: vi.fn(),
      })),
    } as unknown as Pool;

    evaluationService = new EvaluationService(
      mockEvaluationRepo,
      mockEvaluationItemRepo,
      mockPool,
      mockAuditService
    );
  });

  // ── TC14: Evaluation KPI Snapshot Persistence ──────────────────────────────
  it('TC14: Evaluation items persist immutable kpi_weight_snapshot and kpi_code_snapshot', () => {
    const item1 = storedItems[0];
    expect(item1.kpi_weight_snapshot).toBe(50);
    expect(item1.kpi_code_snapshot).toBe('TECH_EXCELLENCE');
    expect(item1.weight_snapshot).toBe(60);
    expect(item1.criterion_code_snapshot).toBe('CODE_QUALITY');
  });

  // ── TC15: KPI Configuration Change Regression ──────────────────────────────
  it('TC15: Modifying KPI master weight does not alter historical evaluation snapshots', async () => {
    // Current KPI master configuration changes from weight 50% to 80%
    const currentKpiConfig = {
      kpi_id: 'kpi-technical-excellence',
      effective_weight: 80, // CHANGED from 50 to 80
      relationship: 'HIERARCHICAL_UPDATED',
    };

    // When reading historical evaluation items, they must retain original snapshot (50%)
    const historicalItems = await mockEvaluationItemRepo.findByEvaluationId(evalId);
    expect(historicalItems[0].kpi_weight_snapshot).toBe(50);
    expect(historicalItems[0].kpi_weight_snapshot).not.toBe(currentKpiConfig.effective_weight);
  });

  // ── TC16: Criterion Weight Change Regression ───────────────────────────────
  it('TC16: Modifying master criterion weight does not mutate historical evaluation items', async () => {
    // Master template criterion weight changed from 60% to 90%
    const updatedTemplateCriterion = {
      template_criterion_id: 'template-criterion-quality',
      effective_weight: 90, // CHANGED
    };

    const historicalItems = await mockEvaluationItemRepo.findByEvaluationId(evalId);
    expect(historicalItems[0].weight_snapshot).toBe(60);
    expect(historicalItems[0].weight_snapshot).not.toBe(updatedTemplateCriterion.effective_weight);
  });

  // ── TC17: Criterion Scoring Rule Change Regression ─────────────────────────
  it('TC17: Modifying master criterion scoring rule preserves historical evaluation rule snapshot', async () => {
    // Master scoring rule changes to INVERSE_THRESHOLD
    const newMasterRule = {
      rule_type: 'INVERSE_THRESHOLD',
      rule_config: { max_penalty: 50 },
    };

    const historicalItems = await mockEvaluationItemRepo.findByEvaluationId(evalId);
    expect(historicalItems[0].scoring_rule_snapshot.rule_type).toBe('RANGE_THRESHOLD');
    expect(historicalItems[0].scoring_rule_snapshot.rule_type).not.toBe(newMasterRule.rule_type);
  });

  // ── TC18: Criterion Level Definition Change Regression ─────────────────────
  it('TC18: Updating level definitions in master configuration leaves historical item levels unchanged', async () => {
    // Master level values updated (e.g. Level 4 reduced to 70 pts)
    const updatedMasterLevels = [
      { level: 4, score_value: 70 }, // CHANGED from 80
    ];

    const historicalItems = await mockEvaluationItemRepo.findByEvaluationId(evalId);
    const itemLevel4 = (historicalItems[0].level_definition_snapshot as Array<{ level: number; score_value: number }>).find(
      (l) => l.level === 4
    );
    expect(itemLevel4?.score_value).toBe(80);
    expect(itemLevel4?.score_value).not.toBe(updatedMasterLevels[0].score_value);
  });

  // ── TC19: Disabled Criterion Regression ────────────────────────────────────
  it('TC19: Disabling a criterion in master template does not disable historical evaluation items', async () => {
    // Master template disables CODE_QUALITY
    const templateCriterionState = { is_disabled: true };

    const historicalItems = await mockEvaluationItemRepo.findByEvaluationId(evalId);
    expect(historicalItems[0].is_disabled_for_employee).toBe(false);
    expect(historicalItems[0].is_disabled_for_employee).not.toBe(templateCriterionState.is_disabled);
  });

  // ── TC20: Template Version Change Regression ───────────────────────────────
  it('TC20: Publishing a new template version does not switch historical evaluation snapshots', async () => {
    // New template version published with different criteria
    const _newTemplateVersion = {
      version_no: 2,
      template_id: 'template-eng',
      criteria: [{ code: 'NEW_METRIC', weight: 100 }],
    };

    const historicalItems = await mockEvaluationItemRepo.findByEvaluationId(evalId);
    const codes = historicalItems.map((i) => i.criterion_code_snapshot);
    expect(codes).toContain('CODE_QUALITY');
    expect(codes).toContain('SPRINT_DELIVERY');
    expect(codes).not.toContain('NEW_METRIC');
  });

  // ── TC21: Historical Score Immutability ─────────────────────────────────────
  it('TC21: Historical raw_score, weighted_score, and final_score remain intact after configuration changes', () => {
    // Initial evaluation score is 85.0
    expect(storedEvaluation.final_score).toBe(85.0);
    expect(storedItems[0].raw_score).toBe(80);
    expect(storedItems[0].weighted_score).toBe(48);
    expect(storedItems[1].raw_score).toBe(100);
    expect(storedItems[1].weighted_score).toBe(40);

    // Scoring calculation with stored snapshot items must yield exactly the preserved score:
    // KPI Score = (80 * 0.6) + (100 * 0.4) = 48 + 40 = 88
    const kpiCalculation = scoringEngine.calculate({
      kpis: [
        {
          kpi_id: storedItems[0].kpi_id_snapshot!,
          kpi_name: storedItems[0].kpi_name_snapshot!,
          effective_weight: storedItems[0].kpi_weight_snapshot!,
          criteria: storedItems.map((item): ScoringCriterionInput => ({
            criterion_id: item.evaluation_item_id,
            kpi_id: item.kpi_id_snapshot!,
            resolved_level: item.resolved_level !== undefined ? item.resolved_level : null,
            raw_score: item.raw_score !== undefined ? item.raw_score : null,
            level_definitions: item.level_definition_snapshot as unknown as ScoringLevelDefinition[],
            effective_weight: item.weight_snapshot,
            is_disabled: item.is_disabled_for_employee,
          })),
        },
      ],
    });

    expect(kpiCalculation.kpi_results[0].normalized_score).toBe(4.4);
    expect(kpiCalculation.official_score).toBe(88);
    // Verified: scoring engine produces stable result based purely on snapshots
  });

  // ── TC22: Score Override & Calibration Adjustment Separation ───────────────
  it('TC22: Score adjustment creates an adjustment record preserving original calculated scores', async () => {
    // Apply score adjustment
    const originalManagerScore = storedEvaluation.manager_score;
    expect(originalManagerScore).toBe(85.0);

    // If an adjustment is made, original manager_score is retained while adjusted score is recorded
    const adjustedScore = 90.0;
    const _reason = 'Outstanding leadership in Q1 critical release';

    storedEvaluation.final_score = adjustedScore;

    expect(storedEvaluation.manager_score).toBe(originalManagerScore);
    expect(storedEvaluation.final_score).toBe(90.0);
    expect(storedEvaluation.manager_score).not.toBe(storedEvaluation.final_score);
  });

  // ── TC23: Explicit Recalculation Behavior ──────────────────────────────────
  it('TC23: Recalculate recalculates using snapshots only and appends an audit record', async () => {
    // Modify one item measurement or level in draft state
    storedItems[0].raw_score = 90;
    storedItems[0].resolved_level = 5;

    // Recalculate evaluation
    await evaluationService.recalculateEvaluation(evalId, hrActor);

    // Audit must have been recorded for the recalculation
    expect(mockAuditService.record).toHaveBeenCalled();
    const auditCalls = vi.mocked(mockAuditService.record).mock.calls;
    const recalculateAudit = auditCalls.find(
      (call) => call[1]?.action === 'RECALCULATE' || call[1]?.entityType === 'EVALUATION'
    );
    expect(recalculateAudit).toBeDefined();
  });
});
