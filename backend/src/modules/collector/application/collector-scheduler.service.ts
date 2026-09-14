import cron, { ScheduledTask } from 'node-cron';
import { CollectorService } from './collector.service.js';

export class CollectorSchedulerService {
  private activeCronTasks: Map<string, ScheduledTask> = new Map();

  constructor(private collectorService: CollectorService) {}

  public async start(): Promise<void> {
    console.log('[CollectorScheduler] Initializing scheduled collector jobs...');
    await this.reloadJobs();
  }

  public async reloadJobs(): Promise<void> {
    // Stop and clear existing cron tasks
    for (const [jobId, task] of this.activeCronTasks.entries()) {
      task.stop();
      this.activeCronTasks.delete(jobId);
    }

    try {
      const jobs = await this.collectorService.listJobs();
      const activeJobs = jobs.filter((j) => j.is_active && j.cron_expression);

      for (const job of activeJobs) {
        if (!cron.validate(job.cron_expression!)) {
          console.warn(`[CollectorScheduler] Invalid cron expression '${job.cron_expression}' for job '${job.name}' (${job.id})`);
          continue;
        }

        const task = cron.schedule(job.cron_expression!, async () => {
          console.log(`[CollectorScheduler] Executing scheduled job '${job.name}' (${job.id})...`);
          try {
            const res = await this.collectorService.runJob(job.id);
            if (res.success) {
              console.log(`[CollectorScheduler] Job '${job.name}' completed successfully.`);
            } else {
              console.error(`[CollectorScheduler] Job '${job.name}' failed.`);
            }
          } catch (err) {
            console.error(`[CollectorScheduler] Error executing job '${job.name}':`, err);
          }
        });

        this.activeCronTasks.set(job.id, task);
        console.log(`[CollectorScheduler] Scheduled job '${job.name}' with schedule '${job.cron_expression}'`);
      }
    } catch (err) {
      console.error('[CollectorScheduler] Error loading collector jobs:', err);
    }
  }

  public stop(): void {
    for (const task of this.activeCronTasks.values()) {
      task.stop();
    }
    this.activeCronTasks.clear();
  }
}
