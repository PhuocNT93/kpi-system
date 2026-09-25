/**
 * ReviewScheduleService — the single owner of employee.last_evaluation_completed_at and
 * employee.next_review_due_date (LLD §14.1, Risk #12).
 *
 * - On publish: the completion timestamp becomes the new base and the due date is derived from it.
 * - On any effective-cadence change: the due date is re-derived from the EXISTING base (Rule 9, no drift);
 *   the base itself is never touched outside a publish.
 * - Every schedule change is audited in the caller's transaction; callers pass their transaction client,
 *   so a failure here rolls back the business write that triggered it.
 */
import { AuditService } from '../../audit/application/audit.service.js';
import { AuditRecordParams } from '../../audit/domain/audit.domain.js';
import { TransactionClient } from '../../../shared/database/transaction.js';
import { getBusinessTimeZone } from '../../../config/evaluation-cycle.config.js';
import {
  PendingScheduleRecalculation,
  ReviewCadenceChangeHandler,
  ReviewCadenceChangeScope,
} from '../../review-cadence/domain/review-cadence-change-handler.js';
import {
  EmployeeCadenceTiers,
  EmployeeScheduleRepository,
  EmployeeScheduleState,
  EmployeeScheduleWrite,
  ScheduleQueryRunner,
} from '../domain/employee-schedule.repository.js';
import { EvaluationPublishedEvent, EvaluationPublishedHandler } from '../domain/review-schedule.port.js';
import { JobLevelCadenceChangeHandler } from '../../organization/domain/job-level-cadence-change-handler.js';
import { computeDueDate, EffectiveCadence, ReviewScheduleTrigger } from '../domain/review-schedule.js';

const SCHEDULE_FIELD = 'next_review_due_date';

interface ScheduleAuditValue {
  employee_id: string;
  trigger?: ReviewScheduleTrigger;
  evaluation_id?: string;
  last_evaluation_completed_at: string | null;
  next_review_due_date: string | null;
  effective_cadence: {
    id: string;
    code: string;
    interval_months: number;
    source: EffectiveCadence['source'];
  } | null;
}

/** Employees locked before a cadence-affecting write, with their schedule as it was before the write. */
export interface ScheduleSnapshot {
  readonly states: readonly EmployeeScheduleState[];
}

/** Schedule of one employee after a recalculation. */
export interface RecalculatedSchedule {
  effectiveCadence: EffectiveCadence | null;
  lastEvaluationCompletedAt: Date | null;
  nextReviewDueDate: string | null;
}

export interface ReviewScheduleServiceOptions {
  /** IANA timezone for business dates; defaults to BUSINESS_TIMEZONE (Asia/Ho_Chi_Minh). */
  timeZone?: string;
}

function toAuditCadence(cadence: EffectiveCadence | null): ScheduleAuditValue['effective_cadence'] {
  if (!cadence) return null;
  return { id: cadence.id, code: cadence.code, interval_months: cadence.intervalMonths, source: cadence.source };
}

function toAuditValue(
  employeeId: string,
  base: Date | null,
  dueDate: string | null,
  cadence: EffectiveCadence | null,
  context: Pick<ScheduleAuditValue, 'trigger' | 'evaluation_id'> = {}
): string {
  const value: ScheduleAuditValue = {
    employee_id: employeeId,
    ...context,
    last_evaluation_completed_at: base ? base.toISOString() : null,
    next_review_due_date: dueDate,
    effective_cadence: toAuditCadence(cadence),
  };
  return JSON.stringify(value);
}

export class ReviewScheduleService
  implements EvaluationPublishedHandler, ReviewCadenceChangeHandler, JobLevelCadenceChangeHandler
{
  private readonly timeZone: string;

  constructor(
    private readonly scheduleRepo: EmployeeScheduleRepository,
    private readonly auditService: AuditService,
    options: ReviewScheduleServiceOptions = {}
  ) {
    this.timeZone = options.timeZone ?? getBusinessTimeZone();
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  async resolveEffectiveCadences(
    runner: ScheduleQueryRunner,
    employeeIds: string[]
  ): Promise<Map<string, EffectiveCadence | null>> {
    return this.scheduleRepo.resolveEffectiveCadences(runner, [...new Set(employeeIds)]);
  }

  async resolveCadenceTiers(runner: ScheduleQueryRunner, employeeId: string): Promise<EmployeeCadenceTiers | null> {
    return this.scheduleRepo.resolveCadenceTiers(runner, employeeId);
  }

  async resolveEffectiveCadence(runner: ScheduleQueryRunner, employeeId: string): Promise<EffectiveCadence | null> {
    const cadences = await this.resolveEffectiveCadences(runner, [employeeId]);
    return cadences.get(employeeId) ?? null;
  }

  // ── Publish (EVAL-06) ────────────────────────────────────────────────────

  async onEvaluationsPublished(
    client: TransactionClient,
    events: EvaluationPublishedEvent[],
    actorUserId: string | null
  ): Promise<void> {
    if (events.length === 0) return;

    // One employee may appear several times (e.g. calibration); the latest completion wins.
    const latestByEmployee = new Map<string, EvaluationPublishedEvent>();
    for (const event of events) {
      const current = latestByEmployee.get(event.employeeId);
      if (!current || event.publishedAt.getTime() >= current.publishedAt.getTime()) {
        latestByEmployee.set(event.employeeId, event);
      }
    }

    const states = await this.scheduleRepo.lockByEmployeeIds(client, [...latestByEmployee.keys()]);
    const writes: EmployeeScheduleWrite[] = [];
    const audits: AuditRecordParams[] = [];

    for (const state of states) {
      const event = latestByEmployee.get(state.employeeId);
      if (!event) continue;
      const nextDueDate = computeDueDate(event.publishedAt, state.effectiveCadence, this.timeZone);
      writes.push({
        employeeId: state.employeeId,
        lastEvaluationCompletedAt: event.publishedAt,
        nextReviewDueDate: nextDueDate,
      });
      audits.push({
        entityType: 'EMPLOYEE',
        entityId: state.employeeId,
        action: 'SCHEDULE_UPDATED',
        fieldName: SCHEDULE_FIELD,
        oldValue: toAuditValue(state.employeeId, state.lastEvaluationCompletedAt, state.nextReviewDueDate, state.effectiveCadence),
        newValue: toAuditValue(state.employeeId, event.publishedAt, nextDueDate, state.effectiveCadence, {
          trigger: 'EVALUATION_PUBLISHED',
          evaluation_id: event.evaluationId,
        }),
        reason: `EVALUATION_PUBLISHED evaluation_id=${event.evaluationId}`,
        performedBy: actorUserId,
        source: 'APPLICATION_SERVICE',
      });
    }

    await this.scheduleRepo.saveSchedules(client, writes, actorUserId);
    await this.auditService.recordMany(client, audits);
  }

  // ── Recalculation on effective-cadence change ────────────────────────────

  /** Locks employees and captures their schedule BEFORE a write that may change their effective cadence. */
  async captureEmployees(client: ScheduleQueryRunner, employeeIds: string[]): Promise<ScheduleSnapshot> {
    return { states: await this.scheduleRepo.lockByEmployeeIds(client, [...new Set(employeeIds)]) };
  }

  /** Serializes with concurrent job-level default changes for the given levels (call before capturing). */
  async lockJobLevelsForShare(client: ScheduleQueryRunner, jobLevelIds: string[]): Promise<void> {
    await this.scheduleRepo.lockJobLevelsForShare(client, jobLevelIds);
  }

  async captureJobLevel(client: ScheduleQueryRunner, jobLevelId: string): Promise<ScheduleSnapshot> {
    return { states: await this.scheduleRepo.lockByJobLevelWithoutOverride(client, jobLevelId) };
  }

  async captureCadence(client: ScheduleQueryRunner, scope: ReviewCadenceChangeScope): Promise<ScheduleSnapshot> {
    return {
      states: await this.scheduleRepo.lockByCadence(client, scope.cadenceId, scope.affectsSystemDefaultFallback),
    };
  }

  /**
   * Re-derives next_review_due_date AFTER the write, from each employee's existing last_evaluation_completed_at
   * and the newly effective cadence. Only employees whose due date actually changes are written and audited.
   * Returns the resulting schedule per captured employee.
   */
  async applyRecalculation(
    client: TransactionClient,
    snapshot: ScheduleSnapshot,
    trigger: ReviewScheduleTrigger,
    actorUserId: string | null,
    reason?: string
  ): Promise<Map<string, RecalculatedSchedule>> {
    const employeeIds = snapshot.states.map((state) => state.employeeId);
    const results = new Map<string, RecalculatedSchedule>();
    const afterCadences = await this.scheduleRepo.resolveEffectiveCadences(client, employeeIds);
    const writes: EmployeeScheduleWrite[] = [];
    const audits: AuditRecordParams[] = [];

    for (const before of snapshot.states) {
      const afterCadence = afterCadences.get(before.employeeId) ?? null;
      const nextDueDate = computeDueDate(before.lastEvaluationCompletedAt, afterCadence, this.timeZone);
      results.set(before.employeeId, {
        effectiveCadence: afterCadence,
        lastEvaluationCompletedAt: before.lastEvaluationCompletedAt,
        nextReviewDueDate: nextDueDate,
      });
      if (nextDueDate === before.nextReviewDueDate) continue;

      writes.push({
        employeeId: before.employeeId,
        lastEvaluationCompletedAt: before.lastEvaluationCompletedAt,
        nextReviewDueDate: nextDueDate,
      });
      audits.push({
        entityType: 'EMPLOYEE',
        entityId: before.employeeId,
        action: 'SCHEDULE_RECALC',
        fieldName: SCHEDULE_FIELD,
        oldValue: toAuditValue(before.employeeId, before.lastEvaluationCompletedAt, before.nextReviewDueDate, before.effectiveCadence),
        newValue: toAuditValue(before.employeeId, before.lastEvaluationCompletedAt, nextDueDate, afterCadence, { trigger }),
        reason: reason ? `${trigger}: ${reason}` : trigger,
        performedBy: actorUserId,
        source: 'APPLICATION_SERVICE',
      });
    }

    await this.scheduleRepo.saveSchedules(client, writes, actorUserId);
    await this.auditService.recordMany(client, audits);
    return results;
  }

  // ── ReviewCadenceChangeHandler (called by the review-cadence module) ─────

  async prepareCadenceChange(
    client: TransactionClient,
    scope: ReviewCadenceChangeScope
  ): Promise<PendingScheduleRecalculation> {
    const snapshot = await this.captureCadence(client, scope);
    return {
      apply: async (actorUserId: string | null, reason: string): Promise<void> => {
        await this.applyRecalculation(client, snapshot, 'REVIEW_CADENCE_CHANGED', actorUserId, reason);
      },
    };
  }

  // ── JobLevelCadenceChangeHandler (called by the organization module) ─────

  async prepareJobLevelDefaultChange(
    client: TransactionClient,
    jobLevelId: string
  ): Promise<PendingScheduleRecalculation> {
    const snapshot = await this.captureJobLevel(client, jobLevelId);
    return {
      apply: async (actorUserId: string | null, reason: string): Promise<void> => {
        await this.applyRecalculation(client, snapshot, 'JOB_LEVEL_DEFAULT_CHANGED', actorUserId, reason);
      },
    };
  }
}
