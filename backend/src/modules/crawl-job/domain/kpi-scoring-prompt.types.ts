export interface KpiScoringPromptRecord {
  prompt_id: string;
  code: string;
  name: string;
  criterion_id: string | null;
  criterion_code: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  current_published_version_id?: string | null;
  current_version_no?: number | null;
}

export interface KpiScoringPromptVersionRecord {
  prompt_version_id: string;
  prompt_id: string;
  version_no: number;
  system_prompt: string;
  user_prompt_template: string;
  expected_output_schema: Record<string, unknown>;
  model: string;
  temperature: number;
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED';
  checksum: string;
  created_by: string;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
}

export interface CreatePromptPayload {
  code: string;
  name: string;
  criterion_id?: string | null;
  criterion_code?: string | null;
  description?: string | null;
  initial_system_prompt?: string;
  initial_user_prompt_template?: string;
  model?: string;
  temperature?: number;
}

export interface CreatePromptVersionPayload {
  system_prompt: string;
  user_prompt_template: string;
  expected_output_schema?: Record<string, unknown>;
  model?: string;
  temperature?: number;
}

export interface TestPromptPayload {
  prompt_version_id?: string;
  system_prompt?: string;
  user_prompt_template?: string;
  model?: string;
  temperature?: number;
  crawl_data_row_id?: string;
  sample_row_data?: Record<string, unknown>;
}
