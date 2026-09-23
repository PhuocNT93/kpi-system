import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ReviewCadenceService } from '../src/modules/review-cadence/application/review-cadence.service.js';
import { ReviewCadenceRepository } from '../src/modules/review-cadence/domain/review-cadence.repository.js';
import { ReviewCadence } from '../src/modules/review-cadence/domain/review-cadence.types.js';
import { Actor } from '../src/shared/auth/types.js';
import { Forbidden, NotFound, Conflict } from '../src/api/app-error.js';

// Mock withAuditedTransaction so tests don't require real DB connections
vi.mock('../src/modules/audit/application/audit-transaction.js', () => ({
  withAuditedTransaction: vi.fn(async (_pool: unknown, _auditService: unknown, work: (client: unknown, audit: unknown) => Promise<unknown>) => {
    const mockAudit = { record: vi.fn(), getPendingRecords: vi.fn(() => []) };
    return work({}, mockAudit);
  }),
}));

describe('ReviewCadenceService', () => {
  let cadenceRepo: Record<string, Mock>;
  let service: ReviewCadenceService;

  const hrAdminActor: Actor = {
    userId: 'user-hr',
    role: 'HR_ADMIN',
  };

  const employeeActor: Actor = {
    userId: 'user-emp',
    role: 'EMPLOYEE',
  };

  const sampleCadence: ReviewCadence = {
    id: 'cadence-1',
    code: 'SEMI_ANNUAL',
    name: 'Semi-Annual (6 months)',
    intervalMonths: 6,
    isSystemDefault: true,
    active: true,
  };

  beforeEach(() => {
    cadenceRepo = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      findSystemDefault: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      isReferencedByJobLevel: vi.fn(),
      isReferencedByEmployee: vi.fn(),
    };

    service = new ReviewCadenceService(
      cadenceRepo as unknown as ReviewCadenceRepository,
      {} as any,
      {} as any
    );
  });

  describe('listCadences', () => {
    it('returns cadences and total count', async () => {
      cadenceRepo.findAll.mockResolvedValue([[sampleCadence], 1]);
      const [items, total] = await service.listCadences({ active: true }, 0, 10);
      expect(items).toHaveLength(1);
      expect(items[0].code).toBe('SEMI_ANNUAL');
      expect(total).toBe(1);
    });
  });

  describe('getCadenceById', () => {
    it('returns cadence when found', async () => {
      cadenceRepo.findById.mockResolvedValue(sampleCadence);
      const res = await service.getCadenceById('cadence-1');
      expect(res.id).toBe('cadence-1');
    });

    it('throws NotFound when missing', async () => {
      cadenceRepo.findById.mockResolvedValue(null);
      await expect(service.getCadenceById('cadence-missing')).rejects.toThrow(NotFound);
    });
  });

  describe('createCadence', () => {
    it('throws Forbidden if actor is EMPLOYEE', async () => {
      await expect(
        service.createCadence(employeeActor, {
          code: 'QUARTERLY',
          name: 'Quarterly',
          intervalMonths: 3,
        })
      ).rejects.toThrow(Forbidden);
    });

    it('throws Conflict (DUPLICATE_CODE) when code already exists', async () => {
      cadenceRepo.findByCode.mockResolvedValue(sampleCadence);
      await expect(
        service.createCadence(hrAdminActor, {
          code: 'SEMI_ANNUAL',
          name: 'Semi-Annual',
          intervalMonths: 6,
        })
      ).rejects.toThrow(Conflict);
    });

    it('throws Conflict (SYSTEM_DEFAULT_EXISTS) when system default already exists', async () => {
      cadenceRepo.findByCode.mockResolvedValue(null);
      cadenceRepo.findSystemDefault.mockResolvedValue(sampleCadence);

      await expect(
        service.createCadence(hrAdminActor, {
          code: 'ANNUAL',
          name: 'Annual',
          intervalMonths: 12,
          isSystemDefault: true,
        })
      ).rejects.toThrow(Conflict);
    });

    it('creates cadence successfully with HR_ADMIN', async () => {
      cadenceRepo.findByCode.mockResolvedValue(null);
      cadenceRepo.create.mockImplementation(async (c: ReviewCadence) => ({ ...c, id: 'new-id' }));

      const res = await service.createCadence(hrAdminActor, {
        code: 'ANNUAL',
        name: 'Annual',
        intervalMonths: 12,
        isSystemDefault: false,
      });

      expect(res.id).toBe('new-id');
      expect(res.code).toBe('ANNUAL');
    });
  });

  describe('updateCadence', () => {
    it('throws Forbidden if actor is not HR or Admin', async () => {
      await expect(
        service.updateCadence(employeeActor, 'cadence-1', { name: 'Updated' })
      ).rejects.toThrow(Forbidden);
    });

    it('throws NotFound if cadence does not exist', async () => {
      cadenceRepo.findById.mockResolvedValue(null);
      await expect(
        service.updateCadence(hrAdminActor, 'missing-id', { name: 'Updated' })
      ).rejects.toThrow(NotFound);
    });

    it('throws Conflict (SYSTEM_DEFAULT_EXISTS) when another system default exists', async () => {
      const nonDefaultCadence: ReviewCadence = {
        ...sampleCadence,
        id: 'cadence-2',
        code: 'QUARTERLY',
        isSystemDefault: false,
      };
      cadenceRepo.findById.mockResolvedValue(nonDefaultCadence);
      cadenceRepo.findSystemDefault.mockResolvedValue(sampleCadence); // cadence-1 is default

      await expect(
        service.updateCadence(hrAdminActor, 'cadence-2', { isSystemDefault: true })
      ).rejects.toThrow(Conflict);
    });

    it('updates cadence successfully', async () => {
      cadenceRepo.findById.mockResolvedValue(sampleCadence);
      cadenceRepo.update.mockImplementation(async (c: ReviewCadence) => c);

      const updated = await service.updateCadence(hrAdminActor, 'cadence-1', {
        name: 'Semi-Annual Updated',
        intervalMonths: 6,
      });

      expect(updated.name).toBe('Semi-Annual Updated');
    });
  });

  describe('deleteCadence', () => {
    it('throws Forbidden if actor is not HR or Admin', async () => {
      await expect(service.deleteCadence(employeeActor, 'cadence-1')).rejects.toThrow(Forbidden);
    });

    it('throws NotFound if cadence does not exist', async () => {
      cadenceRepo.findById.mockResolvedValue(null);
      await expect(service.deleteCadence(hrAdminActor, 'cadence-1')).rejects.toThrow(NotFound);
    });

    it('throws Conflict (CADENCE_IN_USE) if referenced by Job Level or Employee', async () => {
      cadenceRepo.findById.mockResolvedValue(sampleCadence);
      cadenceRepo.isReferencedByJobLevel.mockResolvedValue(true);
      cadenceRepo.isReferencedByEmployee.mockResolvedValue(false);

      await expect(service.deleteCadence(hrAdminActor, 'cadence-1')).rejects.toThrow(Conflict);
    });

    it('deletes cadence successfully when not in use', async () => {
      cadenceRepo.findById.mockResolvedValue(sampleCadence);
      cadenceRepo.isReferencedByJobLevel.mockResolvedValue(false);
      cadenceRepo.isReferencedByEmployee.mockResolvedValue(false);
      cadenceRepo.delete.mockResolvedValue(undefined);

      await expect(service.deleteCadence(hrAdminActor, 'cadence-1')).resolves.toBeUndefined();
      expect(cadenceRepo.delete).toHaveBeenCalledWith('cadence-1');
    });
  });
});
