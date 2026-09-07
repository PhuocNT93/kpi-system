import { getApi, downloadApi } from '@/shared/api/api-client';
import type { CsvTemplate, CsvTemplateColumn } from './csv-template-types';

/**
 * Backend wire format (snake_case)
 */
interface ApiCsvTemplateColumn {
  csv_template_column_id: string;
  column_name: string;
  data_type: string;
  required: boolean;
  validation_rule: Record<string, unknown> | null;
  display_order: number;
}

interface ApiCsvTemplate {
  csv_template_id: string;
  code: string;
  version_no: number;
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED';
  effective_from: string | null;
  columns: ApiCsvTemplateColumn[];
}

/**
 * Mappers
 */
function mapColumn(apiColumn: ApiCsvTemplateColumn): CsvTemplateColumn {
  return {
    csvTemplateColumnId: apiColumn.csv_template_column_id,
    columnName: apiColumn.column_name,
    dataType: apiColumn.data_type,
    required: apiColumn.required,
    validationRule: apiColumn.validation_rule,
    displayOrder: apiColumn.display_order,
  };
}

function mapTemplate(apiTemplate: ApiCsvTemplate): CsvTemplate {
  return {
    csvTemplateId: apiTemplate.csv_template_id,
    code: apiTemplate.code,
    versionNo: apiTemplate.version_no,
    status: apiTemplate.status,
    effectiveFrom: apiTemplate.effective_from,
    columns: apiTemplate.columns ? apiTemplate.columns.map(mapColumn) : [],
  };
}

/**
 * API methods
 */
export async function getCurrentCsvTemplate(): Promise<CsvTemplate> {
  const data = await getApi<ApiCsvTemplate>('/csv-templates/current');
  return mapTemplate(data);
}

export async function downloadCurrentCsvTemplate(): Promise<{ blob: Blob; filename?: string }> {
  return downloadApi('/csv-templates/current/download');
}
