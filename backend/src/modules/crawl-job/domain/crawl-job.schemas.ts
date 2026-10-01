import { z } from 'zod';
import { CRAWL_EXECUTION_STATUSES } from './crawl-job.types.js';

export const uuidSchema = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  'Invalid UUID'
);

export const CreateCrawlJobSchema = z.object({
  code: z.string().trim().min(2).max(100),
  name: z.string().trim().min(2).max(200),
  source_system: z.enum(['BLUEPRINT', 'JIRA', 'GOOGLE_SHEET']),
  crawl_script_version_id: uuidSchema,
  connector_credential_id: uuidSchema,
  source_config: z.record(z.string(), z.unknown()).default({}).superRefine((config, context) => {
    const inspect = (value: unknown, path: PropertyKey[] = []): void => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach((entry, index) => inspect(entry, [...path, index]));
        return;
      }
      for (const [key, nested] of Object.entries(value)) {
        if (/(password|token|secret|api[_-]?key|credential[_-]?value)/i.test(key)) {
          context.addIssue({ code: 'custom', path: [...path, key], message: 'Store a credential reference, never a secret value.' });
          continue;
        }
        if (typeof nested === 'string' && (/(?:[?&]|\b)(?:password|token|secret|api[_-]?key)=/i.test(nested)
          || /\b(Bearer|Basic)\s+[^\s]+/i.test(nested))) {
          context.addIssue({ code: 'custom', path: [...path, key], message: 'Source configuration must not contain credentials.' });
          continue;
        }
        inspect(nested, [...path, key]);
      }
    };
    inspect(config);
  }),
  default_schedule_cron: z.string().trim().max(100).nullable().optional(),
  failure_policy: z.enum(['CONTINUE', 'STOP_CYCLE', 'RETRY_THEN_CONTINUE', 'RETRY_THEN_STOP']).default('CONTINUE'),
  criterion_ids: z.array(uuidSchema).min(1).max(100),
  evaluation_cycle_id: uuidSchema.nullable().optional(),
});

export const UpdateCrawlJobSchema = CreateCrawlJobSchema.omit({ code: true }).partial().extend({
  name: z.string().trim().min(2).max(200).optional(),
  evaluation_cycle_id: uuidSchema.nullable().optional(),
});

export const AssignCrawlJobToCycleSchema = z.object({
  enabled: z.boolean(),
  sequence_order: z.number().int().min(0).max(10000),
  failure_policy: z.enum(['CONTINUE', 'STOP_CYCLE', 'RETRY_THEN_CONTINUE', 'RETRY_THEN_STOP']).optional(),
});

export const CreateCrawlExecutionSchema = z.object({
  evaluation_cycle_id: uuidSchema,
});

export const CreateCrawlScriptSchema = z.object({
  code: z.string().trim().min(2).max(100),
  source_system: z.enum(['BLUEPRINT', 'JIRA', 'GOOGLE_SHEET', 'GITLAB']).or(z.string()),
  source_code: z.string().min(1).max(100_000),
  scoring_prompt: z.string().max(10_000).nullable().optional(),
  evaluation_cycle_id: uuidSchema.nullable().optional(),
  criteria_ids: z.array(z.string()).optional(),
  associated_criterion_ids: z.array(z.string()).optional(),
  name: z.string().trim().max(200).optional(),
  description: z.string().max(2000).optional(),
  prompt_code: z.string().trim().max(100).optional(),
  prompt_name: z.string().trim().max(200).optional(),
  system_prompt: z.string().max(5000).optional(),
  user_prompt_template: z.string().max(10000).optional(),
  model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const UpdateCrawlScriptSchema = z.object({
  source_code: z.string().min(1).max(100_000).optional(),
  scoring_prompt: z.string().max(10_000).nullable().optional(),
  source_system: z.enum(['BLUEPRINT', 'JIRA', 'GOOGLE_SHEET']).optional(),
});

export const TestRunCrawlScriptSchema = z.object({
  script_id: uuidSchema.optional(),
  source_code: z.string().min(1).max(100_000).optional(),
  source_system: z.enum(['BLUEPRINT', 'JIRA', 'GOOGLE_SHEET']),
  source_config: z.record(z.string(), z.unknown()).optional(),
  mock_input: z.record(z.string(), z.unknown()).optional(),
  evaluation_cycle_id: uuidSchema.nullable().optional(),
});

export const CreateCredentialReferenceSchema = z.object({
  code: z.string().trim().min(2).max(100),
  source_system: z.enum(['BLUEPRINT', 'JIRA', 'GOOGLE_SHEET']),
  display_name: z.string().trim().min(2).max(200),
  secret_reference: z.string().regex(/^[A-Z][A-Z0-9_]{0,127}$/),
});

export const CrawlExecutionStatusSchema = z.enum(CRAWL_EXECUTION_STATUSES);

export type CreateCrawlJobRequest = z.infer<typeof CreateCrawlJobSchema>;
export type UpdateCrawlJobRequest = z.infer<typeof UpdateCrawlJobSchema>;
export type AssignCrawlJobToCycleRequest = z.infer<typeof AssignCrawlJobToCycleSchema>;
export type CreateCrawlExecutionRequest = z.infer<typeof CreateCrawlExecutionSchema>;
export type CreateCrawlScriptRequest = z.infer<typeof CreateCrawlScriptSchema>;
export type UpdateCrawlScriptRequest = z.infer<typeof UpdateCrawlScriptSchema>;
export type TestRunCrawlScriptRequest = z.infer<typeof TestRunCrawlScriptSchema>;
export type CreateCredentialReferenceRequest = z.infer<typeof CreateCredentialReferenceSchema>;