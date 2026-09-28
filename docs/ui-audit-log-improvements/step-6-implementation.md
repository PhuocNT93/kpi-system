# Step 6: Implement

Status: reconstructed from the earlier approved response (approved by the user in chat after five user-requested revisions). Final state of the code; per-revision history is under "Actions and Evidence". Changes made during Step 8 are recorded in `step-8-code-review.md`.

## Deliverable

## Implementation

Changes Made:
- `frontend/src/features/audit/components/AuditTable.tsx`:
  - Row hover highlight (`hoveredRowId`), pointer cursor, row click opens the detail modal; Details button uses the `icon` prop, `whiteSpace: nowrap`, and `stopPropagation`.
  - Action and Entity Type badges ellipsize inside their column with `title`; Entity ID truncated with `title` for the full UUID.
  - Header and body are separate tables sharing `COLUMN_WIDTHS` via `colgroup` and `table-layout: fixed`; `TABLE_MIN_WIDTH` 1100px (horizontal scroll below it).
  - Only the body scrolls vertically; slim scrollbar with themed track/thumb colours; the header ends in a lane whose width equals the measured scrollbar width (ResizeObserver) so the scrollbar column runs from header to content.
  - Visible header is `aria-hidden`; the body table keeps a zero-height `<thead>` for screen readers.
  - Long values wrap inside fixed columns.
- `frontend/src/features/audit/components/AuditFilterBar.tsx`:
  - Title row with divider and active-filter count badge.
  - Filters in a `<form>`; circular icon-only Reset (disabled when no filter active) and primary Search button (`t('auditSearchBtn', 'Search')`).
  - New required prop `onSearch`; option lists extracted to `ENTITY_TYPES` / `ACTIONS`; controls share a 38px height.
- `frontend/src/features/audit/pages/AuditLogPage.tsx`:
  - Local theme-aware empty state (SearchX icon + `emptyDesc`), replacing the shared `EmptyState`.
  - `entityIdInput` draft state; Entity ID applied on Search/Enter (trimmed, page reset to 1; refetch when unchanged); Reset clears draft and applied filters.
  - Header uses collision-free keys `auditPageTitle`, `auditPageSubtitle`, `auditRoleSystemAdmin`, `auditRoleHrAdmin` with English fallbacks.
  - Root is a flex column filling the available height so the table scrolls internally.
- `backend/migrations/1791000000010_seed_audit_scoped_ui_i18n_translations.ts` (created as `…0009…`, renamed in Step 8): seeds `audit_page_title`, `audit_page_subtitle`, `audit_role_system_admin`, `audit_role_hr_admin`, `audit_search_btn` (en + vi, snake + camel) under `AUDIT_UI`; `down` deletes only those fields.
- `frontend/src/features/audit/__tests__/AuditLogPage.test.tsx`: mocks use the `audit*` keys plus colliding `pageTitle` values; tests for Reset disabled/enabled and Entity ID on Search.
- `docs/ui-audit-log-improvements/frontend-user-guide.md` (created during Step 7; required for frontend tasks).

Decisions Applied:
- Header title fix via new namespaced i18n fields rather than changing the shared translation loader (root cause: all `*_UI` namespaces are merged into one flat dictionary, so generic fields collide).
- Scrollbar below the header implemented with split tables (works in all browsers) instead of `::-webkit-scrollbar-track` margins (Chromium only).
- Shared components (`EmptyState`, `IconButton`, `AppLayout`) left unchanged.

Deferred / Not Changed:
- Detail modal title still reads another screen's `modal_title` (same collision; systemic fix is a separate task).
- `AuditDetailModal.tsx` unchanged.

## Inputs Reviewed

- User screenshots and feedback for each revision; `shared/i18n/ui-i18n.ts`; i18n seed migrations; `shared/layout/AppLayout.tsx` and `.app-layout-main` CSS.

## Actions and Evidence

- Rev. 1 (filter bar layout per reference image): title row + divider, icon Reset, primary Search, Entity ID on Search/Enter. Typecheck, eslint (audit), audit tests 4/4 pass.
- Rev. 2 (header showed "Review Due Dashboard"): namespaced `audit_*` keys + migration; Details button fix. Headless Chrome with 25 local-only dummy audit rows (`source = 'UI_DUMMY'`): header correct in en/vi, badges, truncation, row click, UPDATE filter 6/6. Audit tests 7/7.
- Rev. 3 (scroll inside the table): page fills `.app-layout-main`; table scrolls; sticky header. Chrome: page does not scroll, pager visible.
- Rev. 4 (scrollbar below the header): split header/body tables with shared column widths; badge ellipsis. Chrome: columns aligned within 1px, equal widths.
- Rev. 5 (fixed scrollbar lane from header to content): measured lane. Chrome: lane 10px = scrollbar 10px, lane colour = track colour.
- Local environment actions (not committed): `docker-compose.override.yml` (dev watch config, Postgres on 127.0.0.1:5433, `migrate` behind a profile) and `dev-autobuild.local.mjs`, both excluded via `.git/info/exclude`; `backend/.env` (gitignored).

## Changes Made

- As listed in the Deliverable.

## Decisions and Rationale

- As listed under "Decisions Applied".

## Risks / Blockers

- Scope grew beyond the Step 1–4 plan at the user's request (backend migration, prop changes).
- `docker compose run --rm migrate` also runs `npm run seed`, which TRUNCATEs `audit_log`; dummy rows had to be re-inserted twice.

## Next Step

Step 7 — Test.
