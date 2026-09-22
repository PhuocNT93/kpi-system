# Step 5: Test Cases

Status: reconstructed

## Deliverable

## Test Cases

| ID | Type | Description | Inputs | Expected Output |
|---|---|---|---|---|
| TC-01 | Backend Integration | Employee accesses own dashboard | Authenticated as `EMPLOYEE` (`emp-1`) | HTTP 200 with personal evaluation status, current overall score, last published score, historical score trend, criteria breakdown, strengths/development areas, and review due cadence. |
| TC-02 | Backend Security | Employee cannot access another employee's scope | Authenticated as `EMPLOYEE` (`emp-1`), requests `emp-2` | Returns HTTP 403 Forbidden or self-only data; zero leakage of `emp-2`. |
| TC-03 | Backend Integration | Manager accesses managed-team dashboard | Authenticated as `MANAGER` managing `team-1` | HTTP 200 with team summary, completion rate, team average score, workflow distribution, anonymous score histogram, team review due summary, attention items. |
| TC-04 | Backend Security | Manager isolated from unmanaged teams | Authenticated as `MANAGER` managing `team-1`, queries `team-2` | Returns aggregates strictly filtered to `team-1`. |
| TC-05 | Backend Integration | HR/Admin accesses organization dashboard | Authenticated as `HR_ADMIN` | HTTP 200 with organization totals, workflow distribution, score distribution histogram, department/team summaries, review due matrix. |
| TC-06 | Backend Integration | System Admin accesses operational dashboard | Authenticated as `SYSTEM_ADMIN` | HTTP 200 with operational metrics and recent audit activity aggregates. |
| TC-07 | Backend Contract | Unauthenticated request rejected | `GET /api/reports/dashboard` without token | HTTP 401 Unauthorized (`UNAUTHENTICATED`). |
| TC-08 | Backend Privacy | Strict anti-ranking verification across all roles | Dashboard responses for all roles | Zero occurrence of keys matching `rank`, `ranking`, `percentile`, `top_employees`, `bottom_employees`. |
| TC-09 | Backend Integration | Review due cadence calculation | Employee with cadence and completed evaluation | Correctly returns status (`UPCOMING`, `OVERDUE`, `NOT_DUE`, `NO_SCHEDULE`) and days remaining. |
| TC-10 | Backend Integration | Historical score trend across cycles | Employee with past published cycles | Returns ordered array of past cycles (`cycle_name`, `overall_score`, `published_at`). |
| TC-11 | Frontend Component | Employee dashboard view renders | Mock response for `EMPLOYEE` | Renders personal score cards, score trend chart, criteria breakdown, strengths/development areas, review due badge. |
| TC-12 | Frontend Component | Manager dashboard view renders | Mock response for `MANAGER` | Renders team summary cards, score distribution histogram, workflow cards, attention items. |
| TC-13 | Frontend Component | HR/Admin dashboard view renders | Mock response for `HR_ADMIN` | Renders organization overview cards, cycle stats, department/team table, workflow bottlenecks. |
| TC-14 | Frontend Component | System Admin dashboard view renders | Mock response for `SYSTEM_ADMIN` | Renders operational cards and audit event aggregates. |
| TC-15 | Frontend UX | Loading skeleton prevents layout shifts | `isLoading: true` | Renders placeholder skeletons matching layout. |
| TC-16 | Frontend UX | Contextual empty states render | Empty evaluations / no active cycles | Renders helpful descriptive empty state banners. |
| TC-17 | Frontend Error | Error and 403 Forbidden handling | API response 403 or 500 | Accessible error banner with retry; distinct unauthorized notice on 403. |
| TC-18 | Frontend Privacy | No ranking or comparison UI elements | DOM inspection across rendered views | Zero ranking badges, percentile indicators, or leaderboards. |

Edge Cases Covered:
- No published evaluations for employee (displays N/A and clear empty state).
- Manager with zero assigned team members (graceful zeroed counts).
- Multiple cycles available with optional `cycleId` filter.
- Overdue reviews accurately flagged with cadence window.
- Missing read-model row triggers on-the-fly projection fallback.

Security / Permission Checks:
- JWT bearer token authentication.
- Identity and role extracted strictly from claims.
- Zero sensitive PII in aggregates.
- System Admin cannot mutate business data.

Regression Risks:
- Existing `/api/reports/*` endpoints remain intact.
- Existing frontend routes and layouts continue working.

## Inputs Reviewed
- Step 4 Implementation Plan
- Step 1 Acceptance Criteria

## Actions and Evidence
- Defined 18 test cases spanning backend integration, security, privacy, and frontend components.

## Changes Made
- None.

## Decisions and Rationale
- Added dedicated programmatic anti-ranking test cases (TC-08 and TC-18) to guarantee compliance with LLD Section 13.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implement
