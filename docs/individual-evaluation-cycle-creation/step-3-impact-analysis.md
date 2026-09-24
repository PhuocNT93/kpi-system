# Step 3: Impact Analysis

Status: reconstructed from approved review output.

## Deliverable

### Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | MEDIUM | New API function, types/mapper, mutation hook, page to create Individual Evaluation reusing employee/template selection. Route + entry for HR/Admin/Manager. Batch form untouched; review-due stub untouched. |
| Backend | HIGH | Extract generation logic out of `openCycle()` into a shared service; `openCycle` calls it with unchanged behavior. New `IndividualCycleCreationService`, DTO, controller method, route, repo methods (employee lock, active evaluations, upcoming batch), env config. |
| Database | MEDIUM | Migration `1791000000003`: `cycle_type varchar(20) NOT NULL DEFAULT 'BATCH'` + CHECK; `triggered_by_employee_id uuid NULL` FK employee; CHECK trigger consistency; indexes. Legacy rows become `BATCH`. No unique index for active evaluations. |
| API | MEDIUM | New `POST /evaluation-cycles/individual`. `GET /evaluation-cycles[/:id]` adds `cycle_type`, `triggered_by_employee_id` (additive). |
| RBAC / Scope | HIGH | Endpoint opens to MANAGER; EMPLOYEE 403 at router; service enforces `team_id ∈ managedTeamIds` on locked employee rows; any out-of-scope employee → 403 whole request. `RbacAuthorizer` untouched. |
| Workflow | LOW | Individual cycle created directly in `OPEN`. State machine unchanged. |
| Audit | MEDIUM | Add `INDIVIDUAL_CYCLE_CREATED` to `AuditActionSchema`; one entry per cycle in the same transaction; none for skipped. |
| Concurrency | HIGH | Lock employee rows `FOR UPDATE OF e` ordered by `employee_id` before active check and inserts. Batch `openCycle` does not lock employees (accepted, C2). |
| Performance | LOW | Template preparation runs once per request; `employee_ids` capped at 100. |
| Historical Data | MEDIUM | Legacy cycles `BATCH`; batch snapshots must stay byte-identical — regression test on `batchCreate` payloads. |

Shared design:

```
EvaluationGenerationService (new, extracted verbatim from openCycle)
  ├─ prepareTemplateSnapshot(client, templateVersionId)      steps 3–5 + 8.5
  ├─ generateEvaluations(client, {cycleId, snapshotDate, employees, template, actor})  steps 7–10
  └─ enqueueCycleOpenedNotifications(...)                   step 13
openCycle:   lock → validate → prepare → resolve by filter → generate → OPEN → audit CYCLE_OPENED → notify
individual:  validate → lock employees → scope → active check → warnings → prepare once
             → per employee: create cycle(OPEN) → generate → audit INDIVIDUAL_CYCLE_CREATED → notify
```

Potential Risks:
1. EVAL-02 regression from extraction — move code verbatim; regression test.
2. No local DB — concurrency/rollback verified with mocks only; DB tests `runIf(DATABASE_URL)` skipped locally.
3. Concurrent batch open + individual create can yield two active evaluations (accepted, LLD Risk #11).
4. Existing `resolveValidEmployeeId` falls back to "first employee" — reused for consistency, not fixed here.
5. Shared uncommitted files with another task (`audit.domain.ts`, `app.ts`, `swagger.ts`, `.env.example`).

Required ADR / Clarification (all approved "C1–C8 đồng ý"):
- C1 Individual cycle stores `applicable_employee_ids = [employee_id]`, team/role empty; update LLD §10.3.
- C2 (a) Accept batch/individual race; do not change batch.
- C3 (a) UI entry on Evaluation Cycles + new route `/cycles/individual/new` open to Manager; keep dashboard stub.
- C4 Allowed to edit dirty files (`audit.domain.ts`, `.env.example`, `swagger.ts`).
- C5 Active = status NOT IN (`APPROVED`,`PUBLISHED`,`LOCKED`,`REJECTED`) AND `is_locked = false` AND cycle status ≠ `LOCKED`.
- C6 Individual cycles enqueue `CYCLE_OPENED` notifications via shared code.
- C7 Response 201 `data = { created[], skipped[], warnings[] }`; all skipped → 409 `EVALUATION_ALREADY_OPEN` with `meta.error.details`. Request: `name?` (default "Individual Review", actual `"{name} - {employee_code}"`), `evaluation_template_version_id`, `employee_ids` (1–100, dedup), `start_date`, `end_date`. Code `IND-{employee_code}-{yyyymmdd}-{rand6}` ≤ 50 chars.
- C8 Upcoming batch = `cycle_type = BATCH`, `status = DRAFT`, `start_date ∈ [today, today + N weeks]` in `BUSINESS_TIMEZONE`, employee matching the same applicable predicate as step 6 of `openCycle`; N = `UPCOMING_BATCH_CYCLE_WINDOW_WEEKS` (default 4).

## Inputs Reviewed
- Step 2 findings.

## Actions and Evidence
- Analysis only.

## Changes Made
- None.

## Decisions and Rationale
- C1–C8 as above, approved by the user.

## Risks / Blockers
- As listed.

## Next Step
Step 4 — Plan.
