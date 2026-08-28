import { EvaluationCycleStatus, EvaluationCycleErrorCodes } from '../domain/evaluation-cycle.types.js';
import { Conflict } from '../../../api/app-error.js';

export class EvaluationCycleTransitionService {
  private static readonly ALLOWED_TRANSITIONS: Record<EvaluationCycleStatus, EvaluationCycleStatus[]> = {
    [EvaluationCycleStatus.DRAFT]: [EvaluationCycleStatus.OPEN],
    [EvaluationCycleStatus.OPEN]: [EvaluationCycleStatus.IN_PROGRESS, EvaluationCycleStatus.LOCKED],
    [EvaluationCycleStatus.IN_PROGRESS]: [EvaluationCycleStatus.SUBMITTED, EvaluationCycleStatus.LOCKED],
    [EvaluationCycleStatus.SUBMITTED]: [EvaluationCycleStatus.REVIEWING, EvaluationCycleStatus.LOCKED],
    [EvaluationCycleStatus.REVIEWING]: [EvaluationCycleStatus.CALIBRATION, EvaluationCycleStatus.APPROVED, EvaluationCycleStatus.LOCKED],
    [EvaluationCycleStatus.CALIBRATION]: [EvaluationCycleStatus.APPROVED, EvaluationCycleStatus.LOCKED],
    [EvaluationCycleStatus.APPROVED]: [EvaluationCycleStatus.PUBLISHED, EvaluationCycleStatus.LOCKED],
    [EvaluationCycleStatus.PUBLISHED]: [EvaluationCycleStatus.LOCKED],
    [EvaluationCycleStatus.LOCKED]: [],
  };

  /**
   * Validates state transition from currentStatus to targetStatus.
   * Throws Conflict error if transition is not allowed.
   */
  public validateTransition(currentStatus: EvaluationCycleStatus, targetStatus: EvaluationCycleStatus): void {
    if (currentStatus === targetStatus) {
      return;
    }

    const allowed = EvaluationCycleTransitionService.ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new Conflict(
        `Cannot transition evaluation cycle status from ${currentStatus} to ${targetStatus}`,
        EvaluationCycleErrorCodes.INVALID_CYCLE_STATE_TRANSITION
      );
    }
  }

  /**
   * Checks if cycle status is lockable.
   */
  public isLockable(currentStatus: EvaluationCycleStatus): boolean {
    return currentStatus !== EvaluationCycleStatus.DRAFT && currentStatus !== EvaluationCycleStatus.LOCKED;
  }
}
