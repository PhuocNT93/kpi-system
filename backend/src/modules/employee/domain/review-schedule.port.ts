import { TransactionClient } from '../../../shared/database/transaction.js';

export interface EvaluationPublishedEvent {
  evaluationId: string;
  employeeId: string;
  publishedAt: Date;
}

/**
 * Port called by every workflow path that moves an evaluation to PUBLISHED (manual publish, calibration
 * finalize auto-publish). Must run inside the caller's publish transaction; a failure must roll back the publish.
 */
export interface EvaluationPublishedHandler {
  onEvaluationsPublished(
    client: TransactionClient,
    events: EvaluationPublishedEvent[],
    actorUserId: string | null
  ): Promise<void>;
}
