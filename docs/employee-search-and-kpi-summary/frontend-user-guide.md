# User Guide: Employee Directory Search & KPI Summary

## 1. Overview

The **Employee Directory & Search** and **Employee KPI Summary** features provide an intuitive, high-performance interface for discovering organization members and reviewing finalized KPI performance snapshots.

Key capabilities:
- **Diacritic-insensitive and typo-tolerant search**: Search Vietnamese names with or without diacritics (e.g., `Nguyễn` vs. `Nguyen`) and tolerate minor typing mistakes (`Nguyem`).
- **Multi-criteria filtering**: Combine department, team, role, job level, evaluation cycle, and status filters seamlessly with AND semantics.
- **Auditable KPI Summaries**: Review immutable evaluation snapshots, with clear visual distinction of the official score of record (`overall_weighted_score` or `overall_score`).
- **Complete Evidence & Lineage**: Inspect automated measurement metrics, evidence links/attachments, reviewer sign-offs, and scoring rules.

---

## 2. Employee Directory & Search UI (`/admin/employees/search`)

### Accessing the Screen
Navigate to **Performance > Employee Search** in the left sidebar, or go directly to `/admin/employees/search`.

### Search & Filtering Features
1. **Fuzzy Search Bar (`q`)**:
   - Type any part of an employee's full name, employee code (e.g. `EMP-001`), or email address.
   - Vietnamese diacritics are normalized automatically; searching `Nguyen` matches `Nguyễn Văn An`.
   - Debounced at 300ms to eliminate unnecessary API requests while typing.
   - Click the **X** button to instantly clear the search query.

2. **Multi-Filter Bar**:
   - **Department**: Filter employees by their current active department.
   - **Team**: Filter by assigned team.
   - **Job Role & Level**: Filter by functional role and seniority level (e.g., Senior, Lead).
   - **Evaluation Cycle**: Filter employees who participated in a specific evaluation cycle.
   - **Evaluation Status**: Filter by evaluation lifecycle state (`DRAFT`, `SUBMITTED`, `REVIEWING`, `APPROVED`, `REJECTED`).

3. **Reset Filters**:
   - When active filters are applied, a "Clear all filters" button appears in the filter header to reset all parameters to default with one click.

4. **Results Table**:
   - Displays Employee Code, Full Name, Email, Department & Team, Role & Level, Manager, and Evaluation Status badge.
   - Hovering over a row highlights the item.
   - Click **KPI Summary** on any employee row to navigate to their evaluation summary.

5. **Pagination**:
   - Switch page size (10, 20, 50, 100 rows).
   - Navigate with **Previous** and **Next** buttons.

---

## 3. Employee KPI Summary UI (`/admin/employees/:id/kpi-summary`)

### Accessing the Screen
- Click the **KPI Summary** button next to any employee in the Search results, or
- Navigate directly to `/admin/employees/:id/kpi-summary?evaluation_cycle_id=<cycle_id>`.

### Key Elements & Visual Hierarchy
1. **Employee & Cycle Header**:
   - Displays employee name, employee code, email, department, and team.
   - Shows evaluation status (e.g., `APPROVED`) and locked indicator (`Locked Snapshot`).
   - Includes a **Cycle Selector dropdown** in the top right to switch between historical evaluation cycles.

2. **Official Score of Record Card**:
   - **Highlighted Badge**: Labeled with **"OFFICIAL SCORE OF RECORD"** and accented with primary brand styling.
   - **Dynamic Official Field**: Adapts dynamically depending on `official_score_field` (e.g., displaying `overall_weighted_score: 4.35 / 5.00` prominently).
   - **Immutability Notice**: Displays a caption stating that the scores are persisted historical snapshots and will not change even if current template criteria change.

3. **Score Breakdown & Comparison Card**:
   - Displays the **Raw Average Score** alongside the **Weighted Final Score** for complete transparency and auditable comparison.
   - Shows the total count of evaluated KPI items and the approval timestamp.

4. **Evaluated KPI Items Table**:
   - Lists all evaluated criteria with Criterion Code, Name, Category, Weight (%), Resolved Level (e.g., `Level 4`), Raw Score, and Weighted Score.
   - Rows are interactive and expand on click.

5. **Detailed Accordion Panel (per KPI item)**:
   - **Measurement Snapshot**: Displays the automated metric key, value, unit, and data source (e.g. `sprint_completion_rate: 95.5 % (Source: Jira)`).
   - **Reviewer & Rationale**: Shows the designated reviewer's name, review date, qualitative comment, and scoring rationale.
   - **Evidence Artifacts**: Lists attached evidence files and clickable URLs (e.g. Jira dashboard links, pull request URLs).

---

## 4. Role-Based Access Scopes (RBAC)

The Search and KPI Summary interfaces strictly adhere to system RBAC scopes:
- **System Admin & HR Admin**: Full visibility into all employees and their KPI evaluations across all departments.
- **Manager**: Can search and view KPI summaries only for employees within their managed teams or direct reports.
- **Employee**: Can search and view only their own employee profile and KPI evaluation summaries. Accessing another employee's summary returns an explicit 403 Access Denied screen.

---

## 5. Dark Mode & Accessibility

Both screens adhere to the system's design tokens and automatically adapt when Dark Mode is toggled:
- Surface containers adjust between `--bg-surface` (`#FFFFFF`) and dark `--bg-surface` (`#111827`).
- Text contrast adheres to WCAG AA guidelines with `--text-primary` and `--text-secondary`.
- Border outlines and status badges retain vibrant, readable color tokens in both modes.
