# Step 6: Implement

Status: produced during this step

## Deliverable

## Implementation

Changes Made:
- `frontend/src/features/reports/hooks/use-report-palette.ts` (new): light/dark semantic palette (`getReportPalette`, `useReportPalette`) with tones for primary/success/warning/info/neutral. Test: `hooks/__tests__/use-report-palette.test.ts`.
- `frontend/src/features/reports/components/ReportFilterBar.tsx` (new): filter card with title row, divider, fixed "Data as of" on the right, filter row.
- `frontend/src/features/reports/components/ReportEmptyState.tsx` (new): theme-aware empty state (icon, title, description, `isBare` for use inside cards).
- `frontend/src/features/reports/components/ScoreDistributionBars.tsx` (new) + `domain/score-distribution.ts` (new, `toScoreDistributionBins`): horizontal bars for `[{range,count,percentage?}]` or `{label: count}` input; empty/zero/malformed input → empty state. Test: `domain/__tests__/score-distribution.test.ts`.
- `components/CycleSelector.tsx`: palette colours, labelled select, i18n; `isOptional` mode starts empty with a "No comparison" option (no auto-select). Test: `components/CycleSelector.test.tsx`.
- `components/DataAsOf.tsx`: palette, locale-aware date, i18n.
- `components/ScoreCard.tsx`, `KpiBreakdown.tsx`, `KpiTrendTable.tsx`, `KpiExplainabilityDrawer.tsx`: palette colours, i18n with the current English as fallback; `KpiTrendTable` accepts `emptyTitle`/`emptyDescription`; drawer gets `role="dialog"`; drawer no longer refetches on locale change.
- `pages/report-page-layout.ts` (new): embedded vs standalone page layout.
- `pages/UnifiedPerformanceReportsPage.tsx`: `.unified-hub-*` classes like the other hubs; tab `role="tab"`/`aria-selected`; readable role label via `t('reports.role.<code>', humanized code)`; un-numbered default labels; team description without ranking; passes `isEmbedded` to all tabs.
- `pages/EmployeeReportPage.tsx`: `isEmbedded`, `ReportFilterBar`, `ReportEmptyState`, i18n, "—" + hint for missing scores; accounts without a linked employee profile get an explanatory empty state and no request.
- `pages/TeamReportPage.tsx`: `isEmbedded`; in the hub the team is kept in `?team=` (no navigation to `/admin/team-report/...`); comparison cycle optional with a trend prompt; themed team select; i18n.
- `pages/OrganizationReportPage.tsx`: `isEmbedded`; `ScoreDistributionBars` replaces the raw JSON `<pre>`; i18n.
- `employee-kpi-summary/pages/KpiSummaryDashboardPage.tsx` + `components/{EmployeeInfoCard,EmployeeSearchBar,KpiDetailPanel,KpiRelationshipDiagram,KpiSummaryTable,ScoreSummaryCard}.tsx` (delegated to a sub-agent, verified here): palette colours, i18n (`reports.summary.*`, 114 keys), `isEmbedded` hides the title and aligns width; behaviour, queries and ordering unchanged.
- `backend/migrations/1792000000003_seed_reports_and_hub_ui_i18n_translations.ts` (new): `REPORTS_UI` updates (un-numbered `reports.scope.*`, `reports.desc.team` without ranking, accurate `reports.desc.summary`) and additions (roles, shared, my/team/org, kpi, trend, explain, summary — en + vi, snake + camel variants); `down` deletes the added fields and restores the previous text of updated fields.
- Tests: `pages/UnifiedPerformanceReportsPage.test.tsx` (new), and extended `EmployeeReportPage.test.tsx`, `TeamReportPage.test.tsx`, `OrganizationReportPage.test.tsx`, `KpiSummaryDashboardPage.test.tsx` (TC-FE-01b); added `cleanup()` to the Team/Org test files.
- `docs/ui-performance-reports-improvements/frontend-user-guide.md` (new).

Decisions Applied:
- Hub follows the shared hub design of the other five hubs (user decision); badges and hint kept.
- Report-scoped palette hook instead of changing shared theme or shared `Card`/`ErrorAlert`.
- New i18n keys all prefixed `reports.` to avoid the global flat-dictionary collisions; English fallbacks equal to the previous hard-coded text.
- Standalone legacy routes keep their titles and centred layout (`isEmbedded` defaults to false).

Deferred / Not Changed:
- Backend never writes org `score_distribution` → the distribution card stays empty (separate backend task).
- Shared `ErrorAlert` (shared/components) and `EvidenceViewer` (imports feature) remain light-only.
- Evaluation status codes and relationship types shown as raw codes; dates in KPI Summary still use the browser locale.
- The other five hubs are unchanged.

### Revision 1 (user feedback during Step 7: "dời scroll vào khung content")

- `pages/UnifiedPerformanceReportsPage.tsx`: the hub root fills the layout height (`flex: 1; minHeight: 0; flex column`); the banner is fixed (`flexShrink: 0`); the `tabpanel` is the scroll container (`flex: 1; minHeight: 240px; overflowY: auto`, thin themed scrollbar, `scrollbar-gutter: stable`, 24px bottom padding). The panel is pulled right by the measured scrollbar width (ResizeObserver) so content stays aligned with the banner and the scrollbar sits in the page gutter.
- Evidence (headless Chrome 1600×900, HR_ADMIN, light + dark, `reports-scroll.mjs`): for all four tabs `.app-layout-main` does not scroll, the banner does not move when the panel scrolls, panel content is left/right aligned with the banner within 1px, scrollbar 10px; Team and Org panels scroll when content is taller. `npm --prefix frontend run typecheck` exit 0, `npx eslint src/features/reports` exit 0, reports tests 46/46.

### Revision 2 (scope expansion: System & Security Hub, Steps 1–5 re-approved)

Changes Made:
- `frontend/src/shared/hooks/use-scrollbar-width.ts` (new) + test: shared scrollbar-width measurement; now used by `features/audit/components/AuditTable.tsx`, the Reports hub and the System hub (duplicates removed).
- `frontend/src/shared/auth/role-label.ts` (new) + test: `roleLabelKey` (`common.role_label.<code>`) and `humanizeRoleCode`; used by both hubs.
- `frontend/src/shared/ui/SubTabs/SubTabs.tsx` (new) + test: underline sub-tab bar with `tablist`/`tab`/`aria-selected`, theme-aware.
- `features/organization/pages/UnifiedSystemAdminPage.tsx`: content scroll frame like the Reports hub (banner fixed, `tabpanel` scrolls, pulled right by the scrollbar width); panel is a flex column so the Audit tab fills it exactly; IAM sub-tabs via `SubTabs`; hub tabs get `role="tab"`/`aria-selected`; role chip shows a readable name.
- `features/organization/pages/OrganizationPage.tsx`: no own `h1`/subtitle (fixes the colliding "Review Due Dashboard" title), no `.org-page-container` padding, `SubTabs`.
- `frontend/src/index.css`: removed unused `.org-tabs-bar` (`.org-page-container` kept — used by `ReviewCadencesPage`).
- `features/i18n/pages/I18nPage.tsx`: removed `marginTop: 1rem`.
- `features/reports/pages/UnifiedPerformanceReportsPage.tsx`: shared role label key and shared hook.
- Migration renamed to `backend/migrations/1792000000003_seed_reports_and_hub_ui_i18n_translations.ts`; `reports.role.*` replaced by `common.role_label.*` under `COMMON_UI` (entity `…0021`); `down` removes both added groups and restores the updated `REPORTS_UI` text.
- Tests: `features/organization/pages/__tests__/UnifiedSystemAdminPage.test.tsx`, `OrganizationPage.test.tsx` (new).

Evidence:
- `npm --prefix frontend run typecheck` exit 0; eslint on touched features and `src/shared` exit 0; `npm --prefix backend run typecheck`/`lint` exit 0.
- Tests for organization pages, shared, reports, audit, i18n: 28 files / 108 tests passed.
- Local migration: down (old name) → rename → up; `common.role_label.*` = 16 rows under `COMMON_UI`, no `reports.role.*`; `common.role_label.hr_admin` en "HR Admin", vi "Quản trị nhân sự".
- Headless Chrome (`system-hub-checks.mjs`, HR_ADMIN, 1600×900, light + dark): all four tabs — page does not scroll, banner stays, no `h1` inside the panel, left edge aligned (0px); right edge aligned for IAM/Audit/Translations; on Organization only the inner employees table (inside its own horizontally scrolling card) extends past the edge, the frame itself does not overflow (panel scrollWidth = clientWidth = 1256). Audit panel does not scroll. Organization and IAM active sub-tab computed styles identical in both themes. 0 JS exceptions. Reports hub re-check (`reports-scroll.mjs`) unchanged.

### Revision 3 (only tables scroll; multi-table tabs get sub-tabs — Steps 1–5 revision 2 approved)

Changes Made:
- `frontend/src/index.css`: new `.fill-column` (height-passing flex column) and `.table-scroll-frame` (the only scroll container: `min-height: 240px`, thin themed scrollbar, sticky `thead` with a box-shadow border, dark variant via `.dark`); `.org-structure-layout` fills the height and stretches at ≥1024px; `.org-tree-sidebar` scrolls on its own (no fixed min-height); unused `.org-job-grid` / `.org-job-full-width` removed.
- Both hubs (`UnifiedSystemAdminPage.tsx`, `UnifiedPerformanceReportsPage.tsx`): `tabpanel` no longer scrolls (no `overflowY`, gutter or scrollbar-width offset; `useScrollbarWidth` now used only by `AuditTable`); panel is `.fill-column` with `min-height: 480px`, below which the page scrolls.
- `shared/ui/SubTabs/SubTabs.tsx`: `flexShrink: 0` and `overflowY: hidden`, so the bar never collapses inside a height-filling column.
- Organization: `OrganizationPage` is a `.fill-column`; `OrgStructureTab` uses `SubTabs` (root Departments · Employees; department Teams · Employees · Evaluation Formula; team Members · Evaluation Formula) with one preferred sub-tab kept across tree selections and a fallback to the level's first sub-tab; hard-coded Vietnamese sub-tab labels and per-section `h3` headings replaced by `org.subtab.*`; formula editor sits in a scroll frame. `JobArchitectureTab` uses `SubTabs` (Job Roles · Job Levels · Review Cadences), one card at a time.
- Organization tables (`Department`, `Employee`, `Team`, `OrgRole`, `JobLevel`, `ReviewCadence`): root `.fill-column`, wrapper `.table-scroll-frame`; the 6rem bottom space for the fixed `BulkActionBar` moved inside the frame and applied only while rows are selected.
- IAM (`UserTable`, `RoleTable`, `PermissionTable`): roots fill the height; table/matrix and card views are `.table-scroll-frame`; toolbars stay fixed.
- Translations (`I18nPage`, `EntityTranslationEditor`): height chain down to the translation table (`.table-scroll-frame`); save bar `flexShrink: 0` below the frame.
- Reports: `report-page-layout.ts` fills the panel when embedded; `KpiBreakdown` and `KpiTrendTable` get `isScrollable` (card fills, only the list/table scrolls; empty state has no minimum height); My Report passes `isScrollable`; Team Report adds `SubTabs` KPI Averages · KPI Trend in the hub; KPI Summary adds `SubTabs` KPI Items · Relationships in the hub, `KpiSummaryTable` gets `isScrollable`, the diagram sits in a scroll frame. Standalone routes unchanged.
- Migration `1792000000003`: `org.subtab.*` under `ORGANIZATION_UI` (`…0001`), `reports.team.subtab.*` and `reports.summary.subtab.*` under `REPORTS_UI`; `down` removes them. Local DB: down → edit → up.
- Tests: new `organization/components/__tests__/OrgStructureTab.test.tsx` (TC40–TC43, TC47) and `JobArchitectureTab.test.tsx` (TC44); `TeamReportPage.test.tsx` (TC45 + standalone case, trend prompt now behind the KPI Trend sub-tab); `KpiSummaryDashboardPage.test.tsx` (TC46); `UnifiedSystemAdminPage.test.tsx` asserts the panel does not scroll.

Evidence:
- `npm --prefix frontend test`: 56 files / 221 tests passed. `npm --prefix frontend run typecheck` exit 0. `npm --prefix frontend run lint`: 0 errors, 1 pre-existing warning (`MyEvaluationPage.tsx`). `npm --prefix backend run typecheck` exit 0.
- Headless Chrome (`table-scroll-checks.mjs`, HR_ADMIN, 1600×900 light + dark): every Org Structure / Job Architecture / IAM sub-tab and Audit — page and panel do not scroll, only `.table-scroll-frame` scrolls, sticky header 0–1px from the frame top, content flush with the banner (0px), 0 JS exceptions.
- 1366×768: frames at the 240px minimum; the page scrolls by 5–14px on department and Job Architecture views (designed fallback).
- Known limits (see Risks): Translations (with an item selected) and KPI Summary keep too much fixed content above the table, so the page still scrolls at 1600×900 (≈329px and ≈140px).

### Revision 4 (Step 8 finding: scrollbar must start below the table header)

- `shared/hooks/use-table-header-offset.ts` (new) + test; `index.css` scrollbar track offset by `--table-header-height`; ref attached to every framed table. Details and evidence in `step-8-code-review.md`.

## Inputs Reviewed

- Step 1–5 artifacts; files listed above; migration 006 pattern; sub-agent report for the KPI Summary tab.

## Actions and Evidence

- `npm --prefix frontend run typecheck` → exit 0; `npx eslint src/features/reports` (frontend) → exit 0.
- `npm --prefix frontend test -- --run src/features/reports` → 11 files, 46 tests passed.
- `npm --prefix backend run typecheck` / `lint` → exit 0.
- Key coverage script (`extract-keys.mjs`, session scratchpad): 199 `reports.*` keys in code, all present in the migration or already seeded by 006 (`reports.title`, `reports.subtitle`, `reports.role_scope`); 0 English mismatches.
- Migration round-trip on local Docker DB (`DATABASE_URL` → `localhost:5433`): before 750 `REPORTS_UI` rows; after `migrate:down -- --no-check-order` 32 rows with "1. My Report" / "Rankings…" restored; after `migrate:up` 758 rows with the new text. `migrate:up` also applied develop's `1792000000000`–`1792000000002` locally.
- Headless Chrome (HR_ADMIN): dark/en and light/vi screenshots of all tabs — dark cards/selects/labels readable, Vietnamese strings applied, un-numbered tabs, readable role, content aligned with the banner, trend prompt visible; My Report no longer errors for an account without an employee profile.

## Changes Made

- As listed in the Deliverable.

## Decisions and Rationale

- As listed under "Decisions Applied".

## Risks / Blockers

- Revision 3: Translations tab (locale cards + entity picker + banner + add-field row) and KPI Summary tab (search + employee card + four score cards) have more fixed content than a 900px window can hold with a 240px table, so the page scroll fallback applies there. Needs a user decision (for example an extra sub-tab for the fixed cards).
- Revision 3 (pre-existing, not changed): selecting an employee in the hub's KPI Summary tab navigates to the standalone `/reports/employees/:id/kpi-summary` route and leaves the hub.
- KPI Summary content with real data could not be seen locally (all evaluations OPEN); covered by existing TC-FE tests.
- `score_semantics_description` translations must keep the literal `{official_score}` placeholder.

## Next Step

Step 7 — Test.
