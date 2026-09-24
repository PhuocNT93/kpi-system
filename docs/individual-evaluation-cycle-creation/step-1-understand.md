# Step 1: Understand

Status: reconstructed from approved review output (three revisions; final version approved).

## Deliverable

### Task Understanding

Goal: `POST /evaluation-cycles/individual` creates, for every valid employee, one `evaluation_cycle` with `cycle_type = INDIVIDUAL_SCHEDULED`, one evaluation, its evaluation_items and snapshots — using the same generation logic as Open Cycle (EVAL-02). Soft warning when the employee belongs to an upcoming Batch cycle. Frontend UI for authorized users.

Approved decisions:

| # | Decision |
|---|---|
| Q1 | One `INDIVIDUAL_SCHEDULED` cycle **per employee** (one evaluation each). N employees → N cycles in one transaction. |
| Q2 | `triggered_by_employee_id` = the evaluated employee. The actor stays in `created_by` and the audit actor. |
| Q3 | Upcoming window = N weeks via env `UPCOMING_BATCH_CYCLE_WINDOW_WEEKS`, default 4 (reuse existing config if found — none found). |
| Q4 | RBAC per LLD: HR_ADMIN/SYSTEM_ADMIN org-wide; MANAGER only for employees in `managedTeamIds`; EMPLOYEE 403. |
| Q5 | Employee with an active evaluation is **skipped**; others still created. Partial skip → 201 with `skipped`; all skipped → 409 `EVALUATION_ALREADY_OPEN`; invalid/out-of-scope input fails the whole request (400/404/403/422). |
| Q6 | Hard block (never create a second active evaluation), concurrency-safe. |
| Q7 | Error code `EVALUATION_ALREADY_OPEN` (LLD). |
| Q8 | `code` auto-generated; `name`, `start_date`, `end_date` from request. |
| Q9 | "Active" = non-terminal status (finalized in Step 3, C5). |
| Q10 | Individual cycle is created directly in `OPEN`. |

Expected Behavior: see decisions above; transaction all-or-nothing for created items; concurrent requests for the same employee yield at most one active evaluation; batch `POST /evaluation-cycles/{id}/open` unchanged; existing cycles are `BATCH`.

Acceptance Criteria:
1. Migration adds `cycle_type` (NOT NULL, legacy = `BATCH`, CHECK enum) and `triggered_by_employee_id` (nullable FK employee), CHECK non-null iff `INDIVIDUAL_SCHEDULED`; unique timestamp prefix.
2. Endpoint uses zod, standard envelope, `AppError`, snake_case wire fields.
3. Batch and Individual call the same generation function for evaluation + items + snapshots.
4. Individual snapshots identical in structure/values to batch.
5. Active evaluation per state machine; skipped employees listed; all skipped → 409 `EVALUATION_ALREADY_OPEN`.
6. No duplicate active evaluation under concurrency.
7. Duplicate `employee_ids` deduplicated.
8. `UPCOMING_BATCH_CYCLE` warning within the env window, non-blocking, deduplicated per (employee, batch cycle).
9. One `INDIVIDUAL_CYCLE_CREATED` audit per created cycle, same transaction; none for skipped or on rollback.
10. RBAC as Q4.
11. FE: hook → mutation → typed client → mapper; success / partial / warning / 409 / 403 / validation / unexpected states; targeted query invalidation; no `any`.
12. BE/FE tests actually executed; typecheck, lint, tests pass.

Out of Scope:
- Auto-create on due date (Phase 2), scheduled job, email sending changes.
- `GET /reviews/due`.
- Unrelated refactors; the in-progress review-due-date work.

Business Rules Involved:
- LLD §10.3 (`cycle_type`, `triggered_by_employee_id`, applicable null for individual), §14.1 (reuse Open Cycle 100%, 409 `EVALUATION_ALREADY_OPEN`, audit `INDIVIDUAL_CYCLE_CREATED`, dedup warning with N-week window, no DB-level global uniqueness), §16/§17 RBAC, snapshot immutability, append-only audit in the same transaction, lock checks in the same transaction.

Open Questions / Conflicts (resolved):
- LLD "exactly 1 employee" vs. task "1 cycle for N" → Q1 = B (LLD).
- LLD "skip the employee" vs. task "block whole request" → Q5 = skip.
- LLD "soft warning / no DB constraint" vs. 409 → Q6 = hard block at service layer, no DB constraint.

## Inputs Reviewed
- `usage.md`, `docs/AI_AGENT_WORKFLOW.md`, LLD §10.3, §14.1, §16, §17, §28–§30, `Sequence_Diagrams_System.md` §3.

## Actions and Evidence
- `grep`/`sed` over the LLD for `cycle_type`, `INDIVIDUAL`, `triggered_by`, `upcoming`, Open Cycle; read LLD lines 425–460, 780–870, 1795–1840.

## Changes Made
- None.

## Decisions and Rationale
- As listed in the decision table; each confirmed by the user.

## Risks / Blockers
- None open.

## Next Step
Step 2 — Investigate.
