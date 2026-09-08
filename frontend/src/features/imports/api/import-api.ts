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

export async function confirmImport(
  jobId: string,
  strictMode: boolean
): Promise<{ data: ImportJobPreview }> {
  // Use generic fetch since api-client doesn't have a postJsonApi with body yet,
  // or we can use fetch directly. Wait, api-client might have it. Let's see.
  // Actually, let's just use standard fetch with Authorization.
  const token = localStorage.getItem('access_token');
  const res = await fetch(`/api/imports/${jobId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ strict_mode: strictMode })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to confirm import');
  }
  return res.json();
}

export async function getImportStatus(jobId: string): Promise<{ data: ImportJobPreview }> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`/api/imports/${jobId}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to fetch import status');
  }
  return res.json();
}
