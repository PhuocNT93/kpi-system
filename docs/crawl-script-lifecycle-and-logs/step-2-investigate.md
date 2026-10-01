# Step 2: Investigate

Status: reconstructed from approved response

## Deliverable

### Repository State
- Current branch: `feature/crawl-job-tabs` at commit `13ce3002e69c4f2ba400fcaf7832d7faea580d93`.
- Backend runs with Node.js/TypeScript & Express, PostgreSQL with node-pg-migrate, and Isolated-VM V8 sandbox.
- Frontend runs with React 19, TanStack Query, and Lucide icons.

### Components Examined
- `backend/migrations/1792000000003_add_crawl_job_execution.ts`:
  - Check constraint on `crawl_script_version.status` only allows DRAFT, PUBLISHED, DEPRECATED. Need to add DISABLED.
  - `crawl_job_execution.crawl_script_version_id` is NOT NULL and lacks ON DELETE SET NULL.
- `backend/src/modules/crawl-job/infrastructure/postgres-crawl-job.repository.ts`:
  - Contains `deleteScriptVersion`. Needs `setScriptStatus`.
- `backend/src/modules/crawl-job/application/crawl-job.service.ts`:
  - Needs `disableScriptVersion` and `enableScriptVersion`. Needs validation in job creation/run for disabled scripts.
- `backend/src/modules/crawl-job/application/crawl-sandbox.service.ts`:
  - Currently no log forwarding. Needs `__logReference` and `console.log` injection.
- `backend/src/modules/crawl-job/application/crawl-execution-worker.service.ts`:
  - Needs step-by-step logging for API requests/responses, employee matching, and data staging.
- `frontend/src/features/crawl-jobs/components/CrawlConfigurationTab.tsx` & `CrawlJobsPage.tsx`:
  - Add Disable/Enable/Delete buttons and badge. Enhance log viewer with step badges.
