# Step 10: Final Verification

Status: produced during this step (after re-syncing with `origin/develop` at `1fcc4a8`, see `step-0-sync-and-branch.md`)

## Deliverable

# Task Completed

## Summary

UI polish of the Performance Reports hub and the System & Security hub. Covers the following:

- Consistent hub banners and tabs, with dark mode and en/vi everywhere.
- Only the main table scrolls, with its header kept visible.
- Tabs that hold several tables switch between them with sub-tabs; each tab level has its own shape.
- Create buttons sit beside the sub-tabs.
- Compact IAM filters and icon-only actions.
- Hub-tab ⓘ tooltips, stable tab widths and a header breadcrumb in all six hubs.
- A new brand logo.

Layout, labels and styling only. Data, APIs, permissions and scoring are unchanged.

## Changes

- Reports hub and its four tabs:
  - Shared hub design, filter bar, score cards and empty states.
  - Distribution bars, optional comparison cycle, and the team kept in `?team=`.
  - KPI Averages / KPI Trend sub-tabs.
  - KPI Items / Relationships sub-tabs.
- System hub:
  - No duplicated titles.
  - Segmented level-2 sub-tabs; Org Structure and Job Architecture pill sub-tabs, with the create button in the sub-tab row.
  - "Organization Overview" root.
  - Feature-prefixed column keys (fixes the "Due Status" collision).
  - IAM Audit-style filters and icon-only actions.
  - Translations table frame.
- Scrolling:
  - `.fill-column` / `.table-scroll-frame` with `contain: size`.
  - Sticky headers; the scrollbar starts below the header (`useTableHeaderOffset`).
  - Page-scroll fallback; no content spills over card borders.
- All six hubs:
  - ⓘ tooltip on the active tab (`useHubTabTooltip`).
  - Bold-width-stable tab labels.
  - Header breadcrumb "Section › Tab" (`header-trail`).
- Shared:
  - `SubTabs` (levels 2 and 3, actions slot).
  - `FilterField`, `role-label`.
  - Brand logo (`BrandLogo`, emblem asset).
- Migration `1792000000003`: UI translations (en + vi) for the new and renamed labels. Idempotent upsert; reversible `down`.

## Test Results

- Unit: PASS. `npm --prefix frontend test`: 59 files / 234 tests after the merge, including this task's TC01–TC56 tests.
- Integration: PASS.
  - Migration round-trip on the local DB after every migration edit (down → up; key counts and en/vi values checked).
  - Headless-Chrome checks of every System/Reports tab, light/dark, en/vi, 1600×900 and 1366×768: no page scroll, frames scroll, sticky headers, 0 spills, breadcrumb, 0 JS exceptions.
  - The migration integration suite (`test:migrations`) was not run: `TEST_DATABASE_URL` is not configured locally.
- Regression: PASS.
  - `npm --prefix backend test`: 787 passed / 30 skipped after the merge.
  - Frontend and backend builds exit 0.
- Type Check: PASS. Frontend and backend `typecheck` exit 0.
- Lint: FAIL on develop code, 0 errors in this task's files.
  - `npm --prefix frontend run lint`: 4 errors in `frontend/src/features/collector/pages/JiraCollectorPage.tsx`.
  - `npm --prefix backend run lint`: 3 errors in `backend/src/modules/jira-crawler/ai-evaluator.ts`.
  - Both files come from develop commit `6607ff2` (PR #149), and this task does not touch them.
  - The CI gate (test, typecheck, build) passes.

## Acceptance Criteria

- AC1 (no repeated page title): PASS. After the Step 8 follow-up, the app header shows a breadcrumb and the banner shows the title.
- AC2 (shared hub design, no numbering, readable role): PASS.
- AC3 (consistent filter bar, Data as of, cards, empty states): PASS.
- AC4 (same width, aligned with banner): PASS. Measured 0 px.
- AC5 (no ranking wording): PASS.
- AC6 (tab visibility by role unchanged): PASS. Unit tests plus a browser check for each role.
- AC7 (light/dark, en/vi, existing tests pass): PASS.
- AC8: superseded by AC13.
- AC9 (System hub tabs aligned with banner): PASS.
- AC10 (no own page title in hub tabs, no "Review Due Dashboard"): PASS.
- AC11 (one sub-tab style per level, light/dark): PASS. Level 2 is segmented, level 3 is pills.
- AC12 (behaviour, data, permissions unchanged; existing tests pass): PASS.
- AC13 (only the main table scrolls; page fallback): PASS. Translations and KPI Summary use the page-scroll fallback at 900 px height, which the user accepted at Step 6.
- AC14 (sub-tabs for multi-table tabs, selection kept): PASS.

## Review

- Architecture: PASS. Shared pieces live in `shared/`; features consume them; no cross-module data access.
- Security: PASS. No auth, RBAC, API or data change. Icon buttons keep `aria-label`s.
- Performance: PASS. See `step-9-performance-review.md`: fewer initial requests, 0 requests on sub-tab switches, 0 long tasks while scrolling.
- LLD Compliance: PASS. No individual ranking; configuration stays data (DB translations); no scoring or snapshot change.

## Files Changed

- Backend: `backend/migrations/1792000000003_seed_reports_and_hub_ui_i18n_translations.ts` (new).
- Frontend, shared:
  - `index.css`, `App.tsx`
  - `shared/layout/{AppLayout,Header,BrandLogo,HeaderTrailProvider}.tsx`, `shared/layout/header-trail.ts`
  - `shared/ui/{SubTabs,FilterField,HubTabTooltip}/**`
  - `shared/hooks/{use-scrollbar-width,use-table-header-offset}.ts`
  - `shared/auth/role-label.ts`
  - `assets/brand/performant-emblem.png`
- Frontend, reports: `features/reports/**` (hub, four pages, components, palette, distribution domain, layout helper).
- Frontend, organization:
  - `features/organization/**`: hub, `OrganizationPage`, `OrgStructureTab`, `JobArchitectureTab`, the six tables, `DepartmentFormModal`, `create-control.ts`.
  - `features/iam/components/{UserTable,RoleTable,PermissionTable}.tsx`
  - `features/i18n/{pages/I18nPage,components/EntityTranslationEditor}.tsx`
  - `features/audit/components/AuditTable.tsx`
- Frontend, other hubs (banner, tooltip and breadcrumb only):
  - `features/evaluation/pages/UnifiedEvaluationsHubPage.tsx`
  - `features/evaluation-cycles/pages/UnifiedEvaluationCyclesPage.tsx`
  - `features/notifications/pages/UnifiedNotificationsPage.tsx`
  - `features/templates/pages/UnifiedKpiTemplateStudioPage.tsx`
- Tests: new and updated specs next to the files above; `shared/layout/__tests__/Header.test.tsx`.
- Docs: `docs/ui-performance-reports-improvements/` (steps 0–10, `frontend-user-guide.md`).

## Remaining Risks / Notes

- Organization Report "Score Distribution" stays empty until the backend writes `score_distribution` (separate backend task).
- Translations (with an item selected) and KPI Summary use the page-scroll fallback at about 900 px height (accepted).
- Selecting an employee in the hub's KPI Summary tab navigates to the standalone route (pre-existing).
- Firefox shows the table scrollbar next to the header (no scrollbar-track margin support).
- The favicon still uses the old icon.
- Lint errors from develop (PR #149) remain in `JiraCollectorPage.tsx` and `ai-evaluator.ts`.
- All work is uncommitted on `feature/ui-performance-reports-improvements`. The pre-merge stash `stash@{0}` and the scratchpad backup are kept until the user confirms.

## Final Status

DONE (pending user review)

## Inputs Reviewed

- Step 0–9 artifacts; `frontend-user-guide.md`; `git status`; the merged `origin/develop`.

## Actions and Evidence

- Commands and results as listed under Test Results, run after the merge.
- Browser smoke run after the merge (`table-scroll-checks.mjs`, Organization / IAM / Reports scenarios): 0 spills, breadcrumb correct, 0 JS exceptions.

## Changes Made

- `step-1-understand.md`: the approved Revision 2 (AC13, AC14), which had not been written, was added.
- Merge-conflict resolution recorded in `step-0-sync-and-branch.md`.
- `UnifiedPerformanceReportsPage.test.tsx` labels aligned with develop's Vietnamese default labels.

## Decisions and Rationale

- Develop's lint errors are outside this task's files, so they were not fixed here.

## Risks / Blockers

- None blocking.

## Next Step

User review. Commit and push only on explicit request.
