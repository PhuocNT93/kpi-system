# Step 1: Understand

Status: produced during this step

## Deliverable

### Goal

Extend the KPI Data Import pipeline so that every imported KPI value carries structured, persisted **source metadata**, **comment**, **rationale**, and **evidence** — forming a fully auditable and explainable evaluation history.

The new pipeline introduces a **JSON import pathway** (`POST /evaluation-data/imports`) that is separate from the existing CSV import (`POST /api/imports/csv`). The JSON pathway supports rich import payloads from external systems (JIRA, Google Sheet, etc.) and must persist source, raw payload, comment, rationale, and evidence from the staging stage through apply and into the historical evaluation record.

---

### Expected Behavior

1. **JSON Import endpoint** accepts a structured payload with `evaluation_cycle_id`, `source` metadata, and `payload.employees[].kpis[]` that includes `value`, `unit`, `comment`, `rationale`, and `evidences[]`.
2. **Import staging** persists the raw JSON immutably (`evaluation_data_import.raw_payload`), extracts and stores `source`, `comment`, `rationale`, and a normalized `evaluation_data_import_record` per KPI row.
3. **Evidence** is stored in a dedicated `evaluation_data_import_evidence` table linked to each import record.
4. **Preview API** (`GET /evaluation-data/imports/{id}/preview`) returns the staged data including `comment`, `rationale`, `source`, and `evidences[]` per KPI row — including comparison to the existing evaluation value.
5. **Preview UI** allows HR/Admin to inspect each KPI row, view comment/rationale/evidence, and optionally edit `comment`/`rationale` before applying. The raw payload and source data remain immutable.
6. **Apply API** (`POST /evaluation-data/imports/{id}/apply`) updates evaluation items (measurement_value, comment, rationale, source, import_id) and copies evidence into the `evidence` table linked to the evaluation item.
7. **KPI Evidence API** (`GET /evaluations/{evaluationId}/kpis/{criterionCode}/evidence`) returns the full explainability record for a KPI.
8. **Dashboard UI** shows a "View details" link per KPI row that opens a drawer with comment, rationale, source, and evidence.
9. **EvidenceViewer** and **KpiExplainability** are reusable components.
10. Historical immutability: locked evaluations cannot have their evidence/comment/rationale rewritten.

---

### Acceptance Criteria

1. JSON import contract supports `source`, `comment`, `rationale`, `evidences[]` per KPI entry.
2. `evaluation_data_import` table stores `source` (jsonb), `raw_payload` (jsonb, immutable after creation).
3. `evaluation_data_import_record` stores `comment`, `rationale`, `employee_code`, `kpi_code`, `raw_value`, `normalized_value`, `unit`, `status`, `error_code`, `error_message`, `action`.
4. `evaluation_data_import_evidence` table stores one row per evidence item linked to an import record.
5. Preview API returns comment/rationale/evidence for each import record.
6. Apply: `evaluation_item` updated with `comment`, `rationale`, `import_id`, `source` (via new columns).
7. Apply: evidence copied into `evidence` table linked to `evaluation_item_id`.
8. Apply: audit record created with action `IMPORT_APPLY` including source, import_id, old/new values.
9. `GET /evaluations/{evaluationId}/kpis/{criterionCode}/evidence` returns full explainability.
10. Locked evaluations reject apply.
11. Evidence URL validation: valid format, no embedded credentials.
12. RBAC: Employee sees own evidence only; Manager sees managed-team; HR/Admin sees org scope.
13. Reporting read model: `employee_kpi_score_read_model` gains `has_evidence`, `evidence_count`, `comment` (lightweight summary fields).
14. Dashboard UI: each KPI has "View details" that opens KpiExplainability drawer.
15. EvidenceViewer component renders URL, FILE, EXTERNAL_RECORD, DOCUMENT types.
16. HR/Admin can edit `comment`/`rationale` in the Preview screen; the raw payload is not modified.
17. Import #2 does not overwrite Import #1's evidence or comment on the historical evaluation record.
18. Tests cover: valid import, missing comment, invalid evidence URL, multiple evidences, authorization boundaries, historical immutability.

---

### Out of Scope

- File/binary upload for evidence files (MVP: FILE type stores a `file_reference` string, not raw bytes).
- Real-time external URL validation / HTTP HEAD requests on evidence URLs.
- Multilingual translation of comment/rationale fields.
- Automatic generation of comment/rationale from KPI scores.
- Peer review, calibration, or advanced reporting BI.
- Integrating with an object-storage service (stored as reference only at MVP).
- Extending the existing CSV import with evidence (CSV has no structured evidence field; this is the JSON pathway only).

---

### Business Rules Involved

- **Locked cycle/evaluation is read-only.** Apply must check `evaluation.is_locked` in the same transaction.
- **Raw payload is immutable.** `evaluation_data_import.raw_payload` must never be modified after creation.
- **Evidence does not overwrite historical records.** Each import creates its own evidence chain; applying Import #2 does not delete Import #1 evidence on the evaluation item. The evaluation item receives the latest comment/rationale/source from the active import, while all historical evidence is retained.
- **Score immutability after lock.** Once locked, comment/rationale/evidence/score cannot be mutated.
- **No credential exposure.** Evidence URLs and descriptions must not contain API tokens, passwords, or signed private URLs exposed in API responses or audit logs.
- **RBAC/scope enforcement.** Evidence access follows evaluation authorization scope.
- **Audit log is append-only.** `IMPORT_APPLY` records created, never deleted.
- **Scoring Engine reuse.** After applying measurements, `recalculateEvaluation` must be called per affected evaluation — same pattern as the existing CSV import.
- **Comment/rationale are not generated.** Blank fields → null, never fabricated.
- **Evidence is optional globally** unless a KPI config explicitly requires it (not enforced globally in MVP).

---

### Open Questions / Conflicts

1. **Existing `evidence` table** in `init_database_schema.ts` has only `evidence_id`, `evaluation_item_id`, `evidence_type` (varchar 20), `evidence_value` (text), `uploaded_by`, `uploaded_at`. The new rich evidence model (title, url, file_reference, external_reference, description, source_type) requires either extending this table or creating a separate `evaluation_data_import_evidence` table. **Recommended:** Extend the existing `evidence` table with new columns (title, url, file_reference, external_reference, description, source_type, import_record_id) to avoid duplication. The existing `evidence_value` becomes a legacy/fallback field. This needs ADR confirmation — see Section 9 below.
2. **`evaluation_item` missing `rationale`, `import_id`, `source_snapshot` columns.** These must be added via migration. The existing `comment` column already exists. `source_snapshot` would be a jsonb field for the import source. This is additive and non-breaking.
3. **Existing import tables** (`import_job`, `import_row`) use the CSV import pathway. The new JSON pathway introduces parallel tables (`evaluation_data_import`, `evaluation_data_import_record`, `evaluation_data_import_evidence`). These are distinct from the CSV import tables and do not interfere.
4. **`employee_kpi_score_read_model`** needs `has_evidence`, `evidence_count`, `comment` columns. Adding these is additive and non-breaking.

None of these conflicts with the LLD — they are extensions. The evidence table extension is the only design decision that needs explicit user alignment.

## Inputs Reviewed

- usage.md, docs/AI_AGENT_WORKFLOW.md
- backend/src/modules/import/domain/import.types.ts
- backend/src/modules/import/application/csv-import.service.ts
- backend/src/modules/import/api/import.controller.ts
- backend/src/modules/import/infrastructure/postgres-import.repository.ts
- backend/src/modules/collector/domain/collector.types.ts
- backend/src/modules/collector/api/collector.controller.ts
- backend/src/modules/evaluation/domain/evaluation.types.ts
- backend/src/modules/audit/domain/audit.domain.ts
- backend/migrations/1724500000001_init_database_schema.ts
- backend/migrations/1788926000011_create_reporting_read_models.ts
- backend/migrations/1788926000012_add_system_benchmark_to_evaluation_item.ts
- frontend/src/features/imports/api/import-api.ts
- frontend/src/features/imports/pages/ImportUploadPage.tsx (partial)
- docs/BACKEND_NODE_RULES.md (partial)

## Actions and Evidence

- Read all major files listed above.
- Confirmed: `evidence` table already exists in schema with minimal fields.
- Confirmed: `evaluation_item` already has `comment` column but lacks `rationale`, `import_id`, `source_snapshot`.
- Confirmed: latest migration timestamp is `1788926000012`.
- Confirmed: CSV import pathway uses `import_job` + `import_row` tables.
- Confirmed: audit log is append-only with `IMPORT_APPLY` not yet in the enum.
- Confirmed: `employee_kpi_score_read_model` has no evidence-related columns yet.

## Decisions and Rationale

- Use separate `evaluation_data_import` / `evaluation_data_import_record` / `evaluation_data_import_evidence` tables for the JSON pathway to keep it isolated from the existing CSV import tables.
- Extend the existing `evidence` table (not create a duplicate) for evidence attached to evaluation items after Apply.
- Add columns to `evaluation_item` (rationale, import_id, source_snapshot) and `employee_kpi_score_read_model` (has_evidence, evidence_count, comment).

## Risks / Blockers

- **Open Question #1 (evidence table):** Extending existing `evidence` table vs. new table. Recommend extending; confirm with user.
- If the existing `evidence` table is in active use with specific tooling, extending it might require caution.

## Next Step

Step 2 - Investigate
