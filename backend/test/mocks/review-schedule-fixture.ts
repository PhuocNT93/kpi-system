/**
 * In-memory, transaction-aware test world for the employee review schedule.
 *
 * - `store` holds employees, job levels, cadences and evaluations; `auditLog` holds audit rows.
 * - The fake transaction client snapshots store + audit on BEGIN and restores them on ROLLBACK, so tests can
 *   assert real atomicity (a failure after the publish write leaves NOTHING behind).
 * - Services under test are the real ones (ReviewScheduleService, AuditService, withAuditedTransaction,
 *   EmployeeCadenceService, OrganizationService, ReviewCadenceService, EvaluationService); only persistence is faked.
 */
import { vi } from 'vitest';
import type { Pool } from 'pg';
import { AuditService } from '../../src/modules/audit/application/audit.service.js';
import { AuditRecordParams, AuditLogQuery, PaginatedAuditLogs } from '../../src/modules/audit/domain/audit.domain.js';
import { AuditRepository } from '../../src/modules/audit/domain/audit.repository.js';
import { TransactionClient } from '../../src/shared/database/transaction.js';
import { QueryResultLike } from '../../src/shared/database/query-executor.js';
import { resolveEffectiveCadenceWithSource } from '../../src/modules/review-cadence/domain/cadence-precedence-resolver.js';
import { ReviewCadence } from '../../src/modules/review-cadence/domain/review-cadence.types.js';
import {
  EmployeeCadenceTiers,
  EmployeeScheduleRepository,
  EmployeeScheduleState,
  EmployeeScheduleWrite,
  ScheduleQueryRunner,
} from '../../src/modules/employee/domain/employee-schedule.repository.js';
import { EffectiveCadence } from '../../src/modules/employee/domain/review-schedule.js';
import { ReviewScheduleService } from '../../src/modules/employee/application/review-schedule.service.js';

export const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const HR_USER_ID = '11111111-1111-4111-8111-000000000001';
export const MANAGER_USER_ID = '11111111-1111-4111-8111-000000000002';

export interface StoredCadence {
  id: string;
  code: string;
  name: string;
  intervalMonths: number;
  isSystemDefault: boolean;
  active: boolean;
}

export interface StoredEmployee {
  employeeId: string;
  jobLevelId: string;
  overrideId: string | null;
  lastEvaluationCompletedAt: Date | null;
  nextReviewDueDate: string | null;
  version: number;
}

export interface StoredJobLevel {
  id: string;
  code: string;
  name: string;
  rank: number;
  active: boolean;
  defaultReviewCadenceId: string | null;
}

export interface StoredEvaluation {
  evaluation_id: string;
  employee_id: string;
  evaluation_cycle_id: string;
  status: string;
  is_locked: boolean;
  published_at: Date | null;
  final_score: number | null;
}

export interface Store {
  cadences: Map<string, StoredCadence>;
  jobLevels: Map<string, StoredJobLevel>;
  employees: Map<string, StoredEmployee>;
  evaluations: Map<string, StoredEvaluation>;
}

function cloneStore(store: Store): Store {
  return {
    cadences: new Map([...store.cadences].map(([k, v]) => [k, { ...v }])),
    jobLevels: new Map([...store.jobLevels].map(([k, v]) => [k, { ...v }])),
    employees: new Map([...store.employees].map(([k, v]) => [k, { ...v }])),
    evaluations: new Map([...store.evaluations].map(([k, v]) => [k, { ...v }])),
  };
}

function restoreStore(target: Store, source: Store): void {
  target.cadences = source.cadences;
  target.jobLevels = source.jobLevels;
  target.employees = source.employees;
  target.evaluations = source.evaluations;
}

export type FailurePoint = 'saveSchedules' | 'auditInsert' | null;

export interface RepositoryCallLog {
  lockByEmployeeIds: number;
  lockByJobLevelWithoutOverride: number;
  lockByCadence: number;
  resolveEffectiveCadences: number;
  saveSchedules: number;
  savedRowsPerCall: number[];
}

export class InMemoryAuditRepository implements AuditRepository {
  insertManyCalls = 0;

  constructor(private readonly world: ScheduleWorld) {}

  async insert(params: AuditRecordParams): Promise<void> {
    this.world.queries.push(`audit:${params.action}`);
    this.world.throwIfFailing('auditInsert');
    this.world.auditLog.push(params);
  }

  async insertMany(params: AuditRecordParams[]): Promise<void> {
    this.world.queries.push(...params.map((entry) => `audit:${entry.action}`));
    this.world.throwIfFailing('auditInsert');
    this.insertManyCalls += 1;
    this.world.auditLog.push(...params);
  }

  async deleteOlderThan(): Promise<number> {
    return 0;
  }

  async findMany(_filters: AuditLogQuery): Promise<PaginatedAuditLogs> {
    return { logs: [], total: 0 };
  }
}

export class InMemoryEmployeeScheduleRepository implements EmployeeScheduleRepository {
  calls: RepositoryCallLog = {
    lockByEmployeeIds: 0,
    lockByJobLevelWithoutOverride: 0,
    lockByCadence: 0,
    resolveEffectiveCadences: 0,
    saveSchedules: 0,
    savedRowsPerCall: [],
  };

  constructor(private readonly world: ScheduleWorld) {}

  private activeCadence(id: string | null): ReviewCadence | null {
    if (!id) return null;
    const cadence = this.world.store.cadences.get(id);
    if (!cadence || !cadence.active) return null;
    return { ...cadence };
  }

  private systemDefault(): ReviewCadence | null {
    const cadence = [...this.world.store.cadences.values()].find((c) => c.isSystemDefault && c.active);
    return cadence ? { ...cadence } : null;
  }

  tiers(employee: StoredEmployee): EmployeeCadenceTiers {
    const jobLevel = this.world.store.jobLevels.get(employee.jobLevelId);
    const employeeOverride = this.activeCadence(employee.overrideId);
    const jobLevelDefault = this.activeCadence(jobLevel?.defaultReviewCadenceId ?? null);
    const systemDefault = this.systemDefault();
    const resolved = resolveEffectiveCadenceWithSource({ employeeOverride, jobLevelDefault, systemDefault });
    const effectiveCadence: EffectiveCadence | null = resolved
      ? {
          id: resolved.cadence.id,
          code: resolved.cadence.code,
          name: resolved.cadence.name,
          intervalMonths: resolved.cadence.intervalMonths,
          source: resolved.source,
        }
      : null;
    return { employeeOverride, jobLevelDefault, systemDefault, effectiveCadence };
  }

  private state(employee: StoredEmployee): EmployeeScheduleState {
    return {
      employeeId: employee.employeeId,
      lastEvaluationCompletedAt: employee.lastEvaluationCompletedAt,
      nextReviewDueDate: employee.nextReviewDueDate,
      effectiveCadence: this.tiers(employee).effectiveCadence,
    };
  }

  private sorted(employees: StoredEmployee[]): EmployeeScheduleState[] {
    return [...employees].sort((a, b) => a.employeeId.localeCompare(b.employeeId)).map((e) => this.state(e));
  }

  async lockByEmployeeIds(_client: ScheduleQueryRunner, employeeIds: string[]): Promise<EmployeeScheduleState[]> {
    this.calls.lockByEmployeeIds += 1;
    this.world.queries.push('schedule:lockByEmployeeIds');
    const ids = new Set(employeeIds);
    return this.sorted([...this.world.store.employees.values()].filter((e) => ids.has(e.employeeId)));
  }

  async lockByJobLevelWithoutOverride(_client: ScheduleQueryRunner, jobLevelId: string): Promise<EmployeeScheduleState[]> {
    this.calls.lockByJobLevelWithoutOverride += 1;
    this.world.queries.push('schedule:lockByJobLevelWithoutOverride');
    return this.sorted(
      [...this.world.store.employees.values()].filter(
        (e) => e.jobLevelId === jobLevelId && this.activeCadence(e.overrideId) === null
      )
    );
  }

  async lockByCadence(
    _client: ScheduleQueryRunner,
    cadenceId: string,
    includeSystemDefaultFallback: boolean
  ): Promise<EmployeeScheduleState[]> {
    this.calls.lockByCadence += 1;
    this.world.queries.push('schedule:lockByCadence');
    return this.sorted(
      [...this.world.store.employees.values()].filter((e) => {
        const jobLevel = this.world.store.jobLevels.get(e.jobLevelId);
        const hasActiveOverride = this.activeCadence(e.overrideId) !== null;
        const hasActiveJobDefault = this.activeCadence(jobLevel?.defaultReviewCadenceId ?? null) !== null;
        return (
          e.overrideId === cadenceId ||
          (!hasActiveOverride && jobLevel?.defaultReviewCadenceId === cadenceId) ||
          (includeSystemDefaultFallback && !hasActiveOverride && !hasActiveJobDefault)
        );
      })
    );
  }

  async lockJobLevelsForShare(_client: ScheduleQueryRunner, jobLevelIds: string[]): Promise<void> {
    this.world.queries.push(`schedule:lockJobLevelsForShare:${jobLevelIds.length}`);
  }

  async resolveEffectiveCadences(
    _runner: ScheduleQueryRunner,
    employeeIds: string[]
  ): Promise<Map<string, EffectiveCadence | null>> {
    this.calls.resolveEffectiveCadences += 1;
    const result = new Map<string, EffectiveCadence | null>();
    for (const id of employeeIds) {
      const employee = this.world.store.employees.get(id);
      if (employee) result.set(id, this.tiers(employee).effectiveCadence);
    }
    return result;
  }

  async resolveCadenceTiers(_runner: ScheduleQueryRunner, employeeId: string): Promise<EmployeeCadenceTiers | null> {
    const employee = this.world.store.employees.get(employeeId);
    return employee ? this.tiers(employee) : null;
  }

  async saveSchedules(_client: ScheduleQueryRunner, rows: EmployeeScheduleWrite[]): Promise<void> {
    this.world.queries.push('schedule:saveSchedules');
    this.world.throwIfFailing('saveSchedules');
    this.calls.saveSchedules += 1;
    this.calls.savedRowsPerCall.push(rows.length);
    for (const row of rows) {
      const employee = this.world.store.employees.get(row.employeeId);
      if (!employee) continue;
      employee.lastEvaluationCompletedAt = row.lastEvaluationCompletedAt;
      employee.nextReviewDueDate = row.nextReviewDueDate;
    }
  }
}

export interface ScheduleWorld {
  store: Store;
  auditLog: AuditRecordParams[];
  queries: string[];
  failAt: FailurePoint;
  client: TransactionClient & { query: ReturnType<typeof vi.fn> };
  pool: Pool;
  auditRepo: InMemoryAuditRepository;
  auditService: AuditService;
  scheduleRepo: InMemoryEmployeeScheduleRepository;
  scheduleService: ReviewScheduleService;
  throwIfFailing(point: Exclude<FailurePoint, null>): void;
  addCadence(cadence: Partial<StoredCadence> & Pick<StoredCadence, 'id' | 'intervalMonths'>): StoredCadence;
  addJobLevel(id: string, defaultReviewCadenceId: string | null): StoredJobLevel;
  addEmployee(employee: Partial<StoredEmployee> & Pick<StoredEmployee, 'employeeId' | 'jobLevelId'>): StoredEmployee;
  employee(id: string): StoredEmployee;
  auditOf(action: string, employeeId?: string): AuditRecordParams[];
}

/** Handles the few raw SQL statements application services issue directly on the transaction client. */
function handleServiceSql(world: ScheduleWorld, sql: string, values: unknown[]): QueryResultLike<Record<string, unknown>> {
  const text = sql.replace(/\s+/g, ' ').trim();
  if (text.startsWith('SELECT 1 FROM review_cadence WHERE review_cadence_id')) {
    return { rows: world.store.cadences.has(String(values[0])) ? [{ '?column?': 1 }] : [] };
  }
  if (text.startsWith('SELECT review_cadence_override_id FROM employee')) {
    const employee = world.store.employees.get(String(values[0]));
    return { rows: employee ? [{ review_cadence_override_id: employee.overrideId }] : [] };
  }
  if (text.startsWith('UPDATE employee SET review_cadence_override_id')) {
    const employee = world.store.employees.get(String(values[2]));
    if (employee) employee.overrideId = (values[0] as string | null) ?? null;
    return { rows: [], rowCount: employee ? 1 : 0 };
  }
  return { rows: [] };
}

export function createScheduleWorld(): ScheduleWorld {
  let snapshot: { store: Store; auditLength: number } | null = null;

  const world = {
    store: { cadences: new Map(), jobLevels: new Map(), employees: new Map(), evaluations: new Map() } as Store,
    auditLog: [] as AuditRecordParams[],
    queries: [] as string[],
    failAt: null as FailurePoint,
  } as ScheduleWorld;

  world.throwIfFailing = (point) => {
    if (world.failAt === point) {
      throw new Error(`INJECTED_FAILURE:${point}`);
    }
  };

  const query = vi.fn(async (sql: string, values: unknown[] = []): Promise<QueryResultLike<Record<string, unknown>>> => {
    world.queries.push(sql.replace(/\s+/g, ' ').trim());
    if (sql === 'BEGIN') {
      snapshot = { store: cloneStore(world.store), auditLength: world.auditLog.length };
      return { rows: [] };
    }
    if (sql === 'COMMIT') {
      snapshot = null;
      return { rows: [] };
    }
    if (sql === 'ROLLBACK') {
      if (snapshot) {
        restoreStore(world.store, snapshot.store);
        world.auditLog.length = snapshot.auditLength;
      }
      snapshot = null;
      return { rows: [] };
    }
    return handleServiceSql(world, sql, values);
  });

  world.client = { query, release: vi.fn() } as ScheduleWorld['client'];
  world.pool = {
    connect: vi.fn(async () => world.client),
    query,
  } as unknown as Pool;

  world.auditRepo = new InMemoryAuditRepository(world);
  world.auditService = new AuditService(world.auditRepo);
  world.scheduleRepo = new InMemoryEmployeeScheduleRepository(world);
  world.scheduleService = new ReviewScheduleService(world.scheduleRepo, world.auditService, { timeZone: TIME_ZONE });

  world.addCadence = (cadence) => {
    const stored: StoredCadence = {
      code: cadence.code ?? `EVERY_${cadence.intervalMonths}_MONTHS`,
      name: cadence.name ?? `Every ${cadence.intervalMonths} months`,
      isSystemDefault: cadence.isSystemDefault ?? false,
      active: cadence.active ?? true,
      ...cadence,
    };
    world.store.cadences.set(stored.id, stored);
    return stored;
  };
  world.addJobLevel = (id, defaultReviewCadenceId) => {
    const stored: StoredJobLevel = { id, code: id, name: id, rank: 1, active: true, defaultReviewCadenceId };
    world.store.jobLevels.set(id, stored);
    return stored;
  };
  world.addEmployee = (employee) => {
    const stored: StoredEmployee = {
      overrideId: null,
      lastEvaluationCompletedAt: null,
      nextReviewDueDate: null,
      version: 1,
      ...employee,
    };
    world.store.employees.set(stored.employeeId, stored);
    return stored;
  };
  world.employee = (id) => {
    const employee = world.store.employees.get(id);
    if (!employee) throw new Error(`employee ${id} not in store`);
    return employee;
  };
  world.auditOf = (action, employeeId) =>
    world.auditLog.filter((a) => a.action === action && (employeeId === undefined || a.entityId === employeeId));

  return world;
}

/** Deterministic uuid-shaped ids (audit entity ids are uuid-validated). */
export function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}
