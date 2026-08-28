import { describe, it, expect } from 'vitest';
import { EvaluationCycleTransitionService } from '../src/modules/evaluation-cycle/application/evaluation-cycle-transition.service.js';
import { EvaluationCycleStatus, EvaluationCycleErrorCodes } from '../src/modules/evaluation-cycle/domain/evaluation-cycle.types.js';
import { Conflict } from '../src/api/app-error.js';

describe('EvaluationCycleTransitionService', () => {
  const transitionService = new EvaluationCycleTransitionService();

  it('allows valid DRAFT -> OPEN transition', () => {
    expect(() =>
      transitionService.validateTransition(EvaluationCycleStatus.DRAFT, EvaluationCycleStatus.OPEN)
    ).not.toThrow();
  });

  it('allows same status (noop)', () => {
    expect(() =>
      transitionService.validateTransition(EvaluationCycleStatus.DRAFT, EvaluationCycleStatus.DRAFT)
    ).not.toThrow();
  });

  it('rejects invalid DRAFT -> LOCKED transition', () => {
    try {
      transitionService.validateTransition(EvaluationCycleStatus.DRAFT, EvaluationCycleStatus.LOCKED);
      expect.fail('Should have thrown Conflict');
    } catch (err: any) {
      expect(err).toBeInstanceOf(Conflict);
      expect(err.code).toBe(EvaluationCycleErrorCodes.INVALID_CYCLE_STATE_TRANSITION);
    }
  });

  it('rejects invalid LOCKED -> DRAFT or LOCKED -> OPEN transition', () => {
    expect(() =>
      transitionService.validateTransition(EvaluationCycleStatus.LOCKED, EvaluationCycleStatus.DRAFT)
    ).toThrow(Conflict);

    expect(() =>
      transitionService.validateTransition(EvaluationCycleStatus.LOCKED, EvaluationCycleStatus.OPEN)
    ).toThrow(Conflict);
  });
});
