# Reports Module Documentation

## Overview
The Reports Module provides dedicated read-models for dashboard and analytical queries in the KPI Evaluation System. It is designed to decouple heavy analytical queries (like average scores, completion rates, and score distributions) from the OLTP `evaluation_item` tables, improving read performance and reducing load on the transactional database.

## Architecture

The module utilizes an Event-Driven architecture to maintain incremental updates without creating circular dependencies:
1. **Event Emitter**: `appEventEmitter` acts as a central hub in `shared/events/event-emitter.ts`.
2. **Publishers**: The `evaluation` and `evaluation-cycle` modules emit events (`EVALUATION_UPDATED` and `CYCLE_LOCKED`).
3. **Subscribers**: The `ReportingProjectionService` listens to these events and writes projection data to flat read-model tables.
4. **Queries**: The `ReportsController` and `ReportsQueryService` only query the read-models.

## Read Models

The system maintains 5 read models:
1. **`employee_evaluation_score_read_model`**: Single row per employee evaluation containing overall scores and statuses.
2. **`employee_kpi_score_read_model`**: Single row per KPI criterion for an employee.
3. **`team_evaluation_aggregate_read_model`**: Rollup of overall scores per team per cycle.
4. **`team_kpi_aggregate_read_model`**: Rollup of specific KPI criteria per team per cycle.
5. **`organization_aggregate_read_model`**: High-level rollup for the entire organization per cycle.

## API Endpoints

All endpoints use `GET` and require `cycleId` as a query parameter.

- `GET /api/reports/employees/:employeeId?cycleId={id}`
  - Returns: `{ score: EmployeeEvaluationScore, kpis: EmployeeKpiScore[] }`
- `GET /api/reports/teams/:teamId?cycleId={id}`
  - Returns: `{ aggregate: TeamEvaluationAggregate, kpis: TeamKpiAggregate[] }`
- `GET /api/reports/organization?cycleId={id}`
  - Returns: `OrganizationAggregate[]`

## Refresh Strategies

- **SYNC (Incremental)**: When an evaluation is editable (OPEN/SUBMITTED/APPROVED) and a score is recalculated, `EVALUATION_UPDATED` triggers an `UPSERT` for just that evaluation and its team aggregates.
- **BATCH (Full)**: When an entire cycle is locked, `CYCLE_LOCKED` triggers a full batch refresh for all evaluations in that cycle to guarantee consistency for historical reporting.
