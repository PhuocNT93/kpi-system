# Step 5: Test Cases

Status: reconstructed from the earlier approved response (approved by the user in chat)

## Deliverable

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Theme palette | `useTheme` light then dark | Call `useReportPalette` | Two different palettes; dark surface is not white |
| TC02 | Tabs by role | SYSTEM_ADMIN / HR_ADMIN / MANAGER / EMPLOYEE | Render hub | 4 / 4 / 3 (My, Team, Summary) / 2 (My, Summary) tabs |
| TC03 | Tab switch | Hub at `?scope=my` | Click Team | URL has `scope=team`; Team content shown |
| TC04 | Invalid / disallowed scope | EMPLOYEE opens `?scope=org` | Render hub | Falls back to the first allowed tab (My) |
| TC05 | Un-numbered tabs, readable role | Translations mocked per new migration | Render hub | No "1. …" labels; role chip shows a name, not a raw code |
| TC06 | Embedded tabs have no own title | Each tab with `isEmbedded` | Render | Tab page title absent; filters and content present |
| TC07 | Standalone routes keep the title | Each tab without `isEmbedded` | Render | Page title present |
| TC08 | Team change stays in the hub | Team tab in hub, ≥ 2 teams | Choose another team | URL `?scope=team&team=<id>`; no navigation to `/admin/team-report/...`; report queries use the new team |
| TC09 | "Compare with" defaults to none | Team tab, cycles available | Render | Current cycle auto-selected; comparison empty; trend query not run; trend table prompts to choose a comparison |
| TC10 | Choose a comparison cycle | As TC09 | Select a cycle in "Compare with" | Trend query runs with both cycles |
| TC11 | Distribution normalisation | Valid array, `{}`, `null`, malformed array | `toScoreDistributionBins` | Valid array → bins; others → empty array, no throw |
| TC12 | Distribution bars (Org) | Report with 5 bins and counts | Render Org | 5 bars with range and count; no JSON `<pre>` |
| TC13 | Empty distribution | `scoreDistribution` is `{}` | Render Org | Distribution empty state |
| TC14 | Score card without a value | Average score null | Render Team/Org | "—" with an explanation, not a bare "-" |
| TC15 | Consistent empty state | No evaluation for the cycle | Render My | `ReportEmptyState` with icon, title, description |
| TC16 | Language switch | Locale `vi`, mocked translations | Render hub and tabs | Filter titles and empty states in Vietnamese |
| TC17 | English fallback | No translations | Render tabs | Current English text; old tests pass |
| TC18 | `CycleSelector` no auto-select | No-auto-select mode | Render with cycles | `onChange` not called; "No comparison" option present |
| TC19 | Existing regression | — | Employee/Team/Org tests, KPI Summary TC-FE-01…07, ScoreCard, KpiTrendTable, KpiExplainabilityDrawer | All pass |
| TC20 | Migration down/up | Local Docker DB | `migrate:down` then `migrate:up` | Down removes new keys and restores old text; up writes new text; key counts match |
| TC21 | Browser check (manual, headless Chrome) | HR_ADMIN and MANAGER, light/dark, en/vi | Open each tab | No white cards/selects in dark; readable labels; content aligned with banner; no repeated title; team change stays in hub |
| TC22 | No-ranking rule | — | Review strings/UI of all tabs | No "Rankings/Xếp hạng"; no employee list sorted by score |

Notes: TC11–TC14 use mocked data (backend does not write `score_distribution`; no completed evaluations locally). TC21 is executed in Step 7.

## Inputs Reviewed

- Step 4 plan; existing report tests.

## Actions and Evidence

- Defined before implementation.

## Changes Made

- None.

## Decisions and Rationale

- Visual checks in the browser rather than style assertions in unit tests.

## Risks / Blockers

- None.

## Next Step

Step 6 — Implement.

## Revision (System & Security Hub, approved by the user in chat)

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC23 | Scrollbar hook | Element with offsetWidth > clientWidth | Render a component using `useScrollbarWidth` | Returns the difference; no error without `ResizeObserver` |
| TC24 | `SubTabs` | 3 tabs, tab 2 active | Render, click tab 3 | tablist + 3 tabs; tab 2 `aria-selected=true`; `onChange(tab3)` |
| TC25 | System hub tabs by role | SYSTEM_ADMIN, HR_ADMIN | Render hub (children mocked) | 4 tabs for both |
| TC26 | System hub tab switch | `?tab=organization` | Click IAM | URL `tab=iam`; IAM content shown |
| TC27 | Invalid `?tab` | `?tab=xyz` | Render | Falls back to Organization |
| TC28 | Readable role (System hub) | SYSTEM_ADMIN, no translations | Render | "System Admin", not "SYSTEM_ADMIN" |
| TC29 | IAM sub-tabs | IAM tab | Click Roles, Permissions | Content switches; `role=tab` + `aria-selected` |
| TC30 | Organization without own title | Render `OrganizationPage` | Render | No "Organization Management"/"Review Due Dashboard" h1; sub-tabs shown |
| TC31 | Organization sub-tabs | Render `OrganizationPage` | Click Job Architecture | Job Architecture shown, `aria-selected=true` |
| TC32 | I18nPage regression | — | `i18n.test.tsx` | Pass |
| TC33 | Audit + Reports regression | — | Audit (8) + Reports (46) tests | Pass |
| TC34 | Migration down/up with rename | Local Docker DB | Down (old name), rename, up; down/up again | `common.role_label.*` en+vi in `COMMON_UI`, no `reports.role.*`; down removes added keys, restores old text |
| TC35 | Browser: content scroll (System hub) | HR_ADMIN, 1600×900, light+dark | Open each tab, scroll | Page does not scroll; banner fixed; Org/IAM scroll in frame; Audit frame does not scroll, table scrolls, pager visible |
| TC36 | Browser: alignment | As TC35 | Measure content edges vs banner | ≤ 1px on all four tabs |
| TC37 | Browser: unified sub-tabs | As TC35 | Compare Org vs IAM sub-tabs | Same underline style/colour/size, light+dark |
| TC38 | Browser: no duplicated title | As TC35 | Open Organization | No "Review Due Dashboard"/"Organization Management" |
| TC39 | Browser: Reports regression | HR_ADMIN | Re-run Reports scroll/alignment checks | As Step 6 revision 1 |

## Revision 2 (only tables scroll; multi-table tabs get sub-tabs — approved by the user in chat)

TC35 is superseded by TC48–TC52.

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC40 | OrgStructure root sub-tabs | `OrgStructureTab`, root (tables mocked) | Render, click Employees | Tablist Departments · Employees; default `DepartmentTable`, then only `EmployeeTable` |
| TC41 | Department sub-tabs | Department selected | Click Employees, Formula | Teams · Employees · Formula; one content at a time; correct `aria-selected` |
| TC42 | Team sub-tabs | Team selected | Click Formula | Members · Formula; content switches |
| TC43 | Sub-tab kept across selection | Department A on Employees | Select department B, then a team | B stays on Employees; team falls back to Members |
| TC44 | Job Architecture sub-tabs | `JobArchitectureTab` (tables mocked) | Click Job Levels, Review Cadences | One table at a time; default Job Roles |
| TC45 | Team Report sub-tabs | `TeamReportPage` `isEmbedded`, data | Click KPI Trend | Default KPI Averages, then trend; cards and filters stay; standalone shows both tables, no sub-tabs |
| TC46 | KPI Summary sub-tabs | `KpiSummaryDashboardPage` `isEmbedded`, data | Click Relationships | Default KPI Items, then diagram; detail panel not open without a selected KPI; TC-FE-01…07 pass |
| TC47 | Sub-tab i18n | Local DB migration down → up | Query | `org.subtab.*` (`ORGANIZATION_UI`), `reports.*.subtab.*` (`REPORTS_UI`) en+vi; removed by down; no hard-coded Vietnamese labels in `OrgStructureTab` |
| TC48 | Browser: only tables scroll (System hub) | HR_ADMIN, 1600×900, light+dark | Open every Organization / Job Architecture sub-tab, IAM sub-tabs, Translations | `.app-layout-main` and `tabpanel` do not scroll; only `.table-scroll-frame` scrolls; banner, tabs, toolbars fixed |
| TC49 | Browser: sticky header | As TC48, long table | Scroll frame 200px | `thead` at frame top (≤1px), border visible |
| TC50 | Browser: last row vs action bar | Organization, one row selected | Scroll to bottom | Last row above `BulkActionBar` |
| TC51 | Browser: translations save bar | Translations tab | Scroll to bottom | Save bar always visible |
| TC52 | Browser: Reports hub | HR_ADMIN, light+dark | My, Team (both sub-tabs), Summary (both), Org | Panel does not scroll; My/Team/Summary scroll inside the table/list frame; Org uses page scroll when taller |
| TC53 | Browser: short viewport | 1366×768, 1280×600 | Open tabs in both hubs | Nothing clipped, no JS exceptions; frame ≥240px or page scrolls |
| TC54 | Browser: alignment + Audit | As TC48 | Measure edges; open Audit | ≤1px vs banner; Audit unchanged |
| TC55 | Standalone routes | `/admin/team-report/:id`, `/reports/employees/:id/kpi-summary` | Open | Old layout, own title, no sub-tabs |
| TC56 | Regression | — | FE+BE tests, typecheck, lint, build | All pass |
