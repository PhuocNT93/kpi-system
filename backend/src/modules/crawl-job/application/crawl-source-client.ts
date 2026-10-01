import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { checkServerIdentity } from 'node:tls';
import { CrawlSourceFetcher } from './crawl-sandbox.service.js';
import { CrawlSourceSystem } from '../domain/crawl-job.types.js';

export class CrawlSourceError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message: string
  ) {
    super(message);
    this.name = 'CrawlSourceError';
  }
}

export function isPrivateNetworkAddress(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0] ?? '';
  if (normalized.startsWith('::ffff:')) return isPrivateNetworkAddress(normalized.slice(7));
  if (normalized.includes('.')) {
    const octets = normalized.split('.').map(Number);
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
    const first = octets[0]!;
    const second = octets[1]!;
    return first === 0 || first === 10 || first === 127 || first >= 224
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168)
      || (first === 198 && (second === 18 || second === 19));
  }
  return normalized === '::' || normalized === '::1'
    || normalized.startsWith('fc') || normalized.startsWith('fd')
    || normalized.startsWith('fe8') || normalized.startsWith('fe9')
    || normalized.startsWith('fea') || normalized.startsWith('feb');
}

export function isHostAllowlisted(hostname: string, allowlist: string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return allowlist.some((entry) => {
    const rule = entry.trim().toLowerCase().replace(/\.$/, '');
    if (!rule) return false;
    if (rule.startsWith('*.')) {
      const suffix = rule.slice(1);
      return host.endsWith(suffix) && host !== suffix.slice(1);
    }
    return host === rule;
  });
}

/**
 * Build the HTTP Authorization header for a connector credential.
 *
 * The secret reference is an env-var name. The env-var value is interpreted in
 * this priority order:
 *   1. JSON with { token } -> Bearer token
 *   2. JSON with { username, password } -> Basic auth
 *   3. Plain string -> Bearer token (legacy)
 *
 * For JIRA and BLUEPRINT, the password env var is paired with a companion
 * username env var (JIRA_USERNAME / BLUEPRINT_USERNAME) to build Basic auth
 * automatically when the env var contains only the plain password string.
 */
function getCredentialHeader(secretReference: string, sourceSystem?: string): string {
  if (!/^[A-Z][A-Z0-9_]{0,127}$/.test(secretReference)) {
    throw new CrawlSourceError('CREDENTIAL_REFERENCE_INVALID', false, 'Connector credential reference is invalid.');
  }
  const secret = process.env[secretReference];
  if (!secret) throw new CrawlSourceError('CREDENTIAL_INVALID', false, 'Connector credential is unavailable.');

  // Helper: build Basic or Bearer from a plain password string + optional paired username env var
  const buildFromPlainPassword = (plainPassword: string): string => {
    const usernameEnvKey = sourceSystem === 'JIRA'
      ? 'JIRA_USERNAME'
      : sourceSystem === 'BLUEPRINT'
        ? 'BLUEPRINT_USERNAME'
        : '';
    const username = usernameEnvKey ? (process.env[usernameEnvKey] ?? '') : '';
    if (username) {
      return `Basic ${Buffer.from(`${username}:${plainPassword}`).toString('base64')}`;
    }
    return `Bearer ${plainPassword}`;
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(secret);
  } catch {
    // Not valid JSON at all — treat raw env-var value as plain password
    return buildFromPlainPassword(secret);
  }

  // Structured credential object
  if (parsed !== null && typeof parsed === 'object') {
    const cred = parsed as { token?: unknown; username?: unknown; password?: unknown };
    if (typeof cred.token === 'string' && cred.token) return `Bearer ${cred.token}`;
    if (typeof cred.username === 'string' && typeof cred.password === 'string') {
      return `Basic ${Buffer.from(`${cred.username}:${cred.password}`).toString('base64')}`;
    }
    throw new CrawlSourceError('CREDENTIAL_INVALID', false, 'Connector credential format is invalid.');
  }

  // JSON primitive (number, boolean, string) — treat as plain password
  return buildFromPlainPassword(String(parsed));
}

export interface CrawlSourceClientOptions {
  timeoutMs?: number;
  maxResponseBytes?: number;
  allowlists?: Partial<Record<CrawlSourceSystem, string[]>>;
}

export type RawPayloadWriter = (payload: unknown) => Promise<string>;

export class CrawlSourceClient {
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;

  constructor(private readonly options: CrawlSourceClientOptions = {}) {
    this.timeoutMs = Math.min(Math.max(options.timeoutMs ?? 10_000, 100), 30_000);
    this.maxResponseBytes = Math.min(Math.max(options.maxResponseBytes ?? 1_000_000, 1024), 5_000_000);
  }

  createFetcher(
    sourceSystem: CrawlSourceSystem,
    sourceConfig: Record<string, unknown>,
    secretReference: string,
    writeRawPayload?: RawPayloadWriter
  ): CrawlSourceFetcher {
    return async (path, optionsOrQuery) => this.fetch(sourceSystem, sourceConfig, secretReference, path, optionsOrQuery, writeRawPayload);
  }

  private async fetch(
    sourceSystem: CrawlSourceSystem,
    sourceConfig: Record<string, unknown>,
    secretReference: string,
    path: string,
    optionsOrQuery?: Record<string, string> | { method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string>; query?: Record<string, string> },
    writeRawPayload?: RawPayloadWriter
  ): Promise<unknown> {
    const baseUrl = typeof sourceConfig.base_url === 'string' ? sourceConfig.base_url : '';
    let target: URL;
    let base: URL;
    try {
      base = new URL(baseUrl);
      // If path is absolute (starts with /), resolve relative to the base origin+basePath
      // e.g. base=https://host/jira, path=/rest/api → https://host/jira/rest/api
      // This prevents path from clobbering the base URL's path segment.
      const basePath = base.pathname.replace(/\/$/, '');
      const resolvedPath = path.startsWith('/') ? `${basePath}${path}` : path;
      target = new URL(resolvedPath, base);
    } catch {
      throw new CrawlSourceError('SOURCE_URL_INVALID', false, 'Crawl source URL is invalid.');
    }
    if (base.protocol !== 'https:' || target.protocol !== 'https:' || target.origin !== base.origin
      || base.username || base.password || target.hash) {
      throw new CrawlSourceError('SOURCE_URL_BLOCKED', false, 'Crawl source URL is not permitted.');
    }

    let method: 'GET' | 'POST' = 'GET';
    let bodyData: unknown = undefined;
    let queryParams: Record<string, string> = {};
    let customHeaders: Record<string, string> = {};

    if (optionsOrQuery) {
      if ('method' in optionsOrQuery || 'body' in optionsOrQuery || 'query' in optionsOrQuery || 'headers' in optionsOrQuery) {
        const opts = optionsOrQuery as { method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string>; query?: Record<string, string> };
        method = opts.method === 'POST' ? 'POST' : 'GET';
        bodyData = opts.body;
        queryParams = opts.query || {};
        customHeaders = opts.headers || {};
      } else {
        queryParams = optionsOrQuery as Record<string, string>;
      }
    }

    for (const [key, value] of Object.entries(queryParams)) target.searchParams.set(key, value);
    if (Array.from(target.searchParams.keys()).some((key) => /(password|token|secret|api[_-]?key|authorization)/i.test(key))) {
      throw new CrawlSourceError('SOURCE_CREDENTIAL_QUERY_BLOCKED', false, 'Credential-like query parameters are not permitted.');
    }

    // Built-in default allowlists per source system (override via env or constructor options)
    const DEFAULT_ALLOWLISTS: Partial<Record<CrawlSourceSystem, string[]>> = {
      JIRA: [
        'pim.cyberlogitec.com',
      ],
      BLUEPRINT: [
        'blueprint.cyberlogitec.com.vn',
        'auth.cyberlogitec.com.vn',
      ],
    };

    const allowlist = this.options.allowlists?.[sourceSystem]
      ?? (process.env[`CRAWL_ALLOWED_HOSTS_${sourceSystem}`] ?? '').split(',').filter(Boolean)
      .concat(DEFAULT_ALLOWLISTS[sourceSystem] ?? []);
    if (!isHostAllowlisted(target.hostname, allowlist)) {
      throw new CrawlSourceError('SOURCE_HOST_NOT_ALLOWLISTED', false, 'Crawl source host is not allowlisted.');
    }

    let addresses: Awaited<ReturnType<typeof lookup>>[];
    try {
      addresses = await lookup(target.hostname, { all: true, verbatim: true });
    } catch {
      throw new CrawlSourceError('UPSTREAM_DNS_FAILURE', true, 'Crawl source could not be resolved.');
    }
    if (addresses.length === 0 || addresses.some((entry) => isPrivateNetworkAddress(entry.address))) {
      throw new CrawlSourceError('SOURCE_PRIVATE_ADDRESS_BLOCKED', false, 'Crawl source resolved to a private or reserved address.');
    }

    const authorization = getCredentialHeader(secretReference, sourceSystem);
    const selectedAddress = addresses[0]!;
    const bodyStr = bodyData !== undefined ? (typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData)) : undefined;

    return new Promise((resolve, reject) => {
      const request = httpsRequest({
        protocol: 'https:',
        hostname: selectedAddress.address,
        family: selectedAddress.family,
        port: target.port || 443,
        method,
        path: `${target.pathname}${target.search}`,
        servername: target.hostname,
        checkServerIdentity: (_hostname, certificate) => checkServerIdentity(target.hostname, certificate),
        headers: {
          authorization,
          host: target.host,
          accept: 'application/json',
          ...(bodyStr !== undefined ? { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(bodyStr, 'utf8')) } : {}),
          ...customHeaders,
        },
      }, (response) => {
        const chunks: Buffer[] = [];
        let responseBytes = 0;
        response.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          responseBytes += buffer.byteLength;
          if (responseBytes > this.maxResponseBytes) {
            request.destroy(new CrawlSourceError('UPSTREAM_RESPONSE_TOO_LARGE', false, 'Crawl source response exceeded the size limit.'));
            return;
          }
          chunks.push(buffer);
        });
        response.on('end', () => {
          const statusCode = response.statusCode ?? 502;
          if (statusCode < 200 || statusCode >= 300) {
            const retryable = statusCode === 429 || [500, 502, 503, 504].includes(statusCode);
            reject(new CrawlSourceError(`UPSTREAM_HTTP_${statusCode}`, retryable, 'Crawl source returned an unsuccessful response.'));
            return;
          }
          try {
            const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
            if (writeRawPayload) {
              void writeRawPayload(payload).then((rawPayloadReference) => {
                resolve({ data: payload, raw_payload_reference: rawPayloadReference });
              }, () => reject(new CrawlSourceError('RAW_PAYLOAD_STORAGE_FAILED', false, 'Crawl source payload could not be stored safely.')));
            } else {
              resolve(payload);
            }
          } catch {
            reject(new CrawlSourceError('UPSTREAM_INVALID_JSON', false, 'Crawl source returned invalid JSON.'));
          }
        });
      });
      request.setTimeout(this.timeoutMs, () => request.destroy(new CrawlSourceError('NETWORK_TIMEOUT', true, 'Crawl source request timed out.')));
      request.on('error', (error: NodeJS.ErrnoException) => {
        if (error instanceof CrawlSourceError) reject(error);
        else reject(new CrawlSourceError(error.code === 'ECONNRESET' ? 'CONNECTION_RESET' : 'UPSTREAM_NETWORK_ERROR', true, 'Crawl source request failed.'));
      });
      if (bodyStr) {
        request.write(bodyStr);
      }
      request.end();
    });
  }
}