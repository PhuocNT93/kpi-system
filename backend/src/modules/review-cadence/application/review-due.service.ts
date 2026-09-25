import { Pool } from 'pg';
import { Actor } from '../../../shared/auth/types.js';
import { Forbidden } from '../../../api/app-error.js';
import {
  ReviewDueItem,
  ReviewDueQueryFilters,
  ReviewDueStatus,
} from '../domain/review-due.types.js';
import {
  calculateReviewDueStatus,
  parseDate,
} from '../domain/review-due-calculator.js';

export interface PaginatedReviewDueResult {
  items: ReviewDueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  last_updated_at: string;
}

export interface ReviewDueServiceConfig {
  leadTimeDays?: number;
  batchCycleLeadTimeWeeks?: number;
}

export class ReviewDueService {
  private lastUpdatedAt: Date = new Date();
  private leadTimeDays: number;
  private batchCycleLeadTimeWeeks: number;

  constructor(
    private readonly pool: Pool,
    config: ReviewDueServiceConfig = {}
  ) {
    const envLeadTime = process.env.REVIEW_DUE_LEAD_TIME_DAYS
      ? parseInt(process.env.REVIEW_DUE_LEAD_TIME_DAYS, 10)
      : undefined;
    const resolvedLeadTime = config.leadTimeDays ?? envLeadTime ?? 30;
    this.leadTimeDays = Math.max(0, resolvedLeadTime);

    const envBatchLeadTime = process.env.BATCH_CYCLE_LEAD_TIME_WEEKS
      ? parseInt(process.env.BATCH_CYCLE_LEAD_TIME_WEEKS, 10)
      : undefined;
    const resolvedBatchLeadTime = config.batchCycleLeadTimeWeeks ?? envBatchLeadTime ?? 4;
    this.batchCycleLeadTimeWeeks = Math.max(0, resolvedBatchLeadTime);
  }

  public getLeadTimeDays(): number {
    return this.leadTimeDays;
  }

  public getBatchCycleLeadTimeWeeks(): number {
    return this.batchCycleLeadTimeWeeks;
  }

  public getLastUpdatedAt(): Date {
    return this.lastUpdatedAt;
  }

  /**
   * Enforces scope rules based on Actor role:
   * - HR_ADMIN / SYSTEM_ADMIN: full organization scope.
   * - MANAGER: strictly limited to actor.managedTeamIds.
   * - Other roles: Forbidden (403).
   */
  private resolveScopeTeamIds(actor: Actor, requestedTeamId?: string): string[] | null {
    if (actor.role === 'HR_ADMIN' || actor.role === 'SYSTEM_ADMIN') {
      return requestedTeamId ? [requestedTeamId] : null; // null means all teams
    }

    if (actor.role === 'MANAGER') {
      const managed = actor.managedTeamIds ?? [];
      if (managed.length === 0) {
        return []; // manager with no teams gets empty result
      }
      if (requestedTeamId) {
        if (!managed.includes(requestedTeamId)) {
          throw new Forbidden('You do not have permission to view reviews for this team.');
        }
        return [requestedTeamId];
      }
      return managed;
    }

    throw new Forbidden('You do not have permission to view review due data.');
  }

  /**
   * Retrieves review due dashboard data with filters, pagination, and RBAC enforcement.
   */
  async getReviewsDue(
    actor: Actor,
    filters: ReviewDueQueryFilters = {}
  ): Promise<PaginatedReviewDueResult> {
    const allowedTeamIds = this.resolveScopeTeamIds(actor, filters.teamId);

    // If manager has 0 managed teams, return early with empty result
    if (allowedTeamIds !== null && allowedTeamIds.length === 0) {
      return {
        items: [],
        total: 0,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
        totalPages: 0,
        last_updated_at: this.lastUpdatedAt.toISOString(),
      };
    }

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const queryParams: unknown[] = [];
    let paramIdx = 1;

    // Base conditions: active employees only, non-null due date, up to lead time
    const whereConditions: string[] = [
      `e.employment_status NOT IN ('INACTIVE', 'TERMINATED')`,
      `e.next_review_due_date IS NOT NULL`,
    ];

    // Team scope
    if (allowedTeamIds !== null) {
      whereConditions.push(`e.team_id = ANY($${paramIdx}::uuid[])`);
      queryParams.push(allowedTeamIds);
      paramIdx++;
    }

    // Lead time cutoff (DB level filter to avoid full-table scans)
    whereConditions.push(`e.next_review_due_date <= (CURRENT_DATE + ($${paramIdx}::int * INTERVAL '1 day'))`);
    queryParams.push(this.leadTimeDays);
    paramIdx++;

    // Cadence filter if requested
    if (filters.cadenceId) {
      whereConditions.push(`(
        e.review_cadence_override_id = $${paramIdx} OR
        (e.review_cadence_override_id IS NULL AND jl.default_review_cadence_id = $${paramIdx}) OR
        (e.review_cadence_override_id IS NULL AND jl.default_review_cadence_id IS NULL AND rc_sys.review_cadence_id = $${paramIdx})
      )`);
      queryParams.push(filters.cadenceId);
      paramIdx++;
    }

    // Status filter if requested
    if (filters.status) {
      const upperStatus = filters.status.toUpperCase();
      if (upperStatus === 'OVERDUE') {
        whereConditions.push(`e.next_review_due_date < CURRENT_DATE`);
      } else if (upperStatus === 'DUE') {
        whereConditions.push(`date_trunc('day', e.next_review_due_date) = CURRENT_DATE`);
      } else if (upperStatus === 'UPCOMING') {
        whereConditions.push(`e.next_review_due_date > CURRENT_DATE`);
      }
    }

    // Search filter if requested
    if (filters.search && filters.search.trim()) {
      whereConditions.push(`(
        e.full_name ILIKE $${paramIdx} OR
        e.employee_code ILIKE $${paramIdx}
      )`);
      queryParams.push(`%${filters.search.trim()}%`);
      paramIdx++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Single query joining employee, job_level, team, and the three review_cadence sources
    const sql = `
      SELECT
        e.employee_id,
        e.employee_code,
        e.full_name,
        e.full_name AS employee_name,
        e.last_evaluation_completed_at,
        e.next_review_due_date,
        t.team_id,
        t.name AS team_name,
        jl.job_level_id,
        jl.name AS job_level_name,
        -- Effective cadence fields resolved via COALESCE precedence:
        COALESCE(rc_override.review_cadence_id, rc_job.review_cadence_id, rc_sys.review_cadence_id) AS cadence_id,
        COALESCE(rc_override.code, rc_job.code, rc_sys.code) AS cadence_code,
        COALESCE(rc_override.name, rc_job.name, rc_sys.name) AS cadence_name,
        COALESCE(rc_override.interval_months, rc_job.interval_months, rc_sys.interval_months) AS cadence_interval_months,
        CASE
          WHEN rc_override.review_cadence_id IS NOT NULL THEN 'EMPLOYEE_OVERRIDE'
          WHEN rc_job.review_cadence_id IS NOT NULL THEN 'JOB_LEVEL'
          ELSE 'SYSTEM_DEFAULT'
        END AS cadence_source,
        COUNT(*) OVER() AS full_count
      FROM employee e
      LEFT JOIN team t ON e.team_id = t.team_id
      LEFT JOIN job_level jl ON e.job_level_id = jl.job_level_id
      LEFT JOIN review_cadence rc_override ON e.review_cadence_override_id = rc_override.review_cadence_id AND rc_override.active = true
      LEFT JOIN review_cadence rc_job ON jl.default_review_cadence_id = rc_job.review_cadence_id AND rc_job.active = true
      LEFT JOIN review_cadence rc_sys ON rc_sys.is_system_default = true AND rc_sys.active = true
      WHERE ${whereClause}
      ORDER BY e.next_review_due_date ASC, e.full_name ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    queryParams.push(pageSize, offset);

    const res = await this.pool.query(sql, queryParams);
    const total = res.rows.length > 0 ? parseInt(res.rows[0].full_count, 10) : 0;
    const totalPages = Math.ceil(total / pageSize);

    const now = new Date();
    const items: ReviewDueItem[] = res.rows.map((row) => {
      const calc = calculateReviewDueStatus(row.next_review_due_date, {
        leadTimeDays: this.leadTimeDays,
        referenceDate: now,
      });

      return {
        employee_id: row.employee_id,
        employee_code: row.employee_code ?? '',
        employee_name: row.employee_name ?? row.full_name ?? '',
        full_name: row.full_name ?? row.employee_name ?? '',
        team_id: row.team_id ?? null,
        team_name: row.team_name ?? null,
        team: {
          id: row.team_id ?? '',
          name: row.team_name ?? 'No Team',
        },
        job_level_id: row.job_level_id ?? null,
        job_level_name: row.job_level_name ?? null,
        job_level: {
          id: row.job_level_id ?? '',
          name: row.job_level_name ?? 'No Level',
        },
        effective_cadence: row.cadence_id
          ? {
              id: row.cadence_id,
              code: row.cadence_code,
              name: row.cadence_name,
              interval_months: row.cadence_interval_months,
              source: row.cadence_source === 'EMPLOYEE_OVERRIDE' || row.cadence_source === 'JOB_LEVEL'
                ? row.cadence_source
                : 'SYSTEM_DEFAULT',
            }
          : null,
        last_evaluation_completed_at: row.last_evaluation_completed_at
          ? new Date(row.last_evaluation_completed_at).toISOString()
          : null,
        next_review_due_date: row.next_review_due_date
          ? parseDate(row.next_review_due_date)?.toISOString().slice(0, 10) ?? null
          : null,
        status: calc.status as ReviewDueStatus,
        days_overdue: calc.daysOverdue,
        days_until_due: calc.daysUntilDue ?? 0,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      last_updated_at: this.lastUpdatedAt.toISOString(),
    };
  }

  /**
   * Refreshes review due read-model / maintenance flags.
   * Executed daily by ReviewDueScheduler.
   * Does NOT auto-create any evaluations.
   */
  async refreshReviewDueState(): Promise<{ processedCount: number; timestamp: Date }> {
    this.lastUpdatedAt = new Date();

    // Query active employees to update or verify due dates
    const res = await this.pool.query(
      `SELECT count(*) as total
       FROM employee
       WHERE employment_status NOT IN ('INACTIVE', 'TERMINATED')
         AND next_review_due_date IS NOT NULL
         AND next_review_due_date <= (CURRENT_DATE + ($1::int * INTERVAL '1 day'))`,
      [this.leadTimeDays]
    );

    const count = parseInt(res.rows[0]?.total ?? '0', 10);
    return {
      processedCount: count,
      timestamp: this.lastUpdatedAt,
    };
  }
}
