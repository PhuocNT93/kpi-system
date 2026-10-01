import { ValidationError } from '../../../api/app-error.js';

export function parseCrawlRequest<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: PropertyKey[]; code: string; message: string }> } } }, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new ValidationError('Crawl request validation failed.', parsed.error.issues.map((issue) => ({
    field: issue.path.map(String).join('.'),
    code: issue.code.toUpperCase(),
    message: issue.message,
  })));
}