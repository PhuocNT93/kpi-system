# Step 4: Plan

Status: reconstructed from approved response

## Deliverable

### 1. Database Schema & Migration (Phase 1)
1. Create migration file `backend/migrations/1792000000005_add_row_level_scoring_and_source_systems.ts`:
   - `crawl_source_system`: Dynamic registry table.
   - Seed initial records (`JIRA`, `BLUEPRINT`, `GOOGLE_SHEET`, `GITLAB`).
   - Relax hardcoded `CHECK` constraints on `source_system`.
   - `kpi_scoring_prompt` & `kpi_scoring_prompt_version`: Versioned prompt storage with immutable published triggers.
   - `crawl_scoring_execution`: Row-level queue table linking directly to `evaluation_data_import_record(record_id)` with `UNIQUE(crawl_data_row_id)`.
   - Add prompt mapping to `crawl_job_criterion`.

### 2. Backend Domain, Infrastructure & Gemini Engine (Phase 2)
2. Domain schemas & types in `crawl-job.schemas.ts` and `crawl-job.types.ts`.
3. Repositories: `PostgresCrawlSourceSystemRepository`, `PostgresKpiScoringPromptRepository`, `PostgresCrawlScoringExecutionRepository`.
4. `GeminiScoringClient` with rate limiter throttle and exponential backoff.
5. `CrawlScoringWorkerService` claiming tasks via `FOR UPDATE SKIP LOCKED`, loading exact row context, validating scores, and handling row-level retries.
6. Update `CrawlExecutionWorkerService` to enqueue scoring tasks upon raw row staging.
7. Application services, controllers, and routes with RBAC.

### 3. Frontend End-to-End Implementation (Phase 3)
8. API client and type definitions in `crawl-job.types.ts` and `crawl-job-api.ts`.
9. Tab 1 — Crawl Jobs: Multi-step wizard with prompt mapping per KPI.
10. Tab 2 — Crawl History: Decoupled Crawl Status vs AI Scoring progress.
11. Tab 3 — Crawl Data & Scores: Row-level table, reasoning chain inspection drawer, and review controls.
12. Tab 4 — Crawl Configuration: Sub-tabs for Source Systems, Crawl Scripts, and AI Scoring Prompts.

### 4. Testing Strategy
- Unit & Sandbox Tests.
- Integration Tests (1 row = 1 scoring task, error isolation, retry without re-crawl).
- Regression Testing (backend and frontend Vitest suites, typechecks, builds).

### 5. Rollback Plan
- Complete migration `down` script.
- Namespaced endpoints preserving existing APIs.

## Next Step
- Step 5: Define Test Cases
