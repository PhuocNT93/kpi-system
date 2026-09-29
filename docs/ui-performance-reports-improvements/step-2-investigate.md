# Step 2: Investigate

Status: reconstructed from the earlier approved response (approved by the user in chat)

## Deliverable

## Investigation

Relevant Documents:
- LLD §2, §19, §30-Q10 (no ranking; aggregates only), §90 (basic dashboard: employee score, team average, completion rate).
- `CLAUDE.md` (i18n as data, query keys include all filters, snapshots not recalculated).

Relevant Modules and Files:
- Hub: `frontend/src/features/reports/pages/UnifiedPerformanceReportsPage.tsx` (`?scope=my|team|org|summary`, role-based tabs).
- Tabs: `EmployeeReportPage.tsx`, `TeamReportPage.tsx`, `OrganizationReportPage.tsx`, `employee-kpi-summary/pages/KpiSummaryDashboardPage.tsx` + 6 components.
- Shared report components: `CycleSelector`, `DataAsOf`, `ScoreCard`, `KpiBreakdown`, `KpiTrendTable`, `KpiExplainabilityDrawer`.
- Routes (`App.tsx`): `/admin/reports`; legacy standalone `/admin/my-report/:employeeId`, `/admin/team-report/:teamId`, `/reports/employees/:employeeId/kpi-summary`.
- i18n: `reports.*` seeded by `backend/migrations/1791000000006_seed_admin_screens_ui_i18n_translations.ts` (`REPORTS_UI`, entity `00000000-0000-0000-0000-000000000016`).

Existing Implementation:
1. No dark mode: only the hub reads `isDark`; all tab content and components hard-code light colours (dark screenshot: white cards/selects, unreadable labels).
2. No i18n in tab content: only the hub uses `useUiTranslation`.
3. Three stacked titles: layout header, hub banner, per-tab `PageHeader`.
4. Inconsistent layout: My/Team/Org use `maxWidth: 1200px; margin: 0 auto; padding: 32px`; Summary differs; filters placed differently per tab.
5. Team tab leaves the hub when changing team (`navigate('/admin/team-report/<id>')`).
6. "Compare with (Previous Cycle)" defaults to the current cycle (`CycleSelector` auto-selects `cycles[0]` for both).
7. Org "Score Distribution" prints `JSON.stringify` in a `<pre>`; backend `refreshOrganization` never writes `score_distribution`, so it is always empty; frontend type is `Record<string, unknown>`.
8. i18n text: numbered tab labels; `reports.desc.team` says "Rankings / Xếp hạng"; `reports.desc.summary` describes an S/A/B/C/D matrix while the tab is a per-employee KPI lookup; emoji hint; raw role code.
9. Local data: 247 evaluations across 13 cycles, all OPEN.

Existing Tests:
- `pages/EmployeeReportPage.test.tsx` (3), `pages/TeamReportPage.test.tsx` (1), `pages/OrganizationReportPage.test.tsx` (1), `employee-kpi-summary/__tests__/KpiSummaryDashboardPage.test.tsx` (TC-FE-01…07), `components/ScoreCard.test.tsx`, `KpiTrendTable.test.tsx`, `KpiExplainabilityDrawer.test.tsx`.

Patterns to Reuse:
- `.unified-hub-*` CSS classes (`index.css`) used by five other hubs.
- Audit-task patterns: filter card with title + divider, theme-aware empty state, `t(key, fallback)`, feature-prefixed i18n keys.
- `RADII`/`TYPOGRAPHY`/`COLORS` tokens, Lucide icons, shared `Button`.

## Inputs Reviewed

- Files above; backend `reports-query.service.ts`, `reporting-projection.service.ts`; local DB read model.

## Actions and Evidence

- `grep -rl isDark|useUiTranslation features/reports` → only the hub.
- Dark screenshots via `reports-tabs.mjs … dark`.
- Read-only SQL: `employee_evaluation_score_read_model` grouped by cycle/status → 13 cycles × 19 rows, all `OPEN`.

## Changes Made

- None.

## Decisions and Rationale

- Assumptions (Step 1 open questions unanswered): no seed data; keep existing charts/tables; backend `score_distribution` gap as a separate task.

## Risks / Blockers

- None.

## Next Step

Step 3 — Impact Analysis.

## Revision (System & Security Hub, approved by the user in chat)

- Hub: `features/organization/pages/UnifiedSystemAdminPage.tsx` (`?tab=organization|iam|audit|i18n`; IAM sub-tabs inline; fill-height only for the Audit tab).
- `OrganizationPage.tsx` and `I18nPage.tsx` are only rendered by the hub (legacy routes redirect).
- Misalignment causes: `.org-page-container` padding 16–24px on Organization; `marginTop: 1rem` on Translations; IAM tables and Audit already flush.
- Duplicated title: `OrganizationPage` renders `h1` with colliding `page_title` → "Review Due Dashboard".
- Two sub-tab styles: Organization underline (indigo) vs IAM bordered pills (blue).
- Raw role code in the System hub chip (`t('common.role')`: `SYSTEM_ADMIN`).
- Scrollbar measurement duplicated in `AuditTable` and the Reports hub.
- Tests: none for the System hub or `OrganizationPage`; `features/i18n/__tests__/i18n.test.tsx` covers `I18nPage` text.
- i18n: `common.*` seeded under `COMMON_UI` (entity `00000000-0000-0000-0000-000000000021`) by migration 006; `sysadmin.*` by `1791000000009_seed_unified_hubs_*`.

## Revision 2 (only tables scroll; multi-table tabs get sub-tabs — approved by the user in chat)

- Current state: both hubs make the whole `tabpanel` the scroll container (`overflowY: auto`, pulled right by the measured scrollbar width). The user wants the panel and page fixed and only the main table to scroll, in both hubs; tabs with several tables switch between them with small sub-tab headers.
- Table wrappers / sticky-header candidates:
  - Organization (root `paddingBottom: 6rem` for the fixed `BulkActionBar`, wrapper `overflowX: auto`): `DepartmentTable` L101/103, `EmployeeTable` L129/131 (props `departmentId?`, `teamId?`), `TeamTable` L105/107, `OrgRoleTable` L107/109, `JobLevelTable` L107/109; `ReviewCadenceTable` root flex column L59, wrapper L71, thead L73.
  - IAM: `UserTable` wrapper L355 / thead L367, `RoleTable` L444 / L456 (both with a view-mode toggle), `PermissionTable` L465 / L484 (matrix or cards).
  - Translations: `EntityTranslationEditor` wrapper L642 / thead L644; save bar L716–720 must stay visible.
  - Reports: `KpiSummaryTable` root `overflow: hidden` (L48–56), wrapper L83, thead L85; `KpiTrendTable` section scrolls itself (L60); `KpiBreakdown` is a list, not a table.
  - Audit: already follows the target pattern (sticky header, table scrolls, pagination pinned).
- Multi-table tabs:
  - `OrgStructureTab`: root view `DepartmentTable` L240 + `EmployeeTable` L247; department view has sub-tabs `deptSubTab` (L28, buttons L312–353) → `TeamTable` L363, `EmployeeTable` L370, formula; team view `teamSubTab` (L29, buttons L475–518) → `EmployeeTable` L527, formula. Sub-tab state is not reset when the selection changes. `.org-structure-layout` becomes a row at ≥1024px with `align-items: flex-start`; `.org-tree-sidebar` max-height 380 then min-height 520.
  - `JobArchitectureTab`: `.org-job-grid` with three cards (roles, levels, review cadences).
  - Team Report: KPI averages table + cross-cycle trend table.
  - KPI Summary: search → info card → score card → `KpiSummaryTable` → `KpiRelationshipDiagram` → fixed `KpiDetailPanel`.
- Proposed pattern: CSS utilities `.fill-column` (flex column, `flex: 1`, `min-height: 0`) and `.table-scroll-frame` (`flex: 1`, `min-height: 240px`, `overflow: auto`, sticky `thead` at top 0); `SubTabs` for multi-table tabs; page-level scroll as fallback when the viewport is too short.
