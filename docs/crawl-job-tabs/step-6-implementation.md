# Step 6: Implement

Status: completed and ready for user review

## Deliverable

Comprehensive implementation of the Automated KPI Data Crawl Job feature with embedded worker, script management tab, seed samples, and login bug fix.

## Implementation

Changes Made:
- `backend/src/api/routes.ts`: Mounted `crawlJobRouter` after `authRouter` so JWT router middleware does not intercept public `/api/auth/login` and `/api/auth/google`.
- `frontend/src/shared/api/api-client.ts`: Excluded auth endpoints (`/auth/login`, `/auth/google`) and `/login` page from global 401 hard reload to preserve user error feedback.
- `backend/src/modules/crawl-job/application/crawl-worker-runner.ts`: Created an in-process worker runner encapsulating start/stop lifecycle and error handling.
- `backend/src/modules/crawl-job/crawl-job.module.ts`: Integrated `CrawlWorkerRunner` to start in-process when `NODE_ENV !== 'test'`, using PostgreSQL distributed lease locks.
- `backend/src/modules/crawl-job/worker-entry.ts`: Refactored standalone worker entrypoint to reuse `CrawlWorkerRunner`.
- `docker-compose.yml`, `render.develop.yaml`: Removed separate `crawl-worker` container service; configured crawl worker environment variables on the backend API web service.
- `backend/migrations/1792000000004_add_scoring_prompt_to_crawl_script.ts`: Added `scoring_prompt TEXT` column to `crawl_script_version` table.
- `backend/src/modules/crawl-job/domain/crawl-job.schemas.ts`:
  - Added `scoring_prompt` optional field to `CreateCrawlScriptSchema`.
  - Added `TestRunCrawlScriptSchema` with `script_source`, `source_system`, and optional `config`.
- `backend/src/modules/crawl-job/infrastructure/postgres-crawl-job.repository.ts`, `backend/src/modules/crawl-job/application/crawl-job.service.ts`, `backend/src/modules/crawl-job/api/crawl-job.controller.ts`, `backend/src/modules/crawl-job/api/crawl-job.router.ts`:
  - Updated `listPublishedScripts` and `createScriptVersion` to persist and return `scoring_prompt`.
  - Added `getScriptVersion` repository method.
  - Implemented `testRunScript` service method executing scripts in sandbox with mock source system responses (Jira/Blueprint) and record schema validation.
  - Added endpoints `POST /api/crawl-scripts/test-run` (dry-run unsaved source code) and `POST /api/crawl-scripts/:scriptVersionId/test-run` (dry-run registered script version).
  - Added `SYSTEM_ADMIN` alongside `HR_ADMIN` to `CRAWL_ADMIN_ROLES` for script draft creation, test-running, and publishing.
- `backend/src/modules/crawl-job/infrastructure/seed-crawl-job-samples.ts`:
  - Seeded sample credentials (`CRED_JIRA_PROD`, `CRED_BLUEPRINT_PROD`), KPI criteria (`CRIT_JIRA_TASK_COMPLETION`, `CRIT_JIRA_BUG_COUNT`, `CRIT_BP_TASK_ONTIME_RATE`, `CRIT_BP_DELAYED_HOURS`).
  - Seeded published scripts (`JIRA_TASK_METRICS_CRAWLER`, `BLUEPRINT_TASK_METRICS_CRAWLER`) complete with rich AI scoring prompts.
  - Added script `"seed:crawl-samples"` to `backend/package.json`.
- `frontend/src/features/crawl-jobs/api/crawl-job.types.ts`: Added `scoring_prompt` to `CrawlScriptItem` and `CreateCrawlScriptPayload`, added `TestRunScriptPayload` and `TestRunScriptResult` interfaces.
- `frontend/src/features/crawl-jobs/api/crawl-job-api.ts`: Added `listScripts`, `createScript`, `publishScript`, and `testRunScript` methods.
- `frontend/src/features/crawl-jobs/pages/CrawlJobsPage.tsx`:
  - Added 4th tab: **Crawl Scripts** with `FileCode` icon, available to `HR_ADMIN` and `SYSTEM_ADMIN`.
  - Upgraded top page header banner with system design tokens (`RADII.xl`, `SHADOWS.sm`), title eyebrow badge (`AUTOMATED KPI INTEGRATION & CRAWLER`), and 3 top metric statistics summary cards: Crawl Jobs (active/total), Crawl Scripts count, and Staged Review Batches.
  - Script table displays Code, Version, Source, Status, **Scoring Prompt preview banner**, Checksum, Created/Published dates, and 5 comprehensive action buttons:
    - **Test Run** (Play icon): executes live dry-run in sandbox with record count & JSON output.
    - **Inspect Details** (Eye icon): opens `InspectScriptModal` with formatted JavaScript source code viewer, copy code button, AI scoring prompt viewer with copy button, and direct test-run button.
    - **Edit Draft** (Edit2 icon): opens `ScriptEditorDialog` in edit mode to modify JavaScript source code and AI scoring prompt with live sandbox test validation.
    - **Publish** (UploadCloud icon): publishes draft script version to make it available for production crawl jobs.
    - **Delete Draft** (Trash2 icon): deletes draft script version with confirmation dialog (prevented if already attached to a crawl job).
  - Added `ScriptEditorDialog` supporting both registration and editing of draft scripts.
  - Added `InspectScriptModal` for reading full script source and AI scoring prompts.
  - Production source integration scripts:
    - **JIRA**: Real-world integration querying `/rest/api/2/search` (POST or GET) with JQL and pagination, parsing issues, and extracting Task Completion (`CRIT_JIRA_TASK_COMPLETION`) and Bug Count (`CRIT_JIRA_BUG_COUNT`) per assignee.
    - **BLUEPRINT**: Real-world integration querying Blueprint PIM `/api/uiPim001/searchRequirement` (POST) with project ID (`PJT20190724000000001` Allegro NX), parsing `lstReq`, and extracting Task On-time Rate (`CRIT_BP_TASK_ONTIME_RATE`) and Delayed Hours (`CRIT_BP_DELAY_HOURS`).
  - Added **TestScriptModal**: runs dry-run on existing scripts, displays execution duration (ms), record count, and formatted JSON output records.
  - Scoring Prompt Template Section: 3 predefined prompt templates (Mức 1: Dễ, Mức 2: Vừa, Mức 3: Khó), clickable tag insertion buttons (`{{taskKey}}`, `{{taskSummary}}`, etc.), and live editable prompt textarea.
  - Implemented automatic KPI criteria suggestion/selection in **JobDialog** when selecting a published script.
  - Connected Tab **Crawl Scripts** (`?tab=scripts`) directly to Tab **Crawl Jobs** (`?tab=jobs`):
    - Added direct **"Dùng tạo Job"** (`Use in Job`) button for every published script in the scripts table, instantly opening JobDialog pre-configured with the script, source system, and matching criteria.
    - Added **"Đăng ký & Publish ngay"** button in `ScriptEditorDialog` to allow single-click registration and publication so the script is immediately available in the Jobs tab.
    - Added empty-state guidance in `JobDialog`: if no published script exists for the selected source system, displays an alert with a direct link button switching to Tab Scripts to register one.
- `frontend/src/features/crawl-jobs/pages/CrawlJobsPage.tsx`:
  - Added Evaluation Cycle dropdown filter (`cycleFilter`) in Crawl Jobs toolbar, passing `cycleId` to `crawlJobApi.listJobs`.
  - Added dedicated **Cycle** column to the Crawl Jobs table displaying `job.evaluation_cycle_code`.
  - Updated `startEdit`, `RunDialog`, and `CycleAssignmentDialog` to automatically inherit and pre-select the job's assigned Evaluation Cycle.
  - Replaced legacy mock templates with production-grade `getLiveCollectorTemplate` supporting pure raw data collection from live Jira and Blueprint endpoints with zero Gemini calls.
- `frontend/src/features/crawl-jobs/components/CrawlConfigurationTab.tsx`:
  - Integrated Evaluation Cycle context selector in the Script Draft registration modal, dynamically providing inherited cycle context.
  - Replaced fake `EMP001` template with dynamic live collector templates based on selected source system (`JIRA` vs `BLUEPRINT`).
- `backend/src/modules/crawl-job/infrastructure/postgres-crawl-job.repository.ts`, `crawl-job.service.ts`, `crawl-job.controller.ts`:
  - Added Evaluation Cycle joins (`evaluation_cycle_crawl_job` + `evaluation_cycle`) to `listJobs` and `getJob`.
  - Added `cycleId` query parameter support in `GET /api/crawl-jobs` for targeted cycle filtering.
- `backend/src/modules/crawl-job/infrastructure/seed-crawl-job-samples.ts`:
  - Seeded Version 2 of both Jira and Blueprint scripts with real query structures (`/rest/api/2/search` and `/api/uiPim001/searchRequirement`).
  - Successfully verified live test runs against CyberLogitec Jira (120 real records) and Blueprint (5 real records).
- Strict adherence to common CSS:
  - Ensured no fixed `crawl-jobs-page.css` file is created or referenced; all styling utilizes shared classes in `frontend/src/index.css`.

Decisions Applied:
- The crawl worker runs directly in-process within the backend API server process using PostgreSQL `FOR UPDATE SKIP LOCKED` and claim leases; no separate worker process or container is required.
- PostgreSQL `crawl_job_execution` is the sole authoritative queue and history store; no Redis or BullMQ.
- Script authoring produces a `DRAFT` record, which can be reviewed, edited, test-run, published, or deleted. Once published, it becomes immutable for audit and historical execution safety.
- Interactive dry-run testing executes code safely in an isolated sandbox (`isolated-vm` / `CrawlSandboxService`) before saving or publishing, preventing faulty scripts from polluting job runs.
- Scoring prompts are saved with script versions and include configurable templates and variables for downstream AI scoring pipelines.
- Crawl scripts perform 100% pure raw data collection with zero AI scoring logic; row-level AI scoring is handled downstream via `kpi_scoring_prompt` and `gemini-2.5-flash`.

## Actions and Evidence
- Verified backend authentication: successfully logged in with `hradmin@kpi.com` and received valid JWT token.
- Executed PostgreSQL migration: `ALTER TABLE crawl_script_version ADD COLUMN IF NOT EXISTS scoring_prompt TEXT;`.
- Seeded samples into PostgreSQL: 2 connector credentials, 4 KPI criteria, and 2 published scripts (Version 2) with scoring prompts and real Jira / Blueprint structure.
- Verified live dry-run execution: tested `POST /api/crawl-scripts/d0000000-0000-0000-0000-000000000011/test-run` (Jira) returning 120 real records and `POST /api/crawl-scripts/d0000000-0000-0000-0000-000000000012/test-run` (Blueprint) returning 5 real records.
- Verified backend crawl-job Vitest suite: 7 test files passed, 21 tests passed (100%).
- Verified frontend crawl-jobs Vitest suite: `CrawlJobsPage.test.tsx` passed (100%).
- Verified frontend typecheck & production build: `tsc --noEmit` and `npm run build` passed with 0 errors.
- Verified backend typecheck & production build: `tsc --noEmit` and `npm run build` passed with 0 errors.
- Synchronized frontend production build into Docker container `kpi-system-frontend-1` and backend into `kpi-system-backend-1`.

## Next Step
- Step 7: Verify (run end-to-end checks, verify against all acceptance criteria, and package final documentation).