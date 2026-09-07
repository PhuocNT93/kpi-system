export interface CsvTemplateColumn {
  csvTemplateColumnId: string;
  columnName: string;
  dataType: string;
  required: boolean;
  validationRule: Record<string, unknown> | null;
  displayOrder: number;
}

export interface CsvTemplate {
  csvTemplateId: string;
  code: string;
  versionNo: number;
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED';
  effectiveFrom: string | null;
  columns: CsvTemplateColumn[];
}
