# Step 3: Impact Analysis

Status: reconstructed from the earlier approved response (approved by the user in chat)

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | ~16 files in `features/reports` (hub, 4 tabs, `CycleSelector`, `DataAsOf`, `ScoreCard`, `KpiBreakdown`, `KpiTrendTable`, 6 KPI Summary components): dark mode, i18n, layout. Components are used only inside `features/reports`. |
| Backend | NONE | No code change. |
| Database | LOW | One i18n seed migration: update `reports.scope.*`, `reports.desc.team`, `reports.desc.summary`; add `reports.*` content keys (en + vi). `down` removes new keys and restores old text. |
| API | NONE | Same endpoints, params, envelope. |
| RBAC / Scope | LOW | Tab visibility unchanged. Team change stays in the hub (`?scope=team&team=<id>`); backend team permission checks unchanged. |
| Workflow | NONE | — |
| Audit | NONE | Read-only. |
| Concurrency | NONE | No writes. |
| Performance | LOW | "Compare with" defaults to none, so the trend query runs only after a comparison cycle is chosen. |
| Historical Data | NONE | Stored snapshot values rendered as-is. |

Potential Risks:
- Legacy standalone routes render tab pages outside the hub; hiding titles must be limited to an `isEmbedded` mode.
- Existing tests assert English text; new i18n keys use the current English as fallback.
- KPI Summary has ~2000 lines of light-only styling — largest effort.
- Content-with-data only verifiable via unit tests.
- Score Distribution replaced by a bar view for array-shaped data; still empty until the backend writes it.
- Global i18n collision avoided by `reports.`-prefixed keys.

Required ADR / Clarification:
- KPI Summary depth: full dark mode + i18n (recommended; taken as approved).
- Backend not writing org `score_distribution`: separate backend task.

## Inputs Reviewed

- Usages of report components outside the feature (`grep`): none; pages referenced only by `App.tsx`.
- `useKpiTrend` gating: `enabled: !!currentCycleId && !!previousCycleId && (!!teamId || !!employeeId)`.

## Actions and Evidence

- `ls backend/migrations | sort | tail` → latest prefix `1792000000002`.

## Changes Made

- None.

## Decisions and Rationale

- Keep changes inside `features/reports` plus one migration.

## Risks / Blockers

- As listed.

## Next Step

Step 4 — Plan.

## Revision (System & Security Hub, approved by the user in chat)

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Adds `UnifiedSystemAdminPage.tsx`, `OrganizationPage.tsx`, `I18nPage.tsx`, a shared `SubTabs` component and a shared `useScrollbarWidth` hook (replacing duplicates in `AuditTable` and the Reports hub). |
| Database | LOW | Migration `1792000000003` (not on remote) moves `reports.role.*` to shared `common.role_label.*` under `COMMON_UI`; local DB needs down → change → up. |
| RBAC / Scope | NONE | Hub tabs remain SYSTEM_ADMIN/HR_ADMIN. |
| Others | NONE | — |

Risks: org tree layout after removing padding; `.org-page-container` possibly shared; two-level scroll on the Audit tab; no existing System hub/Organization tests; i18n test asserts text; inner dark-mode issues out of scope.

## Revision 2 (only tables scroll; multi-table tabs get sub-tabs — approved by the user in chat)

| Area | Impact | Notes |
|---|---|---|
| Frontend – hubs | HIGH | Both hub `tabpanel`s stop scrolling (no `overflowY: auto`, no scrollbar-width offset); the panel becomes a height-filling flex column. |
| Frontend – Organization | HIGH | `OrgStructureTab` uses `SubTabs` (root: Departments · Employees; department: Teams · Employees · Formula; team: Members · Formula), tree sidebar scrolls on its own; `JobArchitectureTab` uses `SubTabs` (Job Roles · Job Levels · Review Cadences); the six organization tables get a scroll frame with a sticky header. Only used by these tabs (`ReviewCadencesPage` is unrouted). |
| Frontend – IAM / Translations | MEDIUM | `UserTable`, `RoleTable`, `PermissionTable` (matrix and cards) and `EntityTranslationEditor` fill the height; the translation save bar stays visible. `IamPage` is unrouted. |
| Frontend – Reports | MEDIUM | My: `KpiBreakdown` scrolls; Team: `SubTabs` KPI Averages · KPI Trend; KPI Summary: `SubTabs` KPI Items · Relationships (`KpiSummaryTable` root `overflow: hidden` removed); Org: page-scroll fallback. Standalone routes unchanged (`isEmbedded = false`). |
| Frontend – shared | LOW | `.fill-column` and `.table-scroll-frame` in `index.css`; `SubTabs` reused unchanged; `useScrollbarWidth` stays for Audit. |
| Backend / DB | LOW | Possible new sub-tab i18n keys added to the unpublished migration `1792000000003` (local down → up). No API or schema change. |
| RBAC / data / scoring | NONE | Layout only. |

Risks: fixed `BulkActionBar` vs. `paddingBottom: 6rem` inside the scroll frame; sticky header borders with `border-collapse` (use box-shadow as in Audit); short viewports (page-scroll fallback, check 1366×768); keeping the selected sub-tab when the tree selection changes (AC14); existing tests assume all tables render at once; the fixed `KpiDetailPanel` when the diagram moves into its own sub-tab.
