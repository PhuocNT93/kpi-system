import { TransactionClient } from '../../../shared/database/transaction.js';

/** A schedule recalculation captured BEFORE a cadence write and applied AFTER it, in the same transaction. */
export interface PendingScheduleRecalculation {
  apply(actorUserId: string | null, reason: string): Promise<void>;
}

export interface ReviewCadenceChangeScope {
  cadenceId: string;
  /**
   * True when the cadence is or becomes the system default: employees with neither an active override
   * nor an active job-level default then depend on it as well.
   */
  affectsSystemDefaultFallback: boolean;
}

/**
 * Port implemented by the employee scheduling boundary (ReviewScheduleService).
 *
 * The review-cadence module calls `prepareCadenceChange` inside its transaction BEFORE writing the cadence
 * (affected employees are locked and their current effective cadence captured) and `apply` AFTER the write,
 * so next_review_due_date is recalculated atomically with the cadence change without this module reading
 * or writing employee data itself.
 */
export interface ReviewCadenceChangeHandler {
  prepareCadenceChange(
    client: TransactionClient,
    scope: ReviewCadenceChangeScope
  ): Promise<PendingScheduleRecalculation>;
}
