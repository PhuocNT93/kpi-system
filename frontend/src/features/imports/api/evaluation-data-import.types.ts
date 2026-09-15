export type ImportStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'READY'
  | 'CONFLICT'
  | 'APPLYING'
  | 'APPLIED'
  | 'PARTIALLY_APPLIED'
  | 'FAILED';

export type RecordStatus =
  | 'VALID'
  | 'INVALID'
  | 'CONFLICT'
  | 'APPLIED'
  | 'REJECTED';

export type EvidenceType =
  | 'URL'
  | 'DOCUMENT'
  | 'FILE'
  | 'SCREENSHOT'
  | 'EXTERNAL_REF';

export type EvidenceStatus = 'ACTIVE' | 'SUPERSEDED';

export interface SourceSnapshot {
  source_type: string;
  source_name: string;
  source_reference?: string;
  collected_at: string;
  collector_version?: string;
  metadata?: Record<string, unknown>;
}

export interface StagedEvidenceInput {
  evidence_type: EvidenceType;
  title: string;
  evidence_url?: string | null;
  file_reference?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface StagedRecordInput {
  employee_code: string;
  cycle_id?: string;
  evaluation_cycle_code?: string;
  cycle_code?: string;
  evaliation_cycle_code?: string;
  kpi_code: string;
  value: number;
  comment?: string | null;
  rationale: string;
  source_snapshot: SourceSnapshot;
  evidences?: StagedEvidenceInput[];
}

export interface CreateImportPayload {
  source_system: string;
  batch_reference?: string;
  records: StagedRecordInput[];
}

export type PatchResolutionChoice =
  | 'USE_EXISTING'
  | 'USE_INCOMING'
  | 'MANUAL_OVERRIDE'
  | 'REJECT_BOTH';

export interface PatchDraftRecord {
  value?: number;
  comment?: string | null;
  rationale?: string;
  resolution?: PatchResolutionChoice;
  evidences?: StagedEvidenceInput[];
}

export interface ConflictDetails {
  conflict_type: 'VALUE_CONFLICT';
  existing_import_id?: string | null;
  existing_source?: string | null;
  existing_value?: number | null;
  incoming_source: string;
  incoming_value: number;
  resolution_options: PatchResolutionChoice[];
}

export interface EvaluationDataImportEvidence {
  staging_evidence_id: string;
  record_id: string;
  evidence_type: EvidenceType;
  title: string;
  evidence_url?: string | null;
  file_reference?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  status: 'PENDING' | 'APPLIED';
  final_evidence_id?: string | null;
  created_at: string;
}

export interface EvaluationDataImportRecord {
  record_id: string;
  import_id: string;
  employee_code: string;
  cycle_id: string;
  cycle_code?: string | null;
  evaluation_cycle_code?: string | null;
  kpi_code: string;
  value: number;
  comment?: string | null;
  rationale: string;
  source_snapshot: SourceSnapshot;
  status: RecordStatus;
  error_message?: string | null;
  conflicts?: ConflictDetails | null;
  evaluation_item_id?: string | null;
  evidences?: EvaluationDataImportEvidence[];
  created_at: string;
  updated_at: string;
}

export interface EvaluationDataImport {
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
  created_at: string;
  applied_at?: string | null;
  updated_at: string;
}

export interface ImportPreviewResponse {
  import: EvaluationDataImport;
  records: EvaluationDataImportRecord[];
  summary: {
    total_records: number;
    valid_records: number;
    conflict_records: number;
    invalid_records: number;
  };
}
