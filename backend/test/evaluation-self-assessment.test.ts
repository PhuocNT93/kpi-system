import { describe, it, expect, vi } from 'vitest';
import { Pool } from 'pg';
import { EvaluationService } from '../src/modules/evaluation/application/services/evaluation.service.js';
import { EvaluationStatus } from '../src/modules/evaluation/domain/evaluation.types.js';
import { IEvaluationRepository, IEvaluationItemRepository } from '../src/modules/evaluation/domain/repositories.interface.js';
import { AppError } from '../src/api/app-error.js';
import { Actor } from '../src/shared/auth/types.js';

describe('EvaluationService Unit Tests (Self Assessment)', () => {
  const mockPool = {
    query: vi.fn(),
  } as unknown as Pool;

  const mockEvaluationRepo = {
    findById: vi.fn(),
    findMyEvaluations: vi.fn(),
    findTeamEvaluations: vi.fn(),
    update: vi.fn(),
    batchCreate: vi.fn(),
  };

  const mockEvaluationItemRepo = {
    findByEvaluationId: vi.fn(),
    update: vi.fn(),
    batchUpdate: vi.fn(),
    batchCreate: vi.fn(),
  };

  const service = new EvaluationService(
    mockEvaluationRepo as unknown as IEvaluationRepository,
    mockEvaluationItemRepo as unknown as IEvaluationItemRepository,
    mockPool
  );

  const employeeActor: Actor = {
    userId: 'user-emp-1',
    employeeId: 'emp-1',
    role: 'EMPLOYEE',
    managedTeamIds: [],
  };

  const otherActor: Actor = {
    userId: 'user-other',
    employeeId: 'emp-other',
    role: 'EMPLOYEE',
    managedTeamIds: [],
  };

  it('getMyEvaluations returns evaluations for current employee', async () => {
    const mockList = [{ evaluation: { evaluation_id: 'eval-1' }, cycle: { name: 'Q1' } }];
    mockEvaluationRepo.findMyEvaluations.mockResolvedValue(mockList);

    const res = await service.getMyEvaluations('emp-1');
    expect(res).toEqual(mockList);
    expect(mockEvaluationRepo.findMyEvaluations).toHaveBeenCalledWith('emp-1');
  });

  it('getEvaluationDetail returns evaluation and items for self', async () => {
    mockEvaluationRepo.findById.mockResolvedValue({
      evaluation_id: 'eval-1',
      employee_id: 'emp-1',
      manager_id_snapshot: 'emp-mgr',
      status: EvaluationStatus.OPEN,
    });
    mockEvaluationItemRepo.findByEvaluationId.mockResolvedValue([
      { evaluation_item_id: 'item-1', criterion_name_snapshot: 'Performance' },
    ]);

    const res = await service.getEvaluationDetail('eval-1', employeeActor);
    expect(res.evaluation_id).toBe('eval-1');
    expect(res.items).toHaveLength(1);
    expect(res.is_manager_reviewer).toBe(false);
  });

  it('getEvaluationDetail throws 403 when accessed by another employee', async () => {
    mockEvaluationRepo.findById.mockResolvedValue({
      evaluation_id: 'eval-1',
      employee_id: 'emp-1',
      manager_id_snapshot: 'emp-mgr',
      status: EvaluationStatus.OPEN,
    });

    await expect(service.getEvaluationDetail('eval-1', otherActor)).rejects.toThrow(
      new AppError(403, 'FORBIDDEN', 'You do not have access to this evaluation.')
    );
  });

  it('saveItemDraft saves item when evaluation is OPEN', async () => {
    mockEvaluationRepo.findById.mockResolvedValue({
      evaluation_id: 'eval-1',
      employee_id: 'emp-1',
      status: EvaluationStatus.OPEN,
    });
    mockEvaluationItemRepo.update.mockResolvedValue({
      evaluation_item_id: 'item-1',
      resolved_level: 4,
      comment: 'Good work',
    });

    await service.saveItemDraft('eval-1', 'item-1', employeeActor, {
      resolved_level: 4,
      comment: 'Good work',
    });

    expect(mockEvaluationItemRepo.update).toHaveBeenCalledWith('item-1', {
      resolved_level: 4,
      comment: 'Good work',
      updated_by: 'user-emp-1',
    });
  });

  it('saveItemDraft throws 400 when evaluation is not OPEN', async () => {
    mockEvaluationRepo.findById.mockResolvedValue({
      evaluation_id: 'eval-1',
      employee_id: 'emp-1',
      status: EvaluationStatus.SUBMITTED,
    });

    await expect(
      service.saveItemDraft('eval-1', 'item-1', employeeActor, { resolved_level: 4 })
    ).rejects.toThrow(new AppError(400, 'INVALID_STATUS', 'Can only save draft when evaluation is OPEN.'));
  });

  it('submitEvaluation updates status to SUBMITTED when OPEN', async () => {
    mockEvaluationRepo.findById.mockResolvedValue({
      evaluation_id: 'eval-1',
      employee_id: 'emp-1',
      status: EvaluationStatus.OPEN,
    });
    mockEvaluationRepo.update.mockResolvedValue({
      evaluation_id: 'eval-1',
      status: EvaluationStatus.SUBMITTED,
    });

    const res = await service.submitEvaluation('eval-1', employeeActor);
    expect(res.status).toBe(EvaluationStatus.SUBMITTED);
    expect(mockEvaluationRepo.update).toHaveBeenCalledWith('eval-1', expect.objectContaining({
      status: EvaluationStatus.SUBMITTED,
      updated_by: 'user-emp-1',
    }));
  });
});
