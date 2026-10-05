import { z } from 'zod';

export const CRAWL_EXECUTION_STATUSES = [
  'QUEUED',
  'RUNNING',
  'SUCCESS',
  'PARTIAL_SUCCESS',
  'FAILED',
  'TIMEOUT',
  'SKIPPED',
  'CANCELLED',
] as const;

export type CrawlExecutionStatus = (typeof CRAWL_EXECUTION_STATUSES)[number];
export type CrawlTriggerType = 'SCHEDULED' | 'MANUAL' | 'RETRY';
export type CrawlFailurePolicy = 'CONTINUE' | 'STOP_CYCLE' | 'RETRY_THEN_CONTINUE' | 'RETRY_THEN_STOP';
export type CrawlSourceSystem = 'BLUEPRINT' | 'JIRA' | 'GOOGLE_SHEET';

const TERMINAL_STATUSES = new Set<CrawlExecutionStatus>([
  'SUCCESS',
  'PARTIAL_SUCCESS',
  'FAILED',
  'TIMEOUT',
  'SKIPPED',
  'CANCELLED',
]);

const ALLOWED_TRANSITIONS: Record<CrawlExecutionStatus, readonly CrawlExecutionStatus[]> = {
  QUEUED: ['RUNNING', 'SKIPPED', 'CANCELLED'],
  RUNNING: ['SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED', 'CANCELLED'],
  SUCCESS: [],
  PARTIAL_SUCCESS: [],
  FAILED: [],
  TIMEOUT: [],
  SKIPPED: [],
  CANCELLED: [],
};

export function canTransitionExecution(
  from: CrawlExecutionStatus,
  to: CrawlExecutionStatus
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalExecutionStatus(status: CrawlExecutionStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function assertExecutionTransition(
  from: CrawlExecutionStatus,
  to: CrawlExecutionStatus
): void {
  if (!canTransitionExecution(from, to)) {
    throw new Error(`Invalid crawl execution transition: ${from} -> ${to}`);
  }
}

export type CrawlFailure =
  | { kind: 'HTTP'; statusCode: number }
  | { kind: 'NETWORK_TIMEOUT' | 'CONNECTION_RESET' | 'TEMPORARY_UNAVAILABLE' }
  | { kind: 'VALIDATION' | 'SANDBOX' | 'CONFIGURATION' | 'CREDENTIAL' | 'UNKNOWN' };

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

export function isRetryableCrawlFailure(failure: CrawlFailure): boolean {
  if (failure.kind === 'HTTP') return RETRYABLE_HTTP_STATUSES.has(failure.statusCode);
  return failure.kind === 'NETWORK_TIMEOUT'
    || failure.kind === 'CONNECTION_RESET'
    || failure.kind === 'TEMPORARY_UNAVAILABLE';
}

export const CrawlTaskEvidenceSchema = z.object({
  key: z.union([z.string(), z.number()]).transform((val) => String(val)),
  title: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  is_on_time: z.boolean().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  issue_type: z.string().optional().nullable(),
  task_type: z.string().optional().nullable(),
});

export type CrawlTaskEvidence = z.infer<typeof CrawlTaskEvidenceSchema>;

export const NormalizedCrawlOutputSchema = z.object({
  schema_version: z.literal('1.0'),
  employee_code: z.string().trim().min(1).max(100),
  criterion_code: z.string().trim().min(1).max(100),
  measurement_value: z.number().finite(),
  measurement_unit: z.string().trim().min(1).max(50),
  measured_at: z.string().datetime({ offset: true }),
  source_reference: z.string().min(1).max(2048),
  raw_payload_reference: z.string().min(1).max(500),
  collected_at: z.string().datetime({ offset: true }),
  measurement_from: z.string().datetime({ offset: true }).optional(),
  measurement_to: z.string().datetime({ offset: true }).optional(),
  source_updated_at: z.string().datetime({ offset: true }).optional(),
  tasks: z.array(CrawlTaskEvidenceSchema).optional(),
}).passthrough();

export type NormalizedCrawlOutput = z.infer<typeof NormalizedCrawlOutputSchema>;

export interface CrawlExecutionSnapshot {
  script_id: string;
  script_version: number;
  script_checksum: string;
  source_system: CrawlSourceSystem;
  source_config: Record<string, unknown>;
  connector_credential_id: string;
  criteria: Array<{ criterion_id: string; criterion_code: string }>;
}