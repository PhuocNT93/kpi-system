import type { QueryClient } from '@tanstack/react-query';
import { organizationKeys } from '../../organization/api/organization-keys';
import { reviewDueKeys } from '../../evaluation-cycles/api/review-due-keys';

/**
 * Publishing an evaluation completes it, so the backend recalculates the employee's
 * last_evaluation_completed_at / next_review_due_date. Refresh every view that shows them.
 */
export function invalidateAfterEvaluationPublish(queryClient: QueryClient, evaluationId: string | undefined): void {
  queryClient.invalidateQueries({ queryKey: ['evaluation-detail', evaluationId] });
  queryClient.invalidateQueries({ queryKey: reviewDueKeys.all });
  queryClient.invalidateQueries({ queryKey: organizationKeys.employees.all });
}
