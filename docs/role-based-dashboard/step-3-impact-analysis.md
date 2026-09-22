# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | New feature module `features/dashboard/` & route `/admin/dashboard` | Implements role-specific views using TanStack Query. Updates `SmartHomeRedirect` in `App.tsx` so authenticated users land on dashboard. No client-side recalculations. |
| Backend | Extends `ReportsQueryService` and `ReportsController` | Adds `getRoleBasedDashboard` endpoint returning pre-aggregated metrics tailored to user role and scope. Enforces API envelope `{ success, message, data, meta }` with `last_updated_at`. |
| Database | Read-only access to existing read models | Reuses existing read model tables and indexes. No schema migrations required. |
| API | `GET /api/reports/dashboard` (and alias `GET /api/dashboard`) | Secured via JWT middleware. Optional `cycleId` filter. Returns role-scoped cards, distributions, review due, and attention links. |
| RBAC & Scope | Server-side enforcement | Scoped strictly by JWT actor context. Ignores/rejects client scope override parameters. |
| Privacy & Anti-Ranking | Strict enforcement | Zero individual or team ranking, zero percentiles, zero "top/bottom performer" lists across APIs and UI presentation. |
| Workflow & Lifecycle | Read-only observation | Integrates with existing evaluation statuses. Navigation links to existing action pages without inline mutations. |
| Audit | Read aggregation for System Admin | Dashboard reads do not generate audit churn; System Admin view aggregates recent operational audit activity. |
| Locking & Concurrency | None | Pure read operations against read models; no database row locks. |
| Scoring & Snapshots | Read from snapshots | Preserves historical scores and snapshots across cycles without joining live criteria templates. |
| Performance | Indexed, pre-aggregated queries | Leverages existing read model tables and composite indexes. Frontend uses TanStack Query caching. |
| Security | PII & IDOR protection | Prevents IDOR by binding queries to authenticated JWT claims. Omits sensitive PII. Returns 403 on forbidden scope access. |

Risk Assessment:
- Risk 1: Incomplete projections for newly created evaluations -> Handled by fallback projection or graceful empty states.
- Risk 2: Multi-team or dynamic manager assignment scope leaks -> Scope strictly queries teams where `team.manager_id = actor.employeeId`.
- Risk 3: Inadvertent score comparison or rank inference -> Distribution charts present anonymous count buckets only.

Architectural Decisions / ADR:
- ADR 1: Unified Role-Aware Endpoint (`GET /api/reports/dashboard`).
- ADR 2: Direct Reuse of Review Status Engine (`getEmployeeReviewStatus`).
- ADR 3: Landing Screen Redirection via `SmartHomeRedirect` to `/admin/dashboard`.

## Inputs Reviewed
- Step 1 Understand
- Step 2 Investigate

## Actions and Evidence
- Evaluated system impact across all 12 mandatory categories.
- Identified and addressed risks regarding scoping, projection staleness, and anti-ranking.

## Changes Made
- None.

## Decisions and Rationale
- Confirmed zero-schema-change approach by leveraging existing read models.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
