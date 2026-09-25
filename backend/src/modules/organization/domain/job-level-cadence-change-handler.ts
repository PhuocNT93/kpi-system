import { TransactionClient } from '../../../shared/database/transaction.js';
import { PendingScheduleRecalculation } from '../../review-cadence/domain/review-cadence-change-handler.js';

/**
 * Port implemented by the employee scheduling boundary (ReviewScheduleService).
 * Called inside the job-level update transaction BEFORE default_review_cadence_id is written; `apply` is
 * called AFTER the write so employees following the job-level default get their due date recalculated
 * atomically. Employees with a personal override are not affected.
 */
export interface JobLevelCadenceChangeHandler {
  prepareJobLevelDefaultChange(client: TransactionClient, jobLevelId: string): Promise<PendingScheduleRecalculation>;
}
