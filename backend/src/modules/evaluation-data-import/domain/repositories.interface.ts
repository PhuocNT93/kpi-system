import type { PoolClient } from 'pg';
import {
  EvaluationDataImport,
  EvaluationDataImportRecord,
  ImportStatus,
  RecordStatus,
  StagedEvidenceInput,
  CreateImportPayload,
  SourceSnapshot,
  ConflictDetails,
} from './evaluation-data-import.types.js';

export interface IEvaluationDataImportRepository {
  create(
    importData: {
      import_id: string;
      source_system: string;
      batch_reference?: string | null;
      status: ImportStatus;
      raw_payload: CreateImportPayload;
      record_count: number;
      success_count: number;
      error_count: number;
      conflict_count: number;
      created_by: string;
    },
    records: Array<{
      record_id: string;
      employee_code: string;
      cycle_id: string;
      kpi_code: string;
      value: number;
      comment?: string | null;
      rationale: string;
      source_snapshot: SourceSnapshot;
      status: RecordStatus;
      error_message?: string | null;
      conflicts?: ConflictDetails | null;
      evidences?: Array<{
        staging_evidence_id: string;
        evidence_type: string;
        title: string;
        evidence_url?: string | null;
        file_reference?: string | null;
        description?: string | null;
        metadata?: Record<string, unknown> | null;
      }>;
    }>,
    client?: PoolClient
  ): Promise<EvaluationDataImport>;

  findById(importId: string): Promise<EvaluationDataImport | null>;

  findByIdForUpdate(importId: string, client?: PoolClient): Promise<EvaluationDataImport | null>;

  findRecordsByImportId(
    importId: string,
    options?: { page?: number; limit?: number; status?: RecordStatus }
  ): Promise<{ records: EvaluationDataImportRecord[]; total: number }>;

  findRecordById(recordId: string): Promise<EvaluationDataImportRecord | null>;

  updateRecordDraft(
    recordId: string,
    patch: {
      value?: number;
      comment?: string | null;
      rationale?: string;
      status?: RecordStatus;
      conflicts?: ConflictDetails | null;
    },
    evidences?: StagedEvidenceInput[]
  ): Promise<EvaluationDataImportRecord>;

  updateImportStatus(
    importId: string,
    status: ImportStatus,
    counts?: { success_count?: number; error_count?: number; conflict_count?: number },
    client?: PoolClient
  ): Promise<void>;

  updateRecordApplied(
    recordId: string,
    evaluationItemId: string,
    finalEvidenceMap: Record<string, string>, // staging_evidence_id -> final_evidence_id
    client?: PoolClient
  ): Promise<void>;

  updateRecordRejected(
    recordId: string,
    errorMessage: string,
    client?: PoolClient
  ): Promise<void>;

  listImports(options?: { page?: number; limit?: number }): Promise<{ items: EvaluationDataImport[]; total: number }>;

  findPendingConflictingRecords(
    cycleId: string,
    employeeCode: string,
    kpiCode: string,
    excludeImportId?: string
  ): Promise<EvaluationDataImportRecord[]>;
}
