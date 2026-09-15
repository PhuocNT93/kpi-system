import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvaluationService } from './evaluation.service.js';
import { IEvaluationRepository, IEvaluationItemRepository } from '../../domain/repositories.interface.js';
import { EvaluationStatus, Evaluation, EvaluationItem } from '../../domain/evaluation.types.js';
import { Actor } from '../../../../shared/auth/types.js';
import type { Pool } from 'pg';
import type { AuditService } from '../../../audit/application/audit.service.js';

describe('EvaluationService - Explainability and Data Import Apply', () => {
  let service: EvaluationService;
  let mockEvalRepo: import('vitest').Mocked<IEvaluationRepository>;
  let mockEvalItemRepo: import('vitest').Mocked<IEvaluationItemRepository>;
  let mockPool: { query: import('vitest').Mock; connect: import('vitest').Mock };
  let mockClient: { query: import('vitest').Mock; release: import('vitest').Mock };
  let mockAuditService: { record: import('vitest').Mock };

  const validCycleId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const evalId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const evalItemId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  beforeEach(() => {
    mockEvalRepo = {
      findById: vi.fn(),
      findByIdForUpdate: vi.fn(),
      findMyEvaluations: vi.fn(),
      findTeamEvaluations: vi.fn(),
      update: vi.fn(),
    } as unknown as import('vitest').Mocked<IEvaluationRepository>;

    mockEvalItemRepo = {
      findByEvaluationId: vi.fn(),
      findByCycleEmployeeKpi: vi.fn(),
      update: vi.fn(),
      updateScoringResult: vi.fn(),
      batchUpdate: vi.fn(),
    } as unknown as import('vitest').Mocked<IEvaluationItemRepository>;

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(mockClient),
    };

    service = new EvaluationService(
      mockEvalRepo,
      mockEvalItemRepo,
      mockPool as unknown as Pool,
      mockAuditService as unknown as AuditService
    );
  });

  describe('getKpiExplainability (RBAC & Lineage)', () => {
    const targetEvaluation = {
      evaluation_id: evalId,
      evaluation_cycle_id: validCycleId,
      employee_id: 'emp-001',
      manager_id_snapshot: 'mgr-001',
      status: EvaluationStatus.SUBMITTED,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    };

    const targetItem = {
      evaluation_item_id: evalItemId,
      evaluation_id: evalId,
      template_criterion_id: 'crit-1',
      criterion_code_snapshot: 'KPI_DELIVERY',
      criterion_name_snapshot: 'Delivery Velocity',
      weight_snapshot: 100,
      scoring_rule_snapshot: {},
      level_definition_snapshot: [],
      measurement_value: 95,
      weighted_score: 90,
      comment: 'Delivered all sprint goals on time',
      rationale: 'Calculated from Jira story points completed vs planned',
      source_snapshot: {
        source_type: 'JIRA',
        source_name: 'Jira Production',
        collected_at: '2026-09-14T08:00:00.000Z',
      },
      import_id: 'imp-1',
      is_disabled_for_employee: false,
      is_missing_score: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      mockEvalRepo.findById.mockResolvedValue(targetEvaluation as unknown as Evaluation);
      mockEvalItemRepo.findByEvaluationId.mockResolvedValue([targetItem as unknown as EvaluationItem]);
      mockPool.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM evidence')) {
          return Promise.resolve({
            rows: [
              {
                evidence_id: 'ev-1',
                title: 'Sprint 34 Velocity Report',
                evidence_type: 'URL',
                evidence_url: 'https://jira.company.com/sprint/34',
                evidence_value: 'https://jira.company.com/sprint/34',
                rationale: 'Sprint completed with 42 points',
                source: 'JIRA',
                status: 'ACTIVE',
                created_at: new Date(),
              },
            ],
          });
        }
        if (sql.includes('FROM evaluation_data_import')) {
          return Promise.resolve({
            rows: [
              {
                import_id: 'imp-1',
                created_at: new Date(),
                created_by: 'hr-user-1',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should allow Employee to view their own KPI explainability (TC-RBAC-03)', async () => {
      const actor: Actor = { userId: 'emp-001', role: 'EMPLOYEE', employeeId: 'emp-001', managedTeamIds: [] };
      const result = await service.getKpiExplainability(evalId, 'KPI_DELIVERY', actor);

      expect(result.evaluation_id).toBe(evalId);
      expect(result.kpi_code).toBe('KPI_DELIVERY');
      expect(result.measurement).toBe(95);
      expect(result.score).toBe(90);
      expect(result.comment).toBe('Delivered all sprint goals on time');
      expect(result.rationale).toBe('Calculated from Jira story points completed vs planned');
      expect(result.source?.source_type).toBe('JIRA');
      expect(result.evidences).toHaveLength(1);
      expect(result.evidences[0]?.title).toBe('Sprint 34 Velocity Report');
    });

    it('should block Employee from viewing another employee KPI explainability with 403 Forbidden (TC-RBAC-04)', async () => {
      const otherEmpActor: Actor = { userId: 'emp-999', role: 'EMPLOYEE', employeeId: 'emp-999', managedTeamIds: [] };
      await expect(service.getKpiExplainability(evalId, 'KPI_DELIVERY', otherEmpActor)).rejects.toThrow(
        'You do not have access to view evidence for this evaluation.'
      );
    });

    it('should allow Manager to view direct report KPI explainability (TC-RBAC-05)', async () => {
      const mgrActor: Actor = { userId: 'mgr-001', role: 'MANAGER', employeeId: 'mgr-001', managedTeamIds: ['team-1'] };
      const result = await service.getKpiExplainability(evalId, 'KPI_DELIVERY', mgrActor);
      expect(result.evaluation_id).toBe(evalId);
    });

    it('should block Manager from viewing other team KPI explainability with 403 Forbidden (TC-RBAC-06)', async () => {
      const otherMgrActor: Actor = { userId: 'mgr-999', role: 'MANAGER', employeeId: 'mgr-999', managedTeamIds: ['team-2'] };
      await expect(service.getKpiExplainability(evalId, 'KPI_DELIVERY', otherMgrActor)).rejects.toThrow(
        'You do not have access to view evidence for this evaluation.'
      );
    });

    it('should allow HR_ADMIN and SYSTEM_ADMIN to view any KPI explainability (TC-RBAC-07)', async () => {
      const hrActor: Actor = { userId: 'hr-1', role: 'HR_ADMIN', employeeId: 'hr-1', managedTeamIds: [] };
      const sysAdminActor: Actor = { userId: 'sys-1', role: 'SYSTEM_ADMIN', employeeId: 'sys-1', managedTeamIds: [] };

      const hrResult = await service.getKpiExplainability(evalId, 'KPI_DELIVERY', hrActor);
      expect(hrResult.evaluation_id).toBe(evalId);

      const sysResult = await service.getKpiExplainability(evalId, 'KPI_DELIVERY', sysAdminActor);
      expect(sysResult.evaluation_id).toBe(evalId);
    });
  });
});
