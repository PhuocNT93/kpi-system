import { describe, it, expect, vi } from 'vitest';
import { AppError } from '../src/api/app-error.js';
import { EvaluationService } from '../src/modules/evaluation/application/services/evaluation.service.js';
import { EvaluationStatus } from '../src/modules/evaluation/domain/evaluation.types.js';
import { PostgresEvaluationItemRepository } from '../src/modules/evaluation/infrastructure/persistence/postgres-evaluation-item.repository.js';
import { CalibrationService } from '../src/modules/calibration/application/calibration.service.js';
import { CsvImportService } from '../src/modules/import/application/csv-import.service.js';
import { KpiRelationshipService } from '../src/modules/kpi/services/kpi-relationship.service.js';
import type { Actor } from '../src/shared/auth/auth.types.js';

describe('TC24 - TC33: Concurrency & Locking Hardening Tests', () => {
  const managerActor: Actor = { userId: 'usr-mgr-1', employeeId: 'mgr-1', role: 'MANAGER' };
  const employeeActor: Actor = { userId: 'usr-emp-1', employeeId: 'emp-1', role: 'EMPLOYEE' };
  const hrActor: Actor = { userId: '11111111-1111-4111-8111-000000000001', role: 'HR_ADMIN', employeeId: 'hr-1', permissions: ['KPI_MANUAL_OVERRIDE'] };

  // TC24: Concurrent evaluation item update (Optimistic Locking)
  describe('TC24: Optimistic Locking on Evaluation Items', () => {
    it('succeeds when version matches, throws 409 VERSION_MISMATCH when version is outdated', async () => {
      let currentVersion = 5;
      const mockPool = {
        query: vi.fn(async (_sql: string, params: unknown[]) => {
          const expectedVersion = params[params.length - 1];
          if (expectedVersion !== currentVersion) {
            return { rows: [] }; // No rows matched version condition
          }
          currentVersion += 1;
          return {
            rows: [
              {
                evaluation_item_id: 'item-1',
                evaluation_id: 'eval-1',
                resolved_level: params[0],
                version: currentVersion,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          };
        }),
      } as unknown as import('pg').Pool;

      const itemRepo = new PostgresEvaluationItemRepository(mockPool);

      // Tab A updates with version 5 -> succeeds and increments to version 6
      const updatedA = await itemRepo.update(
        'item-1',
        { resolved_level: 4 },
        undefined,
        5
      );
      expect(updatedA.version).toBe(6);

      // Tab B attempts update with stale version 5 -> throws 409 VERSION_MISMATCH
      await expect(
        itemRepo.update('item-1', { resolved_level: 3 }, undefined, 5)
      ).rejects.toThrow(
        new AppError(
          409,
          'VERSION_MISMATCH',
          'Evaluation item has been modified by another transaction. Please reload and try again.'
        )
      );
    });
  });

  // TC25: Concurrent submit idempotency
  describe('TC25: Concurrent Submit', () => {
    it('processes first submit and returns idempotent evaluation on concurrent submit', async () => {
      let currentStatus: EvaluationStatus = EvaluationStatus.OPEN;

      const mockRepo = {
        findById: vi.fn(async () => ({
          evaluation_id: 'eval-1',
          employee_id: 'emp-1',
          status: currentStatus,
          is_locked: false,
        })),
        findByIdForUpdate: vi.fn(async () => ({
          evaluation_id: 'eval-1',
          employee_id: 'emp-1',
          status: currentStatus,
          is_locked: false,
        })),
        update: vi.fn(async (_id: string, payload: { status: EvaluationStatus }) => {
          currentStatus = payload.status;
          return {
            evaluation_id: 'eval-1',
            employee_id: 'emp-1',
            status: currentStatus,
            is_locked: false,
          };
        }),
      } as unknown as import('../src/modules/evaluation/domain/repositories.interface.js').IEvaluationRepository;

      const mockItemRepo = {
        findByEvaluationId: vi.fn(async () => []),
      } as unknown as import('../src/modules/evaluation/domain/repositories.interface.js').IEvaluationItemRepository;

      const mockPool = {
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      } as unknown as import('pg').Pool;

      const evalService = new EvaluationService(mockRepo, mockItemRepo, mockPool);

      // First submit transitions to SUBMITTED
      const sub1 = await evalService.submitEvaluation('eval-1', employeeActor);
      expect(sub1.status).toBe(EvaluationStatus.SUBMITTED);

      // Second concurrent submit recognizes SUBMITTED and returns cleanly (idempotent)
      const sub2 = await evalService.submitEvaluation('eval-1', employeeActor);
      expect(sub2.status).toBe(EvaluationStatus.SUBMITTED);
    });
  });

  // TC26: Concurrent approve
  describe('TC26: Concurrent Approve Conflict', () => {
    it('allows first approve and throws 409 ALREADY_APPROVED on concurrent second approve', async () => {
      let currentStatus: EvaluationStatus = EvaluationStatus.MANAGER_REVIEW;

      const mockRepo = {
        findByIdForUpdate: vi.fn(async () => ({
          evaluation_id: 'eval-1',
          employee_id: 'emp-1',
          manager_id_snapshot: 'mgr-1',
          status: currentStatus,
          is_locked: false,
        })),
        update: vi.fn(async (_id: string, payload: { status: EvaluationStatus }) => {
          currentStatus = payload.status;
          return {
            evaluation_id: 'eval-1',
            employee_id: 'emp-1',
            status: currentStatus,
            is_locked: false,
          };
        }),
      } as unknown as import('../src/modules/evaluation/domain/repositories.interface.js').IEvaluationRepository;

      const mockPool = {
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      } as unknown as import('pg').Pool;

      const evalService = new EvaluationService(
        mockRepo,
        {} as unknown as import('../src/modules/evaluation/domain/repositories.interface.js').IEvaluationItemRepository,
        mockPool
      );

      // First reviewer approves
      const app1 = await evalService.approveEvaluation('eval-1', managerActor);
      expect(app1.status).toBe(EvaluationStatus.APPROVED);

      // Second simultaneous reviewer receives 409 ALREADY_APPROVED
      await expect(
        evalService.approveEvaluation('eval-1', managerActor)
      ).rejects.toThrow(new AppError(409, 'ALREADY_APPROVED', 'Evaluation has already been approved.'));
    });
  });

  // TC27: Concurrent calibration adjustments
  describe('TC27: Concurrent Calibration Adjustments', () => {
    it('executes serialized adjustments without losing score updates', async () => {
      let finalScore = 70;
      const mockCalibrationRepo = {
        isCycleLocked: vi.fn(async () => false),
        getSessionById: vi.fn(async () => ({
          calibrationSessionId: '22222222-2222-4222-8222-222222222222',
          status: 'OPEN',
        })),
        getEvaluationById: vi.fn(async () => ({
          evaluationId: '11111111-1111-4111-8111-111111111111',
          finalScore,
          status: 'CALIBRATION',
          isLocked: false,
        })),
        insertAdjustment: vi.fn(async (params: { newFinalScore: number; [key: string]: unknown }) => {
          finalScore = params.newFinalScore;
          return { calibrationAdjustmentId: 'adj-1', ...params };
        }),
        updateEvaluationFinalScore: vi.fn(async (_id: string, score: number) => {
          finalScore = score;
        }),
        getEvaluationsForSession: vi.fn(async () => []),
        getAdjustmentsBySession: vi.fn(async () => []),
      } as unknown as import('../src/modules/calibration/infrastructure/postgres-calibration.repository.js').ICalibrationRepository;

      const mockPool = {
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      } as unknown as import('pg').Pool;

      const calService = new CalibrationService(mockPool, mockCalibrationRepo);

      // Execute adjustment 1
      await calService.adjustScore(
        '22222222-2222-4222-8222-222222222222',
        {
          evaluation_id: '11111111-1111-4111-8111-111111111111',
          new_final_score: 80,
          reason: 'Adjustment A: Performance uplift',
        },
        hrActor
      );
      expect(finalScore).toBe(80);

      // Execute adjustment 2
      await calService.adjustScore(
        '22222222-2222-4222-8222-222222222222',
        {
          evaluation_id: '11111111-1111-4111-8111-111111111111',
          new_final_score: 85,
          reason: 'Adjustment B: Cross-dept normalization',
        },
        hrActor
      );
      expect(finalScore).toBe(85);
    });
  });

  // TC28: Concurrent calibration finalize
  describe('TC28: Concurrent Calibration Finalize', () => {
    it('allows first finalize and returns 409 CALIBRATION_SESSION_ALREADY_FINALIZED for second caller', async () => {
      let isFinalized = false;
      const mockCalibrationRepo = {
        isCycleLocked: vi.fn(async () => false),
        getSessionById: vi.fn(async () => ({
          calibrationSessionId: '22222222-2222-4222-8222-222222222222',
          status: isFinalized ? 'FINALIZED' : 'OPEN',
        })),
        getSessionByIdForUpdate: vi.fn(async () => ({
          calibrationSessionId: '22222222-2222-4222-8222-222222222222',
          status: isFinalized ? 'FINALIZED' : 'OPEN',
        })),
        getEvaluationsForSession: vi.fn(async () => []),
        finalizeSession: vi.fn(async () => {
          isFinalized = true;
        }),
        transitionEvaluationsAndAutoPublish: vi.fn(async () => {}),
      } as unknown as import('../src/modules/calibration/infrastructure/postgres-calibration.repository.js').ICalibrationRepository;

      const mockPool = {
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      } as unknown as import('pg').Pool;

      const calService = new CalibrationService(mockPool, mockCalibrationRepo);

      // Call 1 succeeds
      await calService.finalizeSession('22222222-2222-4222-8222-222222222222', hrActor);
      expect(isFinalized).toBe(true);

      // Call 2 concurrent collision throws 409
      await expect(
        calService.finalizeSession('22222222-2222-4222-8222-222222222222', hrActor)
      ).rejects.toThrow(
        new AppError(409, 'CALIBRATION_SESSION_ALREADY_FINALIZED', 'Phiên hiệu chuẩn điểm này đã được chốt (FINALIZED).')
      );
    });
  });

  // TC29: Cycle lock vs evaluation write race
  describe('TC29: Cycle Lock vs Evaluation Write Race', () => {
    it('throws 409 EVALUATION_LOCKED if cycle status is LOCKED when write begins', async () => {
      const mockRepo = {
        findById: vi.fn(async () => ({
          evaluation_id: 'eval-1',
          evaluation_cycle_id: 'cycle-locked',
          employee_id: 'emp-1',
          status: EvaluationStatus.OPEN,
          is_locked: false,
        })),
      } as unknown as import('../src/modules/evaluation/domain/repositories.interface.js').IEvaluationRepository;

      const mockPool = {
        query: vi.fn(async (sql: string) => {
          if (sql.includes('evaluation_cycle')) {
            return { rows: [{ status: 'LOCKED', locked_at: new Date() }] };
          }
          return { rows: [] };
        }),
      } as unknown as import('pg').Pool;

      const evalService = new EvaluationService(
        mockRepo,
        {} as unknown as import('../src/modules/evaluation/domain/repositories.interface.js').IEvaluationItemRepository,
        mockPool
      );

      await expect(
        evalService.saveItemDraft('eval-1', 'item-1', employeeActor, { resolved_level: 3 })
      ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation cycle is locked.'));
    });
  });

  // TC30: Concurrent KPI relationship creation
  describe('TC30: Concurrent KPI Relationship Conflict', () => {
    it('handles duplicate relationship creation gracefully', async () => {
      const mockRepo = {
        findAllActive: vi.fn(async () => []),
        create: vi.fn(async () => {
          const err = new Error('duplicate key value violates unique constraint') as Error & { code: string };
          err.code = '23505';
          throw err;
        }),
      } as unknown as import('../src/modules/kpi/domain/repositories/kpi-relationship.repository.interface.js').IKpiRelationshipRepository;

      const mockPool = {
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      } as unknown as import('pg').Pool;

      const kpiRelService = new KpiRelationshipService(mockPool, mockRepo);

      await expect(
        kpiRelService.createRelationship({
          sourceKpiId: 'kpi-1',
          targetKpiId: 'kpi-2',
          relationshipType: 'DEPENDS_ON',
        })
      ).rejects.toThrow(new AppError(409, 'DUPLICATE_RELATIONSHIP', 'A relationship already exists between these KPIs'));
    });
  });

  // TC31: Concurrent KPI manual override
  describe('TC31: Concurrent KPI Manual Override', () => {
    it('prevents manual override if evaluation is locked concurrently', async () => {
      const mockRepo = {
        findByIdForUpdate: vi.fn(async () => ({
          evaluation_id: 'eval-1',
          status: EvaluationStatus.LOCKED,
          is_locked: true,
        })),
      } as unknown as import('../src/modules/evaluation/domain/repositories.interface.js').IEvaluationRepository;

      const mockPool = {
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      } as unknown as import('pg').Pool;

      const evalService = new EvaluationService(
        mockRepo,
        {} as unknown as import('../src/modules/evaluation/domain/repositories.interface.js').IEvaluationItemRepository,
        mockPool
      );

      await expect(
        evalService.overrideKpiScore('eval-1', 'item-1', hrActor, {
          manual_override_score: 95,
          override_reason: 'Calibration committee override',
        })
      ).rejects.toThrow(new AppError(409, 'EVALUATION_LOCKED', 'Evaluation is locked. Scores cannot be overridden.'));
    });
  });

  // TC32: Concurrent CSV import upload
  describe('TC32: Concurrent CSV Import Duplicate Protection', () => {
    it('catches unique constraint violation 23505 and throws DUPLICATE_IMPORT', async () => {
      const mockImportRepo = {
        getImportJobByHash: vi.fn(async () => null),
        createImportJob: vi.fn(async () => {
          const err = new Error('duplicate key value violates unique constraint') as Error & { code: string };
          err.code = '23505';
          throw err;
        }),
      } as unknown as import('../src/modules/import/domain/csv-import.repository.js').ICsvImportRepository;

      const mockPool = {
        query: vi.fn(async (sql: string) => {
          if (sql.includes('evaluation_cycle')) {
            return { rows: [{ evaluation_template_version_id: 'tv-1', status: 'ACTIVE' }] };
          }
          if (sql.includes('csv_template')) {
            return { rows: [{ csv_template_id: 'csv-t1' }] };
          }
          return { rows: [] };
        }),
      } as unknown as import('pg').Pool;

      const importService = new CsvImportService(
        mockImportRepo,
        mockPool,
        {} as unknown as import('../src/modules/audit/application/audit.service.js').AuditService
      );

      await expect(
        importService.processUpload(
          'cycle-1',
          Buffer.from('employee_code,kpi_code\nEMP001,KPI01'),
          'test.csv',
          hrActor.userId,
          undefined
        )
      ).rejects.toThrow('This CSV file has already been uploaded for the selected evaluation cycle.');
    });
  });

  // TC33: Concurrent DAG validation race
  describe('TC33: Concurrent DAG Validation Serialization', () => {
    it('detects circular dependency cycle when adding edge that closes cycle', async () => {
      const mockRepo = {
        findAllActive: vi.fn(async () => [
          { sourceKpiId: 'kpi-b', targetKpiId: 'kpi-c', relationshipType: 'DEPENDS_ON' },
          { sourceKpiId: 'kpi-c', targetKpiId: 'kpi-a', relationshipType: 'DEPENDS_ON' },
        ]),
      } as unknown as import('../src/modules/kpi/domain/repositories/kpi-relationship.repository.interface.js').IKpiRelationshipRepository;

      const mockPool = {
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [] }),
          release: vi.fn(),
        }),
      } as unknown as import('pg').Pool;

      const kpiRelService = new KpiRelationshipService(mockPool, mockRepo);

      // Attempting to add A -> B creates cycle: A -> B -> C -> A
      await expect(
        kpiRelService.createRelationship({
          sourceKpiId: 'kpi-a',
          targetKpiId: 'kpi-b',
          relationshipType: 'DEPENDS_ON',
        })
      ).rejects.toThrow('Circular dependency detected. Adding this relationship creates a cycle.');
    });
  });
});
