# Step 4: Plan (Finalized per Review)

Status: finalized per user review

## Deliverable

## Implementation Plan

### 1. Architecture & State Machine

```
Import State Machine:
  DRAFT
    ↓
  VALIDATING
    ├── [Errors found] ─────────────────→ INVALID (blocks apply)
    ├── [Conflicting values detected] ──→ CONFLICT (requires HR resolution)
    └── [All valid & resolved] ────────→ READY
                                            │
                                            │ POST /apply (HR_ADMIN only)
                                            │ Atomic transition check
                                            ▼
                                         APPLYING (locks concurrent apply)
                                            │
                                            ├── [All batches succeed] ──────────→ APPLIED
                                            ├── [Some fail: LOCKED/PUBLISHED] ──→ PARTIALLY_APPLIED
                                            └── [All fail / unhandled crash] ───→ FAILED
```

- **Idempotency Guarantee**:
  - `POST /api/evaluation-data/imports/:id/apply` performs an atomic state transition:
    `UPDATE evaluation_data_import SET status = 'APPLYING' WHERE import_id = $1 AND status IN ('READY', 'PARTIALLY_APPLIED') RETURNING *`
  - If status is already `APPLIED`: returns HTTP 200 with the existing apply summary immediately (no duplicate evaluation items, no duplicated evidence, no duplicate audit records).
  - If status is `APPLYING`: returns HTTP 409 Conflict ("Import is currently being processed").
  - If status is `CONFLICT` or `INVALID`: returns HTTP 400/422 ("Import has unresolved conflicts or validation errors").

- **Handling LOCKED / PUBLISHED (No Ambiguous "Skipped")**:
  - Each batch chunk (100–200 rows) runs in an isolated transaction.
  - In each batch:
    - Verify `evaluation_cycle.status != 'LOCKED'` and `evaluation.status NOT IN ('PUBLISHED', 'LOCKED')` via `SELECT ... FOR UPDATE`.
    - If an evaluation is `LOCKED` or `PUBLISHED`: That specific record is marked `status = 'REJECTED'` with `error_message = 'EVALUATION_CYCLE_LOCKED'` or `'EVALUATION_ALREADY_PUBLISHED'`.
    - If a batch has rejected records, the final import status is explicitly set to `PARTIALLY_APPLIED` (with `success_count`, `error_count`, and per-row error logs exposed via API and UI).
    - If all records are rejected, status is `FAILED`. If all succeed, status is `APPLIED`.

---

### 2. Database Migration `1788926000013_add_kpi_import_comment_evidence.ts`

- **Where:** `backend/migrations/1788926000013_add_kpi_import_comment_evidence.ts`
- **Staging Tables**:
  - `evaluation_data_import`:
    - `import_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `source_system VARCHAR(100) NOT NULL`
    - `batch_reference VARCHAR(100) NULL`
    - `status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'` (`DRAFT`, `VALIDATING`, `READY`, `CONFLICT`, `APPLYING`, `APPLIED`, `PARTIALLY_APPLIED`, `FAILED`)
    - `raw_payload JSONB NOT NULL`
    - `record_count INT NOT NULL DEFAULT 0`
    - `success_count INT NOT NULL DEFAULT 0`
    - `error_count INT NOT NULL DEFAULT 0`
    - `conflict_count INT NOT NULL DEFAULT 0`
    - `created_by VARCHAR(100) NOT NULL`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
    - `applied_at TIMESTAMPTZ NULL`
  - `evaluation_data_import_record`:
    - `record_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `import_id UUID NOT NULL REFERENCES evaluation_data_import(import_id) ON DELETE CASCADE`
    - `employee_code VARCHAR(100) NOT NULL`
    - `cycle_id UUID NOT NULL`
    - `kpi_code VARCHAR(100) NOT NULL`
    - `value NUMERIC(10,2) NOT NULL`
    - `comment TEXT NULL`
    - `rationale TEXT NOT NULL`
    - `source_snapshot JSONB NOT NULL`
    - `status VARCHAR(50) NOT NULL DEFAULT 'VALID'` (`VALID`, `INVALID`, `CONFLICT`, `APPLIED`, `REJECTED`)
    - `error_message TEXT NULL`
    - `conflicts JSONB NULL`
    - `evaluation_item_id UUID NULL`
  - `evaluation_data_import_evidence`:
    - `staging_evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `record_id UUID NOT NULL REFERENCES evaluation_data_import_record(record_id) ON DELETE CASCADE`
    - `evidence_type VARCHAR(50) NOT NULL` (`URL`, `DOCUMENT`, `FILE`, `SCREENSHOT`, `EXTERNAL_REF`)
    - `title VARCHAR(255) NOT NULL`
    - `evidence_url TEXT NULL`
    - `file_reference VARCHAR(500) NULL`
    - `description TEXT NULL`
    - `metadata JSONB NULL`
    - `status VARCHAR(50) NOT NULL DEFAULT 'PENDING'` (`PENDING`, `APPLIED`)
    - `final_evidence_id UUID NULL` (provenance mapping to `evidence.evidence_id`)
- **Table Extensions**:
  - `evaluation_item`:
    - `comment TEXT NULL` (EXISTS - do NOT re-add)
    - `rationale TEXT NULL` (NEW)
    - `import_id UUID NULL REFERENCES evaluation_data_import(import_id) ON DELETE SET NULL` (NEW)
    - `source_snapshot JSONB NULL` (NEW)
  - `evidence`:
    - `title VARCHAR(255) NOT NULL DEFAULT ''` (NEW)
    - `evidence_url TEXT NULL` (NEW)
    - `file_reference VARCHAR(500) NULL` (NEW)
    - `rationale TEXT NULL` (NEW)
    - `source VARCHAR(100) NULL` (NEW)
    - `source_import_id UUID NULL REFERENCES evaluation_data_import(import_id) ON DELETE SET NULL` (NEW)
    - `source_record_id UUID NULL` (NEW)
    - `metadata JSONB NULL` (NEW)
    - `status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'` (`ACTIVE`, `SUPERSEDED`) (NEW)
    - `superseded_by UUID NULL REFERENCES evidence(evidence_id) ON DELETE SET NULL` (NEW)
    - `superseded_at TIMESTAMPTZ NULL` (NEW)
    - `supersede_reason TEXT NULL` (NEW)
    - `created_by VARCHAR(100) NULL` (NEW)
  - `employee_kpi_score_read_model`:
    - `has_evidence BOOLEAN NOT NULL DEFAULT FALSE` (NEW)
    - `evidence_count INT NOT NULL DEFAULT 0` (NEW)
    - `comment TEXT NULL` (NEW)

---

### 3. Conflict Resolution Model

- **Conflict Detection**:
  - Occurs when two sources provide different values for the same 3-tuple `(cycle_id, employee_id, kpi_code)` within the same import or across pending imports.
  - Conflict Structure in `conflicts` JSONB:
    ```json
    {
      "conflict_type": "VALUE_CONFLICT",
      "existing_import_id": "uuid-or-null",
      "existing_source": "JIRA",
      "existing_value": 90.0,
      "incoming_source": "GOOGLE_SHEET",
      "incoming_value": 95.0,
      "resolution_options": ["USE_EXISTING", "USE_INCOMING", "MANUAL_OVERRIDE", "REJECT_BOTH"]
    }
    ```
- **Resolution via `PATCH /api/evaluation-data/imports/:id`**:
  - HR Admin selects resolution:
    - `USE_EXISTING`: Discards incoming record or keeps existing.
    - `USE_INCOMING`: Accepts incoming value.
    - `MANUAL_OVERRIDE`: Sets custom value and rationale.
    - `REJECT_BOTH`: Discards from apply.
  - When all conflicts on the import are resolved, status transitions `CONFLICT` $\rightarrow$ `READY`.

---

### 4. Service Boundaries & Responsibilities

- **`EvaluationDataImportService`** (`backend/src/modules/evaluation-data-import/application/`):
  - Strict orchestrator.
  - Methods:
    - `createImport(payload, actor)`: Validates Zod schema, checks entity resolution 3-tuple `(cycle_id, employee_id, kpi_code)`, checks conflict, inserts staging records & evidence, sets status (`READY` or `CONFLICT`).
    - `getImports(query)`: Paginated history.
    - `getImportById(id)`: Detailed status and counts.
    - `previewImport(id)`: Staged records with conflict breakdown and entity resolution previews.
    - `updateDraft(id, patchData, actor)`: Resolve conflicts and edit draft measurement/rationale/comment.
    - `applyImport(id, actor)`:
      - Checks state and idempotency (APPLIED $\rightarrow$ return cached summary; APPLYING $\rightarrow$ 409).
      - Sets status to `APPLYING`.
      - Chunks records into batches of 100–200.
      - Calls `evaluationService.applyImportedKpiData(batch, actor)`.
      - Links `final_evidence_id` on staging evidence.
      - Sets final status: `APPLIED` or `PARTIALLY_APPLIED`.
- **`EvaluationService.applyImportedKpiData(batch, actor)`** (`backend/src/modules/evaluation/application/services/`):
  - Domain owner of evaluation item mutations and scoring.
  - Resolves `(cycle_id, employee_id, kpi_code)` $\rightarrow$ `evaluation` $\rightarrow$ `evaluation_item`.
  - Transaction lock: `SELECT cycle FOR UPDATE`, verifies `cycle != LOCKED` and `evaluation != PUBLISHED`.
  - Updates `evaluation_item` (`measurement_value`, `comment`, `rationale`, `import_id`, `source_snapshot`).
  - Appends final `evidence` records (strictly append-only; status=`ACTIVE`).
  - Executes Rule Engine & Scoring Engine (standard scoring pipeline; `ROUND_HALF_UP` only at scoring engine).
  - Emits `EVALUATION_UPDATED` event for async projection to `employee_kpi_score_read_model`.
  - Records audit log with action `IMPORT_APPLY`.

---

### 5. Standardized 7 Endpoints & Strict RBAC Scopes

| Endpoint | Method | RBAC Scope | Purpose |
|---|---|---|---|
| `/api/evaluation-data/imports` | `POST` | **`HR_ADMIN` only** (System Admin is read-only) | Create staged JSON import |
| `/api/evaluation-data/imports` | `GET` | `HR_ADMIN`, `SYSTEM_ADMIN` | List import history |
| `/api/evaluation-data/imports/:id` | `GET` | `HR_ADMIN`, `SYSTEM_ADMIN` | Get import status & counts |
| `/api/evaluation-data/imports/:id/preview` | `GET` | `HR_ADMIN`, `SYSTEM_ADMIN` | Detailed preview & conflict list |
| `/api/evaluation-data/imports/:id` | `PATCH` | **`HR_ADMIN` only** | Edit draft records & resolve conflicts |
| `/api/evaluation-data/imports/:id/apply` | `POST` | **`HR_ADMIN` only** | Confirm and apply batch |
| `/api/evaluations/:id/kpis/:code/evidence` | `GET` | Data-scoped: `EMPLOYEE` (self), `MANAGER` (team), `HR_ADMIN` / `SYSTEM_ADMIN` (org) | **Explainability View DTO** |

#### Explainability View DTO:
```json
{
  "evaluation_id": "uuid",
  "evaluation_item_id": "uuid",
  "kpi_code": "KPI_DELIVERY",
  "measurement": 95,
  "score": 90,
  "comment": "Completed all assigned tasks on time",
  "rationale": "Score derived from Jira delivery sprint reports",
  "source": {
    "source_type": "JIRA",
    "source_name": "Jira Production",
    "source_reference": "PROJ-1234",
    "collected_at": "2026-09-14T08:30:00Z",
    "collector_version": "jira-v2"
  },
  "import": {
    "id": "uuid",
    "created_at": "2026-09-14T09:00:00Z",
    "created_by": "hr_admin_user"
  },
  "evidences": [
    {
      "id": "uuid",
      "title": "Sprint 34 Velocity Report",
      "type": "URL",
      "url": "https://jira.company.com/sprint/34",
      "file_reference": null,
      "status": "ACTIVE",
      "superseded_by": null,
      "superseded_at": null,
      "supersede_reason": null,
      "metadata": { "sprint_id": "34", "velocity": 42 }
    }
  ]
}
```

---

### 6. Frontend UI States & Components

- **`EvaluationDataImportPage`** (`frontend/src/features/imports/pages/`):
  - 4 explicit UX states: `Loading`, `Error`, `Empty`, `Forbidden`.
  - Status badges for imports: `DRAFT`, `VALIDATING`, `READY`, `CONFLICT`, `APPLYING`, `APPLIED`, `PARTIALLY_APPLIED`, `FAILED`.
  - Conflict Resolution panel: Side-by-side comparison of conflicting values with 1-click resolution actions.
  - Partial Apply notice: When status is `PARTIALLY_APPLIED`, displays summary cards: `X Applied Successfully`, `Y Rejected (e.g. Cycle Locked)`.
- **`KpiExplainabilityDrawer`** (`frontend/src/features/reports/components/`):
  - Slide-over drawer opened from `KpiBreakdown` "View explanation" button.
  - Displays Score, Measurement, Source Snapshot, Comment, Rationale, and Evidence list.
  - Handles superseded evidence with clear `SUPERSEDED` badge, replacement link, date, and reason.

---

### 7. Comprehensive Verification Matrix

1. **Idempotency**:
   - Calling `POST /apply` twice sequentially returns 200 OK without re-applying, re-scoring, or duplicating evidence/audit logs.
   - Calling `POST /apply` while another apply is running returns 409 Conflict (`APPLYING`).
2. **Cycle Lock & Immutability**:
   - Attempting to apply to a `LOCKED` cycle or `PUBLISHED` evaluation marks row `REJECTED` and produces `PARTIALLY_APPLIED` (or `FAILED` if all locked) with exact error reason.
   - Applied evidence records cannot be updated or deleted; superseding appends a new record and updates status to `SUPERSEDED`.
3. **Conflict Resolution**:
   - Competing values for the same `(cycle, employee, kpi)` result in `CONFLICT` status and block apply until resolved via `PATCH`.
4. **RBAC Security Matrix**:
   - `POST /imports`, `PATCH /imports/:id`, `POST /apply` with `SYSTEM_ADMIN` token $\rightarrow$ 403 Forbidden.
   - `POST /apply` with `EMPLOYEE` / `MANAGER` token $\rightarrow$ 403 Forbidden.
   - `GET /evaluations/:id/kpis/:code/evidence`: Employee accessing self $\rightarrow$ 200; accessing peer $\rightarrow$ 403; Manager accessing team member $\rightarrow$ 200; accessing another team $\rightarrow$ 403; System Admin accessing read-only $\rightarrow$ 200.
5. **Scoring Integrity**:
   - Import measurement $\rightarrow$ Rule Engine $\rightarrow$ Scoring Engine $\rightarrow$ `weighted_score` $\rightarrow$ `overall_score` maintains exact scoring pipeline behavior with `ROUND_HALF_UP` only at scoring engine.
6. **Swagger Documentation**:
   - All 7 endpoints verified in Swagger UI with correct schemas and response models.

---

`STATUS: WAITING FOR USER REVIEW - STEP 4`
