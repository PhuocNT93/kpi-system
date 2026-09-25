import { TransactionClient } from '../../../shared/database/transaction.js';
import {
  CalibrationSession,
  CalibrationAdjustment,
  CalibrationEvaluationRow,
  CreateCalibrationSessionInput,
} from './calibration.domain.js';

export interface PublishedEvaluationRow {
  evaluationId: string;
  employeeId: string;
  publishedAt: Date;
  /** Status read under row lock immediately before this transition. */
  previousStatus: string;
}

export interface CalibrationRepository {
  createSession(
    input: CreateCalibrationSessionInput,
    createdBy: string | null,
    client?: TransactionClient
  ): Promise<CalibrationSession>;

  getSessionById(sessionId: string, client?: TransactionClient): Promise<CalibrationSession | null>;

  getSessionByIdForUpdate(sessionId: string, client: TransactionClient): Promise<CalibrationSession | null>;

  getExistingSession(
    cycleId: string,
    scopeType: string,
    scopeId: string | null,
    client?: TransactionClient
  ): Promise<CalibrationSession | null>;

  listSessionsByCycle(cycleId: string, client?: TransactionClient): Promise<CalibrationSession[]>;

  finalizeSession(sessionId: string, updatedBy: string | null, client?: TransactionClient): Promise<void>;

  getEvaluationsForSession(session: CalibrationSession, client?: TransactionClient): Promise<CalibrationEvaluationRow[]>;

  getEvaluationById(evaluationId: string, client?: TransactionClient): Promise<{
    evaluationId: string;
    evaluationCycleId: string;
    employeeId: string;
    finalScore: number | null;
    managerScore: number | null;
    selfScore: number | null;
    status: string;
    isLocked: boolean;
  } | null>;

  isCycleLocked(cycleId: string, client?: TransactionClient): Promise<boolean>;

  insertAdjustment(
    params: {
      calibrationSessionId: string;
      evaluationId: string;
      oldFinalScore: number;
      newFinalScore: number;
      reason: string;
      adjustedBy: string;
    },
    client: TransactionClient
  ): Promise<CalibrationAdjustment>;

  updateEvaluationFinalScore(
    evaluationId: string,
    finalScore: number,
    client: TransactionClient
  ): Promise<void>;

  /** Moves the evaluations to PUBLISHED and returns the ones actually published. */
  transitionEvaluationsAndAutoPublish(
    evaluationIds: string[],
    updatedBy: string,
    client: TransactionClient
  ): Promise<PublishedEvaluationRow[]>;

  getAdjustmentsBySession(sessionId: string, client?: TransactionClient): Promise<CalibrationAdjustment[]>;
}
