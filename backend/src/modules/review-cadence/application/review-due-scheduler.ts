import cron, { ScheduledTask } from 'node-cron';
import { ReviewDueService } from './review-due.service.js';

export class ReviewDueScheduler {
  private scheduledTask: ScheduledTask | null = null;
  private readonly cronExpression: string;

  constructor(
    private readonly reviewDueService: ReviewDueService,
    cronExpression: string = '0 0 * * *' // Daily at midnight
  ) {
    this.cronExpression = cronExpression;
  }

  public start(): void {
    if (this.scheduledTask) {
      this.stop();
    }

    if (!cron.validate(this.cronExpression)) {
      console.warn(`[ReviewDueScheduler] Invalid cron expression: "${this.cronExpression}". Scheduler not started.`);
      return;
    }

    this.scheduledTask = cron.schedule(this.cronExpression, async () => {
      console.log('[ReviewDueScheduler] Executing daily review due refresh...');
      try {
        const result = await this.triggerNow();
        console.log(`[ReviewDueScheduler] Daily review due refresh completed: ${result.processedCount} employees verified.`);
      } catch (err) {
        console.error('[ReviewDueScheduler] Error executing review due refresh:', err);
      }
    });

    console.log(`[ReviewDueScheduler] Started review due scheduler with schedule: "${this.cronExpression}"`);
  }

  public async triggerNow(): Promise<{ processedCount: number; timestamp: Date }> {
    return this.reviewDueService.refreshReviewDueState();
  }

  public stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      console.log('[ReviewDueScheduler] Stopped review due scheduler.');
    }
  }
}
