# Step 2: Investigate

Status: reconstructed from approved response

## Deliverable

### Code Locations
- **Database Migrations & Schemas**:
  - `backend/migrations/1788926000013_add_kpi_import_comment_evidence.ts`: Defines `evaluation_data_import` and `evaluation_data_import_record` (the staging tables storing raw crawl rows).
  - `backend/migrations/1792000000003_add_crawl_job_execution.ts`: Defines `crawl_script_version`, `connector_credential`, `crawl_job_definition`, and `crawl_job_execution`.
  - `backend/migrations/1792000000004_add_scoring_prompt_to_crawl_script.ts`: Added `scoring_prompt` column to `crawl_script_version`.
- **Crawl Execution & Worker**:
  - `backend/src/modules/crawl-job/application/crawl-execution-worker.service.ts`: Executes sandboxed crawl scripts, stages rows via `CrawlStagingService`, and finishes crawl execution.
  - `backend/src/modules/crawl-job/application/crawl-worker-runner.ts`: In-process background runner claiming queued executions using PostgreSQL transactional locking (`FOR UPDATE SKIP LOCKED`).
  - `backend/src/modules/crawl-job/application/crawl-staging.service.ts`: Normalizes, validates, and stages raw rows into `evaluation_data_import_record`.
- **Gemini Integration Reference**:
  - `backend/src/modules/jira-crawler/ai-evaluator.ts`: Existing reference for invoking Google Generative Language API with JSON structured output and rate-limiting.
- **Frontend Crawl Management**:
  - `frontend/src/features/crawl-jobs/pages/CrawlJobsPage.tsx`: Existing tabs (`jobs`, `executions`, `review`, `scripts`).
  - `frontend/src/features/crawl-jobs/api/crawl-job-api.ts` & `crawl-job.types.ts`: API client and contract interfaces.

### Current Behavior
1. **Crawl Execution Stops at Staging**: After running a crawl script, the worker validates rows and inserts them into `evaluation_data_import_record`, then immediately transitions the crawl execution to `SUCCESS` or `PARTIAL_SUCCESS`.
2. **Missing Asynchronous Row-Level AI Scoring Queue**: There is currently no `crawl_scoring_execution` table or row-level scoring worker to asynchronously pick each raw row and evaluate it with Gemini.
3. **Hardcoded Source Systems**: `source_system` is currently constrained to `CHECK (source_system IN ('BLUEPRINT', 'JIRA', 'GOOGLE_SHEET'))` in several tables rather than referencing an extensible `crawl_source_system` registry table.
4. **Prompt Linked to Script Instead of Independent Versioned Entity**: AI Scoring Prompts are currently stored as a text field inside `crawl_script_version`, whereas the master prompt requires independent `kpi_scoring_prompt` and `kpi_scoring_prompt_version` entities with immutable versioning and dry-run testing against existing crawl rows.
5. **Frontend Tabs Layout**: Tabs currently show Jobs, Executions, Review, and Scripts instead of the 4 master areas.

### Proposed Changes
1. **Database Migration (`1792000000005_add_row_level_scoring_and_source_systems.ts`)**:
   - Create `crawl_source_system` table.
   - Create `kpi_scoring_prompt` and `kpi_scoring_prompt_version` tables.
   - Create `crawl_scoring_execution` table (one task per `evaluation_data_import_record` with `UNIQUE(crawl_data_row_id)`).
   - Seed default source systems (`JIRA`, `BLUEPRINT`, `GOOGLE_SHEET`, `GITLAB`).
2. **Backend Domain & Services**:
   - `CrawlSourceSystemService`: CRUD, enable/disable, test-connection, and domain allowlist resolution.
   - `KpiScoringPromptService`: CRUD, immutable versioning, template rendering, and dry-run testing against real crawl rows.
   - `CrawlScoringService` & `CrawlScoringWorker`: Claims tasks via `FOR UPDATE SKIP LOCKED`, calls Gemini, validates scores/rationale, and isolates errors per row.
   - Update `CrawlExecutionWorkerService`: Automatically enqueues `crawl_scoring_execution` tasks upon raw row staging.
   - Update human review adjustments and evaluation item application.
3. **Backend API Endpoints**:
   - `/api/crawl-source-systems`, `/api/kpi-scoring-prompts`, `/api/crawl-scoring-executions`.
4. **Frontend Architecture**:
   - Refactor `CrawlJobsPage.tsx` into the 4 Master Tabs.

### Potential Risks / Edge Cases
- Gemini Rate Limits (429 HTTP): Throttle and exponential backoff required.
- Row-Level Fault Isolation: Task failure on row #3 must not invalidate rows 1, 2, 4 or crawl batch.
- Compatibility with existing `evaluation_data_import_record` and downstream evaluation workflows.

## Next Step
- Step 3: Impact Analysis
