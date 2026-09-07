export interface CsvTemplate {
  csv_template_id: string;
  code: string;
  version_no: number;
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED';
  effective_from: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface CsvTemplateColumn {
  csv_template_column_id: string;
  csv_template_id: string;
  column_name: string;
  data_type: string;
  required: boolean;
  validation_rule: any;
  display_order: number;
}

export interface ICsvTemplateRepository {
  findActiveTemplateByCode(code: string): Promise<CsvTemplate | null>;
  findById(id: string): Promise<CsvTemplate | null>;
  findColumnsByTemplateId(templateId: string): Promise<CsvTemplateColumn[]>;
}
