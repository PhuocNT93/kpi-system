# Step 1: Understand

Status: reconstructed from approved response

## Deliverable

### Goal
Implement an end-to-end **Automated KPI Crawl + Row-Level AI Scoring + Human Review** module across Backend and Frontend, establishing a strict architectural separation of concerns:
1. **Data Acquisition (Crawl Job)**: Collects and normalizes raw source data into `evaluation_data_import_row` via sandboxed scripts without scoring or calling Gemini.
2. **AI Evaluation (Row-Level Gemini Scoring)**: Evaluates each raw row independently (`1 raw row = 1 scoring task`) via an asynchronous PostgreSQL-backed queue (`crawl_scoring_execution`), producing a traceable numeric score, factual explanation, evidence reference, and confidence rating.
3. **Traceable Review & Apply**: Enables HR/Admin/Manager to inspect the complete chain (Raw Data → Rule → Prompt Snapshot → Gemini Output → Review), approve/adjust with mandatory reason, and apply results into existing Evaluation Items.
4. **Extensible Architecture**: Sources, scripts, and AI prompts are dynamically registered and versioned immutably without requiring backend code changes for new integration endpoints.

### Expected Behavior
1. **Source System Management**:
   - `crawl_source_system` records store authentication type, allowed domain policies (SSRF defense), credential schemas, and configuration.
   - Initial seed systems: `JIRA`, `BLUEPRINT`, `GOOGLE_SHEET`, extensible to any HTTP API (e.g. `GITLAB`).
2. **Crawl Script Lifecycle**:
   - `crawl_script` (parent) + `crawl_script_version` (immutable published code with SHA-256 checksum).
   - Scripts execute in an isolated sandbox (`CrawlSandboxService`) with strict memory/timeout limits, controlled HTTP client (`context.http.request`), and domain allowlist enforcement.
   - Crawl Scripts collect and normalize raw payloads only; they never calculate scores or call AI.
3. **Crawl Job & Execution Queue**:
   - `crawl_job_definition` references a published script version, mapped KPI criteria, evaluation cycle, cron/manual schedule, and failure policy.
   - `crawl_job_execution` acts as PostgreSQL transactional durable queue (`FOR UPDATE SKIP LOCKED`).
   - Each execution stores an immutable snapshot of configuration, script version, checksum, and criteria.
   - Successful crawl stores raw data into `evaluation_data_import_row` with `raw_data` JSON preserved for AI context.
4. **Row-Level Asynchronous AI Scoring**:
   - Every stored raw row automatically enqueues a row-level task in `crawl_scoring_execution` (`UNIQUE(crawl_data_row_id)`).
   - Scoring worker loads the exact raw row, KPI rule, and published prompt version (`kpi_scoring_prompt_version`).
   - Renders prompt safely and calls Gemini with structured output format (`score`, `reason`, `confidence`, `evidence`, `flags`).
   - Validates output: numeric score within allowed range, non-empty reason, confidence in `[0, 1]`.
   - Stores `input_snapshot` and `output_snapshot` for full auditability.
5. **Fault Isolation & Independent Retries**:
   - Crawl execution status (`SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`) is decoupled from AI Scoring status.
   - AI scoring failure on one row does not fail the crawl batch or other rows.
   - Scoring retry operates strictly on stored raw rows without re-crawling external sources.
6. **Human Review & Final Apply**:
   - Row-level review screen shows raw measurement, raw payload, prompt, AI score, reason, and confidence.
   - Reviewer can Approve, Adjust (score adjustment requires mandatory reason), or Reject.
   - Final Apply maps approved rows into the existing evaluation cycle evaluation items.
7. **Frontend Navigation (4 Main Tabs)**:
   - **Tab 1 — Crawl Jobs**: Wizard for job creation, status toggling, cycle assignment, and manual execution trigger.
   - **Tab 2 — Crawl History**: Execution history displaying decoupled Crawl Status vs AI Scoring Status.
   - **Tab 3 — Crawl Data & Scores**: Main row-level table with detail drawer showing the complete reasoning chain.
   - **Tab 4 — Crawl Configuration**: Sub-tabs for Source Systems, Crawl Scripts, and AI Scoring Prompts.

### Acceptance Criteria
1. **Rule 1–3 Compliance**: Crawl scripts only acquire data; zero Gemini calls, scoring logic, or evaluation modification inside crawlers.
2. **Rule 4–7 Compliance (Row-Level Traceability)**: Exactly 1 scoring task per raw row; 300 rows produce 300 independent scoring executions. Every score is directly tied to `evaluation_data_import_row.id`.
3. **Immutable Snapshots**: Published scripts and published prompt versions cannot be modified; each execution and scoring task stores full immutable snapshots.
4. **Retry Independence**: Retrying a failed scoring task re-evaluates the existing raw row without triggering a crawl job execution.
5. **Strict Validation**: Scores returned by Gemini are validated against KPI criterion ranges; invalid structures or scores fail the scoring task and are never applied to evaluation items.
6. **Human Review Gate**: AI scores remain recommendations until explicitly approved or adjusted by an authorized reviewer.
7. **Extensible Sources**: Adding a new source requires only database configuration, credentials, and script authoring—no backend code modifications.
8. **RBAC & Security**: `SYSTEM_ADMIN` manages sources, scripts, and prompts; `HR_ADMIN` configures jobs, runs crawls, and reviews; `MANAGER` reviews permitted employee rows; SSRF protection blocks private IPs and unauthorized domains.

### Out of Scope
- Introducing Redis / BullMQ (PostgreSQL transactional queues will be used exclusively).
- Automatic application of AI scores without human review / approval stage.
- Cross-row or batch AI scoring (where multiple employees are sent in a single Gemini request).

### Business Rules Involved
- Rules 1 to 15 of Master Architectural Rules.
- Evaluation Cycle Constraint: Only `OPEN` cycles can be targeted.
- RBAC Matrix and Audit Trail enforcement.

### Open Questions / Conflicts
- None identified.

## Next Step
- Step 2: Investigate
