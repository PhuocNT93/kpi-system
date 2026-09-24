import { Pool } from 'pg';
import { Actor } from '../../../shared/auth/types.js';
import { Forbidden, NotFound } from '../../../api/app-error.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { withAuditedTransaction } from '../../audit/application/audit-transaction.js';
import { ReviewScheduleService, ResolvedEmployeeCadenceResult } from '../../review-cadence/application/review-schedule.service.js';
import { ReviewCadenceRepository } from '../../review-cadence/domain/review-cadence.repository.js';
import { PostgresReviewCadenceRepository } from '../../review-cadence/infrastructure/postgres-review-cadence.repository.js';

export interface UpdateCadenceOverrideInput {
  review_cadence_override_id: string | null;
  reason?: string;
}

export interface EmployeeCadenceOverrideResult {
  employee_id: string;
  review_cadence_override_id: string | null;
  last_evaluation_completed_at: string | null;
  next_review_due_date: string | null;
  effective_cadence: {
    id: string;
    code: string;
    name: string;
    interval_months: number;
  } | null;
}

export class EmployeeCadenceService {
  private cadenceRepo: ReviewCadenceRepository;

  constructor(
    private readonly pool: Pool,
    private readonly auditService: AuditService,
    private readonly reviewScheduleService: ReviewScheduleService,
    cadenceRepo?: ReviewCadenceRepository
  ) {
    this.cadenceRepo = cadenceRepo ?? new PostgresReviewCadenceRepository(pool);
  }

  private requireHrOrAdmin(actor: Actor): void {
    if (actor.role !== 'HR_ADMIN' && actor.role !== 'SYSTEM_ADMIN') {
      throw new Forbidden('Only HR Admin or System Admin can update employee review cadence overrides.');
    }
  }

  /**
   * Updates an employee's cadence override, recalculates next_review_due_date from the
   * existing completion baseline, and produces transactional audit logs.
   */
  async updateCadenceOverride(
    actor: Actor,
    employeeId: string,
    input: UpdateCadenceOverrideInput
  ): Promise<EmployeeCadenceOverrideResult> {
    this.requireHrOrAdmin(actor);

    // Verify employee exists
    const empCheck = await this.pool.query(
      `SELECT employee_id, review_cadence_override_id, last_evaluation_completed_at, next_review_due_date
       FROM employee
       WHERE employee_id = $1`,
      [employeeId]
    );

    if (empCheck.rows.length === 0) {
      throw new NotFound(`Employee with ID ${employeeId}`);
    }

    const currentEmp = empCheck.rows[0];
    const oldOverrideId = currentEmp.review_cadence_override_id;

    // If setting an override ID, verify it exists
    if (input.review_cadence_override_id) {
      const cadence = await this.cadenceRepo.findById(input.review_cadence_override_id);
      if (!cadence || !cadence.active) {
        throw new NotFound(`Review Cadence with ID ${input.review_cadence_override_id}`);
      }
    }

    return withAuditedTransaction<EmployeeCadenceOverrideResult>(this.pool, this.auditService, async (client, audit) => {
      // 1. Update review_cadence_override_id on employee
      await client.query(
        `UPDATE employee
         SET review_cadence_override_id = $1,
             updated_at = NOW(),
             updated_by = $2
         WHERE employee_id = $3`,
        [input.review_cadence_override_id, actor.userId, employeeId]
      );

      // 2. Audit the override change
      audit.record({
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        action: 'UPDATE',
        fieldName: 'review_cadence_override_id',
        oldValue: oldOverrideId ?? null,
        newValue: input.review_cadence_override_id ?? null,
        reason: input.reason ?? 'HR updated employee review cadence override',
        performedBy: actor.userId,
      });

      // 3. Recalculate next_review_due_date from existing last_evaluation_completed_at
      const recalc = await this.reviewScheduleService.recalculateEmployeeDueDate(
        employeeId,
        client,
        actor.userId,
        input.reason
      );

      // 4. Fetch updated employee record
      const updatedRes = await client.query(
        `SELECT employee_id, review_cadence_override_id, last_evaluation_completed_at, next_review_due_date
         FROM employee
         WHERE employee_id = $1`,
        [employeeId]
      );

      const updated = updatedRes.rows[0] as
        | {
            employee_id: string;
            review_cadence_override_id: string | null;
            last_evaluation_completed_at: string | Date | null;
            next_review_due_date: string | Date | null;
          }
        | undefined;

      if (!updated) {
        throw new NotFound(`Employee with ID ${employeeId}`);
      }

      return {
        employee_id: updated.employee_id,
        review_cadence_override_id: updated.review_cadence_override_id,
        last_evaluation_completed_at: updated.last_evaluation_completed_at
          ? new Date(updated.last_evaluation_completed_at).toISOString()
          : null,
        next_review_due_date: updated.next_review_due_date
          ? new Date(updated.next_review_due_date).toISOString().slice(0, 10)
          : null,
        effective_cadence: recalc.effectiveCadence
          ? {
              id: recalc.effectiveCadence.id,
              code: recalc.effectiveCadence.code,
              name: recalc.effectiveCadence.name,
              interval_months: recalc.effectiveCadence.intervalMonths,
            }
          : null,
      };
    });
  }

  /**
   * Resolves employee effective cadence info.
   */
  async getEmployeeCadenceInfo(employeeId: string): Promise<ResolvedEmployeeCadenceResult> {
    return this.reviewScheduleService.resolveEmployeeEffectiveCadence(employeeId);
  }
}
