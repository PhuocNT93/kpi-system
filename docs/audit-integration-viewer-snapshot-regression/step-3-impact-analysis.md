# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| **Frontend** | Low / Medium | Preserve the existing `AuditLogPage.tsx` screen and its established styling/filters. Add a dedicated read-only `AuditDetailModal` component (showing formatted before/after diffs, reason, timestamp, actor, and request ID without edit/delete/replay actions) and explicit 403 unauthorized state handling. Verify Evaluation Detail renders snapshot fields. |
| **Backend** | Medium | Integrate `AuditService` into any remaining business mutations that lack central audit logging (e.g. `TemplateService`, `CriterionService`, and `CsvImportService`). Ensure all mutation flows execute through shared transactional boundaries (`withAuditedTransaction` or same client transaction). |
| **Database** | Low | Existing schema already has `audit_log` with append-only trigger `prevent_audit_log_modification` and `evaluation_item` snapshot columns (`kpi_*_snapshot`, `criterion_*_snapshot`, `weight_snapshot`, `scoring_rule_snapshot`, `level_definition_snapshot`). No destructive schema changes required. |
| **API** | Low | Endpoint `GET /api/audit-logs` already exists and follows the REST contract. Strictly ensure that no public `POST /audit`, `PUT /audit/:id`, or `DELETE /audit/:id` routes exist. Responses conform to `{ success, message, data, meta }`. |
| **RBAC / Scope** | Medium | Authorize and scope queries at the repository/SQL layer: `SYSTEM_ADMIN` gets full read access; `HR_ADMIN` is scoped to business audit entities (`BUSINESS_AUDIT_ENTITY_TYPES`); `EMPLOYEE` and unauthorized managers receive `403 Forbidden`. |
| **Workflow** | Low | Existing evaluation workflow transitions (`SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_CORRECTION`, `PUBLISH`) and cycle operations remain intact and atomic with audit emission. |
| **Audit** | High | Core feature focus: guarantee atomic execution of business write + audit entry. If business write fails, audit rolls back; if audit write fails, business write rolls back. Verified with integration test cases 1–4. |
| **Locking / Optimistic Locking** | Low | Existing locks (`checkCycleNotLocked`, `findByIdForUpdate`, optimistic version checks) remain strictly enforced. Locked evaluations/cycles block recalculation and editing. |
| **Scoring** | Low | Scoring algorithm and formulas in `ScoringEngine` remain completely untouched. Scored evaluations consume snapshot data directly. |
| **Snapshots / History** | High | Core feature focus: establish regression test suite verifying that modifying current KPIs, relationships, criteria weights, scoring rules, level definitions, or template versions never mutates historical evaluation snapshots or historical scores. |
| **Reporting** | Low | Read models and reporting queries already rely on `evaluation_item` snapshots and will continue to function without alteration. |
| **Concurrency** | Low | Transactions maintain entity-level locks (`SELECT ... FOR UPDATE`) during updates, preventing race conditions during audit append. |
| **Performance** | Low | Server-side pagination (`LIMIT` / `OFFSET`), database indexes on `performed_at`, `entity_type`, and `entity_id` ensure query latency remains low. |
| **Security** | Medium | Authenticated actor ID is taken strictly from JWT context (never trusted from client request body). No PII or audit payloads leaked into URLs, browser storage, or console logs. |

### Risk Assessment:
1. Overwriting Existing Frontend Work -> Mitigated by preserving `AuditLogPage.tsx` and modularly adding components.
2. Transaction Rollback Leakage -> Mitigated by `withAuditedTransaction` and integration tests.
3. Implicit Recalculation on Configuration Mutation -> Mitigated by decoupled services and regression tests.

### Approved Architectural Decisions (ADR):
- ADR-AUD-01: Centralize business audit logging to `audit_log` table via `AuditService.record()` and `withAuditedTransaction()`.
- ADR-AUD-02: Enforce RBAC filtering at SQL repository layer for `GET /api/audit-logs`.
- ADR-SNAP-01: Maintain scoring immutability by exclusively reading snapshot columns from `evaluation_item`.

## Inputs Reviewed
- Architectural impact analysis across 14 dimensions.

## Actions and Evidence
- Evaluated risk and mitigation strategies for backend, frontend, database, and security.

## Changes Made
- None.

## Decisions and Rationale
- Confirmed minimal-risk implementation path.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
