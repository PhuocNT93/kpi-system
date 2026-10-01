import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

function redactPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPayload);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = /(password|token|secret|api[_-]?key|authorization|credential)/i.test(key)
        ? '[REDACTED]'
        : redactPayload(nested);
    }
    return output;
  }
  if (typeof value === 'string') {
    return value
      .replace(/\b(Bearer|Basic)\s+[^\s"']+/gi, '$1 [REDACTED]')
      .replace(/(password|token|secret|api[_-]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
  }
  return value;
}

export interface RawPayloadStorage {
  save(executionId: string, payload: unknown): Promise<string>;
  get(reference: string): Promise<unknown | null>;
}

export class PostgresCrawlRawPayloadStorage implements RawPayloadStorage {
  constructor(private readonly pool: Pool, private readonly maxBytes = 5_000_000) {}

  async save(executionId: string, payload: unknown): Promise<string> {
    const serialized = JSON.stringify(redactPayload(payload));
    if (serialized === undefined || Buffer.byteLength(serialized, 'utf8') > this.maxBytes) {
      throw new Error('Raw crawl payload exceeded the storage limit.');
    }
    const reference = `crawl:${executionId}:${randomUUID()}`;
    const retentionDays = Math.min(Math.max(Number(process.env.CRAWL_RAW_PAYLOAD_RETENTION_DAYS ?? 90), 1), 3650);
    await this.pool.query(
      `INSERT INTO crawl_raw_payload (raw_payload_reference, payload, expires_at)
       VALUES ($1, $2::jsonb, NOW() + ($3::text || ' days')::interval)`,
      [reference, serialized, retentionDays]
    );
    return reference;
  }

  async get(reference: string): Promise<unknown | null> {
    const result = await this.pool.query(
      `SELECT payload FROM crawl_raw_payload WHERE raw_payload_reference = $1 AND expires_at > NOW()`,
      [reference]
    );
    return result.rows[0]?.payload ?? null;
  }
}