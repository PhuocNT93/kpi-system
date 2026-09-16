# Frontend User Guide: KPI Summary Dashboard

## 1. Overview
The **KPI Summary Dashboard** provides an authoritative, read-only evaluation summary for employees within the Employee Performance Evaluation Management System. It enables authorized users to search/select employees within their permitted scope, review organizational context, inspect official scores, review ordered KPI criteria items, drill down into snapshot level definitions and evidence, and explore relationship hierarchies.

---

## 2. Prerequisites & Setup

### Environment Prerequisites
- Node.js >= 18.0.0
- Backend service running on `http://localhost:3000` (or configured `VITE_API_BASE_URL`)
- PostgreSQL database populated with reporting read models

### Startup & Shutdown Commands
```bash
# In frontend/ directory:
npm install
npm run dev

# Production build preview:
npm run build
npm run preview

# Running tests:
npm test -- --run
```

---

## 3. URLs & Navigation
- **KPI Summary Dashboard**: `/reports/kpi-summary`
- **Employee-Specific Deep Link**: `/reports/employees/:employeeId/kpi-summary`
- **Navigation Sidebar**: Located under the **Performance** / **Reports** section as "KPI Summary Dashboard".

---

## 4. Dashboard Sections & Expected Behavior

### 1. Employee Search & Filter Bar
- **Fuzzy Search (`q`)**: Supports free-text search with Vietnamese diacritics normalization (e.g., "Nguyễn Văn A" matches "nguyen van a"). Debounced at 300ms.
- **Relational Filters**:
  - Department
  - Team
  - Role
  - Job Level
  - Manager
  - Evaluation Cycle
  - Evaluation Status
- **Pagination**: Supports configurable page sizes and page switching.
- **Scope Enforcement**:
  - `EMPLOYEE`: Locked to searching and viewing self only.
  - `MANAGER`: Scoped to employees belonging to managed teams.
  - `HR_ADMIN` & `SYSTEM_ADMIN`: Access across organization scope.

### 2. Employee Information Card
- Displays selected employee's code, full name, email, department, team, role, job level, and direct manager.
- Displays evaluation cycle name and evaluation publication status.

### 3. Score Summary Card
- **Official Score**: Highlights the authoritative, server-calculated result with prominent visual hierarchy.
  - Clearly labeled with its source (e.g., "Official Score (Final/Calibrated)" or "Official Score (Manager Review)").
  - Distinct from arithmetic averages.
- **Overall Score**: Displays unweighted score across active criteria.
- **Overall Weighted Score**: Displays sum of weighted criteria scores.
- **KPI Count & Completed Count**: Displays total evaluated criteria count and completed criteria count.
- *Strict Rule*: Zero score recalculation or arithmetic averaging is performed in the frontend.

### 4. KPI Summary Table
- Ordered strictly by template/evaluation snapshot `display_order ASC`.
- Columns: Index, Criterion, Category, Weight, Measurement, Resolved Level, Raw Score, Weighted Score, Status, Evidence.
- Disabled or missing score KPIs are explicitly styled.
- Clicking any row opens the KPI Detail Drill-down panel.

### 5. KPI Detail Drill-Down Panel
- Opens in a slide-out drawer or modal.
- Displays:
  - Criterion code, name, category, and description.
  - Measurement details (value, unit, source system, recorded timestamp).
  - Scoring breakdown (weight, resolved level, raw score, weighted score).
  - Snapshot level definitions used at evaluation time (historical immutability).
  - Associated evidence items (type, title, URL/reference, rationale, uploader).
- Read-only behavior: Editing actions are disabled for published/locked evaluations.

### 6. KPI Relationship Diagram
- Graphical DAG/tree visualization displaying entity relations:
  - `Employee -> Team -> Department`
  - `Manager -> Employee`
  - `Evaluation Cycle -> Evaluation -> Employee`
  - `Evaluation -> KPI items`
- Relationships are strictly driven by backend relational tuples (`source_id`, `target_id`, `relationship_type`).
- **Accessible Alternative**: A toggle allows switching to a structured tabular/list representation for screen-reader and keyboard accessibility.

---

## 5. UI States & Error Handling
- **Skeleton Loading**: Rendered during asynchronous data fetching across all cards.
- **Empty State**: Friendly prompt when no employee is selected or no evaluation exists for the chosen cycle.
- **Error State**: Displays safe user-facing message with `meta.request_id` for diagnostics.
- **403 Forbidden State**: Displayed when requesting an employee outside the user's permitted scope without leaking resource existence.

---

## 6. Known Limitations
- The dashboard is strictly read-only; score adjustments and calibration must occur within the dedicated Evaluation review workflows.
- Audited exports must be triggered via the designated export pipeline.
