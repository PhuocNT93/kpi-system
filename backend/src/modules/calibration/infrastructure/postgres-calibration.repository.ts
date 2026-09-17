import { Pool, QueryResultRow } from 'pg';
import { TransactionClient } from '../../../shared/database/transaction.js';
import {
  CalibrationSession,
  CalibrationAdjustment,
  CalibrationEvaluationRow,
  CreateCalibrationSessionInput,
} from '../domain/calibration.domain.js';
import { CalibrationRepository } from '../domain/calibration.repository.js';

export class PostgresCalibrationRepository implements CalibrationRepository {
  constructor(private pool: Pool) {}

  private getExecutor(client?: TransactionClient) {
    return client ?? this.pool;
  }

  async createSession(
    input: CreateCalibrationSessionInput,
    createdBy: string | null,
    client?: TransactionClient
  ): Promise<CalibrationSession> {
    const executor = this.getExecutor(client);
    const result = await executor.query(
      `INSERT INTO calibration_session (
        evaluation_cycle_id,
        scope_type,
        scope_id,
        status,
        created_by
      ) VALUES ($1, $2, $3, 'OPEN', $4)
      RETURNING 
        calibration_session_id AS "calibrationSessionId",
        evaluation_cycle_id AS "evaluationCycleId",
        scope_type AS "scopeType",
        scope_id AS "scopeId",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        created_by AS "createdBy"`,
      [input.evaluation_cycle_id, input.scope_type, input.scope_id ?? null, createdBy]
    );

    const created = result.rows[0] as unknown as CalibrationSession;
    const full = await this.getSessionById(created.calibrationSessionId, client);
    return full ?? created;
  }

  async getSessionById(sessionId: string, client?: TransactionClient): Promise<CalibrationSession | null> {
    const executor = this.getExecutor(client);
    const result = await executor.query(
      `SELECT 
        cs.calibration_session_id AS "calibrationSessionId",
        cs.evaluation_cycle_id AS "evaluationCycleId",
        ec.name AS "cycleName",
        cs.scope_type AS "scopeType",
        cs.scope_id AS "scopeId",
        CASE 
          WHEN cs.scope_type = 'TEAM' THEN t.name
          WHEN cs.scope_type = 'DEPARTMENT' THEN d.name
          ELSE 'Toàn công ty (Org-wide)'
        END AS "scopeName",
        cs.status,
        cs.created_at AS "createdAt",
        cs.updated_at AS "updatedAt",
        cs.created_by AS "createdBy",
        u.name AS "createdByName"
      FROM calibration_session cs
      JOIN evaluation_cycle ec ON cs.evaluation_cycle_id = ec.evaluation_cycle_id
      LEFT JOIN team t ON cs.scope_type = 'TEAM' AND cs.scope_id = t.team_id
      LEFT JOIN department d ON cs.scope_type = 'DEPARTMENT' AND cs.scope_id = d.department_id
      LEFT JOIN app_user u ON cs.created_by = u.id
      WHERE cs.calibration_session_id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as unknown as CalibrationSession;
  }

  async getSessionByIdForUpdate(sessionId: string, client: TransactionClient): Promise<CalibrationSession | null> {
    const result = await client.query(
      `SELECT 
        cs.calibration_session_id AS "calibrationSessionId",
        cs.evaluation_cycle_id AS "evaluationCycleId",
        cs.scope_type AS "scopeType",
        cs.scope_id AS "scopeId",
        cs.status,
        cs.created_at AS "createdAt",
        cs.updated_at AS "updatedAt",
        cs.created_by AS "createdBy"
      FROM calibration_session cs
      WHERE cs.calibration_session_id = $1
      FOR UPDATE`,
      [sessionId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as unknown as CalibrationSession;
  }

  async getExistingSession(
    cycleId: string,
    scopeType: string,
    scopeId: string | null,
    client?: TransactionClient
  ): Promise<CalibrationSession | null> {
    const executor = this.getExecutor(client);
    const query = scopeId
      ? `SELECT 
          cs.calibration_session_id AS "calibrationSessionId",
          cs.evaluation_cycle_id AS "evaluationCycleId",
          cs.scope_type AS "scopeType",
          cs.scope_id AS "scopeId",
          cs.status,
          cs.created_at AS "createdAt",
          cs.updated_at AS "updatedAt",
          cs.created_by AS "createdBy"
        FROM calibration_session cs
        WHERE cs.evaluation_cycle_id = $1 AND cs.scope_type = $2 AND cs.scope_id = $3 AND cs.status = 'OPEN'
        LIMIT 1`
      : `SELECT 
          cs.calibration_session_id AS "calibrationSessionId",
          cs.evaluation_cycle_id AS "evaluationCycleId",
          cs.scope_type AS "scopeType",
          cs.scope_id AS "scopeId",
          cs.status,
          cs.created_at AS "createdAt",
          cs.updated_at AS "updatedAt",
          cs.created_by AS "createdBy"
        FROM calibration_session cs
        WHERE cs.evaluation_cycle_id = $1 AND cs.scope_type = $2 AND cs.scope_id IS NULL AND cs.status = 'OPEN'
        LIMIT 1`;

    const params = scopeId ? [cycleId, scopeType, scopeId] : [cycleId, scopeType];
    const result = await executor.query(query, params);
    if (result.rows.length === 0) return null;
    return result.rows[0] as unknown as CalibrationSession;
  }

  async listSessionsByCycle(cycleId: string, client?: TransactionClient): Promise<CalibrationSession[]> {
    const executor = this.getExecutor(client);
    const result = await executor.query(
      `SELECT 
        cs.calibration_session_id AS "calibrationSessionId",
        cs.evaluation_cycle_id AS "evaluationCycleId",
        ec.name AS "cycleName",
        cs.scope_type AS "scopeType",
        cs.scope_id AS "scopeId",
        CASE 
          WHEN cs.scope_type = 'TEAM' THEN t.name
          WHEN cs.scope_type = 'DEPARTMENT' THEN d.name
          ELSE 'Toàn công ty (Org-wide)'
        END AS "scopeName",
        cs.status,
        cs.created_at AS "createdAt",
        cs.updated_at AS "updatedAt",
        cs.created_by AS "createdBy",
        u.name AS "createdByName"
      FROM calibration_session cs
      JOIN evaluation_cycle ec ON cs.evaluation_cycle_id = ec.evaluation_cycle_id
      LEFT JOIN team t ON cs.scope_type = 'TEAM' AND cs.scope_id = t.team_id
      LEFT JOIN department d ON cs.scope_type = 'DEPARTMENT' AND cs.scope_id = d.department_id
      LEFT JOIN app_user u ON cs.created_by = u.id
      WHERE cs.evaluation_cycle_id = $1
      ORDER BY cs.created_at DESC`,
      [cycleId]
    );

    return result.rows as unknown as CalibrationSession[];
  }

  async finalizeSession(sessionId: string, updatedBy: string | null, client?: TransactionClient): Promise<void> {
    const executor = this.getExecutor(client);
    await executor.query(
      `UPDATE calibration_session
       SET status = 'FINALIZED', updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE calibration_session_id = $1`,
      [sessionId, updatedBy]
    );
  }

  async getEvaluationsForSession(
    session: CalibrationSession,
    client?: TransactionClient
  ): Promise<CalibrationEvaluationRow[]> {
    const executor = this.getExecutor(client);
    const conditions: string[] = ['e.evaluation_cycle_id = $1'];
    const values: unknown[] = [session.evaluationCycleId];

    if (session.scopeType === 'TEAM' && session.scopeId) {
      conditions.push('e.team_id_snapshot = $2');
      values.push(session.scopeId);
    } else if (session.scopeType === 'DEPARTMENT' && session.scopeId) {
      conditions.push('emp.department_id = $2');
      values.push(session.scopeId);
    }

    const query = `
      SELECT 
        e.evaluation_id AS "evaluationId",
        e.employee_id AS "employeeId",
        emp.employee_code AS "employeeCode",
        emp.full_name AS "employeeName",
        d.name AS "departmentName",
        t.name AS "teamName",
        e.status,
        e.is_locked AS "isLocked",
        COALESCE(e.manager_score, e.self_score) AS "calculatedScore",
        e.final_score AS "finalScore",
        latest_adj.reason AS "latestAdjustmentReason",
        latest_adj.adjusted_at AS "latestAdjustedAt",
        latest_adj_user.name AS "latestAdjustedByName"
      FROM evaluation e
      JOIN employee emp ON e.employee_id = emp.employee_id
      LEFT JOIN team t ON e.team_id_snapshot = t.team_id
      LEFT JOIN department d ON emp.department_id = d.department_id
      LEFT JOIN LATERAL (
        SELECT ca.reason, ca.adjusted_at, ca.adjusted_by
        FROM calibration_adjustment ca
        WHERE ca.evaluation_id = e.evaluation_id AND ca.calibration_session_id = $${values.length + 1}
        ORDER BY ca.adjusted_at DESC
        LIMIT 1
      ) latest_adj ON true
      LEFT JOIN app_user latest_adj_user ON latest_adj.adjusted_by = latest_adj_user.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY emp.full_name ASC
    `;

    values.push(session.calibrationSessionId);

    const result = await executor.query(query, values);
    return result.rows.map((row: QueryResultRow) => ({
      evaluationId: row.evaluationId,
      employeeId: row.employeeId,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      departmentName: row.departmentName,
      teamName: row.teamName,
      status: row.status,
      isLocked: Boolean(row.isLocked),
      calculatedScore: row.calculatedScore != null ? Number(row.calculatedScore) : null,
      finalScore: row.finalScore != null ? Number(row.finalScore) : null,
      latestAdjustmentReason: row.latestAdjustmentReason ?? null,
      latestAdjustedAt: row.latestAdjustedAt ?? null,
      latestAdjustedByName: row.latestAdjustedByName ?? null,
    }));
  }

  async getEvaluationById(evaluationId: string, client?: TransactionClient): Promise<{
    evaluationId: string;
    evaluationCycleId: string;
    employeeId: string;
    finalScore: number | null;
    managerScore: number | null;
    selfScore: number | null;
    status: string;
    isLocked: boolean;
  } | null> {
    const executor = this.getExecutor(client);
    const result = await executor.query(
      `SELECT 
        evaluation_id AS "evaluationId",
        evaluation_cycle_id AS "evaluationCycleId",
        employee_id AS "employeeId",
        final_score AS "finalScore",
        manager_score AS "managerScore",
        self_score AS "selfScore",
        status,
        is_locked AS "isLocked"
      FROM evaluation
      WHERE evaluation_id = $1`,
      [evaluationId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0] as QueryResultRow;
    return {
      evaluationId: row.evaluationId,
      evaluationCycleId: row.evaluationCycleId,
      employeeId: row.employeeId,
      finalScore: row.finalScore != null ? Number(row.finalScore) : null,
      managerScore: row.managerScore != null ? Number(row.managerScore) : null,
      selfScore: row.selfScore != null ? Number(row.selfScore) : null,
      status: row.status,
      isLocked: Boolean(row.isLocked),
    };
  }

  async isCycleLocked(cycleId: string, client?: TransactionClient): Promise<boolean> {
    const executor = this.getExecutor(client);
    const lockClause = client ? ' FOR SHARE' : '';
    const result = await executor.query(
      `SELECT locked_at, status FROM evaluation_cycle WHERE evaluation_cycle_id = $1${lockClause}`,
      [cycleId]
    );
    if (result.rows.length === 0) return false;
    const row = result.rows[0] as QueryResultRow;
    return Boolean(row.locked_at) || row.status === 'LOCKED';
  }

  async insertAdjustment(
    params: {
      calibrationSessionId: string;
      evaluationId: string;
      oldFinalScore: number;
      newFinalScore: number;
      reason: string;
      adjustedBy: string;
    },
    client: TransactionClient
  ): Promise<CalibrationAdjustment> {
    const result = await client.query(
      `INSERT INTO calibration_adjustment (
        calibration_session_id,
        evaluation_id,
        old_final_score,
        new_final_score,
        reason,
        adjusted_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        calibration_adjustment_id AS "calibrationAdjustmentId",
        calibration_session_id AS "calibrationSessionId",
        evaluation_id AS "evaluationId",
        old_final_score AS "oldFinalScore",
        new_final_score AS "newFinalScore",
        reason,
        adjusted_by AS "adjustedBy",
        adjusted_at AS "adjustedAt"`,
      [
        params.calibrationSessionId,
        params.evaluationId,
        params.oldFinalScore,
        params.newFinalScore,
        params.reason,
        params.adjustedBy,
      ]
    );

    const row = result.rows[0] as QueryResultRow;
    return {
      calibrationAdjustmentId: row.calibrationAdjustmentId,
      calibrationSessionId: row.calibrationSessionId,
      evaluationId: row.evaluationId,
      oldFinalScore: Number(row.oldFinalScore),
      newFinalScore: Number(row.newFinalScore),
      reason: row.reason,
      adjustedBy: row.adjustedBy,
      adjustedAt: row.adjustedAt,
    };
  }

  async updateEvaluationFinalScore(
    evaluationId: string,
    finalScore: number,
    client: TransactionClient
  ): Promise<void> {
    await client.query(
      `UPDATE evaluation
       SET final_score = $2, updated_at = CURRENT_TIMESTAMP
       WHERE evaluation_id = $1`,
      [evaluationId, finalScore]
    );
  }

  async transitionEvaluationsAndAutoPublish(
    evaluationIds: string[],
    updatedBy: string,
    client: TransactionClient
  ): Promise<void> {
    if (evaluationIds.length === 0) return;
    await client.query(
      `UPDATE evaluation
       SET status = 'PUBLISHED',
           approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
           published_at = CURRENT_TIMESTAMP,
           published_by = $2,
           updated_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE evaluation_id = ANY($1) AND is_locked = false`,
      [evaluationIds, updatedBy]
    );
  }

  async getAdjustmentsBySession(sessionId: string, client?: TransactionClient): Promise<CalibrationAdjustment[]> {
    const executor = this.getExecutor(client);
    const result = await executor.query(
      `SELECT 
        ca.calibration_adjustment_id AS "calibrationAdjustmentId",
        ca.calibration_session_id AS "calibrationSessionId",
        ca.evaluation_id AS "evaluationId",
        emp.full_name AS "employeeName",
        emp.employee_code AS "employeeCode",
        ca.old_final_score AS "oldFinalScore",
        ca.new_final_score AS "newFinalScore",
        ca.reason,
        ca.adjusted_by AS "adjustedBy",
        u.name AS "adjustedByName",
        ca.adjusted_at AS "adjustedAt"
      FROM calibration_adjustment ca
      JOIN evaluation e ON ca.evaluation_id = e.evaluation_id
      JOIN employee emp ON e.employee_id = emp.employee_id
      LEFT JOIN app_user u ON ca.adjusted_by = u.id
      WHERE ca.calibration_session_id = $1
      ORDER BY ca.adjusted_at DESC`,
      [sessionId]
    );

    return result.rows.map((row: QueryResultRow) => ({
      calibrationAdjustmentId: row.calibrationAdjustmentId,
      calibrationSessionId: row.calibrationSessionId,
      evaluationId: row.evaluationId,
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      oldFinalScore: Number(row.oldFinalScore),
      newFinalScore: Number(row.newFinalScore),
      reason: row.reason,
      adjustedBy: row.adjustedBy,
      adjustedByName: row.adjustedByName,
      adjustedAt: row.adjustedAt,
    }));
  }
}
