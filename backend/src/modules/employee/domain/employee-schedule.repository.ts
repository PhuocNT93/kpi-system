import { QueryResultLike } from '../../../shared/database/query-executor.js';
import { ReviewCadence } from '../../review-cadence/domain/review-cadence.types.js';
import { EffectiveCadence } from './review-schedule.js';

/** Minimal query surface shared by Pool, PoolClient and TransactionClient. */
export interface ScheduleQueryRunner {
  query(queryText: string, values?: unknown[]): Promise<QueryResultLike<Record<string, unknown>>>;
}

/** An employee's review schedule together with the cadence currently in effect for them. */
export interface EmployeeScheduleState {
  employeeId: string;
  lastEvaluationCompletedAt: Date | null;
  nextReviewDueDate: string | null;
  effectiveCadence: EffectiveCadence | null;
}

/** The three precedence tiers (active cadences only) plus the resolved effective cadence. */
export interface EmployeeCadenceTiers {
  employeeOverride: ReviewCadence | null;
  jobLevelDefault: ReviewCadence | null;
  systemDefault: ReviewCadence | null;
  effectiveCadence: EffectiveCadence | null;
}

export interface EmployeeScheduleWrite {
  employeeId: string;
  lastEvaluationCompletedAt: Date | null;
  nextReviewDueDate: string | null;
}

/**
 * Persistence for employee.last_evaluation_completed_at / employee.next_review_due_date.
 * Only ReviewScheduleService uses it; every lock/write method must receive the caller's transaction client.
 * Rows are always locked in employee_id order to avoid deadlocks between concurrent batch recalculations.
 */
export interface EmployeeScheduleRepository {
  lockByEmployeeIds(client: ScheduleQueryRunner, employeeIds: string[]): Promise<EmployeeScheduleState[]>;

  /** Employees of a job level that have no active personal override (they follow the job-level default). */
  lockByJobLevelWithoutOverride(client: ScheduleQueryRunner, jobLevelId: string): Promise<EmployeeScheduleState[]>;

  /**
   * Employees whose effective cadence may depend on the given cadence: override = cadence, job-level default =
   * cadence without an active override, and — when `includeSystemDefaultFallback` — employees that have neither
   * an active override nor an active job-level default.
   */
  lockByCadence(
    client: ScheduleQueryRunner,
    cadenceId: string,
    includeSystemDefaultFallback: boolean
  ): Promise<EmployeeScheduleState[]>;

  /**
   * FOR SHARE lock on job levels whose default cadence is read by the caller, so a concurrent
   * job-level default change cannot interleave with an employee job-level change.
   */
  lockJobLevelsForShare(client: ScheduleQueryRunner, jobLevelIds: string[]): Promise<void>;

  /** Current effective cadence per employee (no lock). Employees without any cadence map to null. */
  resolveEffectiveCadences(
    runner: ScheduleQueryRunner,
    employeeIds: string[]
  ): Promise<Map<string, EffectiveCadence | null>>;

  /** Precedence tiers of one employee (no lock); null when the employee does not exist. */
  resolveCadenceTiers(runner: ScheduleQueryRunner, employeeId: string): Promise<EmployeeCadenceTiers | null>;

  /** One set-based UPDATE; writes only the two schedule columns. */
  saveSchedules(client: ScheduleQueryRunner, rows: EmployeeScheduleWrite[], updatedBy: string | null): Promise<void>;
}
