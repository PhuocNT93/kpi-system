import { Pool } from 'pg';
import { withAuditedTransaction, AuditCollector } from '../../audit/application/audit-transaction.js';
import { TransactionClient } from '../../../shared/database/transaction.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { Actor } from '../../../shared/auth/types.js';
import {
  CalibrationSession,
  CalibrationSessionDetail,
  CalibrationDistribution,
  ScoreBucket,
  CreateCalibrationSessionSchema,
  CreateCalibrationAdjustmentSchema,
  CreateCalibrationSessionInput,
  CreateCalibrationAdjustmentInput,
} from '../domain/calibration.domain.js';
import { AppError, NotFound, Forbidden, Conflict, Unprocessable, BadRequest } from '../../../api/app-error.js';
import { EvaluationPublishedHandler } from '../../employee/domain/review-schedule.port.js';
import { PostgresCalibrationRepository } from '../infrastructure/postgres-calibration.repository.js';
import { NotificationType, NotificationService } from '../../notification/index.js';

export class CalibrationService {
  constructor(
    private pool: Pool,
    private calibrationRepo: PostgresCalibrationRepository,
    private auditService?: AuditService,
    private notificationService?: NotificationService,
    private evaluationPublishedHandler?: EvaluationPublishedHandler
  ) {}

  private requireHrAdmin(actor: Actor): void {
    if (actor.role !== 'HR_ADMIN') {
      throw new Forbidden('Chỉ Quản trị viên nhân sự (HR_ADMIN) mới có quyền thực hiện hiệu chuẩn điểm.');
    }
  }

  async createSession(input: CreateCalibrationSessionInput, actor: Actor): Promise<CalibrationSession> {
    this.requireHrAdmin(actor);

    const parsed = CreateCalibrationSessionSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequest(parsed.error.issues.map((e) => e.message).join(', '));
    }

    const isLocked = await this.calibrationRepo.isCycleLocked(parsed.data.evaluation_cycle_id);
    if (isLocked) {
      throw new Conflict('Kỳ đánh giá này đã bị khóa (LOCKED), không thể tạo phiên hiệu chuẩn mới.', 'EVALUATION_LOCKED');
    }

    const existingOpen = await this.calibrationRepo.getExistingSession(
      parsed.data.evaluation_cycle_id,
      parsed.data.scope_type,
      parsed.data.scope_id ?? null
    );
    if (existingOpen) {
      throw new Conflict(
        'Đã tồn tại một phiên hiệu chuẩn điểm đang mở (OPEN) cho phạm vi này trong kỳ đánh giá.',
        'CALIBRATION_SESSION_ALREADY_EXISTS'
      );
    }

    if (!this.auditService) {
      return this.calibrationRepo.createSession(parsed.data, actor.userId);
    }

    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const session = await this.calibrationRepo.createSession(parsed.data, actor.userId, client);

      audit.record({
        entityType: 'CALIBRATION_SESSION',
        entityId: session.calibrationSessionId,
        action: 'CREATE',
        reason: `Khởi tạo phiên hiệu chuẩn điểm (Scope: ${session.scopeType})`,
        performedBy: actor.userId,
      });

      return session;
    });
  }

  async getSessionDetail(sessionId: string, actor: Actor): Promise<CalibrationSessionDetail> {
    this.requireHrAdmin(actor);

    const session = await this.calibrationRepo.getSessionById(sessionId);
    if (!session) {
      throw new NotFound('Phiên hiệu chuẩn điểm (Calibration Session)');
    }

    const [evaluations, adjustments] = await Promise.all([
      this.calibrationRepo.getEvaluationsForSession(session),
      this.calibrationRepo.getAdjustmentsBySession(sessionId),
    ]);

    const distribution = this.calculateDistribution(evaluations);

    return {
      session,
      distribution,
      evaluations,
      adjustments,
    };
  }

  async getDistribution(sessionId: string, actor: Actor): Promise<CalibrationDistribution> {
    this.requireHrAdmin(actor);

    const session = await this.calibrationRepo.getSessionById(sessionId);
    if (!session) {
      throw new NotFound('Phiên hiệu chuẩn điểm (Calibration Session)');
    }

    const evaluations = await this.calibrationRepo.getEvaluationsForSession(session);
    return this.calculateDistribution(evaluations);
  }

  async listSessions(cycleId: string, actor: Actor): Promise<CalibrationSession[]> {
    this.requireHrAdmin(actor);
    return this.calibrationRepo.listSessionsByCycle(cycleId);
  }

  async getAdjustments(sessionId: string, actor: Actor) {
    this.requireHrAdmin(actor);

    const session = await this.calibrationRepo.getSessionById(sessionId);
    if (!session) {
      throw new NotFound('Phiên hiệu chuẩn điểm (Calibration Session)');
    }

    return this.calibrationRepo.getAdjustmentsBySession(sessionId);
  }

  async adjustScore(
    sessionId: string,
    input: CreateCalibrationAdjustmentInput,
    actor: Actor
  ): Promise<CalibrationSessionDetail> {
    this.requireHrAdmin(actor);

    const trimmedReason = input.reason ? input.reason.trim() : '';
    if (!trimmedReason || trimmedReason.length < 3) {
      throw new Unprocessable(
        'Lý do điều chỉnh là bắt buộc và phải có ít nhất 3 ký tự.',
        'CALIBRATION_REASON_REQUIRED'
      );
    }

    const parsed = CreateCalibrationAdjustmentSchema.safeParse({
      ...input,
      reason: trimmedReason,
    });
    if (!parsed.success) {
      throw new Unprocessable(parsed.error.issues.map((e) => e.message).join(', '), 'INVALID_CALIBRATION_SCORE');
    }

    const session = await this.calibrationRepo.getSessionById(sessionId);
    if (!session) {
      throw new NotFound('Phiên hiệu chuẩn điểm (Calibration Session)');
    }

    if (session.status === 'FINALIZED') {
      throw new Conflict(
        'Phiên hiệu chuẩn điểm này đã được chốt (FINALIZED) và không thể điều chỉnh điểm nữa.',
        'CALIBRATION_SESSION_ALREADY_FINALIZED'
      );
    }

    const isCycleLocked = await this.calibrationRepo.isCycleLocked(session.evaluationCycleId);
    if (isCycleLocked) {
      throw new Conflict('Kỳ đánh giá này đã bị khóa (LOCKED).', 'EVALUATION_LOCKED');
    }

    const evaluation = await this.calibrationRepo.getEvaluationById(parsed.data.evaluation_id);
    if (!evaluation) {
      throw new NotFound('Phiếu đánh giá của nhân viên');
    }

    if (evaluation.evaluationCycleId !== session.evaluationCycleId) {
      throw new NotFound('Phiếu đánh giá không thuộc kỳ đánh giá của phiên này.');
    }

    if (evaluation.isLocked) {
      throw new Conflict('Phiếu đánh giá này đã bị khóa (LOCKED).', 'EVALUATION_LOCKED');
    }

    const oldFinalScore =
      evaluation.finalScore != null
        ? evaluation.finalScore
        : evaluation.managerScore != null
        ? evaluation.managerScore
        : evaluation.selfScore != null
        ? evaluation.selfScore
        : 0;

    const executeAdjustment = async (client: TransactionClient, audit?: AuditCollector) => {
      await this.calibrationRepo.insertAdjustment(
        {
          calibrationSessionId: sessionId,
          evaluationId: parsed.data.evaluation_id,
          oldFinalScore,
          newFinalScore: parsed.data.new_final_score,
          reason: parsed.data.reason,
          adjustedBy: actor.userId,
        },
        client
      );

      await this.calibrationRepo.updateEvaluationFinalScore(
        parsed.data.evaluation_id,
        parsed.data.new_final_score,
        client
      );

      if (audit) {
        audit.record({
          entityType: 'EVALUATION',
          entityId: parsed.data.evaluation_id,
          action: 'CALIBRATION_ADJUST',
          fieldName: 'final_score',
          oldValue: String(oldFinalScore),
          newValue: String(parsed.data.new_final_score),
          reason: parsed.data.reason,
          performedBy: actor.userId,
        });
      }

      if (evaluation.status === 'PUBLISHED' && this.notificationService) {
        const userRes = await client.query(
          `SELECT u.id as user_id, u.email
           FROM employee e
           JOIN app_user u ON LOWER(u.email) = LOWER(e.email)
           WHERE e.employee_id = $1
           LIMIT 1`,
          [evaluation.employeeId]
        );
        if (userRes.rows.length > 0 && userRes.rows[0]) {
          await this.notificationService.enqueueNotification(
            {
              notificationType: NotificationType.SCORE_ADJUSTED,
              relatedEntityType: 'CALIBRATION_SESSION',
              relatedEntityId: sessionId,
              recipientUserAccountId: String(userRes.rows[0].user_id),
              recipientEmail: String(userRes.rows[0].email),
              contextPayload: {
                evaluation_id: parsed.data.evaluation_id,
              },
            },
            client
          );
        }
      }
    };

    if (this.auditService) {
      await withAuditedTransaction(this.pool, this.auditService, executeAdjustment);
    } else {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await executeAdjustment(client);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    return this.getSessionDetail(sessionId, actor);
  }

  async finalizeSession(sessionId: string, actor: Actor): Promise<CalibrationSession> {
    this.requireHrAdmin(actor);

    const executeFinalize = async (client: TransactionClient, audit?: AuditCollector) => {
      const session = await this.calibrationRepo.getSessionByIdForUpdate(sessionId, client);
      if (!session) {
        throw new NotFound('Phiên hiệu chuẩn điểm (Calibration Session)');
      }

      if (session.status === 'FINALIZED') {
        throw new Conflict(
          'Phiên hiệu chuẩn điểm này đã được chốt (FINALIZED).',
          'CALIBRATION_SESSION_ALREADY_FINALIZED'
        );
      }

      const isCycleLocked = await this.calibrationRepo.isCycleLocked(session.evaluationCycleId, client);
      if (isCycleLocked) {
        throw new Conflict('Kỳ đánh giá này đã bị khóa (LOCKED).', 'EVALUATION_LOCKED');
      }

      const evaluations = await this.calibrationRepo.getEvaluationsForSession(session, client);
      if (evaluations.some((e) => e.isLocked)) {
        throw new Conflict('Một hoặc nhiều phiếu đánh giá trong phiên này đã bị khóa (LOCKED).', 'EVALUATION_LOCKED');
      }

      await this.calibrationRepo.finalizeSession(sessionId, actor.userId, client);

      const evaluationIds = evaluations.map((e) => e.evaluationId);
      const published = await this.calibrationRepo.transitionEvaluationsAndAutoPublish(evaluationIds, actor.userId, client);

      // EVAL-06: auto-publish updates the review schedule of every employee whose evaluation became PUBLISHED
      // now, in the same transaction. Evaluations that were already PUBLISHED before this finalize are excluded so
      // their completion base (last_evaluation_completed_at) is not moved (no schedule drift).
      const newlyPublished = published
        .filter((row) => row.previousStatus !== 'PUBLISHED')
        .map(({ evaluationId, employeeId, publishedAt }) => ({ evaluationId, employeeId, publishedAt }));
      if (newlyPublished.length > 0) {
        if (!this.evaluationPublishedHandler) {
          throw new AppError(500, 'REVIEW_SCHEDULE_NOT_CONFIGURED', 'Review schedule handler is not configured; publishing is disabled.');
        }
        await this.evaluationPublishedHandler.onEvaluationsPublished(client, newlyPublished, actor.userId);
      }

      if (audit) {
        audit.record({
          entityType: 'CALIBRATION_SESSION',
          entityId: sessionId,
          action: 'CALIBRATION_FINALIZE',
          reason: 'Chốt phiên hiệu chuẩn điểm calibration và tự động xuất bản (auto-publish)',
          performedBy: actor.userId,
        });

        for (const evalId of evaluationIds) {
          audit.record({
            entityType: 'EVALUATION',
            entityId: evalId,
            action: 'APPROVE',
            oldValue: JSON.stringify({ status: 'CALIBRATION' }),
            newValue: JSON.stringify({ status: 'APPROVED' }),
            reason: 'Phê duyệt phiếu đánh giá sau khi chốt phiên hiệu chuẩn điểm',
            performedBy: actor.userId,
          });
          audit.record({
            entityType: 'EVALUATION',
            entityId: evalId,
            action: 'PUBLISH',
            oldValue: JSON.stringify({ status: 'APPROVED' }),
            newValue: JSON.stringify({ status: 'PUBLISHED' }),
            reason: 'Tự động xuất bản sau khi chốt phiên hiệu chuẩn điểm',
            performedBy: actor.userId,
          });
        }
      }
    };

    if (this.auditService) {
      await withAuditedTransaction(this.pool, this.auditService, executeFinalize);
    } else {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await executeFinalize(client);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    const updated = await this.calibrationRepo.getSessionById(sessionId);
    return updated!;
  }

  calculateDistribution(
    evaluations: { calculatedScore: number | null; finalScore: number | null }[]
  ): CalibrationDistribution {
    const scores = evaluations
      .map((e) => (e.calculatedScore != null ? Number(e.calculatedScore) : null))
      .filter((s): s is number => s != null && !isNaN(s));

    const totalEvaluations = evaluations.length;
    if (scores.length === 0) {
      return {
        totalEvaluations,
        minScore: null,
        maxScore: null,
        averageScore: null,
        medianScore: null,
        buckets: this.buildEmptyBuckets(),
      };
    }

    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const averageScore = Math.round((sum / scores.length) * 100) / 100;

    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianScore: number =
      sorted.length % 2 !== 0
        ? (sorted[mid] ?? 0)
        : Math.round((((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2) * 100) / 100;

    const bucketsDef = [
      { range: '< 60 (Không đạt)', min: -Infinity, max: 60 },
      { range: '60 - 69.99 (Cần cải thiện)', min: 60, max: 70 },
      { range: '70 - 79.99 (Đạt yêu cầu)', min: 70, max: 80 },
      { range: '80 - 89.99 (Tốt)', min: 80, max: 90 },
      { range: '>= 90 (Xuất sắc)', min: 90, max: Infinity },
    ];

    const buckets: ScoreBucket[] = bucketsDef.map((b) => {
      const count = scores.filter((s) => s >= b.min && (b.max === Infinity ? true : s < b.max)).length;
      const percentage = Math.round((count / scores.length) * 100);
      return {
        range: b.range,
        count,
        percentage,
      };
    });

    return {
      totalEvaluations,
      minScore: Math.round(minScore * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      averageScore,
      medianScore,
      buckets,
    };
  }

  private buildEmptyBuckets(): ScoreBucket[] {
    return [
      { range: '< 60 (Không đạt)', count: 0, percentage: 0 },
      { range: '60 - 69.99 (Cần cải thiện)', count: 0, percentage: 0 },
      { range: '70 - 79.99 (Đạt yêu cầu)', count: 0, percentage: 0 },
      { range: '80 - 89.99 (Tốt)', count: 0, percentage: 0 },
      { range: '>= 90 (Xuất sắc)', count: 0, percentage: 0 },
    ];
  }
}
