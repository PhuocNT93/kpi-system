import { NextFunction, RequestHandler, Response, Router } from 'express';
import { CrawlJobController } from './crawl-job.controller.js';
import { CrawlSourceSystemController } from './crawl-source-system.controller.js';
import { KpiScoringPromptController } from './kpi-scoring-prompt.controller.js';
import { CrawlScoringController } from './crawl-scoring.controller.js';

export function createCrawlJobRouter(
  controller: CrawlJobController,
  jwtMiddleware: RequestHandler,
  extraControllers?: {
    sourceSystemController?: CrawlSourceSystemController;
    promptController?: KpiScoringPromptController;
    scoringController?: CrawlScoringController;
  }
): Router {
  const router = Router();
  router.use(jwtMiddleware);
  const run = (action: (req: Parameters<RequestHandler>[0], res: Response) => Promise<void>): RequestHandler =>
    (req, res, next: NextFunction) => { action(req, res).catch(next); };

  // Scripts
  router.get('/crawl-scripts', run((req, res) => controller.listPublishedScripts(req, res)));
  router.post('/crawl-scripts', run((req, res) => controller.createCrawlScript(req, res)));
  router.get('/crawl-scripts/:scriptVersionId', run((req, res) => controller.getCrawlScript(req, res)));
  router.put('/crawl-scripts/:scriptVersionId', run((req, res) => controller.updateCrawlScript(req, res)));
  router.delete('/crawl-scripts/:scriptVersionId', run((req, res) => controller.deleteCrawlScript(req, res)));
  router.post('/crawl-scripts/test-run', run((req, res) => controller.testRunScript(req, res)));
  router.post('/crawl-scripts/:scriptVersionId/test-run', run((req, res) => controller.testRunScript(req, res)));
  router.post('/crawl-scripts/:scriptVersionId/publish', run((req, res) => controller.publishCrawlScript(req, res)));
  router.post('/crawl-scripts/:scriptVersionId/disable', run((req, res) => controller.disableCrawlScript(req, res)));
  router.post('/crawl-scripts/:scriptVersionId/enable', run((req, res) => controller.enableCrawlScript(req, res)));

  // Connector credentials
  router.get('/connector-credentials', run((req, res) => controller.listCredentialReferences(req, res)));
  router.post('/connector-credentials', run((req, res) => controller.createCredentialReference(req, res)));

  // Crawl Jobs & Executions
  router.get('/crawl-jobs', run((req, res) => controller.listJobs(req, res)));
  router.post('/crawl-jobs', run((req, res) => controller.createJob(req, res)));
  router.get('/crawl-jobs/:id', run((req, res) => controller.getJob(req, res)));
  router.patch('/crawl-jobs/:id', run((req, res) => controller.updateJob(req, res)));
  router.delete('/crawl-jobs/:id', run((req, res) => controller.deleteJob(req, res)));
  router.post('/crawl-jobs/:id/enable', run((req, res) => controller.setEnabled(req, res, true)));
  router.post('/crawl-jobs/:id/disable', run((req, res) => controller.setEnabled(req, res, false)));
  router.get('/evaluation-cycles/:cycleId/crawl-jobs', run((req, res) => controller.listCycleJobs(req, res)));
  router.put('/evaluation-cycles/:cycleId/crawl-jobs/:jobId', run((req, res) => controller.assignJobToCycle(req, res)));
  router.post('/crawl-jobs/:id/executions', run((req, res) => controller.createExecution(req, res)));
  router.get('/crawl-jobs/:id/executions', run((req, res) => controller.listExecutions(req, res)));
  router.get('/crawl-executions/:executionId', run((req, res) => controller.getExecution(req, res)));
  router.get('/crawl-executions/:executionId/records', run((req, res) => controller.listExecutionRecords(req, res)));
  router.get('/crawl-executions/:executionId/logs', run((req, res) => controller.listExecutionLogs(req, res)));
  router.post('/crawl-executions/:executionId/retry', run((req, res) => controller.retryExecution(req, res)));
  router.post('/crawl-executions/:executionId/cancel', run((req, res) => controller.cancelExecution(req, res)));

  // Source Systems
  if (extraControllers?.sourceSystemController) {
    const ssc = extraControllers.sourceSystemController;
    router.get('/crawl-source-systems', run((req, res) => ssc.listSourceSystems(req, res)));
    router.post('/crawl-source-systems', run((req, res) => ssc.createSourceSystem(req, res)));
    router.get('/crawl-source-systems/:id', run((req, res) => ssc.getSourceSystem(req, res)));
    router.put('/crawl-source-systems/:id', run((req, res) => ssc.updateSourceSystem(req, res)));
    router.delete('/crawl-source-systems/:id', run((req, res) => ssc.deleteSourceSystem(req, res)));
    router.post('/crawl-source-systems/:id/test-connection', run((req, res) => ssc.testConnection(req, res)));
  }

  // KPI Scoring Prompts
  if (extraControllers?.promptController) {
    const pc = extraControllers.promptController;
    router.get('/kpi-scoring-prompts', run((req, res) => pc.listPrompts(req, res)));
    router.post('/kpi-scoring-prompts', run((req, res) => pc.createPrompt(req, res)));
    router.get('/kpi-scoring-prompts/:promptId', run((req, res) => pc.getPrompt(req, res)));
    router.put('/kpi-scoring-prompts/:promptId', run((req, res) => pc.updatePrompt(req, res)));
    router.delete('/kpi-scoring-prompts/:promptId', run((req, res) => pc.deletePrompt(req, res)));
    router.get('/kpi-scoring-prompts/:promptId/versions', run((req, res) => pc.listPromptVersions(req, res)));
    router.post('/kpi-scoring-prompts/:promptId/versions', run((req, res) => pc.createPromptVersion(req, res)));
    router.post('/kpi-scoring-prompts/:promptId/versions/:versionId/publish', run((req, res) => pc.publishPromptVersion(req, res)));
    router.post('/kpi-scoring-prompts/test-dry-run', run((req, res) => pc.testDryRun(req, res)));
  }

  // Row-Level Scoring Executions & Human Review Gate
  if (extraControllers?.scoringController) {
    const sc = extraControllers.scoringController;
    router.get('/crawl-scoring-executions', run((req, res) => sc.listScoringExecutions(req, res)));
    router.get('/crawl-scoring-executions/:id', run((req, res) => sc.getScoringExecution(req, res)));
    router.post('/crawl-scoring-executions/:id/retry', run((req, res) => sc.retryScoringExecution(req, res)));
    router.post('/crawl-scoring-executions/rescore-row/:rowId', run((req, res) => sc.rescoreRow(req, res)));
    router.post('/crawl-data/:rowId/rescore', run((req, res) => sc.rescoreRow(req, res)));
    router.post('/crawl-scoring-executions/:id/review', run((req, res) => sc.reviewExecution(req, res)));
    router.post('/crawl-scoring-executions/:id/apply', run((req, res) => sc.applyToEvaluation(req, res)));
  }

  return router;
}