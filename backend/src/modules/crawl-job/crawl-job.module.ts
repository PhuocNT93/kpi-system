import { Pool } from 'pg';
import { Router, RequestHandler } from 'express';
import { AuditService } from '../audit/application/audit.service.js';
import { CrawlJobService } from './application/crawl-job.service.js';
import { CrawlJobController } from './api/crawl-job.controller.js';
import { createCrawlJobRouter } from './api/crawl-job.router.js';
import { PostgresCrawlJobRepository } from './infrastructure/postgres-crawl-job.repository.js';
import { CrawlSchedulerService } from './application/crawl-scheduler.service.js';
import { PostgresEvaluationDataImportRepository } from '../evaluation-data-import/infrastructure/postgres-evaluation-data-import.repository.js';
import { CrawlExecutionWorkerService } from './application/crawl-execution-worker.service.js';
import { CrawlSandboxService } from './application/crawl-sandbox.service.js';
import { CrawlSourceClient } from './application/crawl-source-client.js';
import { CrawlStagingService } from './application/crawl-staging.service.js';
import { CrawlWorkerRunner } from './application/crawl-worker-runner.js';
import { GeminiScoringClient } from './application/gemini-scoring-client.js';
import { CrawlScoringWorkerService } from './application/crawl-scoring-worker.service.js';
import { CrawlSourceSystemService } from './application/crawl-source-system.service.js';
import { KpiScoringPromptService } from './application/kpi-scoring-prompt.service.js';
import { CrawlScoringService } from './application/crawl-scoring.service.js';
import { CrawlSourceSystemController } from './api/crawl-source-system.controller.js';
import { KpiScoringPromptController } from './api/kpi-scoring-prompt.controller.js';
import { CrawlScoringController } from './api/crawl-scoring.controller.js';

export interface CrawlJobModule {
  repository: PostgresCrawlJobRepository;
  service: CrawlJobService;
  controller: CrawlJobController;
  router: Router;
  scheduler: CrawlSchedulerService;
  workerRunner: CrawlWorkerRunner;
  scoringWorker: CrawlScoringWorkerService;
  sourceSystemService: CrawlSourceSystemService;
  promptService: KpiScoringPromptService;
  scoringService: CrawlScoringService;
}

export function createCrawlJobModule(
  pool: Pool,
  auditService: AuditService,
  jwtMiddleware: RequestHandler
): CrawlJobModule {
  const repository = new PostgresCrawlJobRepository(pool);
  const service = new CrawlJobService(pool, repository, auditService);
  const scheduler = new CrawlSchedulerService(repository, service);
  service.attachScheduleRefresh(() => { void scheduler.reloadJobs(); });
  if (process.env.NODE_ENV !== 'test') {
    void scheduler.start().catch((error: unknown) => {
      console.error(JSON.stringify({ event: 'crawl_scheduler_start_failed', error_code: 'SCHEDULER_START_FAILED' }));
      void error;
    });
  }

  const geminiClient = new GeminiScoringClient();
  const scoringWorker = new CrawlScoringWorkerService(pool, geminiClient);
  if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_IN_PROCESS_CRAWL_WORKER !== 'true') {
    scoringWorker.start();
  }

  const importRepository = new PostgresEvaluationDataImportRepository(pool);
  const workerService = new CrawlExecutionWorkerService(
    repository,
    service,
    new CrawlStagingService(pool),
    importRepository,
    new CrawlSandboxService(),
    new CrawlSourceClient(),
    scoringWorker
  );
  const workerRunner = new CrawlWorkerRunner(service, workerService);
  if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_IN_PROCESS_CRAWL_WORKER !== 'true') {
    workerRunner.start();
  }

  const sourceSystemService = new CrawlSourceSystemService(pool, repository, auditService);
  const promptService = new KpiScoringPromptService(pool, repository, auditService);
  const scoringService = new CrawlScoringService(pool, repository, geminiClient, auditService);

  const controller = new CrawlJobController(service);
  const sourceSystemController = new CrawlSourceSystemController(sourceSystemService);
  const promptController = new KpiScoringPromptController(promptService, scoringService);
  const scoringController = new CrawlScoringController(scoringService);

  const router = createCrawlJobRouter(controller, jwtMiddleware, {
    sourceSystemController,
    promptController,
    scoringController,
  });

  return {
    repository,
    service,
    controller,
    router,
    scheduler,
    workerRunner,
    scoringWorker,
    sourceSystemService,
    promptService,
    scoringService,
  };
}