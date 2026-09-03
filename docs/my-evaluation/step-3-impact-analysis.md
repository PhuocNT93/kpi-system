# Step 3: Impact Analysis

Status: reconstructed from approved response

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Build comprehensive MyEvaluationPage and EvaluationDetailPage with active card, history table, criteria cards, level selection, summary panel, modals, unsaved changes handling. |
| Backend | MEDIUM | Extend and standardize endpoints in evaluation module (`/self-submit`, `/items/:itemId`, scoping). |
| Database | NONE | Existing tables and migrations already cover evaluation, items, and snapshots. |
| API | LOW | Backward compatible route aliases (`POST /:id/self-submit`, `PUT /:id/items/:itemId`). |
| RBAC / Scope | MEDIUM | Enforce employee ownership strictly. |
| Workflow | MEDIUM | Support draft saving at OPEN/SELF_ASSESSMENT and transition on submit. |
| Audit | LOW | Update timestamps and updated_by on mutations. |
| Concurrency | LOW | Transactional and optimistic safety on updates. |
| Performance | LOW | Fast index queries on evaluation_id and employee_id. |
| Historical Data | NONE | Past cycle evaluations remain read-only. |

Potential Risks:
- Data loss on reload -> Handled via unsaved changes warning.
- Double-submit -> Handled via disabled mutation state and confirmation modal.
- Leaking manager score before publish -> Handled via visibility rules based on status.

Required ADR / Clarification:
- None.

## Next Step
- Step 4: Plan
