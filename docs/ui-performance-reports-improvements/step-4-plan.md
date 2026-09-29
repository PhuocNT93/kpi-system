# Step 4: Plan

Status: reconstructed from the earlier approved response (approved by the user in chat). User chose to follow the shared hub design of the other five hubs (AC2 revised).

## Deliverable

## Implementation Plan

1. **What:** Report-scoped theme palette hook (surface, surfaceSubtle, border, text primary/secondary/muted, input bg/border, track) for light and dark.
   **Where:** `frontend/src/features/reports/hooks/use-report-palette.ts` (new)
   **Why:** ~16 files need dark mode; one source of colours without touching shared theme.
   **Tests:** unit test for both palettes.

2. **What:** `ReportFilterBar` (card with title + divider, filter row, fixed "Data as of" on the right) and `ReportEmptyState` (icon, title, description; theme-aware).
   **Where:** `frontend/src/features/reports/components/ReportFilterBar.tsx`, `ReportEmptyState.tsx` (new)
   **Why:** AC3.
   **Tests:** render, theme, slots.

3. **What:** Theme + i18n for `CycleSelector` (optional no-auto-select with a "No comparison" option), `DataAsOf` (locale-aware, i18n), `ScoreCard`, `KpiBreakdown`, `KpiTrendTable`, `KpiExplainabilityDrawer`.
   **Where:** `frontend/src/features/reports/components/*`
   **Why:** AC7; fixes "Compare with" defaulting to the current cycle.
   **Tests:** keep existing component tests; add `CycleSelector` no-auto-select test.

4. **What:** Hub uses `.unified-hub-*` like `UnifiedSystemAdminPage`; role via `t('reports.role.<code>', code)`; passes `isEmbedded` to tabs.
   **Where:** `frontend/src/features/reports/pages/UnifiedPerformanceReportsPage.tsx`
   **Why:** AC2 (revised); consistency with other hubs.
   **Tests:** tabs per role; tab switch updates `?scope`.

5. **What:** My/Team/Org tabs: `isEmbedded` hides `PageHeader` and removes max-width/padding; `ReportFilterBar` + `ReportEmptyState`; strings via `t('reports.my|team|org.*', fallback)`; palette colours. Team: in the hub, team change updates `?scope=team&team=<id>`; "Compare with" defaults to none with a prompt in the trend table. Org: Score Distribution as horizontal bars for `{range, count, percentage}` arrays, otherwise empty state; no raw JSON. Score cards without a value show "—" with an explanation.
   **Where:** `EmployeeReportPage.tsx`, `TeamReportPage.tsx`, `OrganizationReportPage.tsx`; pure `toScoreDistributionBins` in `frontend/src/features/reports/domain/`
   **Why:** AC1, AC3, AC4, AC7; Team navigation bug.
   **Tests:** update the three page tests; add team-stays-in-hub, compare-defaults-empty, distribution bars, `toScoreDistributionBins` unit tests.

6. **What:** KPI Summary page + 6 components: palette colours, `t('reports.summary.*', fallback)`, `isEmbedded` hides title and aligns width; behaviour, table and diagram unchanged.
   **Where:** `frontend/src/features/reports/employee-kpi-summary/**`
   **Why:** AC3, AC4, AC7.
   **Tests:** existing TC-FE-01…07 must pass.

7. **What:** i18n seed migration (`REPORTS_UI`, same entity id as migration 006): un-numbered `reports.scope.*`; `reports.desc.team` without ranking; accurate `reports.desc.summary`; `reports.role.*`; new tab-content keys (en + vi). `down` removes new keys and restores old text.
   **Where:** `backend/migrations/1792000000003_seed_reports_and_hub_ui_i18n_translations.ts` (re-check prefix before creating)
   **Why:** AC2, AC5, Vietnamese content.
   **Tests:** down/up round-trip on the local Docker DB with key counts.

8. **What:** `frontend-user-guide.md`.
   **Where:** `docs/ui-performance-reports-improvements/`
   **Why:** required for frontend tasks.

Not done: backend `score_distribution`, new charts/metrics, ranking, export, changes to the other five hubs.

Order: 1 → 2 → 3 → 7 → 4 → 5 → 6 → 8.

## Inputs Reviewed

- `shared/theme/colors.ts` (no dark semantic palette), migration 006 seeding pattern, other hubs using `.unified-hub-*` and emoji hints.

## Actions and Evidence

- `grep` for `unified-hub-banner`: five hubs; `💡|unified-hub-tab-badge` present across hubs.
- User answer (AskUserQuestion): "Theo chuẩn 5 hub khác".

## Changes Made

- None.

## Decisions and Rationale

- Consistency with the other hubs over a Reports-only redesign.

## Risks / Blockers

- None.

## Next Step

Step 5 — Test Cases.

## Revision (System & Security Hub, approved by the user in chat)

9. Shared `useScrollbarWidth()` hook — `frontend/src/shared/hooks/use-scrollbar-width.ts`; used by `AuditTable`, Reports hub, System hub.
10. Shared `SubTabs` — `frontend/src/shared/ui/SubTabs/SubTabs.tsx` (underline style, tablist/tab/aria-selected, theme-aware).
11. System hub: content scroll frame like Reports; Audit tab fills the frame height; IAM sub-tabs via `SubTabs`; role via `t('common.role_label.<code>', humanized)`.
12. `OrganizationPage`: no `h1`/subtitle, no `.org-page-container` class, `SubTabs`; remove unused `.org-tabs-bar` CSS (`.org-page-container` kept — also used by `ReviewCadencesPage`).
13. `I18nPage`: remove `marginTop: 1rem`.
14. Reports hub: shared role key and shared hook.
15. Migration: `reports.role.*` → `common.role_label.*` (`COMMON_UI`); rename to `1792000000003_seed_reports_and_hub_ui_i18n_translations.ts`; local down/rename/up.
16. Tests: System hub, `OrganizationPage`, `SubTabs`, `useScrollbarWidth`.
17. Update `frontend-user-guide.md`.

Order: 9 → 10 → 15 → 14 → 11 → 12 → 13 → 16 → 17, then browser checks for both hubs.

## Revision 2 (only tables scroll; multi-table tabs get sub-tabs — approved by the user in chat)

18. CSS utilities `.fill-column` and `.table-scroll-frame` (sticky `thead`, box-shadow header border, thin themed scrollbar) in `index.css`.
19. Both hubs: `tabpanel` no longer scrolls (remove `overflowY`, gutter and scrollbar-width offset); `.fill-column` with `min-height: 480px`; page scroll as fallback.
20. Organization tables (`Department`, `Employee`, `Team`, `OrgRole`, `JobLevel`, `ReviewCadence`): root `.fill-column`, wrapper `.table-scroll-frame`, bottom padding for `BulkActionBar` inside the frame.
21. `OrgStructureTab`: stretch layout, tree sidebar scrolls; `SubTabs` — root Departments · Employees (`rootSubTab`), department Teams · Employees · Formula, team Members · Formula; hard-coded Vietnamese labels replaced by `org.subtab.*`; keep the selected sub-tab across selection changes, fall back to the first when absent.
22. `JobArchitectureTab`: `SubTabs` Job Roles · Job Levels · Review Cadences, one table at a time.
23. `OrganizationPage`: `.fill-column`.
24. IAM tables: `.table-scroll-frame` (cards/matrix inside), toolbar and view toggle fixed.
25. Translations: table in `.table-scroll-frame`, save bar outside the scroll area.
26. Reports: My — `KpiBreakdown` list scrolls; Team — `SubTabs` KPI Averages · KPI Trend; KPI Summary — `SubTabs` KPI Items · Relationships (`KpiSummaryTable` sticky header, no root `overflow: hidden`), `KpiDetailPanel` stays fixed; Org — unchanged. Sub-tabs and fill-height only when `isEmbedded`.
27. Migration `1792000000003`: `org.subtab.*` under `ORGANIZATION_UI` (`…0001`), `reports.team.subtab.*` and `reports.summary.subtab.*` under `REPORTS_UI`; `down` removes them; local down → up.
28. Tests: update organization/hub/Team/KPI Summary tests; add `OrgStructureTab` and `JobArchitectureTab` tests.
29. Browser checks at 1600×900 and 1366×768, light and dark; update `frontend-user-guide.md` and step artifacts.

Decisions (user approved): department "Teams & Nhân sự" split into Teams and Employees; hard-coded Vietnamese labels moved to i18n.
