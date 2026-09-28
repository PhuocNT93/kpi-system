# Step 8: Code Review

Status: produced during this step

## Deliverable

## Code Review

Findings:
- [Medium] `frontend/src/features/audit/components/AuditTable.tsx`: the whole row opens the detail modal on click, so selecting text in a row (for example copying an Entity ID or a reason) opens the modal on mouse-up. Introduced by this task. Corrective action: in the row `onClick`, return early when `window.getSelection()?.toString()` is non-empty.
- [Low] `frontend/src/features/audit/components/AuditFilterBar.tsx`: the icon-only Reset button declares a background transition but has no hover state, so it gives no hover feedback. The shared `IconButton` has no outlined variant, which is why a native `<button>` is used. Corrective action: add a local hover state (transparent → subtle neutral background).
- [Low] `frontend/src/features/audit/pages/AuditLogPage.tsx`: an Entity ID that is not a UUID is rejected by the backend (`AuditLogQuerySchema.entityId` is `z.string().uuid()`) with 400, and the generic ErrorAlert replaces the table. Behaviour is safe and is now only triggered on Search (previously on every keystroke). Corrective action (follow-up, needs a new i18n key): client-side UUID check with an inline field message.
- [Low, pre-existing] `AuditFilterBar.tsx` `ENTITY_TYPES` omits `REVIEW_CADENCE`, `TEMPLATE_KPI`, `EVALUATION_KPI`, which HR_ADMIN is allowed to see (`BUSINESS_AUDIT_ENTITY_TYPES`). All listed options are within the HR scope, so no 403 is possible. Corrective action: follow-up task.
- [Info, pre-existing] Detail modal title shows another screen's `modal_title` because the frontend merges all `*_UI` translation namespaces into one dictionary. Corrective action: separate task to namespace UI translations.
- [Info, process] Step artifacts `step-0` … `step-6` are condensed and do not follow the mandated artifact structure (Deliverable / Inputs Reviewed / Actions and Evidence / …). Corrective action: rewrite them to the template before Step 10.

Review Checklist:
- Requirement correctness: PASS — filter bar, empty state, table scroll/lane, header title and i18n behave as approved (Step 7 browser + unit evidence)
- Architecture and module boundaries: PASS — changes stay in `features/audit`; translations added as data via a migration following the existing seed pattern; no shared component or backend module changed
- Security and RBAC/scope: PASS — no API/RBAC change; filter values still validated server-side (zod); dropdown options all within HR scope; migration SQL built only from static constants
- Data integrity, audit, and history: PASS — no writes to business or audit data; migration `down` deletes only the 10 fields it adds (round-trip verified)
- Error handling and concurrency: PASS — 400/403/error states unchanged; Search refetches when filters are unchanged; ResizeObserver disconnected on unmount and guarded where unavailable (jsdom)
- Type error: PASS — `npm --prefix frontend run typecheck`, `npm --prefix backend run typecheck` exit 0
- Do not use type any: PASS — no `any` in `frontend/src/features/audit/**` or the new migration
- Remove import not use: PASS — `EmptyState` import removed; eslint exit 0 for both apps
- Regression risk: FAIL until the Medium finding is fixed (text selection in a row opens the modal)

### Fixes applied after review (user approved)

- Medium finding fixed: row click returns early when `window.getSelection()` has text; regression test added (`opens the detail modal on row click unless text is being selected`).
- Low (hover) finding fixed: Reset button shows a neutral background on hover when enabled.
- Re-run: frontend typecheck/lint/build exit 0; audit tests 8/8; full frontend suite 45 files / 170 tests PASS.

### New findings after `develop` was pulled into this branch (14:12, fast-forward, 7 commits)

- [High] `backend/migrations`: develop added `1791000000009_seed_unified_hubs_ui_i18n_translations.ts`, colliding with this task's `1791000000009_*`. Fixed: rolled back the audit migration locally, renamed it to `1791000000010_seed_audit_scoped_ui_i18n_translations.ts`, re-ran `migrate:up` (also applied develop's `1788926000018_*`, `1788926000020_*`, `1791000000009_seed_unified_hubs_*` to the local Docker DB).
- [High, needs decision] `frontend/src/features/organization/pages/UnifiedSystemAdminPage.tsx` (from develop): `/admin/audit-logs` now redirects to the Audit tab of the System & Security Hub. The hub root and tab content are plain block containers, so `AuditLogPage` no longer fills the height: headless Chrome shows the page scrolls, the table does not, and the pager is below the fold. The approved "scroll inside the table" behaviour is lost in the hub.
- [Low, needs decision] Inside the hub the audit page repeats a title/role block below the hub banner ("System & Security Hub" + "System Audit Logs").

### Resolution of hub findings (user chose the recommended options)

- `UnifiedSystemAdminPage.tsx`: only while the Audit tab is active, the hub root and tab content become `flex: 1; minHeight: 0; flex column` (bottom padding dropped) so the audit table scrolls internally. Other tabs are unchanged.
- `AuditLogPage.tsx`: new optional prop `isEmbedded`; when set, the page title/subtitle and role badge are not rendered and the page padding is 0 so it aligns with the hub banner. The hub renders `<AuditLogPage isEmbedded />`. Test added (`hides its own title and role badge when embedded in a hub`).
- Evidence: frontend typecheck exit 0; lint 0 errors (1 pre-existing warning in `MyEvaluationPage.tsx` from develop); full frontend suite 45 files / 171 tests PASS; build exit 0; headless Chrome on `/admin/audit-logs` → hub Audit tab, dark + light: page does not scroll, table scrolls, pager visible, lane 10px = scrollbar 10px, columns aligned.

Updated checklist:
- Requirement correctness: PASS
- Architecture and module boundaries: PASS — one scoped change in the organization hub page, limited to the Audit tab
- Security and RBAC/scope: PASS
- Data integrity, audit, and history: PASS
- Error handling and concurrency: PASS
- Type error: PASS
- Do not use type any: PASS
- Remove import not use: PASS
- Regression risk: PASS

## Inputs Reviewed

- `git diff` of `AuditLogPage.tsx`, `AuditFilterBar.tsx`, `AuditTable.tsx`, `AuditLogPage.test.tsx`
- `backend/migrations/1791000000010_seed_audit_scoped_ui_i18n_translations.ts`
- `backend/src/modules/audit/domain/audit.domain.ts` (`BUSINESS_AUDIT_ENTITY_TYPES`, `AuditLogQuerySchema`)
- `frontend/src/shared/ui/IconButton/IconButton.tsx`

## Actions and Evidence

- Grep for `any` in changed frontend files and the migration: no matches.
- Grep for UUID validation in the audit API: `entityId: z.string().uuid().optional()` in `audit.domain.ts:106`.
- Compared dropdown `ENTITY_TYPES` against `BUSINESS_AUDIT_ENTITY_TYPES` (`audit.domain.ts:79-98`).

## Changes Made

- None (review only).

## Decisions and Rationale

- Kept a native `<button>` for Reset because `IconButton` has no outlined style matching the reference design; changing the shared component is out of scope.

## Risks / Blockers

- Medium finding should be fixed before merge.

## Next Step

Fix the Medium and Low (hover) findings if approved, re-run Step 7 checks, then Step 9 — Performance Review.
