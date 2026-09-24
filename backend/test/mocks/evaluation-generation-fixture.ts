import { vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import type {
  Evaluation,
  EvaluationItem,
  EvaluationCycle,
  EvaluationEmployeeRecord,
  ActiveEvaluationRef,
} from '../../src/modules/evaluation-cycle/domain/evaluation-cycle.types.js';
import {
  EvaluationCycleStatus,
  EvaluationCycleType,
} from '../../src/modules/evaluation-cycle/domain/evaluation-cycle.types.js';
import type {
  IEvaluationCycleRepository,
  IEvaluationRepository,
  IEvaluationItemRepository,
  NewEvaluationCycle,
} from '../../src/modules/evaluation-cycle/domain/evaluation-cycle.repository.js';

/**
 * Fixture for EVAL-02 generation tests. A fake transaction client answers every query the
 * generation/opening/individual flows issue, so the real service code runs without Postgres.
 */
export const IDS = {
  templateVersion: '10000000-0000-4000-8000-000000000001',
  template: '10000000-0000-4000-8000-000000000002',
  legacyTemplate: '10000000-0000-4000-8000-000000000003',
  legacyTemplateVersion: '10000000-0000-4000-8000-000000000004',
  tcCommon: '20000000-0000-4000-8000-000000000001',
  tcRoleOnly: '20000000-0000-4000-8000-000000000002',
  cvCommon: '30000000-0000-4000-8000-000000000001',
  cvRoleOnly: '30000000-0000-4000-8000-000000000002',
  criterionCommon: '40000000-0000-4000-8000-000000000001',
  criterionRoleOnly: '40000000-0000-4000-8000-000000000002',
  legacyTcCommon: '50000000-0000-4000-8000-000000000001',
  legacyTcRoleOnly: '50000000-0000-4000-8000-000000000002',
  teamA: '60000000-0000-4000-8000-000000000001',
  teamB: '60000000-0000-4000-8000-000000000002',
  roleDev: '70000000-0000-4000-8000-000000000001',
  roleQa: '70000000-0000-4000-8000-000000000002',
  level: '80000000-0000-4000-8000-000000000001',
  manager: '90000000-0000-4000-8000-000000000001',
  empA: 'a0000000-0000-4000-8000-00000000000a',
  empB: 'a0000000-0000-4000-8000-00000000000b',
  empC: 'a0000000-0000-4000-8000-00000000000c',
  actorEmployee: 'a0000000-0000-4000-8000-0000000000ff',
  actorUser: 'b0000000-0000-4000-8000-0000000000ff',
  batchCycle: 'c0000000-0000-4000-8000-000000000001',
  historicalTeam: '60000000-0000-4000-8000-0000000000aa',
} as const;

export interface FixtureOptions {
  templateStatus?: string;
  kpiWeights?: [number, number];
  /** Employees returned by the batch employee query, keyed by id. */
  batchEmployees?: Record<string, unknown>[];
  /** Historical employee_assignment rows. */
  assignments?: Record<string, unknown>[];
  /** Rows returned by the SELECT … FOR UPDATE OF e employee lock. */
  lockedEmployees?: Record<string, unknown>[];
  activeEvaluations?: Record<string, unknown>[];
  upcomingBatchCycles?: Record<string, unknown>[];
  /** Result of the "latest PUBLISHED template version" lookup; null = none published. */
  latestPublishedTemplateVersionId?: string | null;
}

export interface RecordedQuery {
  sql: string;
  params: unknown[];
}

export function employeeRow(
  id: string,
  code: string,
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    employee_id: id,
    employee_code: code,
    team_id: IDS.teamA,
    role_id: IDS.roleDev,
    job_level_id: IDS.level,
    manager_id: IDS.manager,
    employment_status: 'ACTIVE',
    ...overrides,
  };
}

function templateCriteriaRows(kpiWeights: [number, number]): Record<string, unknown>[] {
  return [
    {
      template_criterion_id: IDS.tcCommon,
      evaluation_template_version_id: IDS.templateVersion,
      criterion_version_id: IDS.cvCommon,
      criterion_weight: '60',
      applicability: null,
      is_disabled: false,
      display_order: 1,
      template_kpi_id: 'tk-1',
      kpi_id: 'kpi-1',
      kpi_weight: String(kpiWeights[0]),
      effective_weight: String((60 * kpiWeights[0]) / 100),
      kpi_code: 'KPI_ON_TIME',
      kpi_name: 'On-time delivery',
      criterion_id: IDS.criterionCommon,
      criterion_code: 'DELIVERY',
      criterion_name: 'Delivery',
      rule_type: 'RANGE_THRESHOLD',
      rule_config: '{"thresholds":[50,80]}',
    },
    {
      template_criterion_id: IDS.tcRoleOnly,
      evaluation_template_version_id: IDS.templateVersion,
      criterion_version_id: IDS.cvRoleOnly,
      criterion_weight: '40',
      applicability: JSON.stringify({ rules: [{ dimension: 'ROLE', values: [IDS.roleQa] }] }),
      is_disabled: false,
      display_order: 2,
      template_kpi_id: 'tk-2',
      kpi_id: 'kpi-2',
      kpi_weight: String(kpiWeights[1]),
      effective_weight: String((40 * kpiWeights[1]) / 100),
      kpi_code: 'KPI_BUGS',
      kpi_name: 'Bugs found',
      criterion_id: IDS.criterionRoleOnly,
      criterion_code: 'QUALITY',
      criterion_name: '{"en":"Quality"}',
      rule_type: 'COUNT_THRESHOLD',
      rule_config: { thresholds: [1, 5] },
    },
  ];
}

function mirrorRows(): Record<string, unknown>[] {
  return [IDS.cvCommon, IDS.cvRoleOnly].map((cvId, index) => ({
    current_criterion_version_id: cvId,
    version_no: 1,
    default_weight: '50',
    measurement_unit: 'PERCENT',
    measurement_source_label: null,
    scoring_rule_id: `sr-${index}`,
    effective_from: '2026-01-01',
    effective_to: null,
    current_criterion_id: index === 0 ? IDS.criterionCommon : IDS.criterionRoleOnly,
    criterion_code: index === 0 ? 'DELIVERY' : 'QUALITY',
    criterion_name: index === 0 ? 'Delivery' : 'Quality',
    criterion_category: 'CORE',
    criterion_description: null,
    criterion_status: 'ACTIVE',
    criterion_created_at: '2026-01-01T00:00:00Z',
    criterion_created_by: null,
    criterion_updated_at: '2026-01-01T00:00:00Z',
    criterion_updated_by: null,
    current_scoring_rule_id: `sr-${index}`,
    scoring_rule_code: `SR${index}`,
    scoring_rule_name: `Rule ${index}`,
    scoring_rule_type: 'RANGE_THRESHOLD',
    scoring_rule_config: '{}',
    scoring_rule_status: 'PUBLISHED',
    scoring_rule_created_at: '2026-01-01T00:00:00Z',
    scoring_rule_created_by: null,
    scoring_rule_updated_at: '2026-01-01T00:00:00Z',
    scoring_rule_updated_by: null,
  }));
}

export function createFakeDb(options: FixtureOptions = {}) {
  const queries: RecordedQuery[] = [];
  const kpiWeights = options.kpiWeights ?? [100, 100];

  const answer = (sql: string, params: unknown[]): Record<string, unknown>[] => {
    const text = sql.replace(/\s+/g, ' ').trim();
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(text)) return [];
    if (text.startsWith('SELECT employee_id FROM employee WHERE employee_id = $1')) return [{ employee_id: params[0] }];
    if (text.startsWith('SELECT id FROM app_user WHERE id = $1')) return [{ id: params[0] }];
    if (text.startsWith("SELECT id FROM evaluation_template_versions WHERE status = 'PUBLISHED'")) {
      return options.latestPublishedTemplateVersionId === null ? [] : [{ id: options.latestPublishedTemplateVersionId ?? IDS.templateVersion }];
    }
    if (text.includes('SELECT id, status FROM evaluation_template_versions')) {
      return [{ id: params[0], status: options.templateStatus ?? 'PUBLISHED' }];
    }
    if (text.includes('SELECT template_id, version_no FROM evaluation_template_versions')) {
      return [{ template_id: IDS.template, version_no: 1 }];
    }
    if (text.includes('FROM evaluation_templates WHERE id')) {
      return [{ code: 'ENG_TPL', name: 'Engineering', description: null, status: 'PUBLISHED', created_at: null, created_by: null, updated_at: null, updated_by: null }];
    }
    if (text.includes('SELECT evaluation_template_id FROM evaluation_template WHERE code')) {
      return [{ evaluation_template_id: IDS.legacyTemplate }];
    }
    if (text.includes('SELECT evaluation_template_version_id FROM evaluation_template_version WHERE')) {
      return [{ evaluation_template_version_id: IDS.legacyTemplateVersion }];
    }
    if (text.includes('FROM template_criteria tc')) return templateCriteriaRows(kpiWeights);
    if (text.includes('FROM criterion_versions cv JOIN criteria c')) return mirrorRows();
    if (text.includes('SELECT scoring_rule_id FROM scoring_rule')) return [{ scoring_rule_id: 'legacy-sr' }];
    if (text.includes('SELECT criterion_id FROM criterion WHERE code')) return [{ criterion_id: `legacy-${String(params[0])}` }];
    if (text.includes('SELECT criterion_version_id FROM criterion_version WHERE')) {
      return [{ criterion_version_id: `legacy-cv-${String(params[0])}` }];
    }
    if (text.includes('SELECT template_criterion_id FROM template_criterion WHERE')) {
      return [{ template_criterion_id: params[1] === 'legacy-cv-legacy-DELIVERY' ? IDS.legacyTcCommon : IDS.legacyTcRoleOnly }];
    }
    if (text.includes('FROM criterion_level')) {
      return [IDS.cvCommon, IDS.cvRoleOnly].flatMap((cvId) => [
        { criterion_level_id: `${cvId}-1`, criterion_version_id: cvId, level_no: '1', label_en: 'Low', label_vn: 'Thấp', score_value: '1' },
        { criterion_level_id: `${cvId}-2`, criterion_version_id: cvId, level_no: '2', label_en: 'High', label_vn: 'Cao', score_value: '5' },
      ]);
    }
    if (text.includes('FROM i18n_translation')) {
      return [
        { entity_id: IDS.criterionCommon, locale: 'en', field_name: 'name', value: 'Delivery' },
        { entity_id: IDS.criterionCommon, locale: 'vi', field_name: 'name', value: 'Giao hàng' },
      ];
    }
    if (text.includes('FROM employee_assignment')) return options.assignments ?? [];
    if (text.includes('SELECT employee_id, team_id, role_id, job_level_id, manager_id FROM employee WHERE')) {
      return options.batchEmployees ?? [];
    }
    if (text.includes('JOIN app_user u ON LOWER(u.email) = LOWER(e.email)')) {
      return [{ user_id: `user-${String(params[0]).slice(-2)}`, email: `${String(params[0]).slice(-2)}@example.test` }];
    }
    if (text.includes('FOR UPDATE OF e')) return options.lockedEmployees ?? [];
    if (text.includes('FROM evaluation ev JOIN evaluation_cycle ec')) return options.activeEvaluations ?? [];
    if (text.includes('FROM evaluation_cycle WHERE cycle_type = $1')) return options.upcomingBatchCycles ?? [];
    throw new Error(`Unexpected query in fake DB: ${text.slice(0, 160)}`);
  };

  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
    return { rows: answer(sql, params) };
  });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = { connect: vi.fn(async () => client), query } as unknown as Pool;

  return { pool, client, queries };
}

/** Evaluation repository double: records batchCreate payloads and serves lock/active queries through the fake client. */
export function createRecordingEvaluationRepo() {
  const payloads: Omit<Evaluation, 'evaluationId' | 'createdAt' | 'updatedAt'>[][] = [];
  let counter = 0;
  const repo: IEvaluationRepository = {
    batchCreate: vi.fn(async (evaluations) => {
      payloads.push(evaluations);
      return evaluations.map((ev) => ({
        ...ev,
        evaluationId: `eval-${++counter}-${ev.employeeId.slice(-2)}`,
        createdAt: '2026-09-24T00:00:00.000Z',
        updatedAt: '2026-09-24T00:00:00.000Z',
      }));
    }),
    lockEvaluationsByCycleId: vi.fn(async () => undefined),
    findByCycleAndEmployee: vi.fn(async () => null),
    lockEmployeesForEvaluation: vi.fn(async (ids: string[], client: PoolClient): Promise<EvaluationEmployeeRecord[]> => {
      const res = await client.query(
        'SELECT e.employee_id FROM employee e WHERE e.employee_id = ANY($1::uuid[]) ORDER BY e.employee_id FOR UPDATE OF e',
        [ids]
      );
      return (res.rows as Record<string, unknown>[]).map((row) => ({
        employeeId: row.employee_id as string,
        employeeCode: row.employee_code as string,
        teamId: (row.team_id as string | null) ?? null,
        roleId: (row.role_id as string | null) ?? null,
        jobLevelId: (row.job_level_id as string | null) ?? null,
        managerId: (row.manager_id as string | null) ?? null,
        employmentStatus: row.employment_status as string,
      }));
    }),
    findActiveEvaluationsByEmployees: vi.fn(async (ids: string[], client: PoolClient): Promise<ActiveEvaluationRef[]> => {
      const res = await client.query('SELECT ev.evaluation_id FROM evaluation ev JOIN evaluation_cycle ec ON 1=1', [ids]);
      return (res.rows as Record<string, unknown>[]).map((row) => ({
        evaluationId: row.evaluation_id as string,
        evaluationCycleId: row.evaluation_cycle_id as string,
        employeeId: row.employee_id as string,
        status: row.status as string,
      }));
    }),
  };
  return { repo, payloads };
}

export function createRecordingItemRepo(options: { failOnCall?: number } = {}) {
  const payloads: Omit<EvaluationItem, 'evaluationItemId' | 'createdAt' | 'updatedAt'>[][] = [];
  const repo: IEvaluationItemRepository = {
    batchCreate: vi.fn(async (items) => {
      payloads.push(items);
      if (options.failOnCall === payloads.length) {
        throw new Error('simulated evaluation_item insert failure');
      }
      return items.map((item, index) => ({
        ...item,
        evaluationItemId: `item-${payloads.length}-${index}`,
        createdAt: '2026-09-24T00:00:00.000Z',
        updatedAt: '2026-09-24T00:00:00.000Z',
      }));
    }),
  };
  return { repo, payloads };
}

export function buildCycle(overrides: Partial<EvaluationCycle> = {}): EvaluationCycle {
  return {
    evaluationCycleId: IDS.batchCycle,
    code: 'H2-2026',
    name: '2026 H2',
    cycleType: EvaluationCycleType.BATCH,
    triggeredByEmployeeId: null,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: EvaluationCycleStatus.DRAFT,
    evaluationTemplateVersionId: IDS.templateVersion,
    applicableTeamIds: [],
    applicableRoleIds: [],
    applicableEmployeeIds: [],
    approvedBy: null,
    lockedAt: null,
    calibrationEnabled: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

/** Cycle repository double; `findUpcomingBatchCycles` routes through the fake client for parameter assertions. */
export function createRecordingCycleRepo(existing: EvaluationCycle | null = null) {
  const created: NewEvaluationCycle[] = [];
  const updated: EvaluationCycle[] = [];
  const repo: IEvaluationCycleRepository = {
    findById: vi.fn(async () => existing),
    findByIdForUpdate: vi.fn(async () => (existing ? { ...existing } : null)),
    findByCode: vi.fn(async () => null),
    findMany: vi.fn(async () => ({ items: [], total: 0 })),
    create: vi.fn(async (cycle: NewEvaluationCycle) => {
      created.push(cycle);
      return {
        ...cycle,
        cycleType: cycle.cycleType ?? EvaluationCycleType.BATCH,
        triggeredByEmployeeId: cycle.triggeredByEmployeeId ?? null,
        evaluationCycleId: `cycle-${created.length}`,
        createdAt: '2026-09-24T00:00:00.000Z',
        updatedAt: '2026-09-24T00:00:00.000Z',
      };
    }),
    update: vi.fn(async (cycle: EvaluationCycle) => {
      updated.push({ ...cycle });
      return cycle;
    }),
    lockCycle: vi.fn(async () => {
      throw new Error('not used');
    }),
    findUpcomingBatchCycles: vi.fn(async (fromDate: string, toDate: string, client: PoolClient) => {
      const res = await client.query('SELECT evaluation_cycle_id FROM evaluation_cycle WHERE cycle_type = $1', [
        'BATCH',
        'DRAFT',
        fromDate,
        toDate,
      ]);
      return (res.rows as Record<string, unknown>[]).map((row) => buildCycle(row as Partial<EvaluationCycle>));
    }),
  };
  return { repo, created, updated };
}
