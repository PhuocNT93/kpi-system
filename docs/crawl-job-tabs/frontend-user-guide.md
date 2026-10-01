# Crawl Jobs User Guide

## Prerequisites

- Node.js 22 and npm for local package commands.
- PostgreSQL for execution persistence and queueing.
- Published crawl script versions and active connector credential references provisioned by a System Admin.
- HTTPS source hosts explicitly allowlisted for each source system.

## Start and Stop

### Docker Compose

1. Configure the existing required `.env` values for PostgreSQL, ports and application authentication.
2. Add each connector secret to the worker environment. Register only its environment-variable name as `secret_reference`; do not put secret values in Crawl Job source configuration.
3. Start the stack with `docker compose up --build`.
4. Stop containers with `docker compose down`. Do not add `-v` unless intentionally deleting the local database volume.

### Separate Development Processes

Run PostgreSQL first, then start:

```powershell
npm --prefix backend run migrate:up
npm --prefix backend run seed:crawl-samples # (optional) Seed sample credentials, criteria & crawlers
npm --prefix backend run dev
npm --prefix frontend run dev
```

> **Note on Worker**: The crawl worker runner is embedded directly into the backend server process (`NODE_ENV !== 'test'`). A standalone worker process (`npm --prefix backend run worker:crawl:dev`) can still be run optionally if separated execution is desired.

Stop each development process with `Ctrl+C`.

## URLs

- Crawl Job screen: `http://localhost:<frontend-dev-port>/admin/crawl-jobs`
- Docker frontend: `http://localhost:<FRONTEND_PORT>/admin/crawl-jobs`
- API base: set `VITE_API_BASE_URL` to the backend origin when running the frontend separately.
- Crawl endpoints are under `/api/crawl-jobs`, `/api/crawl-executions`, `/api/crawl-scripts`, `/api/connector-credentials`, `/api/evaluation-cycles`, and `/api/evaluation-data/imports`.

## Runtime Configuration

- `CRAWL_WORKER_POLL_INTERVAL_MS`: 1000 ms by default, clamped from 100 to 10000 ms.
- `CRAWL_WORKER_LEASE_MS`: 60000 ms by default, clamped from 15000 to 300000 ms; workers renew leases while executing.
- `CRAWL_MAX_ATTEMPTS`: 3 by default, clamped from 1 to 5; each attempt and its `next_retry_at` are persisted in PostgreSQL.
- PostgreSQL is the only required queue store; no Redis URL or Redis service is used by Crawl Jobs.
- `CRAWL_RAW_PAYLOAD_RETENTION_DAYS`: 90 by default, clamped from 1 to 3650 days.
- `CRAWL_ALLOWED_HOSTS_BLUEPRINT`, `CRAWL_ALLOWED_HOSTS_JIRA`, `CRAWL_ALLOWED_HOSTS_GOOGLE_SHEET`: comma-separated exact hosts or `*.example.com` host patterns. Private/reserved IPs are rejected even when hostnames are allowed.
- Connector credential references are environment-variable names resolved only in the worker. The API returns reference metadata, not secret values.

## Available Behavior

- **Crawl Jobs Tab**: HR Admins can configure jobs from published script versions, active connector references and active KPI criteria; assign jobs to OPEN cycles and trigger them manually. Selecting a published script automatically suggests and links corresponding KPI criteria.
- **Executions Tab**: Detailed execution history, configuration snapshot, execution counters, and log streaming. QUEUED/RUNNING details poll every 2.5 seconds and stop polling at terminal status.
- **Data Review Tab**: Staged review batches restricted to HR Admins and Managers. Manager reads and mutations are limited to managed teams. Crawl rows require a reviewer comment of at least 20 characters; conflicts require explicit resolution. Apply and Reject are audited.
- **Crawl Scripts Tab**: HR Admins and System Admins can view all crawler scripts (Draft and Published), register new JavaScript scripts (`ISOLATED_VM` runtime) with pre-filled templates, attach intended KPI criteria, author/select an AI Scoring Prompt with Dễ/Vừa/Khó presets and variable tags (`{{taskKey}}`, `{{taskSummary}}`, etc.), test run scripts live with instant output preview, and publish draft scripts with one click.
- **Script Dry-Run / Test Execution**:
  - Live sandbox test run available directly within the **Register Script Modal** before saving.
  - One-click **Play (Test Run)** button on every script in the registry table to dry-run and inspect generated JSON records with execution duration.
  - Safe HTTPS mock fetcher automatically simulates Jira issues and Blueprint tasks for realistic test executions in sandboxed isolates.
- Schedulers create execution records in PostgreSQL. Workers claim due rows using `FOR UPDATE SKIP LOCKED` and execute the immutable database snapshot.
- Retry attempts are new PostgreSQL rows with `next_retry_at`; a retry is eligible when `next_retry_at <= NOW()`.
- Crawled measurements are staged; scoring remains in the existing Evaluation/Rule Engine.

## Validation Behavior

- Only published scripts can be attached to Crawl Jobs.
- A cycle must be OPEN both when an execution is created and when a worker starts it.
- The worker validates the normalized output contract, employee activity/scope, KPI membership and criterion eligibility. Invalid rows remain visible and cannot be applied.
- Duplicate employee/criterion/cycle measurements become conflicts; the system does not choose a winner automatically.
- Source configuration rejects credential-like keys. Source requests require HTTPS, an allowlisted host and public DNS addresses.
- Raw source responses are stored separately with redaction and configured expiry. Invalid output is stored only as a sanitized validation summary.

## Seed Samples for Jira & Blueprint

A dedicated seed script `npm --prefix backend run seed:crawl-samples` provides ready-to-use sample data:
- **Connector Credentials**: `CRED_JIRA_PROD` (Jira Cloud API) and `CRED_BLUEPRINT_PROD` (Blueprint Platform).
- **KPI Criteria**:
  - `CRIT_JIRA_TASK_COMPLETION`: Completed development tasks from Jira.
  - `CRIT_JIRA_BUG_COUNT`: Resolved production bugs tracked in Jira.
  - `CRIT_BP_TASK_ONTIME_RATE`: On-time delivery rate percentage from Blueprint.
  - `CRIT_BP_DELAYED_HOURS`: Overdue task delay hours from Blueprint.
- **Published Crawl Scripts**:
  - `JIRA_TASK_METRICS_CRAWLER` (v1, PUBLISHED): Fetches Jira issues using JQL and extracts completion & bug metrics per user email.
  - `BLUEPRINT_TASK_METRICS_CRAWLER` (v1, PUBLISHED): Fetches Blueprint task metrics and extracts on-time rates and overdue hours per user email.