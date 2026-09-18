# Step 1: Understand

Status: reconstructed

## Deliverable

## Task Understanding

**Goal**:
Implement, harden, and verify three foundational pillars in the Employee Performance Evaluation Management System:
1. **Audit Integration Framework**: An internal, application-layer shared audit mechanism that atomically records significant business mutations within the same database transaction, enforcing append-only immutability and complete transaction rollback on failure.
2. **Audit Viewer**: A secure, read-only audit browsing experience featuring a backend query API with server-side filtering, sorting, pagination, and strict DB-layer RBAC/organization scoping, accompanied by a dedicated frontend UI module (`features/audit`) with table, filter bar, diff viewer, and robust state handling.
3. **Scoring Regression & Snapshot Contract**: Comprehensive database snapshot guarantees and shared regression test suites ensuring that modifications to current KPIs, criteria, or templates never alter historical evaluation snapshots or historical calculated scores, alongside frontend verification that evaluation details render immutable snapshots.

**Expected Behavior**:
1. **Internal Audit Recording**:
   - Application services (e.g., Evaluation, Template, Criterion, Calibration, Workflow, Import) append audit records within the active transaction context (`AuditService` / `AuditRecorder`).
   - If any business write or audit write fails, the entire transaction rolls back cleanly with zero orphaned records.
   - No public `POST /audit`, `PUT /audit/:id`, or `DELETE /audit/:id` APIs exist.
2. **Read-Only Audit Querying**:
   - `GET /api/v1/audit-logs` (or conforming REST endpoint) returns paginated, filtered audit logs.
   - Query scoping is enforced directly in SQL/repository queries: System Admin reads all records; HR is restricted to their organization/business scope; unauthorized roles (Employee, Manager outside scope) receive `403 Forbidden`.
   - Frontend consumes paginated data via TanStack Query and displays action, entity, actor, timestamp, and read-only `before`/`after` JSON diffs without leaking PII or credentials.
3. **Snapshot Isolation & Historical Scoring Stability**:
   - Creating evaluations snapshots all evaluation KPI weights/relationships and template criterion configurations (rules, weights, level definitions) into `evaluation_item` / `evaluation_kpi` / `evaluation_criterion`.
   - Subsequent configuration changes (KPI weight/relationship change, criterion weight/rule/level change, disabled criteria, new template versions) leave historical evaluations and scores (`raw_score`, `weighted_score`, `overall_score`, `final_score`) 100% intact.
   - Recalculation occurs only via explicit, audited business commands—never automatically.
   - Frontend Evaluation Detail strictly presents snapshot data, confirmed by regression tests.

**Acceptance Criteria**:
1. Shared application-layer audit mechanism (`AuditService` / `AuditRecorder`) implemented and integrated into core business mutators (Evaluation, Template/Criteria, Calibration, Cycle Lock, Workflow state transitions, CSV Import).
2. Business write + audit record append execute within the same transactional boundary (`transactional-write`).
3. Integration tests verify commit and rollback atomicity across 4 test cases.
4. Audit logs remain append-only; public mutation endpoints are prohibited and absent.
5. Backend read-only endpoint supports server-side pagination, sorting, and validated filters.
6. Repository-level RBAC enforcement: System Admin has full access, HR is scoped to business entities, Employee / unauthorized roles receive 403.
7. Frontend feature module (`frontend/src/features/audit/`) enhanced with filters, table, pagination, read-only detail diff modal, and loading/empty/error/403 states.
8. `evaluation_kpi` and `evaluation_criterion` snapshot regression tests pass across full 9-point configuration mutation matrix.
9. Frontend Evaluation Detail renders stored snapshot data rather than querying live template/criteria definitions.

**Out of Scope**:
- Creating an external microservice, distributed event bus (e.g. Kafka/RabbitMQ), or outbox table architecture for audit.
- Introducing Elasticsearch or external search engines for audit log browsing.
- Modifying scoring calculation math/algorithms or changing evaluation workflow state definitions.
- Altering the existing RBAC domain model beyond implementing read scoping for audit logs.
- Automatic recalculation of historical evaluation scores upon template/criterion updates.

**Business Rules Involved**:
- **BR-AUD-01**: Every business mutation with operational or evaluation significance must produce an immutable audit log record.
- **BR-AUD-02**: Audit logs must be recorded atomically in the same database transaction as the business mutation.
- **BR-AUD-03**: Audit records cannot be modified or deleted via any public or application API.
- **BR-AUD-04**: Read access to audit records must be authorized and scoped at the database query layer according to actor role and organizational tenancy.
- **BR-SNAP-01**: Historical evaluation records and evaluation items must be bound to immutable configuration snapshots created at evaluation instantiation.
- **BR-SNAP-02**: Future configuration revisions to KPIs, criteria, or templates apply exclusively to future evaluations and never mutate historical records.
- **BR-SNAP-03**: Score overrides and calibration adjustments must be recorded separately, preserving original calculated values.

**Open Questions / Conflicts**:
- None.

## Inputs Reviewed
- User request specifications
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`

## Actions and Evidence
- Analyzed 3 requested features and established clear scope, boundaries, and acceptance criteria.

## Changes Made
- None.

## Decisions and Rationale
- Strictly avoided over-engineering (no external event bus, no microservice, no changes to core scoring logic).

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
