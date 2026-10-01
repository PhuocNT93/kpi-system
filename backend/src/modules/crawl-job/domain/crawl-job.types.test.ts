import { describe, expect, it } from 'vitest';
import {
  assertExecutionTransition,
  canTransitionExecution,
  isRetryableCrawlFailure,
  isTerminalExecutionStatus,
  NormalizedCrawlOutputSchema,
} from './crawl-job.types.js';

describe('crawl execution domain rules', () => {
  it('allows only explicit lifecycle transitions', () => {
    expect(canTransitionExecution('QUEUED', 'RUNNING')).toBe(true);
    expect(canTransitionExecution('QUEUED', 'SUCCESS')).toBe(false);
    expect(canTransitionExecution('RUNNING', 'TIMEOUT')).toBe(true);
    expect(canTransitionExecution('SUCCESS', 'RUNNING')).toBe(false);
    expect(() => assertExecutionTransition('FAILED', 'RUNNING')).toThrow(/Invalid crawl execution transition/);
  });

  it('recognizes terminal states', () => {
    expect(isTerminalExecutionStatus('QUEUED')).toBe(false);
    expect(isTerminalExecutionStatus('PARTIAL_SUCCESS')).toBe(true);
    expect(isTerminalExecutionStatus('CANCELLED')).toBe(true);
  });

  it('classifies only temporary upstream failures as retryable', () => {
    for (const statusCode of [429, 500, 502, 503, 504]) {
      expect(isRetryableCrawlFailure({ kind: 'HTTP', statusCode })).toBe(true);
    }
    for (const statusCode of [400, 401, 403, 404]) {
      expect(isRetryableCrawlFailure({ kind: 'HTTP', statusCode })).toBe(false);
    }
    expect(isRetryableCrawlFailure({ kind: 'NETWORK_TIMEOUT' })).toBe(true);
    expect(isRetryableCrawlFailure({ kind: 'VALIDATION' })).toBe(false);
  });

  it('validates the versioned normalized output and rejects malformed measurements', () => {
    const row = {
      schema_version: '1.0',
      employee_code: 'EMP001',
      criterion_code: 'JIRA_STORY_POINT',
      measurement_value: 42,
      measurement_unit: 'POINT',
      measured_at: '2026-09-01T00:00:00Z',
      source_reference: 'jira://project/ABC',
      raw_payload_reference: 'raw:execution/row-1',
      collected_at: '2026-10-01T01:00:00Z',
      measurement_from: '2026-09-01T00:00:00Z',
      measurement_to: '2026-09-30T23:59:59Z',
    };
    expect(NormalizedCrawlOutputSchema.safeParse(row).success).toBe(true);
    expect(NormalizedCrawlOutputSchema.safeParse({ ...row, measurement_value: Number.NaN }).success).toBe(false);
    expect(NormalizedCrawlOutputSchema.safeParse({ ...row, schema_version: '2.0' }).success).toBe(false);
  });
});