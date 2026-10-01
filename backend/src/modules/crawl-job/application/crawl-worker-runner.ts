import { randomUUID } from 'node:crypto';
import { CrawlJobService } from './crawl-job.service.js';
import { CrawlExecutionWorkerService } from './crawl-execution-worker.service.js';

export interface CrawlWorkerRunnerOptions {
  workerId?: string;
  pollIntervalMs?: number;
  leaseMs?: number;
}

export class CrawlWorkerRunner {
  private stopping = false;
  private timer: NodeJS.Timeout | null = null;
  private activeExecution: Promise<void> | null = null;
  private readonly workerId: string;
  private readonly pollIntervalMs: number;
  private readonly leaseMs: number;

  constructor(
    private readonly crawlJobService: CrawlJobService,
    private readonly workerService: CrawlExecutionWorkerService,
    options?: CrawlWorkerRunnerOptions
  ) {
    this.pollIntervalMs = Math.min(
      Math.max(Number(options?.pollIntervalMs ?? process.env.CRAWL_WORKER_POLL_INTERVAL_MS ?? 1000), 100),
      10_000
    );
    this.leaseMs = Math.min(
      Math.max(Number(options?.leaseMs ?? process.env.CRAWL_WORKER_LEASE_MS ?? 60_000), 15_000),
      300_000
    );
    this.workerId =
      options?.workerId ??
      `${process.env.HOSTNAME ?? 'in-process-crawl-worker'}:${process.pid}:${randomUUID()}`;
  }

  start(): void {
    if (this.stopping) return;
    void this.runLoop();
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.activeExecution) {
      await this.activeExecution;
    }
  }

  private async runLoop(): Promise<void> {
    while (!this.stopping) {
      try {
        await this.crawlJobService.recoverExpiredLeases(20);
        const claimed = await this.crawlJobService.claimNextExecution(this.workerId, this.leaseMs);
        if (!claimed) {
          await this.delay(this.pollIntervalMs);
          continue;
        }

        const heartbeat = setInterval(() => {
          void this.crawlJobService
            .heartbeatExecution(claimed.crawl_job_execution_id, this.workerId, this.leaseMs)
            .then((isOwned) => {
              if (!isOwned) {
                console.warn(
                  JSON.stringify({
                    event: 'crawl_worker_lease_lost',
                    execution_id: claimed.crawl_job_execution_id,
                    worker_id: this.workerId,
                  })
                );
              }
            })
            .catch(() => {
              console.error(
                JSON.stringify({
                  event: 'crawl_worker_heartbeat_failed',
                  execution_id: claimed.crawl_job_execution_id,
                  worker_id: this.workerId,
                })
              );
            });
        }, Math.max(5000, Math.floor(this.leaseMs / 3)));

        this.activeExecution = this.workerService
          .execute(claimed.crawl_job_execution_id, this.workerId)
          .catch((err: unknown) => {
            console.error(
              JSON.stringify({
                event: 'crawl_worker_unhandled_execution_error',
                execution_id: claimed.crawl_job_execution_id,
                worker_id: this.workerId,
                error: err instanceof Error ? err.stack || err.message : String(err),
              })
            );
          })
          .finally(() => {
            clearInterval(heartbeat);
            this.activeExecution = null;
          });
        await this.activeExecution;
      } catch (err: unknown) {
        console.error(
          JSON.stringify({
            event: 'crawl_worker_poll_failed',
            worker_id: this.workerId,
            error: err instanceof Error ? err.stack || err.message : String(err),
          })
        );
        await this.delay(this.pollIntervalMs);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timer = setTimeout(() => {
        this.timer = null;
        resolve();
      }, ms);
    });
  }
}
