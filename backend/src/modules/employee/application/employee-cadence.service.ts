import { Pool } from 'pg';
import { Actor } from '../../../shared/auth/types.js';
import { toQueryExecutor } from '../../../shared/database/query-executor.js';
import { Forbidden, NotFound, VersionMismatch } from '../../../api/app-error.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { withAuditedTransaction } from '../../audit/application/audit-transaction.js';
import { ReviewCadenceRepository } from '../../review-cadence/domain/review-cadence.repository.js';
import { ReviewCadence } from '../../review-cadence/domain/review-cadence.types.js';
import { PostgresReviewCadenceRepository } from '../../review-cadence/infrastructure/postgres-review-cadence.repository.js';
import { Employee } from '../domain/employee.domain.js';
import { EmployeeRepository } from '../domain/employee.repository.js';
import { EffectiveCadence } from '../domain/review-schedule.js';
import { ReviewScheduleService, ScheduleSnapshot } from './review-schedule.service.js';

export interface UpdateCadenceOverrideInput {
  review_cadence_override_id: string | null;
  reason?: string;
}

export interface EffectiveCadenceResponse {
  id: string;
  code: string;
  name: string;
  interval_months: number;
  source: EffectiveCadence['source'];
}

export interface EmployeeCadenceOverrideResult {
  employee_id: string;
  review_cadence_override_id: string | null;
  last_evaluation_completed_at: string | null;
  next_review_due_date: string | null;
  effective_cadence: EffectiveCadenceResponse | null;
}

/** Response of GET /employees/:id/review-cadence (camelCase, kept for backward compatibility). */
export interface EmployeeCadenceInfo {
  effectiveCadence: (EffectiveCadence & { isSystemDefault: boolean; active: boolean }) | null;
  employeeOverride: ReviewCadence | null;
  jobLevelDefault: ReviewCadence | null;
  systemDefault: ReviewCadence | null;
}

export function toEffectiveCadenceResponse(cadence: EffectiveCadence | null | undefined): EffectiveCadenceResponse | null {
  if (!cadence) return null;
  return {
    id: cadence.id,
    code: cadence.code,
    name: cadence.name,
    interval_months: cadence.intervalMonths,
    source: cadence.source,
  };
}

function requireHrOrAdmin(actor: Actor, message: string): void {
  if (actor.role !== 'HR_ADMIN' && actor.role !== 'SYSTEM_ADMIN') {
    throw new Forbidden(message);
  }
}

/**
 * Employee-side use cases that change an employee's effective review cadence (personal override, job level).
 * Each runs the business write, the schedule recalculation (ReviewScheduleService) and the audit entries
 * in ONE transaction.
 */
export class EmployeeCadenceService {
  private readonly cadenceRepo: ReviewCadenceRepository;

  constructor(
    private readonly pool: Pool,
    private readonly auditService: AuditService,
    private readonly reviewScheduleService: ReviewScheduleService,
    private readonly employeeRepo: EmployeeRepository,
    cadenceRepo?: ReviewCadenceRepository
  ) {
    this.cadenceRepo = cadenceRepo ?? new PostgresReviewCadenceRepository(pool);
  }

  /**
   * Sets or clears an employee's personal cadence override and recalculates next_review_due_date from the
   * existing last_evaluation_completed_at (never from today).
   */
  async updateCadenceOverride(
    actor: Actor,
    employeeId: string,
    input: UpdateCadenceOverrideInput
  ): Promise<EmployeeCadenceOverrideResult> {
    requireHrOrAdmin(actor, 'Only HR Admin or System Admin can update employee review cadence overrides.');

    const overrideId = input.review_cadence_override_id;
    if (overrideId) {
      const cadence = await this.cadenceRepo.findById(overrideId);
      if (!cadence || !cadence.active) {
        throw new NotFound(`Review Cadence with ID ${overrideId}`);
      }
    }

    return withAuditedTransaction<EmployeeCadenceOverrideResult>(
      this.pool,
      this.auditService,
      async (client, audit) => {
        const snapshot = await this.reviewScheduleService.captureEmployees(client, [employeeId]);
        if (snapshot.states.length === 0) {
          throw new NotFound(`Employee with ID ${employeeId}`);
        }

        const currentRes = await client.query(
          'SELECT review_cadence_override_id FROM employee WHERE employee_id = $1',
          [employeeId]
        );
        const currentOverrideRaw = currentRes.rows[0]?.['review_cadence_override_id'];
        const currentOverrideId = typeof currentOverrideRaw === 'string' ? currentOverrideRaw : null;

        if (currentOverrideId !== overrideId) {
          await client.query(
            `UPDATE employee
             SET review_cadence_override_id = $1,
                 updated_at = CURRENT_TIMESTAMP,
                 updated_by = $2
             WHERE employee_id = $3`,
            [overrideId, actor.userId, employeeId]
          );
          audit.record({
            entityType: 'EMPLOYEE',
            entityId: employeeId,
            action: 'UPDATE',
            fieldName: 'review_cadence_override_id',
            oldValue: currentOverrideId,
            newValue: overrideId,
            reason: input.reason ?? 'HR updated employee review cadence override',
            performedBy: actor.userId,
          });
        }

        const results = await this.reviewScheduleService.applyRecalculation(
          client,
          snapshot,
          'EMPLOYEE_OVERRIDE_CHANGED',
          actor.userId,
          input.reason
        );
        const schedule = results.get(employeeId);

        return {
          employee_id: employeeId,
          review_cadence_override_id: overrideId,
          last_evaluation_completed_at: schedule?.lastEvaluationCompletedAt?.toISOString() ?? null,
          next_review_due_date: schedule?.nextReviewDueDate ?? null,
          effective_cadence: toEffectiveCadenceResponse(schedule?.effectiveCadence),
        };
      },
      actor.userId
    );
  }

  /**
   * Persists an employee update. When the job level changes, the caller must be HR/Admin (LLD §17), the change
   * is audited (Rule 10) and next_review_due_date is recalculated from the existing base if the effective
   * cadence changed — all in the same transaction as the update.
   */
  async updateEmployeeWithSchedule(actor: Actor, existing: Employee, next: Employee): Promise<Employee> {
    const isJobLevelChanged = next.jobLevelId !== existing.jobLevelId;
    if (isJobLevelChanged) {
      requireHrOrAdmin(actor, 'Only HR Admin or System Admin can change an employee job level.');
    }

    return withAuditedTransaction<Employee>(
      this.pool,
      this.auditService,
      async (client, audit) => {
        let snapshot: ScheduleSnapshot | null = null;
        if (isJobLevelChanged) {
          await this.reviewScheduleService.lockJobLevelsForShare(client, [existing.jobLevelId, next.jobLevelId]);
          snapshot = await this.reviewScheduleService.captureEmployees(client, [existing.employeeId]);
        }

        let updated: Employee;
        try {
          updated = await this.employeeRepo.update(next, toQueryExecutor(client));
        } catch (error) {
          if (error instanceof Error && error.message === 'RESOURCE_VERSION_CONFLICT') {
            throw new VersionMismatch('Employee');
          }
          throw error;
        }

        if (!snapshot) return updated;

        audit.record({
          entityType: 'EMPLOYEE',
          entityId: existing.employeeId,
          action: 'UPDATE',
          fieldName: 'job_level_id',
          oldValue: existing.jobLevelId,
          newValue: next.jobLevelId,
          reason: 'Employee job level changed',
          performedBy: actor.userId,
        });

        const results = await this.reviewScheduleService.applyRecalculation(
          client,
          snapshot,
          'EMPLOYEE_JOB_LEVEL_CHANGED',
          actor.userId
        );
        const schedule = results.get(existing.employeeId);
        return schedule ? { ...updated, nextReviewDueDate: schedule.nextReviewDueDate } : updated;
      },
      actor.userId
    );
  }

  async getEmployeeCadenceInfo(employeeId: string): Promise<EmployeeCadenceInfo> {
    const tiers = await this.reviewScheduleService.resolveCadenceTiers(this.pool, employeeId);
    if (!tiers) {
      throw new NotFound(`Employee with ID ${employeeId}`);
    }
    const effective = tiers.effectiveCadence;
    const effectiveTier =
      effective?.source === 'EMPLOYEE_OVERRIDE'
        ? tiers.employeeOverride
        : effective?.source === 'JOB_LEVEL_DEFAULT'
          ? tiers.jobLevelDefault
          : tiers.systemDefault;
    return {
      effectiveCadence: effective
        ? { ...effective, isSystemDefault: effectiveTier?.isSystemDefault ?? false, active: true }
        : null,
      employeeOverride: tiers.employeeOverride,
      jobLevelDefault: tiers.jobLevelDefault,
      systemDefault: tiers.systemDefault,
    };
  }

  async resolveEffectiveCadences(employeeIds: string[]): Promise<Map<string, EffectiveCadence | null>> {
    return this.reviewScheduleService.resolveEffectiveCadences(this.pool, employeeIds);
  }
}
