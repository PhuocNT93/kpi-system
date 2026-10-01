import cron, { ScheduledTask } from 'node-cron';
import { CrawlJobService } from './crawl-job.service.js';
import { PostgresCrawlJobRepository } from '../infrastructure/postgres-crawl-job.repository.js';

interface ScheduledEntry {
  expression: string;
  task: ScheduledTask;
}

export class CrawlSchedulerService {
  private readonly tasks = new Map<string, ScheduledEntry>();
  private reconcileTask?: ScheduledTask;
  private retentionTask?: ScheduledTask;

  constructor(
    private readonly repository: PostgresCrawlJobRepository,
    private readonly crawlJobService: CrawlJobService
  ) {}

  async start(): Promise<void> {
    await this.reloadJobs();
    this.reconcileTask = cron.schedule('* * * * *', () => {
      void this.reloadJobs().catch((error: unknown) => {
        console.error(JSON.stringify({ event: 'crawl_schedule_reconcile_failed', error_code: 'SCHEDULE_RECONCILE_FAILED' }));
        void error;
      });
    });
    this.retentionTask = cron.schedule('15 3 * * *', () => {
      void this.repository.expireRawPayloads().then((deletedCount) => {
        console.info(JSON.stringify({ event: 'crawl_raw_payload_retention_completed', deleted_count: deletedCount }));
      }).catch(() => {
        console.error(JSON.stringify({ event: 'crawl_raw_payload_retention_failed', error_code: 'RAW_PAYLOAD_RETENTION_FAILED' }));
      });
    });
  }

  async reloadJobs(): Promise<void> {
    const assignments = await this.repository.listScheduledAssignments();
    const desired = new Map(assignments.map((entry) => [
      `${entry.evaluation_cycle_id}:${entry.crawl_job_definition_id}`,
      entry.default_schedule_cron,
    ]));

    for (const [key, entry] of this.tasks) {
      if (desired.get(key) !== entry.expression) {
        entry.task.stop();
        this.tasks.delete(key);
      }
    }

    for (const [key, expression] of desired) {
      if (this.tasks.has(key)) continue;
      if (!cron.validate(expression)) {
        console.warn(JSON.stringify({ event: 'crawl_schedule_invalid', schedule_key: key }));
        continue;
      }
      const [cycleId, jobId] = key.split(':');
      if (!cycleId || !jobId) continue;
      const task = cron.schedule(expression, () => {
        const now = new Date();
        now.setSeconds(0, 0);
        const windowKey = now.toISOString().slice(0, 16).replace(/[-:T]/g, '');
        void this.crawlJobService.createScheduledExecution(jobId, cycleId, windowKey).catch((error: unknown) => {
          console.error(JSON.stringify({ event: 'crawl_schedule_enqueue_failed', schedule_key: key, error_code: 'SCHEDULE_ENQUEUE_FAILED' }));
          void error;
        });
      });
      this.tasks.set(key, { expression, task });
    }
  }

  stop(): void {
    this.reconcileTask?.stop();
    this.reconcileTask = undefined;
    this.retentionTask?.stop();
    this.retentionTask = undefined;
    for (const entry of this.tasks.values()) entry.task.stop();
    this.tasks.clear();
  }
}