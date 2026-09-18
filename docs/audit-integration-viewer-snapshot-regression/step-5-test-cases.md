# Step 5: Define Test Cases

Status: produced during this step

## Deliverable

## Test Cases

| ID | Type | Description | Inputs | Expected Output | AC |
|---|---|---|---|---|---|
| **TC01** | Integration | **Transactional Audit Success (Case 1)**: Business write and audit append commit atomically | Valid business mutation in audited transaction | Both business record and audit record exist in database; transaction commits | AC-1 |
| **TC02** | Integration | **Business Write Failure Rollback (Case 2)**: Business write failure rolls back audit | Force business persistence / domain failure inside transaction | Business change is rolled back; audit record does NOT exist in DB | AC-1 |
| **TC03** | Integration | **Audit Write Failure Rollback (Case 3)**: Audit failure rolls back business changes | Force/mock audit repository or validation failure during write | Business changes are completely rolled back; no orphaned business record | AC-1 |
| **TC04** | Integration | **Multi-Write Atomicity (Case 4)**: Multiple business writes + audit commit or roll back as one | Multiple sequential entity writes followed by audit entry in same transaction | If all succeed: all commit. If any write or audit fails: all roll back | AC-1 |
| **TC05** | Security | **Audit Immutability & Append-Only Verification**: Direct SQL UPDATE or DELETE on `audit_log` is prohibited by database trigger | Execute `UPDATE audit_log ...` or `DELETE FROM audit_log ...` as standard database role | Database exception: `audit_log is append-only; UPDATE and DELETE are prohibited` | AC-1 |
| **TC06** | Security | **Public Audit Mutation API Prohibition**: Backend exposes no public audit creation or mutation endpoints | `POST /api/audit-logs`, `PUT /api/audit-logs/:id`, `PATCH /api/audit-logs/:id`, `DELETE /api/audit-logs/:id` | Returns `404 Not Found` (endpoints do not exist) | AC-1 |
| **TC07** | Integration / Security | **Audit Viewer RBAC - System Admin**: Full audit log read access | `GET /api/audit-logs` as `SYSTEM_ADMIN` | `200 OK`, returns all audit logs across all entity types and system operations | AC-2 |
| **TC08** | Integration / Security | **Audit Viewer RBAC - HR Admin**: Scoped to business audit entities | `GET /api/audit-logs` as `HR_ADMIN` | `200 OK`, results strictly restricted to `BUSINESS_AUDIT_ENTITY_TYPES` | AC-2 |
| **TC09** | Integration / Security | **Audit Viewer Negative RBAC - HR Admin Scope Violation**: HR Admin attempting to view restricted system entities | `GET /api/audit-logs?entityType=SYSTEM_CONFIG` as `HR_ADMIN` | `403 Forbidden` | AC-2 |
| **TC10** | Integration / Security | **Audit Viewer Negative RBAC - Employee Denied**: Employee role denied access | `GET /api/audit-logs` as `EMPLOYEE` | `403 Forbidden` | AC-2 |
| **TC11** | Integration / Security | **Audit Viewer Negative RBAC - Manager Denied**: Regular manager denied global audit | `GET /api/audit-logs` as `MANAGER` (without admin role) | `403 Forbidden` | AC-2 |
| **TC12** | Integration / Security | **Audit Viewer Negative RBAC - Unauthenticated**: Missing JWT token | `GET /api/audit-logs` with no auth header | `401 Unauthorized` | AC-2 |
| **TC13** | Integration | **Audit Viewer Server-Side Filters & Pagination**: Filter by action, entityId, and date range | Query params: `action=PUBLISH`, `entityType=EVALUATION`, `page=1`, `limit=10` | Filtered paginated results matching criteria with correct total count in meta | AC-2 |
| **TC14** | Regression / DB | **Evaluation KPI Snapshot Persistence**: Initial KPI weight and relationship snapshotted | Create evaluation with KPI A (weight 20%, relationship X) | Evaluation items persist `kpi_weight_snapshot=20`, `kpi_code_snapshot`, `kpi_id_snapshot` | AC-3 |
| **TC15** | Regression | **KPI Configuration Change Regression**: Modifying KPI weight and relationship leaves historical evaluation unchanged | Modify KPI A to weight 40% and relationship Y; fetch historical evaluation | Historical evaluation preserves original 20% weight snapshot and unchanged score | AC-3 |
| **TC16** | Regression | **Criterion Weight Change Regression**: Modifying criterion effective weight leaves historical evaluation unchanged | Update template criterion weight from 15% to 30%; inspect past evaluation item | Past evaluation item retains `weight_snapshot = 15` | AC-3 |
| **TC17** | Regression | **Criterion Scoring Rule Change Regression**: Modifying scoring rule configuration leaves historical evaluation unchanged | Change criterion rule from `RANGE_THRESHOLD` to `INVERSE_THRESHOLD`; re-evaluate item | Historical evaluation item retains original `scoring_rule_snapshot` | AC-3 |
| **TC18** | Regression | **Criterion Level Definition Change Regression**: Modifying level definitions leaves historical evaluation unchanged | Update score values for level definitions in criterion; check historical item | Historical item retains original `level_definition_snapshot` | AC-3 |
| **TC19** | Regression | **Disabled Criterion Regression**: Disabling a criterion in current template leaves historical evaluation unchanged | Set `is_disabled = true` on template criterion; fetch historical evaluation | Historical evaluation item remains enabled and retains original weight | AC-3 |
| **TC20** | Regression | **Template Version Change Regression**: Publishing a new template version leaves historical evaluations intact | Publish template version v2; inspect evaluations created under v1 | Evaluations remain bound to v1 snapshots and do not switch to v2 | AC-3 |
| **TC21** | Regression | **Historical Score Immutability**: All scores remain unchanged after live configuration edits | Calculate scores (`raw_score`, `weighted_score`, `overall_score`, `final_score`), mutate current configurations | All historical score values remain strictly identical | AC-3 |
| **TC22** | Regression | **Score Override / Adjustment Separation**: Override does not mutate original calculation | Apply manual override score or calibration adjustment | Original calculation preserved; adjustment stored in separate record with reason and audit | AC-3 |
| **TC23** | Regression | **Explicit Recalculation Behavior**: Configuration changes never auto-recalculate; explicit recalculate is audited | Update config (no score change) -> trigger `POST /api/evaluations/:id/recalculate` | Score recalculates using snapshots only and appends audit log record | AC-3 |
| **TC24** | Frontend | **Audit Table & Filters Rendering**: Displays audit logs and triggers filter query | Render `AuditLogPage` with mocked audit logs | Table displays timestamp, action badges, entity IDs, actor name; filters update query | AC-2 |
| **TC25** | Frontend | **Audit Detail Modal Read-Only Verification**: Modal opens and displays before/after diffs without mutation controls | Click "Xem chi tiết" on an audit row | Modal displays `before`, `after`, `reason`, `performedBy`, `action`; no edit, delete, or replay controls exist | AC-2 |
| **TC26** | Frontend | **Audit Viewer 403 Unauthorized State**: Displays clear unauthorized banner | Mock API 403 error on `useAuditLogs` | Renders user-friendly unauthorized alert explaining permission requirement | AC-2 |
| **TC27** | Frontend | **Evaluation Detail Snapshot Regression**: Evaluation Detail strictly renders snapshot data | Render `EvaluationDetailPage` with mock snapshot; alter mock current template cache | Rendered UI displays criterion title, weight, and levels from item snapshot, ignoring current template changes | AC-3 |

## Inputs Reviewed
- Requirements and acceptance criteria for all 3 features.

## Actions and Evidence
- Defined 27 comprehensive test cases mapped to AC-1, AC-2, and AC-3.

## Changes Made
- None.

## Decisions and Rationale
- Linked each test case to a specific requirement and expected observable outcome.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implement
