# Step 8: Code Review

Status: produced during this step

## Deliverable

Findings:
- [MEDIUM] `backend/src/modules/evaluation/application/services/evaluation.service.ts`: role-conditional scoring receives `role_id_snapshot`, which is an identifier rather than guaranteed configured role code. Corrective action: snapshot/use the configured role code or add a repository query through the Organization public interface.
- [MEDIUM] `backend/src/modules/evaluation/domain/scoring/scoring-engine.ts`: invalid input validation remains narrower than the full acceptance matrix; negative weights, missing level matches, and non-finite individual level values need stable configuration/input errors.
- [MEDIUM] Frontend evaluation tests do not yet cover the new scoring breakdown, recalculation pending state, or lock/version error rendering. Existing frontend regression tests pass, but feature-specific UI coverage is incomplete.
- [MEDIUM] Migration verification and database-backed recalculation integration remain unexecuted because `TEST_DATABASE_URL` is unavailable.

Resolved Findings:
- [HIGH] Recalculation now acquires an evaluation row lock through `findByIdForUpdate`.
- [HIGH] Scoring item updates now use an optimistic version predicate and return `VERSION_CONFLICT` on mismatch.
- [MEDIUM] Recalculation now fails closed when audit wiring is unavailable, and successful scoring records audit data in the transaction.
- [MEDIUM] Valid zero scores are preserved by persistence mappers.
- [MEDIUM] Measurement-based recalculation now uses fresh Rule Engine output instead of stale raw scores.

Review Checklist:
- Requirement correctness: PASS with medium follow-ups
- Architecture and module boundaries: PASS
- Security and RBAC/scope: PASS for existing actor checks; role-code context follow-up remains
- Data integrity, audit, and history: PASS for implemented transaction/lock/audit path; migration verification pending
- Error handling and concurrency: PASS for row lock and optimistic item version path
- Regression risk: MEDIUM; existing suites pass but new API/UI and migration paths lack database/integration coverage

## Inputs Reviewed
- Approved Step 7 test results
- Full implementation diff and untracked migration/artifact files
- Focused scoring tests and typecheck results

## Actions and Evidence
- Reviewed scoring engine, recalculation service, repositories, migrations, API route, and frontend detail changes.
- Focused scoring tests after corrections: 10 passed.
- Backend typecheck after corrections: passed.
- `git diff --check` after corrections: passed.
- Backend full suite after version-contract changes: 308 passed, 30 skipped.

## Changes Made
- Added row-level evaluation locking and optimistic version-aware scoring updates.
- Added evaluation/evaluation-item version migration.
- Made audit availability mandatory for recalculation.
- Corrected zero-score persistence and stale measurement score handling.

## Decisions and Rationale
- High-severity concurrency and audit gaps were repaired before advancing.
- Remaining medium findings are documented rather than silently bypassed.

## Risks / Blockers
- Database-backed migration and end-to-end recalculation API verification require `TEST_DATABASE_URL`.
- Role-conditional integration needs a role-code snapshot or Organization lookup.
- Feature-specific frontend tests remain a coverage gap.

## Next Step
- Step 9: Performance Review.
