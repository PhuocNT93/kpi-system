# Step 3: Impact Analysis

Status: reconstructed from approved response

## Deliverable

### 1. Affected Components Table

| Component | Impact Level | Description of Impact |
|---|---|---|
| **Database Migrations** | **High** | Introduces 4 new tables: `crawl_source_system`, `kpi_scoring_prompt`, `kpi_scoring_prompt_version`, and `crawl_scoring_execution`. Modifies constraints to allow dynamic source system codes. |
| **Crawl Worker Service** | **High** | Updates `crawl-execution-worker.service.ts` to enqueue row-level tasks into `crawl_scoring_execution` after raw staging, then finishes crawl execution without waiting for Gemini. |
| **Row-Level Scoring Engine** | **High** | New `CrawlScoringWorkerService` and `GeminiScoringClient` claiming tasks via `FOR UPDATE SKIP LOCKED`, loading exact row context + KPI rules + prompt version, calling Gemini API, validating scores/rationale, and storing snapshots. |
| **Prompt & Source Management** | **Medium** | New application services and repositories for `crawl_source_system` and `kpi_scoring_prompt`. |
| **Evaluation Import & Human Review** | **Medium** | Reuses existing `evaluation_data_import_record` attaching scoring execution references; updates review action to support human adjustment with mandatory comment. |
| **Audit Logging Module** | **Medium** | Extends `audit.domain.ts` to audit all new actions: `SOURCE_SYSTEM_CREATED/UPDATED`, `AI_PROMPT_CREATED/PUBLISHED/TESTED`, `AI_SCORING_STARTED/COMPLETED/FAILED/RETRIED`, and `SCORE_ADJUSTED`. |
| **Frontend Crawl Management Hub** | **High** | Reorganizes `CrawlJobsPage.tsx` into the 4 Master Tabs. |

### 2. Dependency and Contract Impacts
- REST endpoints for Source Systems, AI Prompts, and Scoring Executions.
- Database relationship `evaluation_data_import_record` 1:1 `crawl_scoring_execution` (`UNIQUE(crawl_data_row_id)`).
- External dependency: Google Gemini REST API using `process.env.GEMINI_API_KEY`.
- No Redis / BullMQ dependencies (PostgreSQL transactional row locks).

### 3. Risk Assessment and Mitigation Plan
- Risk 1: Gemini Rate Limiting (429 HTTP) -> Concurrency throttle + exponential backoff retry.
- Risk 2: AI Hallucination or Out-of-Bound Scores -> Backend validation strictly bounds score to rubric range.
- Risk 3: Row-Level Fault Isolation -> Single row failure does not fail other rows or crawl batch.
- Risk 4: Re-crawl during AI Retry -> Scoring retry re-evaluates stored raw rows without re-crawling external sources.
- Risk 5: SSRF Vulnerability -> Strict DNS resolution and private network blocking against allowed domains.

### 4. Architectural Decision Records (ADRs)
- **ADR-008: Decoupled PostgreSQL-Backed Row-Level AI Scoring Task Queue**
  - Data Acquisition and AI Evaluation are separated.
  - Exactly 1 raw row = 1 scoring task.
  - Immutability on published scripts, prompts, and execution snapshots.
  - Human review remains the mandatory gate before applying scores to evaluation items.

## Next Step
- Step 4: Plan
