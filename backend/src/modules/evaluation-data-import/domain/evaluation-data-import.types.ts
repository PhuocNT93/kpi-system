import { z } from 'zod';

export const ImportStatusEnum = z.enum([
  'DRAFT',
  'VALIDATING',
  'READY',
  'CONFLICT',
  'APPLYING',
  'APPLIED',
  'PARTIALLY_APPLIED',
  'FAILED'
]);
export type ImportStatus = z.infer<typeof ImportStatusEnum>;

export const RecordStatusEnum = z.enum([
  'VALID',
  'INVALID',
  'CONFLICT',
  'APPLIED',
  'REJECTED'
]);
export type RecordStatus = z.infer<typeof RecordStatusEnum>;

export const EvidenceTypeEnum = z.enum([
  'URL',
  'DOCUMENT',
  'FILE',
  'SCREENSHOT',
  'EXTERNAL_REF'
]);
export type EvidenceType = z.infer<typeof EvidenceTypeEnum>;

export const EvidenceStatusEnum = z.enum([
  'ACTIVE',
  'SUPERSEDED'
]);
export type EvidenceStatus = z.infer<typeof EvidenceStatusEnum>;

export const SourceSnapshotSchema = z.object({
  source_type: z.string().min(1),
  source_name: z.string().min(1),
  source_reference: z.string().optional(),
  collected_at: z.string().datetime(),
  collector_version: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type SourceSnapshot = z.infer<typeof SourceSnapshotSchema>;

export const StagedEvidenceSchema = z.object({
  evidence_type: EvidenceTypeEnum,
  title: z.string().min(1).max(255),
  evidence_url: z.string().url().optional().nullable(),
  file_reference: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});
export type StagedEvidenceInput = z.infer<typeof StagedEvidenceSchema>;

export const StagedRecordInputSchema = z.object({
  employee_code: z.string().min(1),
  cycle_id: z.string().optional(),
  evaluation_cycle_code: z.string().optional(),
  cycle_code: z.string().optional(),
  evaliation_cycle_code: z.string().optional(),
  kpi_code: z.string().min(1),
  value: z.number(),
  comment: z.string().optional().nullable(),
  rationale: z.string().min(1),
  source_snapshot: SourceSnapshotSchema,
  evidences: z.array(StagedEvidenceSchema).optional().default([]),
}).refine(
  (data) => Boolean(data.cycle_id || data.evaluation_cycle_code || data.cycle_code || data.evaliation_cycle_code),
  { message: 'Either evaluation_cycle_code, cycle_code, or cycle_id must be provided.' }
);
export type StagedRecordInput = z.infer<typeof StagedRecordInputSchema>;

export const CreateImportPayloadSchema = z.object({
  source_system: z.string().min(1),
  batch_reference: z.string().optional(),
  records: z.array(StagedRecordInputSchema).min(1),
});
export type CreateImportPayload = z.infer<typeof CreateImportPayloadSchema>;

export const PatchResolutionChoiceEnum = z.enum([
  'USE_EXISTING',
  'USE_INCOMING',
  'MANUAL_OVERRIDE',
  'REJECT_BOTH'
]);
export type PatchResolutionChoice = z.infer<typeof PatchResolutionChoiceEnum>;

export const PatchDraftRecordSchema = z.object({
  value: z.number().optional(),
  comment: z.string().nullable().optional(),
  rationale: z.string().min(1).optional(),
  resolution: PatchResolutionChoiceEnum.optional(),
  evidences: z.array(StagedEvidenceSchema).optional(),
});
export type PatchDraftRecord = z.infer<typeof PatchDraftRecordSchema>;

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
  created_at: Date;
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
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
  applied_at?: Date | null;
  updated_at: Date;
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

export interface FinalEvidenceItem {
  id: string;
  title: string;
  type: EvidenceType;
  url?: string | null;
  file_reference?: string | null;
  description?: string | null;
  rationale?: string | null;
  source?: string | null;
  status: EvidenceStatus;
  superseded_by?: string | null;
  superseded_at?: Date | null;
  supersede_reason?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: Date;
}

export interface ExplainabilityViewDto {
  evaluation_id: string;
  evaluation_item_id: string;
  kpi_code: string;
  measurement?: number | null;
  score?: number | null;
  comment?: string | null;
  rationale?: string | null;
  source?: SourceSnapshot | null;
  import?: {
    id: string;
    created_at: Date;
    created_by: string;
  } | null;
  evidences: FinalEvidenceItem[];
}
