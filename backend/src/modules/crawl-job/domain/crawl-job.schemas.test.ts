import { describe, expect, it } from 'vitest';
import { CreateCrawlJobSchema } from './crawl-job.schemas.js';

describe('Crawl Job request schemas', () => {
  it('rejects credential-like keys even when nested in source configuration', () => {
    const result = CreateCrawlJobSchema.safeParse({
      code: 'JIRA_METRICS',
      name: 'Jira metrics',
      source_system: 'JIRA',
      crawl_script_version_id: 'c5b4c7fc-7618-4f13-a7a8-43d785f6c025',
      connector_credential_id: '2e487813-a085-4ab8-9e56-5206e27f4ffa',
      source_config: { query: { api_token: 'must-not-be-stored' } },
      criterion_ids: ['ae8e1e8b-36dd-46c0-bbde-34a8b18a20c2'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts non-sensitive source configuration with a credential reference', () => {
    const result = CreateCrawlJobSchema.safeParse({
      code: 'JIRA_METRICS',
      name: 'Jira metrics',
      source_system: 'JIRA',
      crawl_script_version_id: 'c5b4c7fc-7618-4f13-a7a8-43d785f6c025',
      connector_credential_id: '2e487813-a085-4ab8-9e56-5206e27f4ffa',
      source_config: { base_url: 'https://jira.example.test', project: 'ABC' },
      criterion_ids: ['ae8e1e8b-36dd-46c0-bbde-34a8b18a20c2'],
    });
    expect(result.success).toBe(true);
  });
});