# Step 1: Understand

Status: reconstructed

## Deliverable

## Task Understanding

### Goal
Implement backend and frontend capabilities for **Employee Search** and **Employee KPI Summary**:
1. **Backend Feature A — Employee Search API (`GET /employees/search`)**: Multi-filter, paginated, RBAC-scoped search supporting PostgreSQL `pg_trgm`-backed fuzzy search for Vietnamese names with diacritics, returning deduplicated employee records with current evaluation context.
2. **Backend Feature B — Employee KPI Summary API (`GET /employees/:id/kpi-summary`)**: Read-only, persisted evaluation summary providing official score clarity via `official_score_field`, overall weighted score vs. reference score, historical evaluation item snapshots, measurements, evidence, comments/rationales, reviewer details, and relationship snapshots.
3. **Frontend Employee Search UI**: Reusable search interface with filter combinations (free-text `q`, department, team, role, job level, manager, evaluation cycle, evaluation status), debounced `q`, pagination, loading/empty/error states, dark mode support, and navigation to KPI summary.
4. **Frontend Employee KPI Summary UI**: Dedicated read-only view displaying employee profile, evaluation cycle/status, official weighted score visually distinguished by `official_score_field`, reference overall score, full KPI list with weights/scores, and expandable/drawer KPI detail breakdown (measurement, evidence links, comment, rationale, reviewer, relationship snapshot) in both light and dark modes.

---

### Expected Behavior

#### Backend — Employee Search (`GET /employees/search`)
- Accepts query parameters: `employee_id`, `name`, `email`, `department`, `team`, `role`, `job_level`, `manager`, `evaluation_cycle`, `evaluation_status`, `q`, `page`, `size`.
- Applies all filters simultaneously with `AND` semantics.
- Free-text `q` searches employee code, full name, and email using PostgreSQL `pg_trgm` (trigram matching with support for Vietnamese diacritics, unaccented matching, partial strings, and typo tolerance).
- When filtering by `evaluation_cycle` and `evaluation_status`, filters for employees who have an evaluation in that cycle with that status; deduplicates rows so each employee appears at most once.
- Enforces service-layer RBAC:
  - `EMPLOYEE`: Can only search/view their own employee record.
  - `MANAGER`: Scoped strictly to employees in their managed team(s); cannot access employees outside their scope even if passing explicit filters.
  - `HR_ADMIN`: Full organization scope.
  - `SYSTEM_ADMIN`: Organization-wide read-only business data access.
- Returns standardized envelope: `{ success: true, message: "...", data: [...], meta: { page: { ... }, request_id: "..." } }`.
- Validates query parameters and pagination limits (page ≥ 1, 1 ≤ size ≤ 100).
- Fully documented in Swagger/OpenAPI.

#### Backend — Employee KPI Summary (`GET /employees/:id/kpi-summary`)
- Accepts path parameter `id` (employee UUID) and query parameter `evaluation_cycle_id` (or `evaluationCycleId`).
- Reads persisted evaluation data directly from `evaluation`, `evaluation_item`, `evidence`, and related snapshot tables.
- **Does not** recalculate scores, run scoring formulas, or fetch current live criteria/templates to overwrite historical snapshot data.
- Returns:
  - Employee header info (id, employee_code, name, email, department, team, role, job_level, manager).
  - Evaluation info (evaluation_id, cycle_id, cycle_name, status).
  - `overall_score`: Reference unweighted/average score.
  - `overall_weighted_score`: Official weighted result.
  - `official_score_field`: Explicit string (`"overall_weighted_score"`) indicating which score is official.
  - `kpi_items`: Array of KPI/criterion records including `criterion_code`, `criterion_name_snapshot`, `category`, `weight_snapshot`, `raw_score`, `weighted_score`, `measurement_value`, `measurement_unit`, `resolved_level`, `evidence` list (URL/FILE/TEXT), `comment`, `rationale`, `reviewer` info, and `kpi_relationship_snapshot`.
- Scope enforcement: Actor cannot read another employee's KPI summary unless permitted by RBAC (self, manager of team, HR/Admin, System Admin).
- Proper errors: 400 (invalid UUID / missing required parameters), 401 (unauthenticated), 403 (out-of-scope), 404 (employee or evaluation not found).
- Fully documented in Swagger/OpenAPI.

#### Frontend — Employee Search
- Screen with searchable filter bar: free-text `q` (debounced 300ms), dropdowns for department, team, role, job level, manager, evaluation cycle, and status.
- TanStack Query with exhaustive query keys (`['employees', 'search', filters]`).
- Clean separation: API returns `snake_case`, mapped at boundary to camelCase domain models.
- States: Skeleton loader during fetch, empty state with "Reset Filters" action, error alert with API error message, 403 forbidden state, paginated table footer.
- Row action: "View KPI Summary" navigates to `/employees/:id/kpi-summary?cycleId=...`.
- Verified in both light and dark mode.

#### Frontend — Employee KPI Summary
- Dedicated route/screen rendering:
  - Header: Employee identity, role, team, department, manager.
  - Evaluation status badge and cycle information.
  - Score summary cards: Reference Score vs. Official Score, with prominent visual distinction driven dynamically by `official_score_field` (never hard-coded on client).
  - KPI Table: Criterion, Category, Weight, Score, Weighted Score, Resolved Level.
  - Detail View (drawer or expandable section): Measurement details, Evidence list with links/badges, Comments, Rationale, Reviewer name/date, KPI relationship snapshot.
  - Purely read-only with no edit actions.
  - Handles loading skeleton, 404 not found, 403 unauthorized, and empty KPI states.
  - Verified in both light and dark mode with accessibility compliant contrast and semantics.

---

### Acceptance Criteria

1. **Migration & DB Indexes**:
   - Migration ensures `pg_trgm` extension exists.
   - GIN trigram index added on employee searchable fields (`full_name`, `employee_code`, `email`).
   - Query indexes on `team_id`, `role_id`, `job_level_id`, `department_id`, `manager_id`, `status`.
   - Migration is versioned and reversible (`down` script drops created indexes/extensions).
2. **Search Logic & Vietnamese Diacritics**:
   - `GET /employees/search` returns matching employees for multi-filter combinations.
   - Free-text `q` matches Vietnamese names with or without diacritics (e.g., `Nguyễn`, `Nguyen`, `Nguyễn Văn An`, `Nguyen Van An`), partial names, and typos.
   - Joining on `evaluation` does not duplicate employee rows when multiple evaluations exist.
3. **Search RBAC**:
   - Employee role only sees self in search results.
   - Manager role only sees members of their managed team(s).
   - HR_ADMIN sees all active/applicable organization employees.
   - SYSTEM_ADMIN has organization-wide read access.
   - Any query parameter attempting to bypass scope (e.g., manager filtering another team) is restricted by server-side actor scope.
4. **KPI Summary Contract & Immutability**:
   - `GET /employees/:id/kpi-summary` returns exact JSON contract with persisted evaluation data.
   - `official_score_field` is explicitly present and set to `"overall_weighted_score"`.
   - `overall_score` and `overall_weighted_score` reflect persisted database values without recalculation.
   - Evaluation item snapshots (`criterion_name_snapshot`, `weight_snapshot`, `scoring_rule_snapshot`, `level_definition_snapshot`) reflect historical snapshot without being overwritten by live criteria/templates.
   - Includes per-criterion measurements, comments, rationales, reviewer, and evidences.
   - Missing evaluation for cycle returns 404.
5. **OpenAPI / Swagger**:
   - Both `GET /employees/search` and `GET /employees/:id/kpi-summary` documented in Swagger with complete request parameters, response envelopes, error schemas, and field types.
6. **Frontend UI & TanStack Query**:
   - Employee search UI combines all filters with debounced `q`.
   - Query keys reflect all search parameters and pagination.
   - Wire snake_case converted to camelCase domain models at API boundary.
   - KPI Summary UI renders header, official score badge, reference score, KPI table, and detail drawer/expansion.
   - Full dark mode and light mode visual compliance across all components and states.
   - Read-only UI without score modification controls.
7. **Automated Tests**:
   - Backend unit and integration tests covering search filters, Vietnamese diacritics fuzzy search, RBAC scope enforcement, pagination, deduplication, KPI summary response, snapshot immutability, and 403/404 handling.
   - Frontend tests covering search filters, debouncing, loading/empty/error states, KPI summary rendering, and official score highlighting.

---

### Out of Scope

- Client-side calculation or reconstruction of scores.
- File upload / binary evidence streaming (stored as persisted references/URLs).
- Automated external integration for real-time measurements (Jira/Git sync).
- Modifying historical evaluation data or editing scores via the KPI summary screen.
- Real-time collaborative editing.

---

### Business Rules Involved

- **BR-AUTH-01 (Actor Scoping)**: Employee scope is `SELF`; Manager scope is `TEAM` (teams where `manager_id = actor.employee_id`); HR Admin scope is `ORGANIZATION`; System Admin scope is `SYSTEM` (read-only for business data). Scope is enforced server-side.
- **BR-EVAL-02 (Historical Immutability)**: Evaluated items and scores must reflect historical snapshots taken at evaluation time; template/criterion changes never mutate historical evaluation reads.
- **BR-SCORE-03 (Official Score Field)**: The system must explicitly designate the official score field (`overall_weighted_score`) via `official_score_field`, distinct from reference scores (`overall_score`).
- **BR-SEARCH-04 (Deduplication)**: Employee search evaluation joins must use distinct employee resolution (`DISTINCT ON` or `EXISTS` subqueries) to prevent duplicate employee records.

---

### Open Questions / Conflicts

- **Query parameter naming on KPI Summary**: Both `evaluation_cycle_id` (primary snake_case per LLD) and `evaluationCycleId` (camelCase alias) supported via Zod transform.

## Inputs Reviewed
- Prompt requirements for Feature A and Feature B
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`

## Actions and Evidence
- Analyzed and synthesized exact functional, non-functional, security, and immutability requirements.

## Changes Made
- Documented task understanding.

## Decisions and Rationale
- Supported both `evaluation_cycle_id` and `evaluationCycleId` to ensure zero-risk contract compatibility.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
