import { Router, RequestHandler } from 'express';
import { Pool } from 'pg';
import { JiraCrawlerController } from './jira-crawler.controller.js';

export function createJiraCrawlerRouter(pool: Pool, jwtMiddleware?: RequestHandler): Router {
  const router = Router();
  const controller = new JiraCrawlerController(pool);

  if (jwtMiddleware) {
    router.use(jwtMiddleware);
  }

  // Init cron scheduler on startup (midnight daily by default)
  controller.initScheduler('0 0 * * *');

  // ── Member info & Review Cadence ──
  // GET /api/collector/jira/members
  router.get('/members', controller.getMembers);
  // PATCH /api/collector/jira/members/:code/cadence
  router.patch('/members/:code/cadence', controller.updateMemberCadence);

  // ── Dynamic Collector Script ──
  // GET /api/collector/jira/script
  router.get('/script', controller.getScriptConfig);
  // PUT /api/collector/jira/script
  router.put('/script', controller.saveScriptConfig);
  // POST /api/collector/jira/script/reset
  router.post('/script/reset', controller.resetScriptConfig);
  // POST /api/collector/jira/script/test
  router.post('/script/test', controller.testScript);

  // ── Batch Job ──
  // POST /api/collector/jira/batch-run  (manual trigger)
  router.post('/batch-run', controller.triggerBatchRun);
  // GET /api/collector/jira/batch-runs  (list all runs)
  router.get('/batch-runs', controller.getBatchRuns);
  // GET /api/collector/jira/batch-runs/:id  (single run detail)
  router.get('/batch-runs/:id', controller.getBatchRunDetail);
  // GET /api/collector/jira/batch-runs/:runId/member/:employeeCode
  router.get('/batch-runs/:runId/member/:employeeCode', controller.getMemberRunDetail);
  // GET /api/collector/jira/batch-schedule (get auto-collect schedule info)
  router.get('/batch-schedule', controller.getBatchSchedule);
  // PUT /api/collector/jira/batch-cron  (update cron expression)
  router.put('/batch-cron', controller.updateBatchCron);
  // POST /api/collector/jira/members/:code/apply-batch  (apply single member result to DB)
  router.post('/members/:code/apply-batch', controller.applyBatchMemberResult);

  // ── Legacy single-member (kept for backward compat) ──
  // POST /api/collector/jira/evaluate
  router.post('/evaluate', controller.evaluateMember);
  // POST /api/collector/jira/apply
  router.post('/apply', controller.applyMemberKpis);
  // GET /api/collector/jira/payload-export
  router.get('/payload-export', controller.getPreScoredPayload);

  return router;
}
