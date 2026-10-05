export type CrawlSourceSystem = 'BLUEPRINT' | 'JIRA' | 'GOOGLE_SHEET';
export type CrawlFailurePolicy = 'CONTINUE' | 'STOP_CYCLE' | 'RETRY_THEN_CONTINUE' | 'RETRY_THEN_STOP';
export type CrawlExecutionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'FAILED'
  | 'TIMEOUT'
  | 'SKIPPED'
  | 'CANCELLED';

export interface CrawlCriterionMapping {
  criterion_id: string;
  criterion_code: string;
}

export interface CrawlJob {
  crawl_job_definition_id: string;
  code: string;
  name: string;
  source_system: CrawlSourceSystem;
  crawl_script_version_id: string;
  script_code: string;
  script_version: number;
  script_checksum: string;
  published_at: string | null;
  connector_credential_id: string;
  credential_code: string;
  source_config: Record<string, unknown>;
  default_schedule_cron: string | null;
  failure_policy: CrawlFailurePolicy;
  active: boolean;
  criteria?: CrawlCriterionMapping[];
  criteria_count?: number;
  last_execution_at?: string | null;
  last_execution_status?: CrawlExecutionStatus | null;
  evaluation_cycle_id?: string | null;
  evaluation_cycle_code?: string | null;
  evaluation_cycle_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrawlScriptItem {
  crawl_script_version_id: string;
  code: string;
  version_no: number;
  source_system: CrawlSourceSystem;
  checksum: string;
  scoring_prompt?: string | null;
  source_code?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'DEPRECATED';
  created_at?: string;
  created_by?: string | null;
  published_by?: string | null;
  published_at?: string | null;
}

export type PublishedCrawlScript = CrawlScriptItem;

export interface CrawlScriptDetails extends CrawlScriptItem {
  source_code: string;
}

export interface CreateCrawlScriptPayload {
  code: string;
  source_system: CrawlSourceSystem;
  source_code: string;
  scoring_prompt?: string | null;
  evaluation_cycle_id?: string;
  associated_criterion_ids?: string[];
  criteria_ids?: string[];
  name?: string;
  description?: string;
  prompt_code?: string;
  prompt_name?: string;
  system_prompt?: string;
  user_prompt_template?: string;
  model?: string;
  temperature?: number;
}

export interface UpdateCrawlScriptPayload {
  source_code?: string;
  scoring_prompt?: string | null;
  source_system?: CrawlSourceSystem;
}

export interface TestRunScriptPayload {
  script_id?: string;
  source_code?: string;
  source_system: CrawlSourceSystem;
  source_config?: Record<string, unknown>;
  mock_input?: Record<string, unknown>;
  evaluation_cycle_id?: string;
}

export interface TestRunScriptResult {
  success: boolean;
  executionTimeMs: number;
  recordCount: number;
  records: Array<{
    schema_version?: string;
    employee_code?: string;
    criterion_code?: string;
    measurement_value?: number;
    measurement_unit?: string;
    measured_at?: string;
    source_reference?: string;
    raw_payload_reference?: string;
    collected_at?: string;
    [key: string]: unknown;
  }>;
  error?: string;
}

export interface CrawlCredentialReference {
  connector_credential_id: string;
  code: string;
  source_system: CrawlSourceSystem;
  display_name: string;
  is_active: boolean;
}

export interface CrawlCycleJob {
  evaluation_cycle_id: string;
  crawl_job_definition_id: string;
  enabled: boolean;
  sequence_order: number;
  failure_policy: CrawlFailurePolicy;
  code: string;
  name: string;
  source_system: CrawlSourceSystem;
  active: boolean;
  script_version: number;
}

export interface CrawlExecution {
  crawl_job_execution_id: string;
  crawl_job_definition_id: string;
  evaluation_cycle_id: string;
  job_code?: string;
  job_name?: string;
  cycle_code?: string;
  cycle_name?: string;
  status: CrawlExecutionStatus;
  attempt_no: number;
  max_attempts: number;
  trigger_type: 'SCHEDULED' | 'MANUAL' | 'RETRY';
  triggered_by: string | null;
  scheduled_at: string | null;
  next_retry_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  script_version: number;
  script_checksum: string;
  source_system: CrawlSourceSystem;
  source_config_snapshot: Record<string, unknown>;
  criteria_snapshot: CrawlCriterionMapping[];
  records_fetched: number;
  records_parsed: number;
  records_valid: number;
  records_invalid: number;
  records_conflict: number;
  records_applied: number;
  error_code: string | null;
  error_message: string | null;
  can_retry?: boolean;
  retry_of_execution_id: string | null;
  evaluation_data_import_id: string | null;
  created_at: string;
}

export interface CrawlJobCreatePayload {
  code: string;
  name: string;
  source_system: CrawlSourceSystem;
  crawl_script_version_id: string;
  connector_credential_id: string;
  source_config: Record<string, unknown>;
  default_schedule_cron?: string | null;
  failure_policy: CrawlFailurePolicy;
  criterion_ids: string[];
  evaluation_cycle_id?: string;
}

export interface CrawlExecutionLog {
  crawl_job_execution_log_id: string;
  crawl_job_execution_id: string;
  logged_at: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context: Record<string, unknown>;
}

// ── Source Systems ────────────────────────────────────────────────────────
export interface CrawlSourceSystemRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: string;
  authentication_type: string;
  allowed_domains: string[];
  credential_schema: Record<string, unknown>;
  configuration_schema: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCrawlSourceSystemPayload {
  code: string;
  name: string;
  description?: string;
  type?: string;
  authentication_type?: string;
  allowed_domains: string[];
  credential_schema?: Record<string, unknown>;
  configuration_schema?: Record<string, unknown>;
  enabled?: boolean;
}

// ── KPI Scoring Prompts ───────────────────────────────────────────────────
export interface KpiScoringPrompt {
  prompt_id: string;
  code: string;
  name: string;
  criterion_id?: string | null;
  criterion_code?: string | null;
  description?: string | null;
  latest_version_no?: number | null;
  latest_model?: string | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KpiScoringPromptVersion {
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
  published_by?: string | null;
  published_at?: string | null;
  created_at: string;
}

export interface CreateKpiScoringPromptPayload {
  code: string;
  name: string;
  criterion_id?: string;
  criterion_code?: string;
  description?: string;
  initial_system_prompt?: string;
  initial_user_prompt_template?: string;
  model?: string;
  temperature?: number;
}

export interface CreateKpiScoringPromptVersionPayload {
  system_prompt: string;
  user_prompt_template: string;
  expected_output_schema?: Record<string, unknown>;
  model?: string;
  temperature?: number;
}

export interface DryRunPromptTestPayload {
  system_prompt: string;
  user_prompt_template: string;
  model?: string;
  temperature?: number;
  crawl_data_row_id?: string;
  sample_row_data?: Record<string, unknown>;
}

export interface DryRunPromptTestResult {
  score: number;
  reason: string;
  confidence?: number;
  evidence?: Array<{ source_reference?: string; claim: string }>;
  rendered_prompt: string;
  execution_time_ms: number;
}

// ── Row-Level AI Scoring Executions & Human Review Gate ──────────────────
export type ScoringStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'RETRYING' | 'CANCELLED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'ADJUSTED' | 'REJECTED' | 'APPLIED';

export interface CrawlScoringExecutionRecord {
  id: string;
  crawl_data_row_id: string;
  crawl_execution_id: string;
  employee_id: string | null;
  employee_code: string;
  employee_name?: string | null;
  criterion_id: string | null;
  criterion_code: string;
  evaluation_cycle_id: string;
  prompt_version_id: string | null;
  status: ScoringStatus;
  attempt_no: number;
  max_attempts: number;
  next_retry_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
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
  review_status: ReviewStatus;
  final_score: number | null;
  reviewer_id: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  raw_measurement_value?: number | null;
  source_snapshot?: Record<string, unknown> | null;
  row_staging_status?: string | null;
  row_comment?: string | null;
  prompt_version_no?: number | null;
  prompt_name?: string | null;
}

export interface ReviewScoringPayload {
  action: 'APPROVE' | 'ADJUST' | 'REJECT';
  final_score?: number;
  comment?: string;
}