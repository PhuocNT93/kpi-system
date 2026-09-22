# Step 1: Understand

Status: reconstructed

## Deliverable

## Task Understanding

Goal: Implement a role-based Dashboard and Summary Statistics feature for the Employee Performance Evaluation Management System across backend and frontend, delivering immediate insights upon login for Employee, Manager, HR/Admin, and System Admin, strictly enforcing server-side authorization, resource scoping, read-model aggregation, and strict privacy controls (zero individual or team ranking).

Expected Behavior:
- Role & Scope Enforcement strictly from authenticated JWT/session context (Employee: self, Manager: managed teams, HR/Admin: organization/dept/team, System Admin: operational/audit).
- Privacy & Anti-Ranking: Strictly no stack-ranking, percentiles, "top/bottom" employee lists, or score-based ordering anywhere in APIs, charts, tables, or exports.
- Backend-Owned Aggregation & Reporting Read Model: All metrics computed server-side reusing existing read models (`employee_evaluation_score_read_model`, `team_evaluation_aggregate_read_model`, `organization_aggregate_read_model`) and review cadence engine.
- Frontend Presentation: Built in `features/dashboard/` with TanStack Query, responsive layout, loading skeletons, explicit empty states, and 403 forbidden handling.

Acceptance Criteria:
1. Unified/role-aware Dashboard API endpoint (`GET /api/reports/dashboard`, alias `GET /api/dashboard`) authenticates via JWT and returns data strictly scoped to caller's role.
2. Employee Dashboard displays self evaluation status, overall score, last published score, historical score trend, criteria breakdown, strengths/development areas, and review cadence status.
3. Manager Dashboard displays team aggregate summary, workflow stage distribution, score distribution histogram, criterion aggregates, team review due/overdue summary, and actionable attention items.
4. HR/Admin Dashboard displays organization overview, active cycles, workflow bottlenecks, score distribution, department/team aggregates, cycle trends, and review due overview.
5. System Admin Dashboard displays operational overview (users, roles, teams, departments, cycles, published templates, audit activity overview).
6. Zero personal or team ranking, percentile, or stack-ranking anywhere in API or UI.
7. No business logic recalculations on frontend.
8. UI robustness: responsive layouts, accessible charts with textual summaries, loading skeletons, empty states, and unauthorized (403) handling.
9. Comprehensive backend and frontend automated tests validating RBAC scope, aggregation, privacy, and rendering.

Out of Scope:
- Stack-ranking, leaderboards, top/bottom performers, or peer comparisons.
- In-widget mutations or custom workflow actions directly from dashboard.
- Creating an external OLAP or separate heavy reporting engine.
- Client-side export generation bypassing backend authorization and audit logging.

Business Rules Involved:
- RBAC and Resource Scoping (LLD section 4).
- Evaluation Lifecycle & Workflow States (`DRAFT` to `LOCKED`).
- Review Due Cadence Precedence (Employee override -> Job level default -> System default).
- Reporting Read Model & Freshness (`last_updated_at`).
- PII Protection.

Open Questions / Conflicts:
- None.

## Inputs Reviewed
- User request prompt
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`
- `docs/Sequence_Diagrams_System.md`

## Actions and Evidence
- Analyzed role matrix and scope boundaries.
- Confirmed strict anti-ranking mandates from LLD section 13.
- Checked reporting read model and review cadence requirements.

## Changes Made
- None.

## Decisions and Rationale
- Decided on unified role-aware API endpoint returning server-aggregated data.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
