# Step 3: Impact Analysis

Status: produced during this step

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | New page `EvaluationDataImportPage` (JSON import workflow); new components `EvidenceViewer`, `KpiExplainabilityDrawer`; modify `KpiBreakdown` to add "View details" button; extend `reports.types.ts`; add route + sidebar item |
| Backend | HIGH | New module `evaluation-data-import` (7 files); extend evaluation module (2 files); extend audit domain (1 file); extend reports module (2 files); extend routes/DI (1 file); Swagger (1 file) |
| Database | HIGH | 1 new migration: 3 new tables (`evaluation_data_import`, `evaluation_data_import_record`, `evaluation_data_import_evidence`); 3 extended tables (`evidence`, `evaluation_item`, `employee_kpi_score_read_model`) |
| API | HIGH | 7 new endpoints: POST/GET/PATCH under `/api/evaluation-data/imports`, POST apply, GET history; GET `/api/evaluations/:id/kpis/:code/evidence` on existing router; all documented in Swagger |
| RBAC / Scope | MEDIUM | Stage/Preview/Edit/Apply/History: HR_ADMIN + SYSTEM_ADMIN only (same guard as CSV import). KPI Evidence read endpoint: EMPLOYEE (own), MANAGER (team), HR_ADMIN/SYSTEM_ADMIN (org-wide) — same RBAC as existing evaluation access |
| Workflow | MEDIUM | Apply must check `evaluation.is_locked` in the same transaction; locked evaluations produce per-row error, not full abort (partial-success model mirroring CSV import). Apply also triggers `recalculateEvaluation` per affected evaluation |
| Audit | LOW | Additive: `IMPORT_APPLY` added to `AuditActionSchema` enum. One audit record per affected evaluation per apply. Existing audit infrastructure unchanged |
| Concurrency | MEDIUM | Apply uses `withTransaction` + `SELECT ... FOR UPDATE` on `evaluation_data_import` to prevent double-apply. Existing `evaluation_item.version` optimistic lock is NOT used in the apply path (direct UPDATE per CSV import pattern); risk is duplicate concurrent applies on the same import — mitigated by row lock and status check |
| Performance | LOW | Bulk apply iterates per-record inside a single transaction; `recalculateEvaluation` called once per unique evaluation (not once per record); evidence rows are bulk-inserted. No N+1 risk for typical import size (<1000 rows). `evidence` table gains an index on `evaluation_item_id` (already exists via FK). `employee_kpi_score_read_model` update is event-driven, not synchronous with apply |
| Historical Data | HIGH | `raw_payload` immutable after creation (no UPDATE permitted). `source_snapshot` on `evaluation_item` captures the import source at apply time. Evidence rows in `evidence` table are append-only — a second apply does not delete evidence from the first. Locked evaluations are read-only |

## Potential Risks

1. **Migration ordering**: Next migration must use timestamp > `1788926000012`. Using `1788926000013` is safe but must not conflict with a parallel migration committed to the branch by another developer. **Mitigation**: check `git log --oneline migrations/` on branch before running.

2. **`source_snapshot` JSONB serialization**: `postgres-evaluation-item.repository.ts` `update()` iterates `Object.entries(item)`. JSONB columns require the value to already be a JS object (pg driver serializes it), not a pre-stringified string. **Mitigation**: pass `source_snapshot` as a plain JS object from the service; do not `JSON.stringify()` it before passing to `update()`.

3. **Double-apply prevention**: Two concurrent apply calls on the same import could both read `status = PREVIEW` before either commits. The `SELECT ... FOR UPDATE` on `evaluation_data_import` in the same transaction eliminates this. **Mitigation**: implement the FOR UPDATE lock at the start of `applyImport`.

4. **`recalculateEvaluation` actor requirement**: `recalculateEvaluation()` in `evaluation.service.ts` checks that actor is manager or HR — it also requires `auditService`. The apply service must pass a valid HR actor and must wire `auditService` into the evaluation service. **Mitigation**: `createEvaluationDataImportModule` receives both `evaluationService` and `auditService`; the evaluation service already has `auditService` wired in the main DI path.

5. **Large payload performance**: A payload with 500 employees × 10 KPIs = 5000 records; each apply row does a `SELECT` (employee lookup) + `UPDATE` (evaluation_item) + `INSERT` (evidence). This is within a single long transaction. For MVP this is acceptable; flag as a known limitation in the user guide.

6. **Evidence URL exposure**: Evidence URLs must not be logged to audit or exposed in error messages. The service must sanitize evidence URLs before logging.

7. **`employee_kpi_score_read_model` refresh lag**: After apply, the read model is updated asynchronously via the `EVALUATION_UPDATED` event. The KPI explainability endpoint (`GET /api/evaluations/:id/kpis/:code/evidence`) reads directly from the OLTP tables (`evidence`, `evaluation_item`), not the read model — so it is always consistent. The read model's `has_evidence`/`evidence_count`/`comment` may lag by a few seconds after apply.

8. **No binary file upload**: Evidence of type `FILE` stores only a `file_reference` string. The frontend must make this limitation visible (tooltip or help text). Users must upload files to an external system and paste the reference.

## Required ADR / Clarification

- **None.** All design decisions were resolved in Steps 1–2 (Option A confirmed, Swagger requirement confirmed, partial-success model consistent with existing CSV import). No LLD conflicts detected.

## Next Step

Step 4 - Plan
