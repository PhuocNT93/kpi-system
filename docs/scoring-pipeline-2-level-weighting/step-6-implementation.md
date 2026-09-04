# Step 6: Implement

Status: produced during this step

## Deliverable

Implementation

Changes Made:
- `backend/src/modules/evaluation/domain/scoring/scoring-engine.ts`: Added pure two-level scoring with exact decimal-string arithmetic, explicit N/A/disabled handling, configurable level maximums, KPI and overall denominators, and final HALF_UP percentage rounding.
- `backend/src/modules/evaluation/domain/scoring/scoring-engine.test.ts`: Added deterministic focused tests for normalization, custom decimal scores, denominator exclusion, N/A KPI exclusion, final rounding, and no-applicable-KPI failure.
- `backend/migrations/1724500000011_add_scoring_pipeline_snapshots.ts`: Added KPI snapshot fields, normalized criterion score storage, and evaluation scoring breakdown storage.
- Evaluation cycle snapshot types/repository/opening service: Persist and map KPI identity/name/weight from published configuration into evaluation items.
- Evaluation service/controller/router/module/app: Added authenticated manager/HR recalculation, Rule Engine measurement resolution, Scoring Engine aggregation, lock checks, transaction, audit record, and common-envelope action endpoint.
- Frontend evaluation API/models/page: Added scoring contracts, recalculation action, and backend-provided criterion/KPI/overall breakdown rendering.

Decisions Applied:
- Reused existing KPI/template grouping and snapshot structures.
- Used `final_score`/`manager_score` for existing persisted overall compatibility and exposed calculated `official_score` as the calculated overall result.
- Kept formulas out of frontend; the UI renders returned values only.

Deferred / Not Changed:
- Existing repository-wide lint debt was not refactored.
- Migration execution could not be performed because no `TEST_DATABASE_URL` is configured.
- Existing broader API/frontend mapping conventions were preserved to avoid unrelated refactoring.

## Inputs Reviewed
- Approved Steps 0-5
- Existing evaluation, configuration, Rule Engine, migration, audit, and frontend code

## Actions and Evidence
- Focused scoring test: PASS, 8 tests.
- Backend typecheck: PASS.
- Frontend typecheck: PASS.
- Backend build: PASS.
- Frontend build: PASS, with existing bundle-size warning.
- Full backend tests: PASS, 306 passed and 30 skipped.
- Full frontend tests: PASS, 32 passed.
- Backend lint: FAIL, 160 existing repository errors.
- Frontend lint: FAIL, 82 existing repository errors.
- Migration tests: SKIPPED because `TEST_DATABASE_URL` is unavailable.
- `git diff --check`: PASS.

## Changes Made
- Implemented the approved scoring and snapshot/API/UI slices.

## Decisions and Rationale
- Scoring was implemented as a pure domain engine first and integrated through the existing application service.
- KPI context is snapshotted at evaluation creation to prevent current configuration leakage.

## Risks / Blockers
- Database migration execution and end-to-end recalculation API verification require a configured test database.
- Existing lint failures are broader than this feature and were not changed.
- Role-conditional rule branches require a role-code snapshot; current evaluation data provides a role identifier, so that branch should receive dedicated integration verification.

## Next Step
- Step 7: Test.
