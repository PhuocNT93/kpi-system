import { EvaluationStatus, Evaluation, EvaluationItem } from '../../domain/evaluation.types.js';
import { AppError } from '../../../../api/app-error.js';

export class EvaluationTransitionService {
  public static readonly ALLOWED_TRANSITIONS: Record<EvaluationStatus, EvaluationStatus[]> = {
    [EvaluationStatus.DRAFT]: [
      EvaluationStatus.OPEN,
    ],
    [EvaluationStatus.OPEN]: [
      EvaluationStatus.SELF_ASSESSMENT,
      EvaluationStatus.SUBMITTED,
      EvaluationStatus.MANAGER_REVIEW,
      EvaluationStatus.APPROVED,
      EvaluationStatus.REJECTED,
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.SELF_ASSESSMENT]: [
      EvaluationStatus.MANAGER_ASSESSMENT,
      EvaluationStatus.SUBMITTED,
      EvaluationStatus.OPEN,
      EvaluationStatus.MANAGER_REVIEW,
      EvaluationStatus.APPROVED,
      EvaluationStatus.REJECTED,
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.SUBMITTED]: [
      EvaluationStatus.MANAGER_ASSESSMENT,
      EvaluationStatus.MANAGER_REVIEW,
      EvaluationStatus.APPROVED,
      EvaluationStatus.REJECTED,
      EvaluationStatus.OPEN,
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.MANAGER_ASSESSMENT]: [
      EvaluationStatus.REVIEWING,
      EvaluationStatus.MANAGER_REVIEW,
      EvaluationStatus.APPROVED,
      EvaluationStatus.SELF_ASSESSMENT,
      EvaluationStatus.REJECTED,
      EvaluationStatus.OPEN,
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.MANAGER_REVIEW]: [
      EvaluationStatus.REVIEWING,
      EvaluationStatus.APPROVED,
      EvaluationStatus.REJECTED,
      EvaluationStatus.OPEN,
      EvaluationStatus.LOCKED,
    ],
    [EvaluationStatus.REVIEWING]: [
      EvaluationStatus.MANAGER_ASSESSMENT,
      EvaluationStatus.MANAGER_REVIEW,
      EvaluationStatus.CALIBRATION,
      EvaluationStatus.APPROVED,
    ],
    [EvaluationStatus.CALIBRATION]: [
      EvaluationStatus.APPROVED,
    ],
    [EvaluationStatus.APPROVED]: [
      EvaluationStatus.PUBLISHED,
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
   * Throws 422 if transition violates workflow state machine or calibration flag,
   * or 400 for invalid status.
   */
  public validateTransition(
    currentStatus: EvaluationStatus,
    targetStatus: EvaluationStatus,
    options?: { calibrationEnabled?: boolean }
  ): void {
    if (currentStatus === targetStatus) {
      return;
    }

    // Specific disallow checks mandated by LLD Part A
    // REVIEWING -> PUBLISHED, REVIEWING -> LOCKED
    // CALIBRATION -> PUBLISHED, CALIBRATION -> LOCKED
    // APPROVED -> LOCKED
    if (
      (currentStatus === EvaluationStatus.REVIEWING && (targetStatus === EvaluationStatus.PUBLISHED || targetStatus === EvaluationStatus.LOCKED)) ||
      (currentStatus === EvaluationStatus.CALIBRATION && (targetStatus === EvaluationStatus.PUBLISHED || targetStatus === EvaluationStatus.LOCKED)) ||
      (currentStatus === EvaluationStatus.APPROVED && targetStatus === EvaluationStatus.LOCKED)
    ) {
      throw new AppError(
        422,
        'INVALID_WORKFLOW_TRANSITION',
        `Cannot transition evaluation status from ${currentStatus} to ${targetStatus}.`
      );
    }

    if (
      currentStatus === EvaluationStatus.REVIEWING &&
      targetStatus === EvaluationStatus.CALIBRATION &&
      options?.calibrationEnabled === false
    ) {
      throw new AppError(
        422,
        'CALIBRATION_NOT_ENABLED',
        'Cannot transition to CALIBRATION when calibration is disabled for this cycle.'
      );
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
