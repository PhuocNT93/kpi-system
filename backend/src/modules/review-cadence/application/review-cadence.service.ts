/**
 * ReviewCadenceService — application-layer use cases for Review Cadence CRUD.
 *
 * RBAC (BACKEND_NODE_RULES §4):
 *   READ (list / get) → any authenticated user
 *   CREATE / UPDATE / DELETE → HR_ADMIN or SYSTEM_ADMIN only
 *
 * Audit writes happen inside the same DB transaction as the business mutation
 * via withAuditedTransaction.
 *
 * Business rules enforced:
 *   BR-4: At most one review_cadence row may have is_system_default = true
 *         (also enforced at DB by partial unique index; service check gives better UX)
 *   BR-5: interval_months > 0 (DB CHECK constraint; validated at controller level)
 *   BR-7: Cannot delete a cadence referenced by job_level or employee
 */

import { Pool } from 'pg';
import { Actor } from '../../../shared/auth/types.js';
import { Forbidden, NotFound, Conflict } from '../../../api/app-error.js';
import { ReviewCadenceRepository } from '../domain/review-cadence.repository.js';
import { ReviewCadence, CreateReviewCadenceData, UpdateReviewCadenceData } from '../domain/review-cadence.types.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { withAuditedTransaction } from '../../audit/application/audit-transaction.js';
import { AppError } from '../../../api/app-error.js';
import { TransactionClient } from '../../../shared/database/transaction.js';
import { toQueryExecutor } from '../../../shared/database/query-executor.js';
import {
  PendingScheduleRecalculation,
  ReviewCadenceChangeHandler,
  ReviewCadenceChangeScope,
} from '../domain/review-cadence-change-handler.js';

/** Placeholder id used to scope the fallback group before a new cadence row exists. */
const NEW_CADENCE_PLACEHOLDER_ID = '00000000-0000-0000-0000-000000000000';

// ── RBAC guard ────────────────────────────────────────────────────────────────

function requireHrOrAdmin(actor: Actor): void {
  if (actor.role !== 'HR_ADMIN' && actor.role !== 'SYSTEM_ADMIN') {
    throw new Forbidden('Only HR Admin or System Admin can manage Review Cadences.');
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ReviewCadenceService {
  constructor(
    private readonly cadenceRepo: ReviewCadenceRepository,
    private readonly auditService: AuditService,
    private readonly pool: Pool,
    private readonly changeHandler?: ReviewCadenceChangeHandler
  ) {}

  /**
   * Captures (and locks) the employees whose effective cadence may change, before the cadence write.
   * Recalculation is applied after the write, in the same transaction (LLD §14.1, Rule 9).
   */
  private async prepareScheduleRecalculation(
    client: TransactionClient,
    scope: ReviewCadenceChangeScope
  ): Promise<PendingScheduleRecalculation> {
    if (!this.changeHandler) {
      throw new AppError(500, 'REVIEW_SCHEDULE_NOT_CONFIGURED', 'Review schedule handler is not configured.');
    }
    return this.changeHandler.prepareCadenceChange(client, scope);
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  async listCadences(
    filters?: { active?: boolean },
    skip?: number,
    limit?: number
  ): Promise<[ReviewCadence[], number]> {
    return this.cadenceRepo.findAll(filters, skip, limit);
  }

  async getCadenceById(id: string): Promise<ReviewCadence> {
    const cadence = await this.cadenceRepo.findById(id);
    if (!cadence) throw new NotFound(`Review Cadence with ID ${id}`);
    return cadence;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createCadence(actor: Actor, data: CreateReviewCadenceData): Promise<ReviewCadence> {
    requireHrOrAdmin(actor);

    // BR: code uniqueness
    const existing = await this.cadenceRepo.findByCode(data.code);
    if (existing) {
      throw new Conflict(`Review Cadence with code "${data.code}" already exists.`, 'DUPLICATE_CODE');
    }

    // BR-4: at most one system default
    if (data.isSystemDefault) {
      const currentDefault = await this.cadenceRepo.findSystemDefault();
      if (currentDefault) {
        throw new Conflict(
          `A system-default cadence already exists ("${currentDefault.name}"). Unset it first.`,
          'SYSTEM_DEFAULT_EXISTS'
        );
      }
    }

    const isNewActiveSystemDefault = (data.isSystemDefault ?? false) && (data.active ?? true);

    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      // A new active system default gives a cadence to employees that previously had none.
      const pending = isNewActiveSystemDefault
        ? await this.prepareScheduleRecalculation(client, {
            cadenceId: NEW_CADENCE_PLACEHOLDER_ID,
            affectsSystemDefaultFallback: true,
          })
        : null;

      const cadence = await this.cadenceRepo.create({
        id: '',
        ...data,
        isSystemDefault: data.isSystemDefault ?? false,
        active: data.active ?? true,
      }, toQueryExecutor(client));

      audit.record({
        entityType: 'REVIEW_CADENCE',
        entityId: cadence.id,
        action: 'CREATE',
        newValue: JSON.stringify({ code: cadence.code, name: cadence.name, intervalMonths: cadence.intervalMonths }),
      });

      await pending?.apply(actor.userId, `review_cadence_id=${cadence.id} created as system default`);
      return cadence;
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateCadence(
    actor: Actor,
    id: string,
    data: UpdateReviewCadenceData
  ): Promise<ReviewCadence> {
    requireHrOrAdmin(actor);

    const existing = await this.cadenceRepo.findById(id);
    if (!existing) throw new NotFound(`Review Cadence with ID ${id}`);

    // BR-4: if toggling to system default, ensure no other row holds it
    if (data.isSystemDefault === true && !existing.isSystemDefault) {
      const currentDefault = await this.cadenceRepo.findSystemDefault();
      if (currentDefault && currentDefault.id !== id) {
        throw new Conflict(
          `A system-default cadence already exists ("${currentDefault.name}"). Unset it first.`,
          'SYSTEM_DEFAULT_EXISTS'
        );
      }
    }

    const updated: ReviewCadence = {
      ...existing,
      name: data.name ?? existing.name,
      intervalMonths: data.intervalMonths ?? existing.intervalMonths,
      isSystemDefault: data.isSystemDefault ?? existing.isSystemDefault,
      active: data.active ?? existing.active,
    };

    const isScheduleRelevant =
      updated.intervalMonths !== existing.intervalMonths ||
      updated.active !== existing.active ||
      updated.isSystemDefault !== existing.isSystemDefault;

    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const pending = isScheduleRelevant
        ? await this.prepareScheduleRecalculation(client, {
            cadenceId: id,
            affectsSystemDefaultFallback: existing.isSystemDefault || updated.isSystemDefault,
          })
        : null;

      const saved = await this.cadenceRepo.update(updated, toQueryExecutor(client));

      audit.record({
        entityType: 'REVIEW_CADENCE',
        entityId: saved.id,
        action: 'UPDATE',
        oldValue: JSON.stringify({ name: existing.name, intervalMonths: existing.intervalMonths, isSystemDefault: existing.isSystemDefault, active: existing.active }),
        newValue: JSON.stringify({ name: saved.name, intervalMonths: saved.intervalMonths, isSystemDefault: saved.isSystemDefault, active: saved.active }),
      });

      await pending?.apply(actor.userId, `review_cadence_id=${saved.id} updated`);
      return saved;
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteCadence(actor: Actor, id: string): Promise<void> {
    requireHrOrAdmin(actor);

    const existing = await this.cadenceRepo.findById(id);
    if (!existing) throw new NotFound(`Review Cadence with ID ${id}`);

    // BR-7: reject if referenced
    const [byJobLevel, byEmployee] = await Promise.all([
      this.cadenceRepo.isReferencedByJobLevel(id),
      this.cadenceRepo.isReferencedByEmployee(id),
    ]);

    if (byJobLevel || byEmployee) {
      const refs: string[] = [];
      if (byJobLevel) refs.push('one or more Job Levels');
      if (byEmployee) refs.push('one or more Employees');
      throw new Conflict(
        `Cannot delete cadence "${existing.name}" — it is referenced by ${refs.join(' and ')}.`,
        'CADENCE_IN_USE'
      );
    }

    await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      // Only the system default can be depended upon without an FK reference (BR-7 blocks the rest).
      const pending = existing.isSystemDefault
        ? await this.prepareScheduleRecalculation(client, { cadenceId: id, affectsSystemDefaultFallback: true })
        : null;

      await this.cadenceRepo.delete(id, toQueryExecutor(client));

      audit.record({
        entityType: 'REVIEW_CADENCE',
        entityId: id,
        action: 'DELETE',
        oldValue: JSON.stringify({ code: existing.code, name: existing.name }),
      });

      await pending?.apply(actor.userId, `review_cadence_id=${id} deleted`);
    });
  }
}
