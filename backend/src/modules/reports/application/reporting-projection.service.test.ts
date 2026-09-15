import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { ReportingProjectionService } from './reporting-projection.service.js';
import { IReportsRepository } from '../domain/reports.types.js';
import { Pool } from 'pg';
import { IEvaluationRepository, IEvaluationItemRepository } from '../../evaluation/domain/repositories.interface.js';
import { EvaluationStatus } from '../../evaluation/domain/evaluation.types.js';

describe('ReportingProjectionService', () => {
  let service: ReportingProjectionService;
  let poolMock: { query: Mock };
  let reportsRepoMock: {
    upsertEmployeeEvaluationScore: Mock;
    upsertEmployeeKpiScore: Mock;
    upsertTeamEvaluationAggregate: Mock;
    upsertTeamKpiAggregate: Mock;
    upsertOrganizationAggregate: Mock;
  };
  let evaluationRepoMock: { findById: Mock };
  let evaluationItemRepoMock: { findByEvaluationId: Mock };

  beforeEach(() => {
    poolMock = {
      query: vi.fn(),
    };
    reportsRepoMock = {
      upsertEmployeeEvaluationScore: vi.fn(),
      upsertEmployeeKpiScore: vi.fn(),
      upsertTeamEvaluationAggregate: vi.fn(),
      upsertTeamKpiAggregate: vi.fn(),
      upsertOrganizationAggregate: vi.fn(),
    };
    evaluationRepoMock = {
      findById: vi.fn(),
    };
    evaluationItemRepoMock = {
      findByEvaluationId: vi.fn(),
    };

    service = new ReportingProjectionService(
      poolMock as unknown as Pool,
      reportsRepoMock as unknown as IReportsRepository,
      evaluationRepoMock as unknown as IEvaluationRepository,
      evaluationItemRepoMock as unknown as IEvaluationItemRepository
    );
  });

  describe('refreshEvaluation', () => {
    it('should upsert score and items', async () => {
      const mockEval = {
        evaluation_id: 'eval-1',
        evaluation_cycle_id: 'cycle-1',
        employee_id: 'emp-1',
        team_id_snapshot: 'team-1',
        role_id_snapshot: 'role-1',
        job_level_snapshot: 'l-1',
        status: EvaluationStatus.SUBMITTED,
        self_score: 80,
        manager_score: 85,
        final_score: 85,
        is_locked: false,
      };

      const mockItems = [
        {
          criterion_code_snapshot: 'C1',
          criterion_name_snapshot: 'Crit 1',
          weight_snapshot: 50,
          resolved_level: 3,
          raw_score: 70,
          weighted_score: 35,
          is_disabled_for_employee: false,
          is_missing_score: false,
        }
      ];

      evaluationRepoMock.findById.mockResolvedValue(mockEval);
      evaluationItemRepoMock.findByEvaluationId.mockResolvedValue(mockItems);
      poolMock.query.mockResolvedValue({ rows: [{ employee_count: '1', completed_count: '0', avg_score: null }] }); // Mock team aggregate query

      await service.refreshEvaluation('eval-1');

      expect(evaluationRepoMock.findById).toHaveBeenCalledWith('eval-1');
      expect(reportsRepoMock.upsertEmployeeEvaluationScore).toHaveBeenCalledWith(expect.objectContaining({
        evaluation_id: 'eval-1',
        evaluation_cycle_id: 'cycle-1',
        employee_id: 'emp-1',
        final_score: 85,
      }));
      expect(reportsRepoMock.upsertEmployeeKpiScore).toHaveBeenCalledWith(expect.objectContaining({
        evaluation_id: 'eval-1',
        criterion_code: 'C1',
        raw_score: 70,
      }));
    });
  });

  describe('refreshAllForLockedCycle', () => {
    it('should iterate all evaluations and refresh them', async () => {
      poolMock.query.mockResolvedValue({
        rows: [{ evaluation_id: 'eval-1' }, { evaluation_id: 'eval-2' }]
      });

      const spy = vi.spyOn(service, 'refreshEvaluation').mockResolvedValue(undefined);

      await service.refreshAllForLockedCycle('cycle-1');

      expect(poolMock.query).toHaveBeenCalledWith(
        'SELECT evaluation_id FROM evaluation WHERE evaluation_cycle_id = $1',
        ['cycle-1']
      );
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith('eval-1');
      expect(spy).toHaveBeenCalledWith('eval-2');
    });
  });
});
