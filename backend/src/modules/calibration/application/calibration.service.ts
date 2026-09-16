import { Pool } from 'pg';
import { withAuditedTransaction } from '../../audit/application/audit-transaction.js';
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
import { CalibrationRepository } from '../domain/calibration.repository.js';
import { NotFound, Forbidden, Conflict, Locked, BadRequest } from '../../../api/app-error.js';

export class CalibrationService {
  constructor(
    private pool: Pool,
    private calibrationRepo: CalibrationRepository,
    private auditService?: AuditService
  ) {}

  private requireHrOrAdmin(actor: Actor): void {
    if (actor.role !== 'HR_ADMIN' && actor.role !== 'SYSTEM_ADMIN') {
      throw new Forbidden('Chỉ Quản trị viên nhân sự (HR_ADMIN) hoặc Quản trị hệ thống (SYSTEM_ADMIN) mới có quyền thực hiện hiệu chuẩn điểm.');
    }
  }

  async createSession(input: CreateCalibrationSessionInput, actor: Actor): Promise<CalibrationSession> {
    this.requireHrOrAdmin(actor);
    const parsed = CreateCalibrationSessionSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequest(parsed.error.issues.map((e) => e.message).join(', '));
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
        reason: `Khởi tạo phiên cân bằng điểm (Scope: ${session.scopeType})`,
        performedBy: actor.userId,
      });

      return session;
    });
  }

  async getSessionDetail(sessionId: string, actor: Actor): Promise<CalibrationSessionDetail> {
    this.requireHrOrAdmin(actor);
    const session = await this.calibrationRepo.getSessionById(sessionId);
    if (!session) {
      throw new NotFound('Không tìm thấy phiên hiệu chuẩn điểm (Calibration Session).');
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

  async listSessions(cycleId: string, actor: Actor): Promise<CalibrationSession[]> {
    this.requireHrOrAdmin(actor);
    return this.calibrationRepo.listSessionsByCycle(cycleId);
  }

  async adjustScore(
    sessionId: string,
    input: CreateCalibrationAdjustmentInput,
    actor: Actor
  ): Promise<CalibrationSessionDetail> {
    this.requireHrOrAdmin(actor);
    const parsed = CreateCalibrationAdjustmentSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequest(parsed.error.issues.map((e) => e.message).join(', '));
    }

    const session = await this.calibrationRepo.getSessionById(sessionId);
    if (!session) {
      throw new NotFound('Không tìm thấy phiên hiệu chuẩn điểm.');
    }

    if (session.status === 'FINALIZED') {
      throw new Conflict('Phiên hiệu chuẩn điểm này đã được chốt (FINALIZED) và không thể điều chỉnh điểm nữa.');
    }

    const evaluation = await this.calibrationRepo.getEvaluationById(parsed.data.evaluation_id);
    if (!evaluation) {
      throw new NotFound('Không tìm thấy phiếu đánh giá của nhân viên.');
    }

    if (evaluation.isLocked) {
      throw new Locked('Phiếu đánh giá này');
    }

    const oldFinalScore =
      evaluation.finalScore != null
        ? evaluation.finalScore
        : evaluation.managerScore != null
        ? evaluation.managerScore
        : evaluation.selfScore != null
        ? evaluation.selfScore
        : 0;

    const executeAdjustment = async (client: any, audit?: any) => {
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
          action: 'ADJUST',
          fieldName: 'final_score',
          oldValue: String(oldFinalScore),
          newValue: String(parsed.data.new_final_score),
          reason: parsed.data.reason,
          performedBy: actor.userId,
        });
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
    this.requireHrOrAdmin(actor);
    const session = await this.calibrationRepo.getSessionById(sessionId);
    if (!session) {
      throw new NotFound('Không tìm thấy phiên hiệu chuẩn điểm.');
    }

    if (session.status === 'FINALIZED') {
      return session; // Idempotent
    }

    const executeFinalize = async (client: any, audit?: any) => {
      await this.calibrationRepo.finalizeSession(sessionId, actor.userId, client);

      if (audit) {
        audit.record({
          entityType: 'CALIBRATION_SESSION',
          entityId: sessionId,
          action: 'FINALIZE',
          reason: 'Chốt phiên cân bằng điểm calibration thành công',
          performedBy: actor.userId,
        });
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

  private calculateDistribution(evaluations: { calculatedScore: number | null; finalScore: number | null }[]): CalibrationDistribution {
    const scores = evaluations
      .map((e) => (e.finalScore != null ? e.finalScore : e.calculatedScore))
      .filter((s): s is number => s != null && !isNaN(s));

    const totalEvaluations = evaluations.length;
    if (scores.length === 0) {
      return {
        totalEvaluations,
        minScore: null,
        maxScore: null,
        averageScore: null,
        buckets: this.buildEmptyBuckets(),
      };
    }

    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const averageScore = Math.round((sum / scores.length) * 100) / 100;

    const bucketsDef = [
      { range: '< 2.0 (Kém)', min: -Infinity, max: 2.0 },
      { range: '2.0 - 2.9 (Cần cải thiện)', min: 2.0, max: 3.0 },
      { range: '3.0 - 3.9 (Đạt yêu cầu)', min: 3.0, max: 4.0 },
      { range: '4.0 - 4.5 (Tốt)', min: 4.0, max: 4.5 },
      { range: '> 4.5 (Xuất sắc)', min: 4.5, max: Infinity },
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
      buckets,
    };
  }

  private buildEmptyBuckets(): ScoreBucket[] {
    return [
      { range: '< 2.0 (Kém)', count: 0, percentage: 0 },
      { range: '2.0 - 2.9 (Cần cải thiện)', count: 0, percentage: 0 },
      { range: '3.0 - 3.9 (Đạt yêu cầu)', count: 0, percentage: 0 },
      { range: '4.0 - 4.5 (Tốt)', count: 0, percentage: 0 },
      { range: '> 4.5 (Xuất sắc)', count: 0, percentage: 0 },
    ];
  }
}
