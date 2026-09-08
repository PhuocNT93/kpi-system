import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsvImportService } from './csv-import.service.js';
import { EvaluationService } from '../../evaluation/application/services/evaluation.service.js';
import { IImportRepository, ImportJob } from '../domain/import.types.js';
import { Pool } from 'pg';

describe('CsvImportService', () => {
  let service: CsvImportService;
  let mockRepo: import('vitest').Mocked<IImportRepository>;
  let mockPool: import('vitest').Mocked<Pool>;
  let mockEvaluationService: import('vitest').Mocked<EvaluationService>;

  beforeEach(() => {
    mockRepo = {
      getImportJobByIdempotencyKey: vi.fn(),
      getImportJobByHash: vi.fn(),
      createImportJob: vi.fn(),
      updateImportJob: vi.fn(),
      getImportJobById: vi.fn(),
      getImportRows: vi.fn(),
      updateImportRow: vi.fn(),
      bulkInsertImportRows: vi.fn(),
      updateImportRowsStatusByJobId: vi.fn(),
    } as unknown as import('vitest').Mocked<IImportRepository>;

    mockPool = {
      query: vi.fn(),
    } as unknown as import('vitest').Mocked<Pool>;

    mockEvaluationService = {
      recalculateEvaluation: vi.fn(),
    } as unknown as import('vitest').Mocked<EvaluationService>;

    service = new CsvImportService(mockRepo, mockPool, mockEvaluationService);
  });

  describe('confirmImport', () => {
    it('should throw an error if job is not in PREVIEW status', async () => {
      mockRepo.getImportJobById.mockResolvedValue({ status: 'UPLOADED' } as unknown as ImportJob);
      
      await expect(service.confirmImport('job-1', false, { userId: 'u1', role: 'ADMIN' }))
        .rejects.toThrow('Only PREVIEW jobs can be confirmed');
    });

    it('should throw an error in STRICT mode if there are error rows', async () => {
      mockRepo.getImportJobById.mockResolvedValue({ 
        import_job_id: 'job-1', 
        status: 'PREVIEW',
        error_rows: 5
      } as unknown as ImportJob);

      await expect(service.confirmImport('job-1', true, { userId: 'u1', role: 'ADMIN' }))
        .rejects.toThrow('Strict mode enabled: Cannot import because there are invalid rows.');
      
      expect(mockRepo.updateImportJob).toHaveBeenCalledWith({ import_job_id: 'job-1', status: 'FAILED' });
    });

    it('should process synchronous import for <= 500 rows', async () => {
      mockRepo.getImportJobById.mockResolvedValue({ 
        import_job_id: 'job-1', 
        status: 'PREVIEW',
        success_rows: 10,
        total_rows: 10,
        error_rows: 0
      } as unknown as ImportJob);

      // Mock processJobAsync indirectly by returning empty rows on first batch to simulate completion
      mockRepo.getImportRows.mockResolvedValue([]);

      const result = await service.confirmImport('job-1', false, { userId: 'u1', role: 'ADMIN' });
      
      expect(result.status).toBe('COMPLETED');
      expect(mockRepo.updateImportJob).toHaveBeenCalledWith({ import_job_id: 'job-1', status: 'IMPORTING' });
    });
    
    it('should return ACCEPTED and enqueue job for > 500 rows', async () => {
      const mockJob = { 
        import_job_id: 'job-1', 
        status: 'PREVIEW',
        success_rows: 1000,
        total_rows: 1000,
        error_rows: 0
      };
      mockRepo.getImportJobById.mockResolvedValue(mockJob as unknown as ImportJob);

      const result = await service.confirmImport('job-1', false, { userId: 'u1', role: 'ADMIN' });
      
      expect(result.status).toBe('ACCEPTED');
      expect(mockRepo.updateImportJob).toHaveBeenCalledWith({ import_job_id: 'job-1', status: 'IMPORTING' });
    });
  });
});
