import { getApi, postApi, patchApi } from '@/shared/api/api-client';
import type {
  EvaluationDataImport,
  EvaluationDataImportRecord,
  CreateImportPayload,
  PatchDraftRecord,
  ImportPreviewResponse,
} from './evaluation-data-import.types';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export async function createEvaluationDataImport(
  payload: CreateImportPayload
): Promise<EvaluationDataImport> {
  return postApi<EvaluationDataImport>('/api/evaluation-data/imports', payload);
}

export async function listEvaluationDataImports(
  page: number = 1,
  limit: number = 20
): Promise<EvaluationDataImport[] | PaginatedResponse<EvaluationDataImport>> {
  return getApi<EvaluationDataImport[] | PaginatedResponse<EvaluationDataImport>>(
    `/api/evaluation-data/imports?page=${page}&limit=${limit}`
  );
}

export async function getEvaluationDataImport(
  importId: string
): Promise<EvaluationDataImport> {
  return getApi<EvaluationDataImport>(`/api/evaluation-data/imports/${importId}`);
}

export async function getEvaluationDataImportPreview(
  importId: string,
  page: number = 1,
  limit: number = 100,
  status?: string
): Promise<ImportPreviewResponse> {
  let url = `/api/evaluation-data/imports/${importId}/preview?page=${page}&limit=${limit}`;
  if (status) {
    url += `&status=${encodeURIComponent(status)}`;
  }
  return getApi<ImportPreviewResponse>(url);
}

export async function patchEvaluationDataImportRecord(
  importId: string,
  recordId: string,
  patch: PatchDraftRecord
): Promise<EvaluationDataImportRecord> {
  return patchApi<EvaluationDataImportRecord>(
    `/api/evaluation-data/imports/${importId}/records/${recordId}`,
    patch
  );
}

export async function applyEvaluationDataImport(
  importId: string
): Promise<{
  import_id: string;
  status: string;
  applied_count: number;
  conflict_count: number;
  error_count: number;
}> {
  return postApi(`/api/evaluation-data/imports/${importId}/apply`, {});
}
