export interface ImportJob {
  import_job_id: string;
  csv_template_id: string;
  evaluation_cycle_id: string;
  file_name: string;
  file_hash: string;
  status: 'UPLOADED' | 'VALIDATING' | 'PREVIEW' | 'IMPORTING' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';
  total_rows: number;
  success_rows: number;
  error_rows: number;
  imported_by: string;
  started_at: Date;
  finished_at: Date | null;
  idempotency_key?: string | null;
}

export interface ImportRow {
  import_row_id: string;
  import_job_id: string;
  row_no: number;
  raw_data: Record<string, unknown>;
  status: 'VALID' | 'INVALID' | 'IMPORTED' | 'SKIPPED';
  error_messages: Array<{
    row_no: number;
    field: string;
    code: string;
    message: string;
  }> | null;
  evaluation_item_id: string | null;
}

export interface ImportJobPreview {
  import_job_id: string;
  status: ImportJob['status'];
  file_name: string;
  file_hash: string;
  csv_template_id: string;
  evaluation_cycle_id: string;
  total_rows: number;
  success_rows: number;
  error_rows: number;
}

export interface IImportRepository {
  createImportJob(job: ImportJob): Promise<void>;
  updateImportJob(job: Partial<ImportJob> & { import_job_id: string }): Promise<void>;
  getImportJobByHash(cycleId: string, fileHash: string): Promise<ImportJob | null>;
  getImportJobByIdempotencyKey(actorId: string, idempotencyKey: string): Promise<ImportJob | null>;
  bulkInsertImportRows(rows: ImportRow[]): Promise<void>;
}
