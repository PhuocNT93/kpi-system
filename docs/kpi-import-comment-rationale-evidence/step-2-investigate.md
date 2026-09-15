# Step 2: Investigate

Status: produced during this step

## Deliverable

### Relevant Documents

- `docs/LLD_Employee_Performance_Evaluation_System.md` — configurable, rule-driven evaluation framework; immutable locked history; audit-append-only rules.
- `docs/BACKEND_NODE_RULES.md` — modular monolith, controller = parsing only, services = business logic, repositories = queries.
- `docs/FRONTEND_REACT_RULES.md` — Page → Feature Component → Hook → Query/Mutation → API client.

---

### Relevant Modules and Files

#### Backend

| File | Role |
|---|---|
| `backend/src/modules/import/domain/import.types.ts` | `ImportJob`, `ImportRow` domain types for CSV import |
| `backend/src/modules/import/application/csv-import.service.ts` | CSV import pipeline: upload→validate→preview→confirm→apply; batch processing; calls `recalculateEvaluation` |
| `backend/src/modules/import/api/import.controller.ts` | CSV import controller with HR guard |
| `backend/src/modules/import/api/import.routes.ts` | Routes: POST `/imports/csv`, POST `/imports/:id/confirm`, GET `/imports/:id`, GET `/imports`, GET `/imports/:id/rows` |
| `backend/src/modules/import/infrastructure/postgres-import.repository.ts` | DB queries for `import_job`, `import_row` |
| `backend/src/modules/import/import.module.ts` | DI factory for import module |
| `backend/src/modules/evaluation/domain/evaluation.types.ts` | `Evaluation`, `EvaluationItem` types; `EvaluationItem.comment` already exists; lacks `rationale`, `import_id`, `source_snapshot` |
| `backend/src/modules/evaluation/domain/repositories.interface.ts` | `IEvaluationItemRepository` with `update()`, `updateScoringResult()`, `batchUpdate()`, `findByEvaluationId()` |
| `backend/src/modules/evaluation/infrastructure/persistence/postgres-evaluation-item.repository.ts` | Full SQL update via field-iteration; `findByEvaluationId` joins with `measurement` table |
| `backend/src/modules/evaluation/application/services/evaluation.service.ts` | `recalculateEvaluation()` — scoring engine call post-import; uses optimistic locking via `version`; calls `auditService.record()`; emits `EVALUATION_UPDATED` event |
| `backend/src/modules/audit/domain/audit.domain.ts` | `AuditAction` enum (needs `IMPORT_APPLY`); `AuditEntityType` enum; `AuditRecordParams` interface |
| `backend/src/modules/reports/domain/reports.types.ts` | `EmployeeKpiScore` read model — lacks `has_evidence`, `evidence_count`, `comment` |
| `backend/src/modules/reports/application/reports-query.service.ts` | Reads from read models only |
| `backend/src/modules/reports/application/reporting-projection.service.ts` | Writes to read models when `EVALUATION_UPDATED` event fires |
| `backend/src/api/routes.ts` | Registers all modules; new `evaluation-data` module will plug in here |
| `backend/migrations/1788926000012_*` | Latest migration (timestamp base for next migration) |

#### Database (existing, from `init_database_schema.ts`)

| Table | Key Fields |
|---|---|
| `evaluation_item` | `evaluation_item_id`, `comment` (already exists), lacks `rationale`, `import_id`, `source_snapshot` |
| `evidence` | `evidence_id`, `evaluation_item_id`, `evidence_type`, `evidence_value`, `uploaded_by`, `uploaded_at` — minimal, needs extension |
| `import_job` | CSV import jobs only |
| `import_row` | CSV import rows only |
| `audit_log` | Append-only; `action` is varchar |
| `employee_kpi_score_read_model` | Read model lacking `has_evidence`, `evidence_count`, `comment` |

#### Frontend

| File | Role |
|---|---|
| `frontend/src/features/imports/pages/ImportUploadPage.tsx` | CSV import upload + preview UI |
| `frontend/src/features/imports/pages/ImportDetailPage.tsx` | CSV import row detail UI |
| `frontend/src/features/imports/api/import-api.ts` | API client for CSV import; types: `ImportJobPreview`, `ImportRowDetails` |
| `frontend/src/features/reports/components/KpiBreakdown.tsx` | Renders per-KPI rows for the employee/team report pages; needs "View details" button |
| `frontend/src/features/reports/types/reports.types.ts` | `EmployeeKpiScore` frontend type — needs `hasEvidence`, `evidenceCount`, `comment` |
| `frontend/src/features/reports/api/reports.api.ts` | Report API client — camelizes all responses |
| `frontend/src/features/reports/pages/EmployeeReportPage.tsx` | Renders `ScoreCard` + `KpiBreakdown` |

---

### Existing Implementation

1. **CSV Import pipeline** (`import_job` / `import_row`): Upload → Validate → Preview → Confirm → Batch apply (UPDATE `evaluation_item.measurement_value`, `comment`) → `recalculateEvaluation()`.
2. **`evaluation_item`** has `comment` (text) and `system_source` (varchar). Missing: `rationale`, `import_id`, `source_snapshot` (jsonb).
3. **`evidence` table** exists but is minimal (type + text value only).
4. **Audit service** `record()` method accepts `entityType`, `entityId`, `action`, `oldValue`, `newValue`, `reason`, `performedBy`, `source`. The `action` field is a varchar — no strict enum enforcement at DB level, so adding `IMPORT_APPLY` just requires updating the TypeScript enum.
5. **Reporting projection** fires on `EVALUATION_UPDATED` event. The `employee_kpi_score_read_model` holds per-KPI scores but no explainability fields.
6. **`recalculateEvaluation()`** uses optimistic locking (`version`) on evaluation items. Direct `pool.query` UPDATE in the CSV import service bypasses this — must continue using direct UPDATE for the JSON import apply step too (same pattern, within a transaction).
7. **No existing JSON import pathway** — this is entirely new.

---

### Existing Tests

- `backend/src/modules/import/application/csv-import.service.test.ts` — unit tests for CSV import.
- `backend/src/modules/reports/application/reporting-projection.service.test.ts` — projection service tests.
- `frontend/src/features/reports/components/ScoreCard.test.tsx`, `KpiTrendTable.test.tsx` — frontend unit tests.
- No existing tests for evidence, JSON import, or KPI explainability.

---

### Patterns to Reuse

1. **CSV import pattern** — `processUpload` → staged records → `confirmImport` → `processJobBatch` → `recalculateEvaluation`. Mirror this for JSON pathway.
2. **Import repository pattern** — typed interface (`IImportRepository`) + Postgres implementation. Create parallel `IEvaluationDataImportRepository`.
3. **Module factory pattern** — `createImportModule(pool, evaluationService)`. Create `createEvaluationDataImportModule(pool, evaluationService, auditService)`.
4. **`withTransaction()` helper** — already used in evaluation service. Use for Apply atomicity.
5. **`auditService.record()`** — log `IMPORT_APPLY` with before/after state.
6. **`appEventEmitter.emit(AppEvent.EVALUATION_UPDATED, ...)`** — trigger read model refresh after apply.
7. **`sendSuccess` / `sendFailure` / `sendCollection`** helpers from `http-response.ts`.
8. **`getActorFromContext(req)`** — extract auth actor.
9. **`requireHrAdmin` guard** — copy from import.routes.ts for new routes.
10. **Frontend `camelize()`** — all report API responses are camelized in the client.
11. **`useQuery` + `useMutation` pattern** — used by `ImportUploadPage`.

---

### New Module Architecture: `evaluation-data-import`

New backend module at:
`backend/src/modules/evaluation-data-import/`

Structure:
```
domain/evaluation-data-import.types.ts
application/evaluation-data-import.service.ts
api/evaluation-data-import.controller.ts
api/evaluation-data-import.router.ts
infrastructure/postgres-evaluation-data-import.repository.ts
evaluation-data-import.module.ts
```

New frontend feature at:
`frontend/src/features/imports/`
- Add `evaluation-data-import-api.ts` (new API client)
- Add `EvaluationDataImportPage.tsx` (new JSON import page)
- Add `components/EvidenceViewer.tsx` (reusable)
- Add `components/KpiExplainabilityDrawer.tsx` (reusable)
- Extend `KpiBreakdown.tsx` to show "View details" button

---

### New DB Tables (Migration `1788926000013_create_evaluation_data_import.ts`)

1. **`evaluation_data_import`** — JSON import staging header
2. **`evaluation_data_import_record`** — one row per KPI entry in the payload
3. **`evaluation_data_import_evidence`** — one row per evidence item, linked to a record

### Extended DB Columns (same migration)

4. **`evidence`** table — add: `title`, `url`, `file_reference`, `external_reference`, `description`, `source_type`, `import_record_id`
5. **`evaluation_item`** table — add: `rationale`, `import_id`, `source_snapshot` (jsonb)
6. **`employee_kpi_score_read_model`** table — add: `has_evidence`, `evidence_count`, `comment`

---

### New API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/evaluation-data/imports` | Stage a JSON import |
| GET | `/api/evaluation-data/imports/:id` | Get import status |
| GET | `/api/evaluation-data/imports/:id/preview` | Get preview rows with comment/rationale/evidence |
| PATCH | `/api/evaluation-data/imports/:id/records/:recordId` | Edit comment/rationale before apply |
| POST | `/api/evaluation-data/imports/:id/apply` | Apply import to evaluations |
| GET | `/api/evaluation-data/imports` | Import history |
| GET | `/api/evaluations/:evaluationId/kpis/:criterionCode/evidence` | KPI explainability (added to evaluation module or as new endpoint on existing eval router) |

## Inputs Reviewed

- All files listed in Relevant Modules and Files section above.

## Actions and Evidence

- Read `import.types.ts`: confirmed `ImportJob`, `ImportRow` shape — CSV-specific, no comment/rationale/source/evidence.
- Read `csv-import.service.ts`: confirmed direct `pool.query` pattern for apply step; `recalculateEvaluation` called per evaluation after apply.
- Read `evaluation.types.ts`: confirmed `comment` exists; `rationale`, `import_id`, `source_snapshot` missing.
- Read `postgres-evaluation-item.repository.ts`: confirmed update uses field iteration — adding `rationale`, `import_id`, `source_snapshot` is automatically supported by existing `update()` method.
- Read `init_database_schema.ts`: confirmed `evidence` table schema (minimal), `evaluation_item` schema.
- Read `reporting_read_models migration`: confirmed `employee_kpi_score_read_model` has no evidence fields.
- Read `audit.domain.ts`: `AuditAction` enum needs `IMPORT_APPLY`; `source` field is a string in DB so freely extensible.
- Read `reports.module.ts`: `ReportingProjectionService.init()` subscribes to events; can use same event pattern to update read model after JSON import apply.
- Read `routes.ts`: confirmed injection pattern — add `evaluationDataImportController` to `RegisterRoutesOptions`.

## Decisions and Rationale

1. **New module `evaluation-data-import`** — isolated from CSV import module to preserve backward compatibility. CSV import remains unchanged.
2. **Extend `evidence` table** (Option A confirmed) — not duplicate; additive migration only.
3. **Extend `evaluation_item`** with `rationale`, `import_id`, `source_snapshot` — additive, non-breaking.
4. **KPI evidence endpoint on evaluation router** — `GET /api/evaluations/:evaluationId/kpis/:criterionCode/evidence` — avoids creating a duplicate API; follows existing endpoint conventions.
5. **`IMPORT_APPLY` audit action** — add to `AuditActionSchema` enum in `audit.domain.ts`.
6. **`has_evidence`, `evidence_count`, `comment` on `employee_kpi_score_read_model`** — lightweight; updated in projection service when `EVALUATION_UPDATED` fires after apply.
7. **URL validation** — regex-only at backend validation step; no outbound HTTP call.
8. **Evidence editing during preview** — allowed for `comment`/`rationale` on the import record; `raw_payload` immutable.

## Risks / Blockers

- The `postgres-evaluation-item.repository.ts` `update()` method iterates `Object.entries(item)` — if `source_snapshot` is a JSONB object, it must be serialized to JSON string before passing. Requires care in service layer.
- Reporting projection `upsertEmployeeKpiScore` must be extended to include `has_evidence`, `evidence_count`, `comment` — a straightforward SQL change.

## Next Step

Step 3 - Impact Analysis
