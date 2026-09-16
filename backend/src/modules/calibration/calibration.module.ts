import { Pool } from 'pg';
import { PostgresCalibrationRepository } from './infrastructure/postgres-calibration.repository.js';
import { CalibrationService } from './application/calibration.service.js';
import { CalibrationController } from './api/calibration.controller.js';
import { AuditService } from '../audit/application/audit.service.js';

export interface CalibrationModule {
  calibrationRepo: PostgresCalibrationRepository;
  calibrationService: CalibrationService;
  calibrationController: CalibrationController;
}

export function createCalibrationModule(pool: Pool, auditService?: AuditService): CalibrationModule {
  const calibrationRepo = new PostgresCalibrationRepository(pool);
  const calibrationService = new CalibrationService(pool, calibrationRepo, auditService);
  const calibrationController = new CalibrationController(calibrationService);

  return {
    calibrationRepo,
    calibrationService,
    calibrationController,
  };
}
