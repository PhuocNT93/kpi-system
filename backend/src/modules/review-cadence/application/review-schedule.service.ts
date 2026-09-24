import { Pool } from 'pg';
import { AuditService } from '../../audit/application/audit.service.js';
import { TransactionClient } from '../../../shared/database/transaction.js';
import { QueryResultLike } from '../../../shared/database/query-executor.js';
import { ReviewCadence } from '../domain/review-cadence.types.js';
import { resolveEffectiveCadence } from '../domain/cadence-precedence-resolver.js';
import { calculateNextReviewDueDate } from '../domain/review-due-calculator.js';

export interface QueryRunner {
  query: (
    queryText: string,
    values?: unknown[]
  ) => Promise<QueryResultLike<Record<string, unknown>>>;
}

export interface ResolvedEmployeeCadenceResult {
  effectiveCadence: ReviewCadence | null;
  employeeOverride: ReviewCadence | null;
  jobLevelDefault: ReviewCadence | null;
  systemDefault: ReviewCadence | null;
}

export class ReviewScheduleService {
  constructor(
    private readonly pool: Pool,
    private readonly auditService?: AuditService
  ) {}

  /**
   * Resolves the effective review cadence for a given employee using the authoritative precedence:
   * employee.review_cadence_override_id -> job_level.default_review_cadence_id -> review_cadence.is_system_default
   */
  async resolveEmployeeEffectiveCadence(
    employeeId: string,
    client?: QueryRunner
  ): Promise<ResolvedEmployeeCadenceResult> {
    const runner = client ?? this.pool;

    // Load employee override cadence, job level default cadence, and system default in one optimized query
    const res = await runner.query(
      `SELECT
         e.review_cadence_override_id,
         e.job_level_id,
         rc_override.review_cadence_id AS override_id,
         rc_override.code AS override_code,
         rc_override.name AS override_name,
         rc_override.interval_months AS override_interval_months,
         rc_override.is_system_default AS override_is_system_default,
         rc_override.active AS override_active,
         rc_job.review_cadence_id AS job_id,
         rc_job.code AS job_code,
         rc_job.name AS job_name,
         rc_job.interval_months AS job_interval_months,
         rc_job.is_system_default AS job_is_system_default,
         rc_job.active AS job_active,
         rc_sys.review_cadence_id AS sys_id,
         rc_sys.code AS sys_code,
         rc_sys.name AS sys_name,
         rc_sys.interval_months AS sys_interval_months,
         rc_sys.is_system_default AS sys_is_system_default,
         rc_sys.active AS sys_active
       FROM employee e
       LEFT JOIN job_level jl ON e.job_level_id = jl.job_level_id
       LEFT JOIN review_cadence rc_override ON e.review_cadence_override_id = rc_override.review_cadence_id AND rc_override.active = true
       LEFT JOIN review_cadence rc_job ON jl.default_review_cadence_id = rc_job.review_cadence_id AND rc_job.active = true
       LEFT JOIN review_cadence rc_sys ON rc_sys.is_system_default = true AND rc_sys.active = true
       WHERE e.employee_id = $1
       LIMIT 1`,
      [employeeId]
    );

    const row = res.rows[0];
    if (!row) {
      return {
        effectiveCadence: null,
        employeeOverride: null,
        jobLevelDefault: null,
        systemDefault: null,
      };
    }

    const mapCadence = (
      id: unknown,
      code: unknown,
      name: unknown,
      intervalMonths: unknown,
      isSystemDefault: unknown,
      active: unknown
    ): ReviewCadence | null => {
      if (!id || !code || !name || typeof intervalMonths !== 'number') return null;
      return {
        id: String(id),
        code: String(code),
        name: String(name),
        intervalMonths: Number(intervalMonths),
        isSystemDefault: Boolean(isSystemDefault),
        active: Boolean(active),
      };
    };

    const employeeOverride = mapCadence(
      row['override_id'],
      row['override_code'],
      row['override_name'],
      row['override_interval_months'],
      row['override_is_system_default'],
      row['override_active']
    );

    const jobLevelDefault = mapCadence(
      row['job_id'],
      row['job_code'],
      row['job_name'],
      row['job_interval_months'],
      row['job_is_system_default'],
      row['job_active']
    );

    const systemDefault = mapCadence(
      row['sys_id'],
      row['sys_code'],
      row['sys_name'],
      row['sys_interval_months'],
      row['sys_is_system_default'],
      row['sys_active']
    );

    const effectiveCadence = resolveEffectiveCadence({
      employeeOverride,
      jobLevelDefault,
      systemDefault,
    });

    return {
      effectiveCadence,
      employeeOverride,
      jobLevelDefault,
      systemDefault,
    };
  }

  /**
   * Called whenever an evaluation reaches PUBLISHED.
   * Updates last_evaluation_completed_at and recalculates next_review_due_date.
   */
  async onEvaluationPublished(
    evaluationId: string,
    employeeId: string,
    publishedAt: Date,
    client: QueryRunner,
    performedBy?: string
  ): Promise<{ nextReviewDueDate: Date | null }> {
    // 1. Lock employee row for update to prevent lost updates during concurrent operations
    const empRes = await client.query(
      `SELECT employee_id, last_evaluation_completed_at, next_review_due_date
       FROM employee
       WHERE employee_id = $1
       FOR UPDATE`,
      [employeeId]
    );

    const currentEmp = empRes.rows[0];
    if (!currentEmp) {
      return { nextReviewDueDate: null };
    }

    const rawOldDueDate = currentEmp['next_review_due_date'];
    const oldDueDate = rawOldDueDate ? new Date(rawOldDueDate as string | number | Date) : null;
    const oldIso = oldDueDate?.toISOString() ?? null;

    // 2. Resolve effective cadence
    const { effectiveCadence } = await this.resolveEmployeeEffectiveCadence(employeeId, client);

    let nextDueDate: Date | null = null;
    if (effectiveCadence && effectiveCadence.intervalMonths > 0) {
      nextDueDate = calculateNextReviewDueDate(publishedAt, effectiveCadence.intervalMonths);
    }
    const nextIso = nextDueDate?.toISOString() ?? null;

    // 3. Update employee
    await client.query(
      `UPDATE employee
       SET last_evaluation_completed_at = $1,
           next_review_due_date = $2,
           updated_at = NOW(),
           updated_by = $3
       WHERE employee_id = $4`,
      [publishedAt, nextDueDate, performedBy ?? null, employeeId]
    );

    // 4. Record audit entry
    if (this.auditService) {
      await this.auditService.record(client as unknown as TransactionClient, {
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        action: 'UPDATE',
        fieldName: 'next_review_due_date',
        oldValue: oldIso,
        newValue: nextIso,
        reason: `Evaluation ${evaluationId} published`,
        performedBy: performedBy ?? null,
        source: 'API',
      });
    }

    return { nextReviewDueDate: nextDueDate };
  }

  /**
   * Recalculates next_review_due_date for an employee based on existing last_evaluation_completed_at
   * and the newly resolved effective cadence.
   * Preserves historical completion baseline (does NOT use today + cadence).
   */
  async recalculateEmployeeDueDate(
    employeeId: string,
    client: QueryRunner,
    performedBy?: string,
    reason?: string
  ): Promise<{ nextReviewDueDate: Date | null; effectiveCadence: ReviewCadence | null }> {
    const empRes = await client.query(
      `SELECT employee_id, last_evaluation_completed_at, next_review_due_date
       FROM employee
       WHERE employee_id = $1
       FOR UPDATE`,
      [employeeId]
    );

    const emp = empRes.rows[0];
    if (!emp) {
      return { nextReviewDueDate: null, effectiveCadence: null };
    }

    const rawOldDueDate = emp['next_review_due_date'];
    const oldDueDate = rawOldDueDate ? new Date(rawOldDueDate as string | number | Date) : null;
    const oldIso = oldDueDate?.toISOString() ?? null;

    const { effectiveCadence } = await this.resolveEmployeeEffectiveCadence(employeeId, client);

    let nextDueDate: Date | null = null;
    const rawLastCompletedAt = emp['last_evaluation_completed_at'];
    const lastCompletedAt = rawLastCompletedAt ? new Date(rawLastCompletedAt as string | number | Date) : null;
    if (lastCompletedAt && effectiveCadence && effectiveCadence.intervalMonths > 0) {
      nextDueDate = calculateNextReviewDueDate(lastCompletedAt, effectiveCadence.intervalMonths);
    }
    const nextIso = nextDueDate?.toISOString() ?? null;

    await client.query(
      `UPDATE employee
       SET next_review_due_date = $1,
           updated_at = NOW(),
           updated_by = $2
       WHERE employee_id = $3`,
      [nextDueDate, performedBy ?? null, employeeId]
    );

    if (this.auditService && (oldIso !== nextIso)) {
      await this.auditService.record(client as unknown as TransactionClient, {
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        action: 'UPDATE',
        fieldName: 'next_review_due_date',
        oldValue: oldIso,
        newValue: nextIso,
        reason: reason ?? 'Cadence changed — due date recalculated from last completion',
        performedBy: performedBy ?? null,
        source: 'API',
      });
    }

    return { nextReviewDueDate: nextDueDate, effectiveCadence };
  }
}
