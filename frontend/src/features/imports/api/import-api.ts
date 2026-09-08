import { getApi, postApi, postFormDataApi } from '@/shared/api/api-client';

export interface ImportRowError {
  row_no: number;
  field: string;
  code: string;
  message: string;
}

export interface ImportJobPreview {
  import_job_id: string;
  status: 'UPLOADED' | 'VALIDATING' | 'PREVIEW' | 'IMPORTING' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';
  file_name: string;
  file_hash: string;
  csv_template_id: string;
  evaluation_cycle_id: string;
  total_rows: number;
  success_rows: number;
  error_rows: number;
}

export interface ImportPreviewResponse {
  data: ImportJobPreview;
  meta: {
    request_id: string;
    row_errors: ImportRowError[];
  };
}

// Shape returned by the backend controller for paginated endpoints:
// { "success": true, "data": { "items": [...], "page": N, "pageSize": N, "total": N }, "meta": {...} }
// getApi<T> strips the envelope and returns payload.data, so T = PaginatedData<X>
export interface PaginatedData<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ImportJobSummary extends ImportJobPreview {
  started_at: string;
  finished_at: string | null;
  imported_by: string;
}

export interface ImportRowDetails {
  import_row_id: string;
  import_job_id: string;
  row_no: number;
  raw_data: Record<string, unknown>;
  status: 'VALID' | 'INVALID' | 'IMPORTED' | 'SKIPPED';
  error_messages: ImportRowError[] | null;
}

export async function uploadCsvFile(
  cycleId: string,
  file: File,
  idempotencyKey: string
): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append('cycle_id', cycleId);
  formData.append('file', file);

  return postFormDataApi<ImportPreviewResponse>('/api/imports/csv', formData, idempotencyKey);
}

export async function confirmImport(
  jobId: string,
  strictMode: boolean
): Promise<ImportJobPreview> {
  return postApi<ImportJobPreview>(`/api/imports/${jobId}/confirm`, { strict_mode: strictMode });
}

export async function getImportStatus(jobId: string): Promise<ImportJobPreview> {
  return getApi<ImportJobPreview>(`/api/imports/${jobId}`);
}

export async function getImportHistory(page: number = 1, pageSize: number = 20): Promise<PaginatedData<ImportJobSummary>> {
  return getApi<PaginatedData<ImportJobSummary>>(`/api/imports?page=${page}&pageSize=${pageSize}`);
}

export async function getImportRows(jobId: string, page: number = 1, pageSize: number = 100): Promise<PaginatedData<ImportRowDetails>> {
  return getApi<PaginatedData<ImportRowDetails>>(`/api/imports/${jobId}/rows?page=${page}&pageSize=${pageSize}`);
}
