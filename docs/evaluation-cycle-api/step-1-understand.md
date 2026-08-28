# Step 1: Understand

Status: produced during this step

## Deliverable
Goal: Implement the Evaluation Cycle API module in the Node.js TypeScript backend to manage evaluation cycles, enforce state transitions, snapshot employee assignments and template criteria upon opening a cycle, lock cycles, and record audit logs.

Expected Behavior:
- Create Cycle (`POST /evaluation-cycles`): HR_ADMIN creates a cycle with default status `DRAFT`, code uniqueness, template version reference, and applicable team/role IDs.
- Get Cycle (`GET /evaluation-cycles/:id`): Retrieves identity, dates, status, template reference, applicable teams/roles, and audit metadata.
- List Cycles (`GET /evaluation-cycles`): Supports pagination (`page`, `page_size`), filtering (`status`, `search`), sorting, and sort direction.
- Update Draft Cycle (`PATCH /evaluation-cycles/:id`): Allows editing code, name, dates, template version, applicable teams/roles ONLY when `status = DRAFT`. Returns `409 EVALUATION_CYCLE_NOT_EDITABLE` if not `DRAFT`.
- Open Cycle (`POST /evaluation-cycles/:id/open`): Atomically opens a `DRAFT` cycle using `SELECT ... FOR UPDATE` row lock. Validates template version, effective weight sum, snapshots historical employee assignments and template criterion configs into evaluations and evaluation items, and writes audit event.
- Lock Cycle (`POST /evaluation-cycles/:id/lock`): Transition eligible cycle to `LOCKED`, set `locked_at`, enforce immutability boundary, and write audit event.

Acceptance Criteria:
1. HR_ADMIN can create, list, view, update draft, open, and lock evaluation cycles.
2. Cycle code must be unique; duplicate codes return a validation/conflict error.
3. Non-DRAFT cycles cannot be edited (returns 409 EVALUATION_CYCLE_NOT_EDITABLE).
4. Opening a cycle validates that the referenced template version is PUBLISHED and sum of effective weights equals 100%.
5. Opening a cycle snapshots historical employee assignment at cycle start date via getAssignmentAt.
6. Opening a cycle creates evaluation and evaluation_item records with deep snapshot copies of criteria metadata.
7. Disabled criteria or criteria with role/team applicability mismatch are marked is_disabled_for_employee = true.
8. Opening and locking operations are transactional, idempotent under concurrent requests (FOR UPDATE locking + UNIQUE DB constraint), and audited.
9. Invalid state transitions are rejected.
10. Automated tests pass cleanly.

Out of Scope:
- Score calculation / Rule Engine execution.
- CSV Import parsing or background queue job processing.
- Reporting, distribution, or personal ranking features.
- Calibration session adjustment logic.

Business Rules Involved:
- Cycle state machine (DRAFT -> OPEN -> IN_PROGRESS -> SUBMITTED -> REVIEWING -> CALIBRATION -> APPROVED -> PUBLISHED -> LOCKED).
- Employee historical assignment snapshotting rule.
- Deep configuration snapshotting for evaluation_item.
- Defense in depth sum of effective weights = 100%.
- RBAC matrix.
- Idempotency and database-level concurrency protection.
- Immutability of locked cycles.

Open Questions / Conflicts:
- None.

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- AI Agent Prompt

## Actions and Evidence
- Analyzed LLD requirements and domain decisions.

## Changes Made
- Documented task understanding.

## Decisions and Rationale
- Target Node.js Modular Monolith architecture matching existing codebase conventions.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
