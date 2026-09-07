import { postFormDataApi } from '@/shared/api/api-client';

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
