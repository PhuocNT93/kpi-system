# Step 2: Investigate

Status: reconstructed during Step 6

## Deliverable

### Investigation

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md` — Sections 1–6 (Modular monolith bounded contexts, ERD details for `employee` & `employee_assignment`, RBAC Roles).
- Attachment #1 Design Specification — Comprehensive Organization Module breakdown (Master Data, Assignment Management, Temporal Context Resolution, Organizational Scope boundaries).
- `docs/BACKEND_NODE_RULES.md` — Node/TypeScript backend architecture and coding conventions.

Relevant Modules and Files:
- `backend/migrations/1724500000000_create_department.ts` — DB schema for `department`.
- `backend/migrations/1724500000001_init_database_schema.ts` — Initial DB schema for `team`, `role`, `job_level`, `employee`, and legacy `employee_team_history`.
- `backend/migrations/1724500000004_create_employee_assignment.ts` — DB migration adding `version` to `employee`, dropping `employee_team_history`, creating `employee_assignment` table with date check constraints.
- `backend/src/modules/employee/domain/employee.domain.ts` — Employee domain model & entities.
- `backend/src/modules/employee/domain/employee.repository.ts` — Repository interfaces for Employee & Assignment context retrieval.
- `backend/src/modules/employee/application/employee-context.service.ts` — `getAssignmentAt(employeeId, date)` logic and context resolution.
- `backend/src/modules/employee/infrastructure/postgres-employee.repository.ts` — PostgreSQL implementation for assignment queries.
- `backend/src/modules/employee/api/employee.controller.ts` & `employee.router.ts` — REST endpoints for employee domain.

Existing Implementation:
- **Data Model:** `department`, `team`, `role` (JobRole), `job_level`, `employee`, and `employee_assignment` tables are already created via migrations. `employee_assignment` includes `effective_from`, `effective_to`, `department_id`, `team_id`, `role_id`, `job_level_id`, `manager_id`, and `change_reason`.
- **Context Service:** `employee-context.service.ts` provides basic `getAssignmentAt()` functionality for temporal context resolution.
- **Separation of Concerns:** `role` table represents organizational Job Roles (e.g. `SOFTWARE_ENGINEER`), whereas security permissions reside in IAM (`app_user`, `user_role`, `iam_role`).

Existing Tests:
- `backend/test/employee-module.test.ts` — Unit tests for employee domain models, context resolver, and invariants.
- `backend/test/employee-api.test.ts` — Integration tests for `/api/v1/employees` controller and routes.

Patterns to Reuse:
- **Temporal Assignment Resolution:** Querying `employee_assignment` matching `effective_from <= atDate AND (effective_to IS NULL OR effective_to >= atDate)` to establish point-in-time snapshot context.
- **Bounded Context Output:** Exposing `EvaluationOrganizationContext` DTO to Evaluation module without leaking internal fields (`address`, `salary`, `audit details`).
- **Optimistic Locking:** Using the `version` integer column on `employee` for concurrent updates.
- **Express Router & Controller Structure:** Standard controllers returning structured JSON envelopes (`{ success: true, data: ... }`).

## Inputs Reviewed
- `backend/src/modules/employee/domain/employee.domain.ts`
- `backend/src/modules/employee/application/employee-context.service.ts`
- `backend/migrations/1724500000004_create_employee_assignment.ts`

## Actions and Evidence
- Verified existing migration and service code structure for Organization/Employee domain.

## Decisions and Rationale
- Align Organization Module design with existing schema structure while detailing missing service contracts.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis
