# Step 6: Implementation Documentation

## Module: Automated KPI Crawl + Row-Level AI Scoring + Human Review

### 1. Executive Summary
The end-to-end implementation of the **Automated KPI Crawl + Row-Level AI Scoring + Human Review System** has been fully realized across both Backend and Frontend, strictly adhering to the MASTER IMPLEMENTATION PROMPT requirements and the architectural separation between Data Acquisition and AI Evaluation.

---

### 2. Core Architectural Principles Enforced

| Principle | Implementation Detail |
|---|---|
| **Separation of Concerns** | Crawl Jobs and scripts (`isolated-vm` sandbox) only connect to sources, fetch raw data, and normalize it into `evaluation_data_import_record`. They contain **zero** Gemini API calls and **zero** score calculations. |
| **1 Raw Row = 1 AI Scoring Unit** | Each normalized raw row staged creates exactly one independent scoring execution task in `crawl_scoring_execution` (`UNIQUE(crawl_data_row_id)`). |
| **Asynchronous Decoupling** | Crawl jobs finish immediately upon staging raw rows; they do not wait for Gemini scoring. |
| **PostgreSQL Queue Only** | Scoring tasks are enqueued into PostgreSQL and claimed by worker threads using `SELECT ... FOR UPDATE SKIP LOCKED` (no Redis/BullMQ). |
| **Immutability** | Published scripts and prompt versions are immutable with SHA-256 checksum tracking. Updates generate new versions. |
| **Independent Scoring Retries** | Retrying a failed score task operates strictly on the already-persisted raw row data without re-crawling the external source system. |
| **Human Review Gate** | AI scores remain in `PENDING_REVIEW` until approved, adjusted, or rejected. Minimum 20 characters required for reviewer rationale on Adjust or Reject. Only approved scores apply to `evaluation_item`. |
| **Dynamic Source Registry** | Source systems are registered in `crawl_source_system` with strict allowed domains for SSRF defense. |

---

### 3. Database Schema (`backend/migrations/1792000000005_add_row_level_scoring_and_source_systems.ts`)

1. **`crawl_source_system` Table**:
   - `id UUID PRIMARY KEY`, `code VARCHAR(50) UNIQUE`, `name VARCHAR(200)`, `description TEXT`
   - `authentication_type VARCHAR(50)`, `allowed_domains TEXT[]`, `enabled BOOLEAN`
   - Default seeded connectors: `JIRA`, `BLUEPRINT`, `GOOGLE_SHEET`, `GITLAB`.

2. **`kpi_scoring_prompt` & `kpi_scoring_prompt_version` Tables**:
   - Manages prompt templates, versioning, author, changelog, and SHA-256 checksums.
   - Initial published prompts seeded: `PROMPT_JIRA_TASK_COMPLETION` (v1) and `PROMPT_BP_ONTIME_RATE` (v1).

3. **`crawl_scoring_execution` Table**:
   - Foreign keys to `crawl_job_execution_id`, `crawl_data_row_id` (unique constraint), `kpi_scoring_prompt_version_id`.
   - AI output fields: `status`, `score`, `reasoning`, `confidence`, `input_payload_snapshot`, `output_payload_snapshot`.
   - Human review gate fields: `review_status`, `final_score`, `reviewer_id`, `review_comment`, `reviewed_at`, `applied_at`.

4. **`audit_log` Table Fix**:
   - Column lengths for `action` and `source` expanded from `VARCHAR(20)` to `VARCHAR(50)` to support granular audit actions (e.g. `CRAWL_SCRIPT_PUBLISHED`, `KPI_PROMPT_VERSION_PUBLISHED`).

---

### 4. Backend Implementation

- **`GeminiScoringClient` (`gemini-scoring-client.ts`)**:
  - Direct REST integration with Google Generative Language API.
  - Sliding-window concurrency limiter, exponential backoff for rate limits, deterministic response schema parsing, and offline heuristic fallback.
- **`CrawlScoringWorkerService` (`crawl-scoring-worker.service.ts`)**:
  - Background worker with `FOR UPDATE SKIP LOCKED` task claim loop.
  - Formats raw row payloads into prompt templates, invokes Gemini, validates 1.0–5.0 bounds, records metrics and execution snapshots.
- **`CrawlSourceSystemService` (`crawl-source-system.service.ts`)**:
  - Dynamic CRUD for connectors with SSRF domain validation and connectivity ping tester.
- **`KpiScoringPromptService` (`kpi-scoring-prompt.service.ts`)**:
  - Manages prompt drafting, versioning, publishing with SHA-256 checksums, and interactive dry-run testing.
- **`CrawlScoringService` (`crawl-scoring.service.ts`)**:
  - Provides row-level task querying, execution retries, rescoring, prompt sandbox testing, and the complete Human Review workflow (`APPROVE`, `ADJUST`, `REJECT`, `APPLY_TO_EVALUATION`).
- **`CrawlExecutionWorkerService` (`crawl-execution-worker.service.ts`)**:
  - Updated to automatically link and enqueue row-level scoring tasks immediately when raw rows are staged.
- **Controllers & Routing**:
  - Mounted under `/api/crawl-source-systems`, `/api/kpi-scoring-prompts`, `/api/crawl-scoring-executions`.

---

### 5. Frontend Implementation

1. **Tab 1: Crawl Jobs (`jobs`)**:
   - Job definition registry, published script mapping, KPI criterion association, schedule display, and manual trigger modal.
2. **Tab 2: Crawl History (`executions`)**:
   - Execution attempts timeline, status badges, granular log viewer, retry and cancel actions.
3. **Tab 3: Crawl Data & Scores (`review`) - `CrawlDataScoresTab.tsx`**:
   - Summary cards: Total Rows, AI Scored, Review Progress, Applied to KPI.
   - Filter bar: Review Status tabs (All, Pending Review, Approved, Adjusted, Rejected, Applied), Scoring Status, and Employee Code search.
   - Score badges (1-5 color gradient) and visual confidence bar (0-100%).
   - One-click Approve, Adjust Modal (score slider/number + mandatory >= 20 char counter validation), Reject Modal (mandatory >= 20 char counter validation).
   - Apply to Evaluation button and Rescore action.
   - Deep Inspection Drawer with 6 progressive steps:
     1. Raw Data Snapshot
     2. Criterion & Rule Definition
     3. AI Scoring Prompt Version
     4. AI Input Payload
     5. AI Evaluation Output (Score, Reasoning, Confidence)
     6. Human Review History & Audit Record.
4. **Tab 4: Crawl Configuration (`config`) - `CrawlConfigurationTab.tsx`**:
   - **Sub-tab 1: Crawl Scripts**: List scripts, version numbers, checksums, draft/published status, sandbox test-run button, draft creation dialog.
   - **Sub-tab 2: Source Systems Registry**: List connectors, SSRF allowed domains, ping connection test, new source system registration.
   - **Sub-tab 3: AI Scoring Prompts**: List prompts & versions, prompt creation dialog, and interactive dry-run sandbox testing with immediate score and reasoning feedback.
5. **URL Parameter Routing**:
   - Backward-compatible navigation: `?tab=jobs`, `?tab=executions`, `?tab=review`, `?tab=config`, and `?tab=scripts` / `?tab=sources` / `?tab=prompts` (which activates Tab 4 with the specific sub-tab selected).

---

### 6. Database Migration & Seed Data Infrastructure

1. **Migration via `node-pg-migrate` (TypeScript)**:
   - Migration file: [1792000000005_add_row_level_scoring_and_source_systems.ts](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/migrations/1792000000005_add_row_level_scoring_and_source_systems.ts).
   - Executed via `node-pg-migrate` without relying on standalone raw SQL files.
   - Creates all tables (`crawl_source_system`, `kpi_scoring_prompt`, `kpi_scoring_prompt_version`, `crawl_scoring_execution`), adds trigger immutability constraints, expands `audit_log` columns, and registers standard initial prompts.

2. **Sample Seed Script (`seed-crawl-job-samples.ts`)**:
   - Location: [seed-crawl-job-samples.ts](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/crawl-job/infrastructure/seed-crawl-job-samples.ts).
   - **OPEN Cycle Binding**: Queries the database dynamically for the currently active cycle with `status = 'OPEN'` (`H2-2026`) and injects it as the default target cycle for jobs, crawl scripts, staged rows, and row-level AI scoring tasks.
   - **Default Input Binding in Crawl Execution**:
     - `crawl-execution-worker.service.ts` passes `targetCycle` and `target_cycle` with the crawl job's cycle `{ id, code, name }`.
     - `crawl-job.service.ts` `testRunScript` sandbox dry-run queries the active OPEN cycle dynamically and injects it as `input.targetCycle` and `input.target_cycle`.
     - Both standard crawl scripts (`JIRA_TASK_METRICS_CRAWLER`, `BLUEPRINT_TASK_METRICS_CRAWLER`) read `input.targetCycle` / `input.target_cycle` to attribute raw records and metadata.

---

### 7. Build & Deployment Verification

- **Backend**:
  - TypeScript compilation: Clean (Exit code 0).
  - Deployed to Docker container `kpi-system-backend-1`.
  - Migration & Seed executed: `Using OPEN evaluation cycle: H2-2026`.
  - Endpoint verification script (`verify_new_endpoints.js`): All endpoints return 200 OK.
- **Frontend**:
  - TypeScript typecheck & Vite build: Clean (Exit code 0).
  - Deployed to Docker container `kpi-system-frontend-1`.
  - HTTP verification: Serving `index.html` and bundled assets with 200 OK.

---

### 8. Evaluation Cycle Context — Script Creation Flow (Added)

#### Backend Changes
| File | Change |
|---|---|
| `crawl-job.schemas.ts` | `CreateCrawlJobSchema`: added `evaluation_cycle_id?: uuid`. `CreateCrawlScriptSchema`: added `evaluation_cycle_id`, `criteria_ids`, `name`, `description`. `TestRunCrawlScriptSchema`: added `script_id`, `evaluation_cycle_id`. |
| `crawl-job.service.ts` | `createJob`: validates `status=OPEN` when `evaluation_cycle_id` supplied, auto-inserts into `evaluation_cycle_crawl_job`. `createScriptVersion`: validates cycle is OPEN. `testRunScript`: validates cycle is OPEN, accepts `evaluation_cycle_id`. `assignJobToCycle`: validates cycle is OPEN before enabling. |
| `crawl-job.controller.ts` | `testRunScript`: passes `evaluation_cycle_id` and `script_id` from parsed request into service. |

#### Frontend Changes
| File | Change |
|---|---|
| `crawl-job.types.ts` | `CrawlJobCreatePayload`: `evaluation_cycle_id?`. `CreateCrawlScriptPayload`: `evaluation_cycle_id?`, `criteria_ids?`, `name?`, `description?`. `TestRunScriptPayload`: `script_id?`, `evaluation_cycle_id?`. |
| `CrawlJobsPage.tsx` | `JobFormState`: `evaluationCycleId?`. `openCyclesQuery` always fetches (removed conditional `enabled`). New Job button pre-fills `evaluationCycleId` with first OPEN cycle. `JobDialog`: added `cycles` prop, Evaluation Cycle selector, `[+ Tạo Script mới]` button that opens `ScriptCreationSubModal`. New `ScriptCreationSubModal` component: shows context badges (cycle + source system + inherited criteria), sandbox test, and Publish & auto-select flow. |
| `CrawlConfigurationTab.tsx` | Added `evaluationCycleApi` import, `openCyclesQuery` to fetch active OPEN cycle, displays cycle context banner in script creation dialog, passes `evaluation_cycle_id` to `createScript`. |

#### Business Rules Enforced
- Crawl Scripts **only collect raw data** — zero Gemini calls in sandbox.
- Evaluation Cycle must be **OPEN** on job creation, script creation, test-run, and cycle assignment.
- Published script auto-selected in parent `JobDialog` after `ScriptCreationSubModal` publishes.
- Inherited context (cycle, source system, criteria) clearly displayed with read-only badges.

