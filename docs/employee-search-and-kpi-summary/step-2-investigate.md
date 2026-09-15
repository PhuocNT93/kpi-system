# Step 2: Investigate

Status: reconstructed

## Deliverable

## Investigation

### Relevant Documents
- `docs/LLD_Employee_Performance_Evaluation_System.md`: Sections 6 (User Roles & Employee Model), 10 (Database Design: employee, evaluation, evaluation_item, evidence), 13 (Scoring Engine), 16 (API Design: `/employees`, `/evaluations`, `/reports`), 17 (RBAC Permission Matrix & Scope Rules).
- `docs/BACKEND_NODE_RULES.md`: Architecture rules, envelope standard (`success`, `message`, `data`, `meta`), error types (`NotFound`, `Forbidden`, `ValidationError`, `AppError`), controller/service separation, snake_case HTTP contracts, no raw ORM/entity leakage.
- `docs/FRONTEND_REACT_RULES.md`: TanStack Query rules, boundary mapping (snake_case wire to camelCase domain), dark mode tokens, accessibility, error states.

### Relevant Modules and Files
- **Backend Employee Module**:
  - `backend/src/modules/employee/api/employee.router.ts`: Employee route definitions.
  - `backend/src/modules/employee/api/employee.controller.ts`: Express controller handling requests, pagination parsing, DTO mapping.
  - `backend/src/modules/employee/domain/employee.domain.ts`: `Employee`, `EmploymentStatus`, `EmployeeAssignment` domain interfaces.
  - `backend/src/modules/employee/domain/employee.repository.ts`: `EmployeeRepository` interface.
  - `backend/src/modules/employee/infrastructure/postgres-employee.repository.ts`: PostgreSQL repository implementation with `findMany`, `findById`, `findByCode`, `findByEmail`.
- **Backend Evaluation Module**:
  - `backend/src/modules/evaluation/domain/evaluation.types.ts`: `Evaluation`, `EvaluationItem`, `EvaluationStatus` domain types.
  - `backend/src/modules/evaluation/domain/repositories.interface.ts`: `IEvaluationRepository`, `IEvaluationItemRepository`.
  - `backend/src/modules/evaluation/application/services/evaluation.service.ts`: Service with evaluation querying, RBAC scoping, and item retrieval.
  - `backend/src/modules/evaluation/domain/scoring/scoring-engine.ts`: `OverallScoringResult` and score definitions.
- **Backend IAM / Auth & API Infrastructure**:
  - `backend/src/shared/auth/actor-context.ts`: `getActorFromContext(req)`.
  - `backend/src/shared/auth/types.ts`: `Actor`, `UserRole`.
  - `backend/src/api/http-response.ts`: Standard response envelope (`sendSuccess`, `sendCollection`, `sendFailure`).
  - `backend/src/api/pagination.ts`: `parsePaginationQuery` and `buildPageMeta`.
  - `backend/src/config/swagger.ts`: OpenAPI/Swagger schema and path documentation.
- **Database & Migrations**:
  - `backend/migrations/1724500000001_init_database_schema.ts`: Schemas for `employee`, `team`, `department`, `role`, `job_level`, `evaluation`, `evaluation_item`, `evidence`.
  - `backend/migrations/1788926000013_add_kpi_import_comment_evidence.ts`: Extended fields on `evaluation_item` (rationale, source_snapshot) and `evidence` (title, evidence_url, file_reference, rationale, source).
- **Frontend**:
  - `frontend/src/App.tsx`: Route registration and layout integration.
  - `frontend/src/shared/layout/Sidebar.tsx`: Navigation items and menu selection.
  - `frontend/src/shared/theme/ThemeProvider.tsx`: Dark mode theme context and attributes.
  - `frontend/src/lib/theme.ts`: Semantic tokens for light and dark modes.

### Existing Implementation
- **Employee Queries**: Existing `GET /employees` performs basic filtering on single employee attributes with simple `ILIKE '%...%'`. It lacks multi-attribute fuzzy search, Vietnamese diacritics support, join against evaluation cycle/status, and strict multi-role server-side resource scoping.
- **Evaluation Details**: `evaluation.service.ts` has `getEvaluationDetail` which fetches an evaluation and its items, verifying actor scope (self, team manager, or HR/Admin). Persisted scores exist in `evaluation` (`self_score`, `manager_score`, `final_score`, `scoring_breakdown`, `official_score`), and `evaluation_item` holds immutable snapshot values (`criterion_code_snapshot`, `criterion_name_snapshot`, `weight_snapshot`, `raw_score`, `weighted_score`, `measurement_value`, `comment`, `rationale`, `reviewer_id`, `review_date`).
- **Evidence**: `evidence` table stores URL, FILE, and TEXT evidence linked to `evaluation_item_id`.

### Existing Tests
- `backend/test/employee-api.test.ts`: Supertest tests for employee endpoints.
- `backend/test/employee-module.test.ts`: Employee domain and service tests.
- `backend/src/modules/evaluation/application/services/evaluation.service.explainability.test.ts`: Integration tests verifying persisted evidence and rationale snapshots.
- `backend/src/modules/reports/api/reports.controller.test.ts`: Report queries and response structures.
- `backend/test/team-crud-rbac.test.ts`: RBAC verification patterns for managers and admins.

### Patterns to Reuse
- **Response Format**: `sendCollection` with `buildPageMeta` for paginated search results, and `sendSuccess` with DTO envelope for single-resource responses.
- **Actor Scope Enforcement**: Using `getActorFromContext(req)` to extract actor role, userId, and employeeId, and restricting database queries at the SQL/service layer based on:
  - `EMPLOYEE`: `WHERE employee.employee_id = $actorEmployeeId`
  - `MANAGER`: `WHERE employee.team_id IN (SELECT team_id FROM team WHERE manager_id = $actorEmployeeId)`
  - `HR_ADMIN` / `SYSTEM_ADMIN`: Unrestricted organization-wide scope.
- **Vietnamese Diacritics & Fuzzy Matching**:
  - PostgreSQL `pg_trgm` extension with GIN indexing.
  - An immutable SQL normalization function (handling lowercase and diacritic removal for Vietnamese vowels and 'đ') allowing trigram matching (`word_similarity` or `%` operator or `similarity > threshold`) to seamlessly match both accented (`Nguyễn Văn An`) and unaccented (`Nguyen Van An`) queries, as well as typo-tolerant search.
- **Frontend**:
  - TanStack Query with composite query keys (`['employees', 'search', filters]`, `['employees', 'kpi-summary', employeeId, cycleId]`).
  - Dark mode compliance via Tailwind/CSS vars and semantic theme tokens from `@/shared/theme`.
  - Wire snake_case to domain camelCase mapping at API client boundaries.

## Inputs Reviewed
- Database schema and migration history
- Controller, service, and repository code across `employee`, `evaluation`, and `iam`
- Frontend routes, sidebar, and theme implementation

## Actions and Evidence
- Verified existing tables, column types, and missing indexes.
- Identified exact query points for deduplication and scope restrictions.

## Changes Made
- Documented findings in Step 2.

## Decisions and Rationale
- Reused existing actor context and pagination parsing utilities to maintain uniform architecture.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis
