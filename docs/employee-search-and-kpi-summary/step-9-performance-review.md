# Step 9: Performance Review

Status: produced during this step

## Deliverable

## Performance Review

Findings:
- None — all items reviewed and found acceptable as documented below.

Actions Taken:
- None — no optimizations were introduced without evidence of a problem. All findings are acceptable at current data volumes.

---

## Detailed Review

### Backend

#### Query Structure
- The `search()` method issues **2 queries**: one `COUNT(DISTINCT e.employee_id)` for pagination and one `SELECT DISTINCT ON (...)` for the data page. This is the standard paginated query pattern used across the project.
- A `LEFT JOIN LATERAL` subquery is used to get the most recent evaluation per employee. Lateral joins with `ORDER BY + LIMIT 1` are well-suited for this correlated subquery pattern and avoid N+1 queries.
- Filters are applied as parameterized `WHERE` conditions, never via N+1 per-row lookups.

#### Indexes — Migration `1788926000014`
- **GIN trigram indexes** (`pg_trgm`) on `immutable_unaccent(full_name)`, `employee_code`, and `email` are in place, making the `%` trigram operator (`%`) and `ILIKE '%...%'` efficient.
- **B-tree indexes** on `department_id`, `role_id`, and `job_level_id` — the most common filter columns — are created.
- `team_id` and `manager_id` do not have dedicated indexes but their cardinality is low enough that a sequential scan on the `employee` table is acceptable at the expected data volumes (hundreds to low thousands of employees).
- The `evaluation` subquery in the lateral join has `ev.employee_id` filtered, which hits the existing PK/FK index on `evaluation.employee_id`.

#### RBAC Scope
- RBAC restriction is applied at the `WHERE` clause level in the same query — no post-query filtering that could cause over-fetching.

#### Payload Size
- The response includes only the fields required by the search result card: employee identity, department, team, role, job level, manager name, and latest evaluation status. No nested evaluation items or scoring details are returned. Payload is acceptably minimal.

### Frontend

#### Re-render Efficiency
- `useEmployeeSearch` uses `keepPreviousData` to avoid content flicker during page transitions. This is the correct pattern.
- `staleTime: 30_000` (30 s) prevents redundant refetches for the same filter state within a short session.
- Debounce is 300ms on the free-text `q` input, which limits API request frequency during typing.
- Filter changes reset `page` to 1 in the same event handler, preventing stale offset mismatches.

#### Reference Data Queries
- `useDepartments`, `useTeams`, `useJobRoles`, `useJobLevels`, and `useEvaluationCyclesQuery` are called once on page mount and cached by React Query. They do not re-trigger on filter changes.

#### Excessive Requests
- No evidence of duplicate API calls. Each filter change only triggers one search request (after debounce for `q`).

#### No N+1 on the Frontend
- The table renders employee rows from a single query response. No per-row sub-requests are made.

---

## Risks / Blockers
- None

## Next Step
- Step 10 - Final Verification
