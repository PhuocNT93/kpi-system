import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createDatabasePool } from '../../shared/database/database.js';
import { createAuditModule } from '../audit/audit.module.js';
import { PostgresEvaluationDataImportRepository } from '../evaluation-data-import/infrastructure/postgres-evaluation-data-import.repository.js';
import { CrawlJobService } from './application/crawl-job.service.js';
import { CrawlExecutionWorkerService } from './application/crawl-execution-worker.service.js';
import { CrawlSandboxService } from './application/crawl-sandbox.service.js';
import { CrawlSourceClient } from './application/crawl-source-client.js';
import { CrawlStagingService } from './application/crawl-staging.service.js';
import { PostgresCrawlJobRepository } from './infrastructure/postgres-crawl-job.repository.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '../../../../.env') });
dotenv.config({ path: path.resolve(currentDirectory, '../../../.env') });
dotenv.config();

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for the Crawl worker.');

const pollIntervalMs = Math.min(Math.max(Number(process.env.CRAWL_WORKER_POLL_INTERVAL_MS ?? 1000), 100), 10_000);
const leaseMs = Math.min(Math.max(Number(process.env.CRAWL_WORKER_LEASE_MS ?? 60_000), 15_000), 300_000);
const workerId = `${process.env.HOSTNAME ?? 'crawl-worker'}:${process.pid}:${randomUUID()}`;
import { CrawlWorkerRunner } from './application/crawl-worker-runner.js';

const pool = createDatabasePool();
const auditModule = createAuditModule(pool);
const repository = new PostgresCrawlJobRepository(pool);
const importRepository = new PostgresEvaluationDataImportRepository(pool);
const crawlJobService = new CrawlJobService(pool, repository, auditModule.auditService);
const workerService = new CrawlExecutionWorkerService(
  repository,
  crawlJobService,
  new CrawlStagingService(pool),
  importRepository,
  new CrawlSandboxService(),
  new CrawlSourceClient()
);

const runner = new CrawlWorkerRunner(crawlJobService, workerService, {
  workerId,
  pollIntervalMs,
  leaseMs,
});

async function shutdown(): Promise<void> {
  await runner.stop();
  await pool.end();
}

process.once('SIGTERM', () => { void shutdown(); });
process.once('SIGINT', () => { void shutdown(); });
runner.start();