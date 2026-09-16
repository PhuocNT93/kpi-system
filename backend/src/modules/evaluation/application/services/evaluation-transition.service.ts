import { EvaluationStatus, Evaluation, EvaluationItem } from '../../domain/evaluation.types.js';
import { AppError } from '../../../../api/app-error.js';

export class EvaluationTransitionService {
  public static readonly ALLOWED_TRANSITIONS: Record<EvaluationStatus, EvaluationStatus[]> = {
    [EvaluationStatus.OPEN]: [
      EvaluationStatus.SUBMITTED,
      EvaluationStatus.MANAGER_REVIEW,
      EvaluationStatus.APPROVED,
      EvaluationStatus.REJECTED,
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.SUBMITTED]: [
      EvaluationStatus.MANAGER_REVIEW,
      EvaluationStatus.APPROVED,
      EvaluationStatus.REJECTED,
      EvaluationStatus.OPEN,
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.MANAGER_REVIEW]: [
      EvaluationStatus.APPROVED,
      EvaluationStatus.REJECTED,
      EvaluationStatus.OPEN,
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.APPROVED]: [
      EvaluationStatus.PUBLISHED,
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.REJECTED]: [
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.PUBLISHED]: [
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.LOCKED]: [],
  };

  /**
   * Validates state transition from currentStatus to targetStatus.
   * Throws 400 INVALID_STATUS if transition is not allowed.
   */
  public validateTransition(currentStatus: EvaluationStatus, targetStatus: EvaluationStatus): void {
    if (currentStatus === targetStatus) {
      return;
    }

    const allowed = EvaluationTransitionService.ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        400,
        'INVALID_STATUS',
        `Cannot transition evaluation status from ${currentStatus} to ${targetStatus}.`
      );
    }
  }

  /**
   * Validates that an evaluation has all required criteria completed before submitting.
   * Throws 400 INCOMPLETE_EVALUATION if any enabled criterion lacks score/level.
   */
  public validateSubmittable(evaluation: Evaluation, items: EvaluationItem[]): void {
    if (evaluation.is_locked || evaluation.status === EvaluationStatus.LOCKED) {
      throw new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked.');
    }

    if (evaluation.status !== EvaluationStatus.OPEN) {
      throw new AppError(400, 'INVALID_STATUS', 'Can only submit when evaluation is OPEN.');
    }

    const activeItems = items.filter((item) => !item.is_disabled_for_employee);
    const incompleteItems = activeItems.filter((item) => {
      const hasResolvedLevel = item.resolved_level !== null && item.resolved_level !== undefined;
      const hasRawScore = item.raw_score !== null && item.raw_score !== undefined;
      const hasManualOverride = item.manual_override_score !== null && item.manual_override_score !== undefined;
      const hasAnyScore = hasResolvedLevel || hasRawScore || hasManualOverride;

      return item.is_missing_score || !hasAnyScore;
    });

    if (incompleteItems.length > 0) {
      const missingNames = incompleteItems
        .map((i) => i.criterion_code_snapshot || i.criterion_name_snapshot)
        .join(', ');
      throw new AppError(
        400,
        'INCOMPLETE_EVALUATION',
        `Cannot submit evaluation: ${incompleteItems.length} required criteria are incomplete or missing scores (${missingNames}).`
      );
    }
  }
}
