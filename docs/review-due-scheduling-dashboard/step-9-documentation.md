# Step 9 — System Documentation: Review Cadence & Review Due Scheduling Dashboard

## 1. Feature Overview & Purpose

The **Review Cadence & Review Due Scheduling** capability introduces automated cadence resolution, schedule-drift-free due date tracking, scoped monitoring dashboards, and transactional cadence override management to the KPI & Performance Evaluation platform.

Key capabilities delivered:
1. **Authoritative 3-Tier Precedence Resolver**: Seamlessly determines the effective review interval based on Employee Override &rarr; Job Level Default &rarr; System Default.
2. **Schedule-Drift-Free Review Due Date Calculation**: Ensures due dates anchor strictly to completed evaluation baselines (`last_evaluation_completed_at + interval_months`), eliminating calendar drift across fiscal years.
3. **Daily Scheduled State Refresh (`0 0 * * *`)**: Lightweight background cron job refreshing due dates and overdue statuses without automatically generating evaluations.
4. **Scoped Review Due Monitoring Dashboard**:
   - `HR_ADMIN` / `SYSTEM_ADMIN`: Organization-wide visibility, multi-filter query, bulk review initiation.
   - `MANAGER`: Scoped strictly to direct team members (`managedTeamIds`).
   - `EMPLOYEE`: Access forbidden (`403 Forbidden`).
5. **Strict Anti-Ranking Assurance**: Dashboard display order is strictly constrained to `next_review_due_date ASC NULLS LAST`. The UI explicitly avoids ranking, scores, or competitive comparative indicators.
6. **Pure Dynamic UI Internationalization (i18n)**: Adheres to the established `AUDIT_UI` pattern, storing localized strings in PostgreSQL and synchronizing to browser `localStorage` (`kpi_ui_translations`), enabling instantaneous zero-network language switching.
7. **Responsive Multi-Device & Dark Mode Experience**: Fluid mobile card layout, sticky bulk actions bar, and contrast-validated dark mode styling.

---

## 2. System Architecture & Component Interactions

```mermaid
graph TD
    subgraph Frontend["Frontend Layer (React 19 + TypeScript)"]
        UI_Dash["Review Due Dashboard<br/>(/admin/review-due)"]
        UI_Cadence["Review Cadence Admin<br/>(/admin/review-cadences)"]
        UI_Modal["Individual Evaluation Modal"]
        UI_EmpModal["Employee Form Modal<br/>(Cadence Override)"]
        Hook_Due["useReviewDue Hook"]
        Hook_i18n["useUiTranslation<br/>(localStorage: kpi_ui_translations)"]
    end

    subgraph Backend_API["API Layer (Express Router)"]
        Route_Due["GET /reviews/due"]
        Route_Override["PATCH /api/employees/:id/review-cadence-override"]
        Route_Inspect["GET /api/employees/:id/review-cadence"]
        Route_IndivCycle["POST /api/evaluation-cycles/individual"]
    end

    subgraph Domain_Services["Application & Domain Services"]
        Due_Service["ReviewDueService<br/>(RBAC scoping, lead-time query)"]
        Schedule_Service["ReviewScheduleService<br/>(Baseline calculation, locking)"]
        Precedence_Resolver["cadence-precedence-resolver<br/>(3-tier precedence)"]
        Due_Calculator["review-due-calculator<br/>(Date drift-free math)"]
        Cron_Scheduler["ReviewDueScheduler<br/>(Cron: 0 0 * * *)"]
        Cycle_Service["EvaluationCycleService<br/>(Individual cycle creation)"]
        Audit_Service["AuditService<br/>(Transactional audit logs)"]
    end

    subgraph Storage["Persistence Layer (PostgreSQL)"]
        DB_Emp[("employee<br/>(next_review_due_date,<br/>last_evaluation_completed_at,<br/>review_cadence_override_id)")]
        DB_Cadence[("review_cadence")]
        DB_JobLevel[("job_level<br/>(default_review_cadence_id)")]
        DB_Audit[("audit_log")]
        DB_Cycle[("evaluation_cycle")]
    end

    UI_Dash --> Route_Due
    UI_Modal --> Route_IndivCycle
    UI_EmpModal --> Route_Override
    Hook_i18n -.-> Storage

    Route_Due --> Due_Service
    Route_Override --> Schedule_Service
    Route_IndivCycle --> Cycle_Service
    Cron_Scheduler --> Due_Service

    Schedule_Service --> Precedence_Resolver
    Schedule_Service --> Due_Calculator
    Schedule_Service --> DB_Emp
    Schedule_Service --> Audit_Service

    Due_Service --> DB_Emp
    Audit_Service --> DB_Audit
    Cycle_Service --> DB_Cycle
```

---

## 3. Sequence Diagrams

### 3.1. Cadence Precedence Resolution (3-Tier)

```mermaid
sequenceDiagram
    autonumber
    participant Caller as Calling Service / Controller
    participant RSS as ReviewScheduleService
    participant DB as PostgreSQL Database
    participant CPR as CadencePrecedenceResolver

    Caller->>RSS: resolveEmployeeEffectiveCadence(employeeId)
    RSS->>DB: SELECT employee override, job_level default, system default (Single LEFT JOIN query)
    DB-->>RSS: override_id, job_id, sys_id + metadata
    RSS->>CPR: resolveEffectiveCadence({ employeeOverride, jobLevelDefault, systemDefault })
    Note over CPR: Tier 1: employeeOverride (if active)<br/>Tier 2: jobLevelDefault (if active)<br/>Tier 3: systemDefault (active = true)
    CPR-->>RSS: { effectiveCadence, source: 'OVERRIDE' | 'JOB_LEVEL' | 'SYSTEM_DEFAULT' }
    RSS-->>Caller: ResolvedEmployeeCadenceResult
```

---

### 3.2. Daily Scheduled Review Due Job (`0 0 * * *`)

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Node-Cron (Daily @ 00:00)
    participant RDS as ReviewDueScheduler
    participant Serv as ReviewDueService
    participant DB as PostgreSQL Database

    Cron->>RDS: Trigger daily execution
    RDS->>Serv: refreshReviewDueState()
    Serv->>DB: SELECT employees with ACTIVE status requiring calculation
    DB-->>Serv: rows
    loop For each employee needing recalculation
        Serv->>DB: Recalculate next_review_due_date using completion baseline
    end
    Note over RDS,Serv: Scheduled job NEVER auto-generates evaluations.<br/>Evaluations require human approval.
    RDS-->>Cron: Log completion summary (processedCount)
```

---

### 3.3. Evaluation Publish Event & Baseline Registration

```mermaid
sequenceDiagram
    autonumber
    participant EvalSvc as EvaluationService
    participant RSS as ReviewScheduleService
    participant Tx as DB Transaction Client
    participant Audit as AuditService

    EvalSvc->>Tx: BEGIN Transaction
    EvalSvc->>Tx: UPDATE evaluation SET status = 'PUBLISHED'
    EvalSvc->>RSS: onEvaluationPublished(evalId, empId, publishedAt, tx, actorId)
    RSS->>Tx: SELECT next_review_due_date FROM employee WHERE id = empId FOR UPDATE
    RSS->>RSS: resolveEmployeeEffectiveCadence(empId, tx)
    RSS->>RSS: calculateNextReviewDueDate(publishedAt, intervalMonths)
    RSS->>Tx: UPDATE employee SET last_evaluation_completed_at = publishedAt, next_review_due_date = newDueDate
    RSS->>Audit: record(tx, { entityType: 'EMPLOYEE', action: 'UPDATE', fieldName: 'next_review_due_date' })
    Audit->>Tx: INSERT INTO audit_log
    EvalSvc->>Tx: COMMIT Transaction
```

---

### 3.4. Cadence Override Mutation & Drift-Free Recalculation

```mermaid
sequenceDiagram
    autonumber
    participant User as HR Admin / System Admin
    participant Route as PATCH /api/employees/:id/review-cadence-override
    participant ECS as EmployeeCadenceService
    participant Tx as Transaction (withAuditedTransaction)
    participant RSS as ReviewScheduleService
    participant Audit as AuditService

    User->>Route: { review_cadence_override_id, reason }
    Route->>ECS: updateCadenceOverride(actor, employeeId, input)
    ECS->>ECS: requireHrOrAdmin(actor)
    ECS->>Tx: BEGIN
    ECS->>Tx: SELECT employee FOR UPDATE
    ECS->>Tx: UPDATE employee SET review_cadence_override_id = $overrideId
    ECS->>RSS: recalculateEmployeeDueDate(empId, tx, actorId, reason)
    Note over RSS: Uses existing last_evaluation_completed_at baseline.<br/>Independent of today's date!
    RSS->>Tx: UPDATE employee SET next_review_due_date = $newDueDate
    RSS->>Audit: record(tx, { fieldName: 'next_review_due_date', oldValue, newValue, reason })
    Tx-->>User: 200 OK { employee_id, effective_cadence, next_review_due_date }
```

---

## 4. REST API Specification

### 4.1. `GET /reviews/due`
Returns employees scheduled for performance evaluation within the given lead-time window.

- **Access**: Authenticated (`HR_ADMIN`, `SYSTEM_ADMIN`, `MANAGER`).
- **Query Parameters**:
  - `lead_time_days` *(optional, integer, default: 30)*: Lookahead window in days.
  - `status` *(optional, string)*: Filter by `OVERDUE`, `DUE`, `UPCOMING`, `NOT_DUE`.
  - `team_id` *(optional, UUID)*: Filter by team (validated against manager's team permissions).
  - `cadence_id` *(optional, UUID)*: Filter by assigned cadence.
  - `search` *(optional, string)*: Keyword search against employee name or employee code.
  - `page` *(optional, integer, default: 1)*: Pagination page index.
  - `page_size` *(optional, integer, default: 20)*: Page size limit.
- **Sorting Rule**: Guaranteed `next_review_due_date ASC NULLS LAST` (Strict anti-ranking).
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "employee_id": "c1f7a2d8-4b2e-4b9e-9d2a-1b2c3d4e5f6a",
        "employee_code": "EMP-0042",
        "employee_name": "Nguyen Van A",
        "team_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "team_name": "Core Engineering",
        "job_level_id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
        "job_level_name": "Senior Software Engineer",
        "effective_cadence_id": "d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a",
        "effective_cadence_name": "Bán niên (6 tháng)",
        "effective_cadence_code": "CAD-SEMIANNUAL",
        "effective_cadence_interval_months": 6,
        "cadence_source": "JOB_LEVEL",
        "last_evaluation_completed_at": "2025-10-15T00:00:00.000Z",
        "next_review_due_date": "2026-04-15",
        "days_remaining": -5,
        "status": "OVERDUE"
      }
    ],
    "summary": {
      "total_due_count": 14,
      "overdue_count": 3,
      "due_today_count": 1,
      "upcoming_count": 10
    },
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 14,
      "total_pages": 1
    }
  }
}
```

---

### 4.2. `PATCH /api/employees/:employeeId/review-cadence-override`
Assigns or clears an individual employee's cadence override and immediately recalculates `next_review_due_date`.

- **Access**: Strictly restricted to `HR_ADMIN` and `SYSTEM_ADMIN`.
- **Request Body**:
```json
{
  "review_cadence_override_id": "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
  "reason": "Probationary period review cadence adjustment"
}
```
*Note: Pass `null` for `review_cadence_override_id` to revert back to Job Level or System Default.*

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Employee review cadence override updated successfully.",
  "data": {
    "employee_id": "c1f7a2d8-4b2e-4b9e-9d2a-1b2c3d4e5f6a",
    "review_cadence_override_id": "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
    "last_evaluation_completed_at": "2025-10-15T00:00:00.000Z",
    "next_review_due_date": "2026-01-15",
    "effective_cadence": {
      "id": "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
      "code": "CAD-QUARTERLY",
      "name": "Định kỳ Quý (3 tháng)",
      "interval_months": 3
    }
  }
}
```

---

### 4.3. `GET /api/employees/:employeeId/review-cadence`
Inspects the resolved cadence breakdown for an employee.

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "effectiveCadence": {
      "id": "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
      "code": "CAD-QUARTERLY",
      "name": "Định kỳ Quý (3 tháng)",
      "intervalMonths": 3,
      "isSystemDefault": false,
      "active": true
    },
    "employeeOverride": {
      "id": "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
      "code": "CAD-QUARTERLY",
      "name": "Định kỳ Quý (3 tháng)",
      "intervalMonths": 3,
      "isSystemDefault": false,
      "active": true
    },
    "jobLevelDefault": {
      "id": "d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a",
      "code": "CAD-SEMIANNUAL",
      "name": "Bán niên (6 tháng)",
      "intervalMonths": 6,
      "isSystemDefault": false,
      "active": true
    },
    "systemDefault": {
      "id": "f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0c",
      "code": "CAD-ANNUAL",
      "name": "Thường niên (12 tháng)",
      "intervalMonths": 12,
      "isSystemDefault": true,
      "active": true
    }
  }
}
```

---

### 4.4. `POST /api/evaluation-cycles/individual`
Creates individual review cycles for selected review-due employees with team conflict validation.

- **Request Body**:
```json
{
  "employee_ids": ["c1f7a2d8-4b2e-4b9e-9d2a-1b2c3d4e5f6a"],
  "template_id": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
  "start_date": "2026-04-15",
  "end_date": "2026-04-30",
  "name_prefix": "Đánh giá Kỳ Hạn"
}
```

---

## 5. Database Schema & Migration Details

### 5.1. Migration `1791000000002_add_employee_review_due_indexes.ts`
Creates compound indexes on table `employee` to accelerate `GET /reviews/due`:
```sql
-- Organization-wide search: filters by active employees and orders by due date
CREATE INDEX IF NOT EXISTS idx_employee_review_due 
ON employee (employment_status, next_review_due_date)
WHERE employment_status = 'ACTIVE';

-- Team-scoped search: filters by team and orders by due date
CREATE INDEX IF NOT EXISTS idx_employee_team_review_due 
ON employee (employment_status, team_id, next_review_due_date)
WHERE employment_status = 'ACTIVE';
```

### 5.2. Migration `1791000000003_seed_review_due_ui_i18n_translations.ts`
Registers entity type `REVIEW_DUE_UI` in `app_entity_type` and seeds bilingual translations (`en` and `vi`) into `ui_translation`.

---

## 6. Frontend Internationalization Architecture

Matches the pure dynamic pattern established in `AUDIT_UI`:
- **Storage Location**: Browser `localStorage.getItem('kpi_ui_translations')`.
- **Hydration**: Handled on application bootstrap via `AuthProvider.tsx` (`fetchAndStoreUiTranslations()`).
- **Hook Integration**: `useReviewDueTranslation()` calls `useUiTranslation('REVIEW_DUE_UI')`, with support for interpolation placeholders (`{count}`, `{days}`).
- **Zero Static Bundles**: Eliminated all hardcoded static dictionary fallbacks from frontend source code, ensuring single source of truth in PostgreSQL.

---

## 7. Operational & Deployment Guide

### Environment Variables
| Variable | Default | Purpose |
|---|---|---|
| `REVIEW_DUE_CRON_SCHEDULE` | `"0 0 * * *"` | Cron pattern for the daily review due background refresh job |
| `BATCH_CYCLE_LEAD_TIME_WEEKS` | `4` | Threshold in weeks to alert managers if a batch cycle is impending |

### Rollback Strategy
If review-due scheduling needs to be reverted:
1. Revert Git commits on the release branch.
2. Run database rollback down migrations:
   ```bash
   npm run migrate down
   ```
3. Restart backend service (daily cron will cease). Historical evaluation records and criterion snapshots remain 100% intact due to absolute immutability guarantees.
