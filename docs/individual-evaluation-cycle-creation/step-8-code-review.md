# Step 8: Code Review

Status: produced during this step

## Deliverable

### Code Review

Findings:
- [High] `frontend/src/features/evaluation-cycles/pages/IndividualCycleCreatePage.tsx` (via `useEmployees()` → `employeeApi.getEmployees`): the employee list loads only the first page (`page_size=50`, backend max 100). Organisations with more than 50 employees cannot select the rest. Same pre-existing limitation as the batch cycle form. Corrective action (needs approval): use the server-side employee search endpoint (query + paging) for the picker. **Not fixed.**
- [Medium] `IndividualCycleResultPanel.tsx`: created-cycle links pointed to `/admin/cycles/:id`, a route MANAGER cannot open. **Fixed** — link shown only when `canOpenCycle` (non-manager); managers see the code as text.
- [Medium, pre-existing, out of scope] `backend/src/modules/configuration/api/configuration.controller.ts:254` `createTemplate` has no try/catch/`next(e)`; an async error (audit `performed_by` null) crashes the Node process. Corrective action: wrap like sibling handlers; investigate null actor. **Not changed** (outside this task).
- [Low] `individual-cycle-creation.service.ts` `buildCycleCode`: a random 6-hex suffix collision (≈1 in 16.7M per employee/day) would raise a unique violation → HTTP 500 and rollback of the whole request. Acceptable; could add retry later.
- [Low, pre-existing] `actor-resolution.ts` (moved verbatim): falls back to the first employee/user when the actor cannot be mapped, so `created_by`/audit actor may be wrong in misconfigured environments. Reused for consistency with batch; not fixed.
- [Low, accepted C2] Batch `openCycle` does not lock employees; a batch open concurrent with an individual creation can still yield two active evaluations.
- [Low, UX, user-raised] The picker does not show who already has an active evaluation (users learn it only after submit). Proposal (pending decision): eligibility indicator backed by the same active rule.
- [Info] **Fixed**: removed unused exported type `UpcomingBatchCycleMatch`.
- [Info] Test gaps: no Postgres integration tests (concurrency/rollback covered by mock unit tests); `IndividualCycleCreatePage` component test not written.

Review Checklist:
- Requirement correctness: PASS (with the High finding on >50 employees open)
- Architecture and module boundaries: PASS — controller parses/maps only; service owns the transaction; generation logic shared; no cross-module repository access beyond the existing `employee`/`app_user` reads already done by EVAL-02
- Security and RBAC/scope: PASS — router blocks EMPLOYEE; service re-checks role and MANAGER team scope on row-locked data; `RbacAuthorizer` untouched
- Data integrity, audit, and history: PASS — single transaction; audit in-transaction per cycle; snapshots produced by the unchanged EVAL-02 code (equivalence verified)
- Error handling and concurrency: PASS — AppError codes (400/403/404/409/422), `next(err)`; ordered `FOR UPDATE OF e` before active check
- Type error: PASS — `npm --prefix backend run typecheck` 0 errors; `npm --prefix frontend run typecheck` 0 errors
- Do not use type any: PASS — no `any` in changed/new source or tests
- Remove import not use: PASS — `npm --prefix backend run lint` clean; `npm --prefix frontend run lint` no findings in changed files
- Regression risk: PASS — batch open verified equivalent; batch form only changed its import of the moved review-status helpers

## Inputs Reviewed
- All files listed in Step 6; `employee.controller.ts` `getEmployees`; `employee-api.ts`; `pagination.ts`; `App.tsx` routes.

## Actions and Evidence
- `npm --prefix backend run typecheck` → no errors; `npm --prefix backend run lint` → no problems (after removing the unused type).
- `npm --prefix frontend run typecheck` → 0 `error TS`; `npm --prefix frontend run lint` → no findings in `features/evaluation-cycles`.

## Changes Made
- Removed `UpcomingBatchCycleMatch`; manager-safe result links; page centered (`maxWidth 1200px`, `margin 0 auto`, like Employee Search).

## Decisions and Rationale
- Out-of-scope and design-changing items are reported, not fixed, pending user decision.

## Risks / Blockers
- High finding (>50 employees) open.

## Next Step
Step 9 — Performance Review.
