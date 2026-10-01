export type ScoringExecutionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED';

export interface CrawlScoringExecutionRecord {
  id: string;
  crawl_data_row_id: string;
  crawl_execution_id: string;
  employee_id: string | null;
  employee_code: string;
  criterion_id: string | null;
  criterion_code: string;
  evaluation_cycle_id: string;
  prompt_version_id: string | null;
  status: ScoringExecutionStatus;
  attempt_no: number;
  max_attempts: number;
  next_retry_at: string;
  locked_at: string | null;
  locked_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  model: string | null;
  score: number | null;
  reason: string | null;
  confidence: number | null;
  evidence: Array<{ source_reference?: string; claim: string }>;
  flags: string[];
  input_snapshot: Record<string, unknown>;
  output_snapshot: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  review_status?: 'PENDING' | 'APPROVED' | 'ADJUSTED' | 'REJECTED' | 'APPLIED' | null;
  final_score?: number | null;
  reviewer_id?: string | null;
  review_comment?: string | null;
  reviewed_at?: string | null;
  applied_at?: string | null;
  // Joins
  raw_measurement_value?: number | null;
  raw_source_reference?: string | null;
  raw_data_summary?: Record<string, unknown> | null;
  row_staging_status?: string | null;
  row_comment?: string | null;
  prompt_version_no?: number | null;
  prompt_name?: string | null;
}

export interface GeminiScoringOutput {
  score: number;
  reason: string;
  confidence?: number;
  evidence?: Array<{ source_reference?: string; claim: string }>;
  flags?: string[];
}
