import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvaluationDataImportService } from './evaluation-data-import.service.js';
import { IEvaluationDataImportRepository } from '../domain/repositories.interface.js';
import { EvaluationService } from '../../evaluation/application/services/evaluation.service.js';
import { Actor } from '../../../shared/auth/types.js';
import type { Pool } from 'pg';
import {
  EvaluationDataImport,
  EvaluationDataImportRecord,
  CreateImportPayload,
} from '../domain/evaluation-data-import.types.js';

describe('EvaluationDataImportService', () => {
  let service: EvaluationDataImportService;
  let mockRepo: import('vitest').Mocked<IEvaluationDataImportRepository>;
  let mockEvaluationService: import('vitest').Mocked<EvaluationService>;
  let mockPool: { query: import('vitest').Mock; connect: import('vitest').Mock };
  let mockClient: { query: import('vitest').Mock; release: import('vitest').Mock };

  const hrActor: Actor = {
    userId: 'hr-123',
    role: 'HR_ADMIN',
    employeeId: 'emp-hr',
    managedTeamIds: [],
  };

  const sysAdminActor: Actor = {
    userId: 'admin-123',
    role: 'SYSTEM_ADMIN',
    employeeId: 'emp-admin',
    managedTeamIds: [],
  };

  const employeeActor: Actor = {
    userId: 'emp-123',
    role: 'EMPLOYEE',
    employeeId: 'emp-regular',
    managedTeamIds: [],
  };

  const validCycleId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockImplementation((importData, _records) => ({
        ...importData,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      findById: vi.fn(),
      findByIdForUpdate: vi.fn(),
      findRecordsByImportId: vi.fn().mockResolvedValue({ records: [], total: 0 }),
      findRecordById: vi.fn(),
      updateRecordDraft: vi.fn(),
      updateImportStatus: vi.fn().mockResolvedValue(undefined),
      updateRecordApplied: vi.fn().mockResolvedValue(undefined),
      updateRecordRejected: vi.fn().mockResolvedValue(undefined),
      listImports: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findPendingConflictingRecords: vi.fn().mockResolvedValue([]),
    } as unknown as import('vitest').Mocked<IEvaluationDataImportRepository>;

    mockEvaluationService = {
      applyImportedKpiData: vi.fn(),
      getKpiExplainability: vi.fn(),
    } as unknown as import('vitest').Mocked<EvaluationService>;

    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(mockClient),
    };

    service = new EvaluationDataImportService(mockRepo, mockEvaluationService, mockPool as unknown as Pool);
  });

  describe('createImport', () => {
    it('should reject employee actor with 403 Forbidden (TC-RBAC-02)', async () => {
      await expect(
        service.createImport(
          {
            source_system: 'JIRA',
            records: [],
          },
          employeeActor
        )
      ).rejects.toThrow('Only HR Admins can create KPI data imports.');
    });

    it('should reject system admin actor on mutation with 403 Forbidden (TC-RBAC-01)', async () => {
      await expect(
        service.createImport(
          {
            source_system: 'JIRA',
            records: [
              {
                employee_code: 'EMP001',
                cycle_id: validCycleId,
                kpi_code: 'KPI_DELIVERY',
                value: 90,
                rationale: 'High velocity',
                source_snapshot: {
                  source_type: 'JIRA',
                  source_name: 'Jira Pro',
                  collected_at: new Date().toISOString(),
                },
                evidences: [],
              },
            ],
          },
          sysAdminActor
        )
      ).rejects.toThrow('System Admin is read-only. Only HR Admin can create imports.');
    });

    it('should stage valid payload with READY status (TC-VAL-01, TC-VAL-03)', async () => {
      mockPool.query.mockImplementation((sql: string) => {
        if (sql.includes('evaluation_cycle')) {
          return Promise.resolve({ rows: [{ status: 'OPEN' }] });
        }
        if (sql.includes('employee')) {
          return Promise.resolve({ rows: [{ employee_id: 'emp-uuid-1' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const payload = {
        source_system: 'JIRA',
        records: [
          {
            employee_code: 'EMP001',
            cycle_id: validCycleId,
            kpi_code: 'KPI_DELIVERY',
            value: 95,
            comment: 'On schedule',
            rationale: 'Completed 10 tickets on time',
            source_snapshot: {
              source_type: 'JIRA',
              source_name: 'Jira Production',
              source_reference: 'PROJ-1',
              collected_at: new Date().toISOString(),
            },
            evidences: [
              {
                evidence_type: 'URL' as const,
                title: 'Jira Sprint Report',
                evidence_url: 'https://jira.example.com/sprint/1',
              },
            ],
          },
        ],
      };

      const result = await service.createImport(payload, hrActor);
      expect(result.status).toBe('READY');
      expect(result.record_count).toBe(1);
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('should resolve cycle by evaluation_cycle_code without cycle_id', async () => {
      mockPool.query.mockImplementation((sql: string) => {
        if (sql.includes('evaluation_cycle')) {
          return Promise.resolve({ rows: [{ evaluation_cycle_id: validCycleId, status: 'OPEN', code: '2026-Q2' }] });
        }
        if (sql.includes('employee')) {
          return Promise.resolve({ rows: [{ employee_id: 'emp-uuid-1' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const payload = {
        source_system: 'JIRA',
        records: [
          {
            employee_code: 'EMP001',
            evaluation_cycle_code: '2026-Q2',
            kpi_code: 'KPI_DELIVERY',
            value: 95,
            rationale: 'Resolved by natural cycle code',
            source_snapshot: {
              source_type: 'JIRA',
              source_name: 'Jira Production',
              collected_at: new Date().toISOString(),
            },
            evidences: [],
          },
        ],
      };

      const result = await service.createImport(payload, hrActor);
      expect(result.status).toBe('READY');
      expect(result.record_count).toBe(1);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({
            cycle_id: validCycleId,
            employee_code: 'EMP001',
            status: 'VALID',
          }),
        ])
      );
    });

    it('should detect within-batch conflict and mark CONFLICT status (TC-CONF-01)', async () => {
      mockPool.query.mockImplementation((sql: string) => {
        if (sql.includes('evaluation_cycle')) {
          return Promise.resolve({ rows: [{ status: 'OPEN' }] });
        }
        if (sql.includes('employee')) {
          return Promise.resolve({ rows: [{ employee_id: 'emp-uuid-1' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const payload = {
        source_system: 'MULTI',
        records: [
          {
            employee_code: 'EMP001',
            cycle_id: validCycleId,
            kpi_code: 'KPI_DELIVERY',
            value: 90,
            rationale: 'Jira velocity',
            source_snapshot: {
              source_type: 'JIRA',
              source_name: 'Jira',
              collected_at: new Date().toISOString(),
            },
            evidences: [],
          },
          {
            employee_code: 'EMP001',
            cycle_id: validCycleId,
            kpi_code: 'KPI_DELIVERY',
            value: 95,
            rationale: 'Google Sheet report',
            source_snapshot: {
              source_type: 'SHEET',
              source_name: 'Manual Sheet',
              collected_at: new Date().toISOString(),
            },
            evidences: [],
          },
        ],
      };

      const result = await service.createImport(payload, hrActor);
      expect(result.status).toBe('CONFLICT');
      expect(result.conflict_count).toBe(1);
    });

    it('should mark record INVALID if cycle is locked (TC-LOCK-01)', async () => {
      mockPool.query.mockImplementation((sql: string) => {
        if (sql.includes('evaluation_cycle')) {
          return Promise.resolve({ rows: [{ status: 'LOCKED' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const payload = {
        source_system: 'JIRA',
        records: [
          {
            employee_code: 'EMP001',
            cycle_id: validCycleId,
            kpi_code: 'KPI_DELIVERY',
            value: 85,
            rationale: 'Sprint completed',
            source_snapshot: {
              source_type: 'JIRA',
              source_name: 'Jira',
              collected_at: new Date().toISOString(),
            },
            evidences: [],
          },
        ],
      };

      const result = await service.createImport(payload, hrActor);
      expect(result.status).toBe('FAILED');
      expect(result.error_count).toBe(1);
    });
  });

  describe('updateDraft', () => {
    it('should allow HR Admin to resolve conflict with USE_INCOMING (TC-CONF-02)', async () => {
      const recordId = 'rec-1';
      const importId = 'imp-1';

      mockRepo.findRecordById.mockResolvedValue({
        record_id: recordId,
        import_id: importId,
        employee_code: 'EMP001',
        cycle_id: validCycleId,
        kpi_code: 'KPI_DELIVERY',
        value: 95,
        rationale: 'Initial value',
        source_snapshot: { source_type: 'JIRA', source_name: 'Jira', collected_at: new Date().toISOString() },
        status: 'CONFLICT',
        conflicts: {
          conflict_type: 'VALUE_CONFLICT',
          existing_value: 90,
          incoming_value: 95,
          incoming_source: 'JIRA',
          resolution_options: ['USE_EXISTING', 'USE_INCOMING', 'MANUAL_OVERRIDE', 'REJECT_BOTH'],
        },
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRepo.findById.mockResolvedValue({
        import_id: importId,
        source_system: 'JIRA',
        status: 'CONFLICT',
        raw_payload: {} as unknown as CreateImportPayload,
        record_count: 1,
        success_count: 0,
        error_count: 0,
        conflict_count: 1,
        created_by: 'hr-123',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockRepo.findRecordsByImportId.mockResolvedValue({
        records: [{ status: 'VALID' } as unknown as EvaluationDataImportRecord],
        total: 1,
      });

      mockRepo.updateRecordDraft.mockResolvedValue({
        record_id: recordId,
        status: 'VALID',
        conflicts: null,
      } as unknown as EvaluationDataImportRecord);

      await service.updateDraft(
        importId,
        recordId,
        { resolution: 'USE_INCOMING' },
        hrActor
      );

      expect(mockRepo.updateRecordDraft).toHaveBeenCalledWith(
        recordId,
        expect.objectContaining({ status: 'VALID', conflicts: null }),
        undefined
      );
      expect(mockRepo.updateImportStatus).toHaveBeenCalledWith(
        importId,
        'READY',
        expect.objectContaining({ conflict_count: 0 })
      );
    });
  });

  describe('applyImport', () => {
    it('should be idempotent and return 200 summary if already APPLIED (TC-IDEMP-01)', async () => {
      const importId = 'imp-applied';
      mockRepo.findByIdForUpdate.mockResolvedValue({
        import_id: importId,
        status: 'APPLIED',
        record_count: 10,
        success_count: 10,
        error_count: 0,
      } as unknown as EvaluationDataImport);

      const result = await service.applyImport(importId, hrActor);

      expect(result.message).toBe('Import has already been applied.');
      expect(result.status).toBe('APPLIED');
      expect(mockEvaluationService.applyImportedKpiData).not.toHaveBeenCalled();
    });

    it('should reject apply if import is currently APPLYING (TC-CONC-01)', async () => {
      const importId = 'imp-applying';
      mockRepo.findByIdForUpdate.mockResolvedValue({
        import_id: importId,
        status: 'APPLYING',
      } as unknown as EvaluationDataImport);

      await expect(service.applyImport(importId, hrActor)).rejects.toThrow(
        'Import is currently being processed by another request.'
      );
    });

    it('should reject apply if import has unresolved CONFLICT', async () => {
      const importId = 'imp-conflict';
      mockRepo.findByIdForUpdate.mockResolvedValue({
        import_id: importId,
        status: 'CONFLICT',
      } as unknown as EvaluationDataImport);

      await expect(service.applyImport(importId, hrActor)).rejects.toThrow(
        'Cannot apply import with unresolved conflicts.'
      );
    });

    it('should apply batch, link evidence, and transition to APPLIED (TC-APPLY-01)', async () => {
      const importId = 'imp-ready';
      mockRepo.findByIdForUpdate.mockResolvedValue({
        import_id: importId,
        status: 'READY',
        record_count: 1,
      } as unknown as EvaluationDataImport);

      mockRepo.findRecordsByImportId.mockResolvedValue({
        records: [
          {
            record_id: 'rec-1',
            import_id: importId,
            employee_code: 'EMP001',
            cycle_id: validCycleId,
            kpi_code: 'KPI_DELIVERY',
            value: 95,
            rationale: 'Met all delivery targets',
            source_snapshot: { source_type: 'JIRA', source_name: 'Jira', collected_at: new Date().toISOString() },
            status: 'VALID',
            evidences: [
              {
                staging_evidence_id: 'stg-ev-1',
                record_id: 'rec-1',
                evidence_type: 'URL',
                title: 'Sprint 34 Report',
                status: 'PENDING',
                created_at: new Date(),
              },
            ],
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        total: 1,
      });

      mockEvaluationService.applyImportedKpiData.mockResolvedValue({
        applied: [
          {
            recordId: 'rec-1',
            evaluationItemId: 'item-uuid-1',
            finalEvidenceMap: { 'stg-ev-1': 'final-ev-1' },
          },
        ],
        rejected: [],
      });

      const result = await service.applyImport(importId, hrActor);

      expect(mockEvaluationService.applyImportedKpiData).toHaveBeenCalled();
      expect(mockRepo.updateRecordApplied).toHaveBeenCalledWith(
        'rec-1',
        'item-uuid-1',
        { 'stg-ev-1': 'final-ev-1' }
      );
      expect(mockRepo.updateImportStatus).toHaveBeenCalledWith(
        importId,
        'APPLIED',
        expect.objectContaining({ success_count: 1, error_count: 0 })
      );
      expect(result.status).toBe('APPLIED');
    });

    it('should transition to PARTIALLY_APPLIED when some records are rejected (TC-LOCK-02)', async () => {
      const importId = 'imp-partial';
      mockRepo.findByIdForUpdate.mockResolvedValue({
        import_id: importId,
        status: 'READY',
        record_count: 2,
      } as unknown as EvaluationDataImport);

      mockRepo.findRecordsByImportId.mockResolvedValue({
        records: [
          {
            record_id: 'rec-1',
            import_id: importId,
            employee_code: 'EMP001',
            cycle_id: validCycleId,
            kpi_code: 'KPI_DELIVERY',
            value: 95,
            rationale: 'Valid record',
            source_snapshot: { source_type: 'JIRA', source_name: 'Jira', collected_at: new Date().toISOString() },
            status: 'VALID',
            evidences: [],
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            record_id: 'rec-2',
            import_id: importId,
            employee_code: 'EMP002',
            cycle_id: validCycleId,
            kpi_code: 'KPI_QUALITY',
            value: 80,
            rationale: 'Rejected record',
            source_snapshot: { source_type: 'JIRA', source_name: 'Jira', collected_at: new Date().toISOString() },
            status: 'VALID',
            evidences: [],
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        total: 2,
      });

      mockEvaluationService.applyImportedKpiData.mockResolvedValue({
        applied: [
          {
            recordId: 'rec-1',
            evaluationItemId: 'item-uuid-1',
            finalEvidenceMap: {},
          },
        ],
        rejected: [
          {
            recordId: 'rec-2',
            reason: 'EVALUATION_ALREADY_PUBLISHED',
          },
        ],
      });

      const result = await service.applyImport(importId, hrActor);

      expect(mockRepo.updateRecordRejected).toHaveBeenCalledWith(
        'rec-2',
        'EVALUATION_ALREADY_PUBLISHED'
      );
      expect(result.status).toBe('PARTIALLY_APPLIED');
      expect(result.success_count).toBe(1);
      expect(result.error_count).toBe(1);
    });
  });
});
