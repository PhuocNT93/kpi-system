import ivm from 'isolated-vm';

export interface FetchSourceOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

export interface CrawlSourceFetcher {
  (path: string, optionsOrQuery?: Record<string, string> | FetchSourceOptions): Promise<unknown>;
}

export interface CrawlSandboxLimits {
  timeoutMs?: number;
  memoryLimitMb?: number;
  outputLimitBytes?: number;
}

const MAX_TIMEOUT_MS = 30_000;
const MAX_MEMORY_MB = 128;
const MAX_OUTPUT_BYTES = 1_000_000;

export class CrawlSandboxError extends Error {
  constructor(
    message: string,
    readonly code: 'SANDBOX_TIMEOUT' | 'SANDBOX_OUTPUT_TOO_LARGE' | 'SANDBOX_INVALID_OUTPUT' | 'SANDBOX_RUNTIME_ERROR',
    cause?: unknown
  ) {
    super(message);
    this.name = 'CrawlSandboxError';
    if (cause !== undefined) Object.defineProperty(this, 'cause', { value: cause });
  }
}

export class CrawlSandboxService {
  constructor(private readonly limits: CrawlSandboxLimits = {}) {}

  async run<T>(
    sourceCode: string,
    input: Record<string, unknown>,
    fetchSource: CrawlSourceFetcher,
    onLog?: (message: string) => void | Promise<void>
  ): Promise<T> {
    const timeoutMs = Math.min(this.limits.timeoutMs ?? MAX_TIMEOUT_MS, MAX_TIMEOUT_MS);
    const memoryLimitMb = Math.min(this.limits.memoryLimitMb ?? 64, MAX_MEMORY_MB);
    const outputLimitBytes = Math.min(this.limits.outputLimitBytes ?? MAX_OUTPUT_BYTES, MAX_OUTPUT_BYTES);
    const isolate = new ivm.Isolate({ memoryLimit: memoryLimitMb });

    try {
      const context = await isolate.createContext();
      await context.global.set('input', new ivm.ExternalCopy(input).copyInto());
      await context.global.set('__sourceFetchReference', new ivm.Reference(
        async (path: string, optionsOrQuery?: Record<string, string> | FetchSourceOptions) => {
          const result = JSON.stringify(await fetchSource(path, optionsOrQuery));
          if (result === undefined || Buffer.byteLength(result, 'utf8') > outputLimitBytes) {
            throw new Error('Source response is not serializable or exceeded the transfer limit.');
          }
          return result;
        }
      ));

      if (onLog) {
        await context.global.set('__logReference', new ivm.Reference(async (msg: string) => {
          try {
            await onLog(String(msg ?? '').slice(0, 2000));
          } catch {
            // Ignore logging transport errors
          }
        }));
      }

      await context.eval(`(() => {
        const sourceFetchReference = globalThis.__sourceFetchReference;
        delete globalThis.__sourceFetchReference;
        globalThis.fetchSource = async (path, optionsOrQuery) => {
          const response = sourceFetchReference.applySyncPromise(undefined, [path, optionsOrQuery], {
            arguments: { copy: true },
            timeout: ${timeoutMs}
          });
          return JSON.parse(response);
        };

        const logRef = globalThis.__logReference;
        if (logRef) {
          const writeLog = (...args) => {
            try {
              const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
              logRef.applySyncPromise(undefined, [text], { arguments: { copy: true }, timeout: 5000 });
            } catch (_) {}
          };
          globalThis.console = {
            log: writeLog,
            info: (...args) => writeLog('[INFO]', ...args),
            warn: (...args) => writeLog('[WARN]', ...args),
            error: (...args) => writeLog('[ERROR]', ...args),
          };
          globalThis.log = writeLog;
        }
      })()`);

      const output = await context.eval(
        `(async () => { const crawl = (${sourceCode}); return await crawl(input, fetchSource); })()`,
        { timeout: timeoutMs, promise: true, copy: true }
      ) as T;

      let serialized: string;
      try {
        serialized = JSON.stringify(output);
      } catch {
        throw new CrawlSandboxError('Crawler returned a non-serializable result.', 'SANDBOX_INVALID_OUTPUT');
      }
      if (serialized === undefined) {
        throw new CrawlSandboxError('Crawler returned no output.', 'SANDBOX_INVALID_OUTPUT');
      }
      if (Buffer.byteLength(serialized, 'utf8') > outputLimitBytes) {
        throw new CrawlSandboxError('Crawler output exceeded the configured size limit.', 'SANDBOX_OUTPUT_TOO_LARGE');
      }
      return output;
    } catch (error) {
      if (error instanceof CrawlSandboxError) throw error;
      const message = error instanceof Error ? error.message : 'Crawler execution failed.';
      const isTimeout = /timed out|timeout/i.test(message);
      throw new CrawlSandboxError(
        isTimeout ? 'Crawler execution exceeded its time limit.' : 'Crawler execution failed in the sandbox.',
        isTimeout ? 'SANDBOX_TIMEOUT' : 'SANDBOX_RUNTIME_ERROR',
        error
      );
    } finally {
      isolate.dispose();
    }
  }
}