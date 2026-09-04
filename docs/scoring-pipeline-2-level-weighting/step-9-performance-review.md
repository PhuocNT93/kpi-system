# Step 9: Performance Review

Status: produced during this step

## Deliverable

Findings:
- [MEDIUM] `backend/src/modules/evaluation/application/services/evaluation.service.ts`: recalculation writes one `UPDATE` per criterion inside one transaction. This is N+1 write behavior and increases transaction duration as criterion count grows. Recommended action: add a repository bulk scoring update using one parameterized statement or bounded batches while preserving optimistic-version predicates.
- [LOW] `frontend/src/features/evaluation/pages/EvaluationDetailPage.tsx`: successful recalculation invalidates only the detail query, although `manager_score`/`final_score` changes can affect team and personal evaluation list views. Recommended action: invalidate the affected list query according to the current viewer context.
- [LOW] `backend/src/modules/evaluation/infrastructure/persistence/postgres-evaluation-item.repository.ts`: latest-measurement lookup uses a lateral subquery per returned evaluation item. It is one SQL request and avoids application-level N+1 queries, but the database-backed performance of the lookup remains unverified without `TEST_DATABASE_URL`; verify an index on `(evaluation_item_id, recorded_at DESC)` before bulk rollout.
- [LOW] Scoring aggregation itself is in-memory and linear in the number of criteria/KPIs; no unnecessary database calls occur during aggregation.

Actions Taken:
- None. The review identifies optimization opportunities but does not change behavior without database benchmarks and a focused bulk-update design.

## Inputs Reviewed
- Approved Step 8 code review
- Evaluation recalculation service and repositories
- Frontend evaluation query invalidation
- Migration and snapshot query shape

## Actions and Evidence
- Inspected recalculation query flow: one evaluation lock, one snapshot read, one item update per scoring criterion, one evaluation update, and one audit insert.
- Inspected frontend mutation callbacks: recalculation invalidates `evaluation-detail` only.
- Inspected measurement loading: a single lateral-join query returns latest measurements.
- No database benchmark was possible because `TEST_DATABASE_URL` is unavailable.

## Changes Made
- No production changes during this step.
- Recorded performance findings and recommended follow-ups.

## Decisions and Rationale
- Keep correctness and transaction semantics unchanged until bulk update behavior can be tested against PostgreSQL.
- Treat the lateral lookup as query-level batching rather than application N+1, with index verification still required.

## Risks / Blockers
- Bulk recalculation performance and index effectiveness remain unverified without a test database.

## Next Step
- Step 10: Final Verification.
