# Step 2: Investigate

Status: reconstructed from approved review output.

## Deliverable

### Investigation

Relevant Documents:
- LLD §10.3, §14.1, §16, §17, §30; `Sequence_Diagrams_System.md` §3; `BACKEND_NODE_RULES.md` §3–§7; `FRONTEND_REACT_RULES.md` §2, §5, §7, §8.

Relevant Modules and Files:
- EVAL-02: `backend/src/modules/evaluation-cycle/application/evaluation-cycle-opening.service.ts`
- Cycle CRUD: `evaluation-cycle.service.ts`, `api/evaluation-cycle.controller.ts`, `api/evaluation-cycle.router.ts`, `api/evaluation-cycle.dto.ts`
- Domain/Repo: `domain/evaluation-cycle.types.ts`, `domain/evaluation-cycle.repository.ts`, `infrastructure/postgres-evaluation-cycle.repository.ts`, `application/criterion-applicability.resolver.ts`
- State machine: `backend/src/modules/evaluation/application/services/evaluation-transition.service.ts`, `evaluation/domain/evaluation.types.ts`
- Audit: `audit/application/audit.service.ts`, `audit/domain/audit.domain.ts`
- RBAC: `shared/auth/authorizer.service.ts`, `shared/auth/types.ts`
- Config: `backend/src/config/business-time.config.ts`
- FE: `features/evaluation-cycles/{api/cycle-api.ts, hooks/use-evaluation-cycles.ts, types/cycle-types.ts, components/EvaluationCycleForm.tsx, pages/ReviewDueDashboard.tsx, pages/EvaluationCycleUpsertPage.tsx}`, `shared/api/api-client.ts`, `App.tsx`

Existing Implementation:
- EVAL-02 lives entirely in `EvaluationCycleOpeningService.openCycle()` (lines 36–745) inside one `withTransaction`:
  1–2 lock cycle (`findByIdForUpdate`), require DRAFT + transition (batch-only);
  3 validate template version PUBLISHED and mirror into legacy template tables (58–162);
  4 load criteria/KPI, mirror legacy scoring_rule/criterion/criterion_version/template_criterion, weight sum = 100 (164–452);
  5 load `criterion_level` (454–477);
  6 **resolve employees** — ACTIVE AND applicable_employee_ids AND team AND role; skip missing team/role (479–534) — the only batch-specific selection;
  7 employee snapshot from `employee_assignment` effective at `cycle.startDate`, fallback current employee (536–577);
  8 `evaluationRepo.batchCreate` status OPEN (579–586); 8.5 i18n translations (588–610);
  9 item snapshots via `CriterionApplicabilityResolver` (612–683); 10 `evaluationItemRepo.batchCreate`;
  11 cycle → OPEN; 12 audit `CYCLE_OPENED`; 13 enqueue `CYCLE_OPENED` notifications.
  No reusable function exists; reuse requires extraction.
- Schema: `evaluation_cycle` has no `cycle_type` / `triggered_by_employee_id`; has `applicable_employee_ids` (migration `1788926000007`) and `calibration_enabled`. `evaluation` unique `(evaluation_cycle_id, employee_id)`; no global active uniqueness. Latest migration prefix `1791000000002` → next `1791000000003`.
- Evaluation statuses: `DRAFT, OPEN, SELF_ASSESSMENT, MANAGER_ASSESSMENT, REVIEWING, CALIBRATION, APPROVED, PUBLISHED, LOCKED` + legacy `SUBMITTED, MANAGER_REVIEW, REJECTED`. Terminal-ish: LOCKED, PUBLISHED→LOCKED, REJECTED→LOCKED, APPROVED auto-publishes. Reports treat APPROVED/PUBLISHED/LOCKED as completed. No existing "active evaluation" helper.
- Concurrency: `withTransaction`; no advisory locks anywhere; existing pattern `SELECT … FROM employee e … ORDER BY e.employee_id FOR UPDATE OF e` (`postgres-review-schedule.repository.ts:114`).
- Audit: `AuditService.record(tx, …)` in-transaction; `action` validated as string.
- RBAC: router inline `requireHrAdmin` on all cycle writes; `RbacAuthorizer` denies MANAGER `CREATE`; scope precedent `actor.managedTeamIds.includes(teamId)` in service.
- Response: `sendCreated`/`sendSuccess`; no `meta.warnings` convention. `Conflict(message, code)`; `AppError.details`.
- Config: env reader pattern in `business-time.config.ts`; no batch-window config exists.
- FE: typed `evaluationCycleApi` via `postApi`; `CYCLE_QUERY_KEYS`; mutation hooks; mapper inside `api/`. `EvaluationCycleForm` already has employee multi-select with search, review-due status, template select, `managedTeamIds`. `ReviewDueDashboard.tsx` is a stub using raw `fetch` + fake data, not routed; no backend `GET /reviews/due`. `ApiClientError` has no `details`; `postApi` returns `data` only. `/admin/cycles*` routes HR/Admin only.

Existing Tests:
- `backend/test/evaluation-cycle-api.test.ts` (TC-EC-01..08) gated by `describe.runIf(DATABASE_URL)`; no `DATABASE_URL`/docker locally → skipped.
- Mock-pool unit pattern: `backend/test/concurrency-hardening.test.ts`; mocks in `backend/test/mocks/`.
- FE: vitest + Testing Library; no tests in `evaluation-cycles`.

Patterns to Reuse:
- `withTransaction`, `evaluationRepo.batchCreate`, `evaluationItemRepo.batchCreate`, `CriterionApplicabilityResolver`, `AuditService.record(tx)`, `Conflict`/`ValidationError`, zod DTO, `sendCreated`, `FOR UPDATE OF e` ordered lock, env config pattern, `getBusinessTimeZone`.
- FE: `postApi`, `CYCLE_QUERY_KEYS`, `useTemplatesQuery`, `useEmployees`, `useAuth`, `PageToast`, `ErrorAlert`, employee picker UI.

Findings raised: LLD/code mismatch on applicable fields; batch open does not lock employees; review-due dashboard is a stub; `audit.domain.ts` has uncommitted edits of another task; no local DB.

## Inputs Reviewed
- Files listed above.

## Actions and Evidence
- `find`, `cat`, `sed`, `grep` on the files above; `echo ${DATABASE_URL:+yes}` → empty; `docker ps` → `docker: command not found`.

## Changes Made
- None.

## Decisions and Rationale
- Extraction of EVAL-02 is required for reuse.

## Risks / Blockers
- Integration/concurrency tests against real Postgres cannot run locally.

## Next Step
Step 3 — Impact Analysis.
