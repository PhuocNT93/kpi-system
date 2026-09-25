import { resolveEffectiveCadenceWithSource } from '../../review-cadence/domain/cadence-precedence-resolver.js';
import { ReviewCadence } from '../../review-cadence/domain/review-cadence.types.js';
import {
  EmployeeCadenceTiers,
  EmployeeScheduleRepository,
  EmployeeScheduleState,
  EmployeeScheduleWrite,
  ScheduleQueryRunner,
} from '../domain/employee-schedule.repository.js';
import { EffectiveCadence, toDateOnlyString, toTimestamp } from '../domain/review-schedule.js';

type CadencePrefix = 'o' | 'j' | 's';

const CADENCE_PREFIXES: CadencePrefix[] = ['o', 'j', 's'];

function cadenceColumns(prefix: CadencePrefix): string {
  return `${prefix}.review_cadence_id AS ${prefix}_id, ${prefix}.code AS ${prefix}_code, ${prefix}.name AS ${prefix}_name, ${prefix}.interval_months AS ${prefix}_interval_months`;
}

/**
 * Joins the three cadence tiers (LLD §14.1). Inactive cadences are not joined, so they fall through to the next tier.
 * o = employee override, j = job-level default, s = system default.
 */
const CADENCE_JOINS = `
  LEFT JOIN job_level jl ON jl.job_level_id = e.job_level_id
  LEFT JOIN review_cadence o ON o.review_cadence_id = e.review_cadence_override_id AND o.active = true
  LEFT JOIN review_cadence j ON j.review_cadence_id = jl.default_review_cadence_id AND j.active = true
  LEFT JOIN review_cadence s ON s.is_system_default = true AND s.active = true`;

const SCHEDULE_SELECT = `
  SELECT e.employee_id, e.last_evaluation_completed_at, e.next_review_due_date,
         ${CADENCE_PREFIXES.map(cadenceColumns).join(',\n         ')}
  FROM employee e${CADENCE_JOINS}`;

function mapTier(row: Record<string, unknown>, prefix: CadencePrefix): ReviewCadence | null {
  const id = row[`${prefix}_id`];
  if (typeof id !== 'string' || id.length === 0) return null;
  return {
    id,
    code: String(row[`${prefix}_code`] ?? ''),
    name: String(row[`${prefix}_name`] ?? ''),
    intervalMonths: Number(row[`${prefix}_interval_months`]),
    isSystemDefault: prefix === 's',
    active: true,
  };
}

function mapEffectiveCadence(row: Record<string, unknown>): EffectiveCadence | null {
  const resolved = resolveEffectiveCadenceWithSource({
    employeeOverride: mapTier(row, 'o'),
    jobLevelDefault: mapTier(row, 'j'),
    systemDefault: mapTier(row, 's'),
  });
  if (!resolved) return null;
  return {
    id: resolved.cadence.id,
    code: resolved.cadence.code,
    name: resolved.cadence.name,
    intervalMonths: resolved.cadence.intervalMonths,
    source: resolved.source,
  };
}

export class PostgresEmployeeScheduleRepository implements EmployeeScheduleRepository {
  /**
   * Locks the matching employee rows first (FOR UPDATE OF e, employee_id order), then resolves their effective
   * cadence in a SEPARATE statement. Under READ COMMITTED a statement's snapshot predates any lock wait, so reading
   * cadences in the locking statement could return cadence rows that a concurrent, now-committed transaction changed.
   */
  private async lockWhere(
    client: ScheduleQueryRunner,
    whereClause: string,
    values: unknown[]
  ): Promise<EmployeeScheduleState[]> {
    const locked = await client.query(
      `SELECT e.employee_id, e.last_evaluation_completed_at, e.next_review_due_date
       FROM employee e${CADENCE_JOINS}
       WHERE ${whereClause}
       ORDER BY e.employee_id
       FOR UPDATE OF e`,
      values
    );
    if (locked.rows.length === 0) return [];
    const cadences = await this.resolveEffectiveCadences(
      client,
      locked.rows.map((row) => String(row['employee_id']))
    );
    return locked.rows.map((row) => {
      const employeeId = String(row['employee_id']);
      return {
        employeeId,
        lastEvaluationCompletedAt: toTimestamp(row['last_evaluation_completed_at']),
        nextReviewDueDate: toDateOnlyString(row['next_review_due_date']),
        effectiveCadence: cadences.get(employeeId) ?? null,
      };
    });
  }

  async lockJobLevelsForShare(client: ScheduleQueryRunner, jobLevelIds: string[]): Promise<void> {
    const ids = [...new Set(jobLevelIds.filter((id) => id.length > 0))];
    if (ids.length === 0) return;
    await client.query(
      'SELECT job_level_id FROM job_level WHERE job_level_id = ANY($1::uuid[]) ORDER BY job_level_id FOR SHARE',
      [ids]
    );
  }

  async lockByEmployeeIds(client: ScheduleQueryRunner, employeeIds: string[]): Promise<EmployeeScheduleState[]> {
    if (employeeIds.length === 0) return [];
    return this.lockWhere(client, 'e.employee_id = ANY($1::uuid[])', [employeeIds]);
  }

  async lockByJobLevelWithoutOverride(
    client: ScheduleQueryRunner,
    jobLevelId: string
  ): Promise<EmployeeScheduleState[]> {
    return this.lockWhere(client, 'e.job_level_id = $1 AND o.review_cadence_id IS NULL', [jobLevelId]);
  }

  async lockByCadence(
    client: ScheduleQueryRunner,
    cadenceId: string,
    includeSystemDefaultFallback: boolean
  ): Promise<EmployeeScheduleState[]> {
    return this.lockWhere(
      client,
      `(e.review_cadence_override_id = $1
         OR (o.review_cadence_id IS NULL AND jl.default_review_cadence_id = $1)
         OR ($2::boolean AND o.review_cadence_id IS NULL AND j.review_cadence_id IS NULL))`,
      [cadenceId, includeSystemDefaultFallback]
    );
  }

  async resolveEffectiveCadences(
    runner: ScheduleQueryRunner,
    employeeIds: string[]
  ): Promise<Map<string, EffectiveCadence | null>> {
    const result = new Map<string, EffectiveCadence | null>();
    if (employeeIds.length === 0) return result;
    const res = await runner.query(`${SCHEDULE_SELECT}\n       WHERE e.employee_id = ANY($1::uuid[])`, [employeeIds]);
    for (const row of res.rows) {
      result.set(String(row['employee_id']), mapEffectiveCadence(row));
    }
    return result;
  }

  async resolveCadenceTiers(runner: ScheduleQueryRunner, employeeId: string): Promise<EmployeeCadenceTiers | null> {
    const res = await runner.query(`${SCHEDULE_SELECT}
       WHERE e.employee_id = $1`, [employeeId]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      employeeOverride: mapTier(row, 'o'),
      jobLevelDefault: mapTier(row, 'j'),
      systemDefault: mapTier(row, 's'),
      effectiveCadence: mapEffectiveCadence(row),
    };
  }

  async saveSchedules(
    client: ScheduleQueryRunner,
    rows: EmployeeScheduleWrite[],
    updatedBy: string | null
  ): Promise<void> {
    if (rows.length === 0) return;
    await client.query(
      `UPDATE employee e
       SET last_evaluation_completed_at = v.last_evaluation_completed_at,
           -- next_review_due_date is timestamptz: store the business date at 00:00 UTC, independent of the session timezone.
           next_review_due_date = (v.next_review_due_date::timestamp AT TIME ZONE 'UTC'),
           updated_by = COALESCE($4::uuid, e.updated_by),
           updated_at = CURRENT_TIMESTAMP
       FROM unnest($1::uuid[], $2::timestamptz[], $3::date[]) AS v(employee_id, last_evaluation_completed_at, next_review_due_date)
       WHERE e.employee_id = v.employee_id`,
      [
        rows.map((row) => row.employeeId),
        rows.map((row) => (row.lastEvaluationCompletedAt ? row.lastEvaluationCompletedAt.toISOString() : null)),
        rows.map((row) => row.nextReviewDueDate),
        updatedBy,
      ]
    );
  }
}
