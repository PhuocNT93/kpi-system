# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Adds Employee Search screen (multi-filter bar, debounced free-text, pagination, loading/empty/error states) and Employee KPI Summary screen (profile header, cycle/status badge, official score distinction driven by `official_score_field`, KPI table with weights/scores, and expandable detail drawer/accordion for measurement, evidence, comment, rationale, reviewer, relationship snapshot). Full dark mode compliance and accessible markup. |
| Backend | HIGH | Implements `GET /employees/search` and `GET /employees/:id/kpi-summary` with runtime Zod parameter validation, service-layer RBAC scoping, repository queries, standard envelope responses, and complete Swagger/OpenAPI documentation. |
| Database | MEDIUM | New reversible migration adding `pg_trgm` extension, an immutable Vietnamese unaccent normalization function `immutable_unaccent(text)`, GIN trigram expression index on employee searchable attributes (`immutable_unaccent(full_name)`, `employee_code`, `email`), and B-tree indexes on `department_id`, `role_id`, `job_level_id`. No table schema modifications. |
| API | MEDIUM | Introduces two REST endpoints matching LLD conventions: `GET /employees/search` (paginated collection) and `GET /employees/:id/kpi-summary` (single-resource DTO with official score metadata). Preserves `snake_case` on the wire and envelope standards. |
| RBAC / Scope | HIGH | Strict service-layer scope enforcement preventing IDOR and query-parameter bypass: `EMPLOYEE` is restricted to self; `MANAGER` is strictly bounded to managed team(s); `HR_ADMIN` has organization-wide scope; `SYSTEM_ADMIN` has organization-wide read-only business data access. |
| Workflow | NONE | Read-only search and summary features; no state transitions or workflow mutations. |
| Audit | LOW | Read endpoints do not mutate data or write audit logs, preserving audit append-only retention. |
| Concurrency | LOW | Pure read queries; no transactional lock contention or optimistic locking issues. |
| Performance | MEDIUM | All filtering, fuzzy matching, and pagination executed database-side. Single-query or batched queries for KPI summary (evaluation, items, evidences) to eliminate N+1 overhead. Efficient GIN trigram index minimizes search query latency. |
| Historical Data | LOW / POSITIVE | Strictly adheres to historical evaluation immutability. Reads persisted snapshot columns (`criterion_name_snapshot`, `weight_snapshot`, `raw_score`, `weighted_score`, `scoring_breakdown`, `official_score`) without recalculation or live template overwriting. |

### Potential Risks
1. **Vietnamese Diacritics Mismatch in Trigram Search**: If query diacritics do not match database records (e.g. searching "Nguyen" for "Nguyễn Văn An"), standard trigrams differ.
   - *Mitigation*: Create a deterministic, `IMMUTABLE` normalization function in PostgreSQL (`immutable_unaccent`) that strips Vietnamese diacritics and converts to lowercase. Build a GIN expression index on `immutable_unaccent(full_name)` with `gin_trgm_ops`, and apply normalization to both the search term and the indexed column.
2. **Duplicate Employee Records in Search**: Joining `employee` with `evaluation` can produce duplicate rows if an employee has multiple evaluations or records matching cycle/status.
   - *Mitigation*: Use an `EXISTS (SELECT 1 FROM evaluation ev WHERE ev.employee_id = e.employee_id AND ...)` subquery instead of a naive 1:N join, guaranteeing exactly one row per employee.
3. **Manager Scope Leakage**: A manager passing query parameters like `team=<another-team-id>` or `manager=<another-manager-id>` might attempt to view employees outside their scope.
   - *Mitigation*: Intersect request filters with the manager's authorized team scope in the service/repository layer: `WHERE e.team_id IN (SELECT team_id FROM team WHERE manager_id = $actorEmployeeId)`.
4. **Client-side Score Manipulation / Hardcoding**: The frontend might hard-code `officialScore = overallWeightedScore` or attempt to recalculate scores.
   - *Mitigation*: Strictly drive UI official score highlighting from `data.official_score_field` provided by the backend response, displaying `data.overall_weighted_score` and `data.overall_score` as purely read-only values.

### Required ADR / Clarification
- **None**: Requirements, schema, and API contracts are fully aligned with the approved LLD and backend/frontend rules.

## Inputs Reviewed
- Step 1 and Step 2 findings
- Database index plans and query patterns

## Actions and Evidence
- Evaluated risk matrix across 10 functional and architectural areas.

## Changes Made
- Documented impact analysis and mitigations.

## Decisions and Rationale
- Used `EXISTS` subquery to definitively prevent duplicate employee rows on evaluation joins.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
