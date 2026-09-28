# Step 3: Impact Analysis

Status: reconstructed from the earlier approved response (approved by the user in chat). The table reflects the original frontend-only scope; later expansions are listed under "Risks / Blockers".

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | LOW | `AuditLogPage.tsx`, `AuditFilterBar.tsx`, `AuditTable.tsx`; visual changes only |
| Backend | NONE | No code change |
| Database | NONE | No schema/data change |
| API | NONE | Same endpoint and parameters |
| RBAC / Scope | NONE | Route guard and backend scope unchanged |
| Workflow | NONE | — |
| Audit | NONE | Read-only view; no writes |
| Concurrency | NONE | — |
| Performance | LOW | Local hover state re-renders ≤ page-size rows |
| Historical Data | NONE | — |

Potential Risks:
- Existing tests are behaviour-level; style changes should not break them.
- Shared components are not modified, so no blast radius outside the audit feature.

Required ADR / Clarification:
- None.

## Inputs Reviewed

- Step 2 findings.

## Actions and Evidence

- Confirmed no prop-interface changes were needed for the original plan.

## Changes Made

- None.

## Decisions and Rationale

- Keep props stable; keep i18n keys unchanged.

## Risks / Blockers

Later scope changes (user-requested) that raised impact beyond this table:
- Frontend: `AuditFilterBar` gained a required `onSearch` prop; `AuditLogPage` gained optional `isEmbedded`; `UnifiedSystemAdminPage.tsx` (organization module, from `develop`) changed for the Audit tab only.
- Database: new seed migration `backend/migrations/1791000000010_seed_audit_scoped_ui_i18n_translations.ts` (i18n rows only).
- Performance: Entity ID now applies on Search/Enter (fewer requests; see Step 9).

## Next Step

Step 4 — Plan.
