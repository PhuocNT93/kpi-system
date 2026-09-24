# Step 9: Performance Review

Status: produced during this step

## Deliverable

### Performance Review

Findings:
- [Low → watch] `findActiveEvaluationsByEmployees` filters `evaluation` by `employee_id`, but `evaluation` has no index on `employee_id` (only PK and unique `(evaluation_cycle_id, employee_id)`, whose leading column is the cycle). Postgres uses a sequential scan of `evaluation`. At current/LLD scale (~1,000 employees × ~2–4 evaluations/year, 2-year retention ≈ 4–8k rows) this is sub-millisecond-to-few-ms, but it runs while employee rows are locked. Recommended follow-up (not done — no measured problem, and adding it is a schema change): `CREATE INDEX evaluation_employee_id_idx ON evaluation (employee_id)` in a later migration; it would also help the existing employee-search lateral join.
- [Low] Per-employee work inside one transaction: for N employees ≈ N × (cycle insert + assignment select + evaluation insert + item insert + audit insert + ≤2 notification queries) ≈ 6–7N statements, plus one-time template preparation (~15–25 statements), one lock, one active check, one upcoming-batch query. With the enforced cap of 100 employees ≈ ≤ 700 short statements; employee row locks are held for the whole transaction. Acceptable for a manual, low-frequency HR action; batching inserts across employees would reduce round trips but adds complexity without evidence.
- [OK] Template preparation (legacy mirroring, criteria, levels, translations) runs once per request, not per employee (verified by TC-BE-02 spy: `prepareTemplateSnapshot` called once for 3 employees).
- [OK] Upcoming-batch query uses the new index `idx_evaluation_cycle_type_status_start (cycle_type, status, start_date)`; matching is in memory over the few DRAFT cycles in the window. Employee lock uses the PK. `employee_assignment` lookup uses the existing `(employee_id, effective_from, effective_to)` index.
- [OK] Batch `openCycle`: identical statement set to before the extraction (equivalence run) — no performance change.
- [OK] Frontend: one employees query, one templates query, one teams query (cached by TanStack keys); client-side search/paging is memoized; no inner scroll; mutation invalidates only `['evaluation-cycles']` and `['organization','employees']`. Response payload is bounded by the 100-employee cap.
- [Deferred, from Step 8] Employee list limited to the first page (50) — functional issue deferred by user decision (b); a server-side search picker would also bound payload size.

Actions Taken:
- None (no optimization introduced without evidence, per workflow).

## Inputs Reviewed
- Service/repository SQL in Step 6; `pg_indexes` for `evaluation`, `evaluation_cycle`, `employee_assignment` on the local Docker Postgres.

## Actions and Evidence
- Ran read-only `SELECT … FROM pg_indexes WHERE tablename IN ('evaluation','evaluation_cycle','employee_assignment')` → 9 indexes; none on `evaluation(employee_id)`; new cycle indexes present.

## Changes Made
- None.

## Decisions and Rationale
- Index recommendation reported, not applied (schema change without measured need).

## Risks / Blockers
- None blocking.

## Next Step
Step 10 — Final Verification.
